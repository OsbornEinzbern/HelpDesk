<template>
  <div v-if="visible" class="org-modal-backdrop" @keydown.esc="close" tabindex="-1" role="dialog" aria-modal="true">
    <div class="org-modal" ref="modalRoot" role="document" :aria-label="modalTitle">
      <header class="modal-header">
        <h2 class="modal-title">{{ modalTitle }}</h2>
        <div class="header-right">
          <template v-if="isEditing && mode !== 'create'">
            <button  
              v-if="hasFormChanges" 
              class="save-btn" 
              :class="{ 'save-btn-active': isFormValid }"
              @click="onSave" 
              :disabled="saving || !isFormValid"
              title="Сохранить изменения"
            >
              <Icon :icon="uiIcons?.icons.save" width="20" height="20" /> Сохранить изменения
            </button>
          </template>
          <template v-else-if="isEditing && mode === 'create'">
            <button 
              class="save-btn" 
              :class="{ 'save-btn-active': isFormValid }"
              @click="onSave" 
              :disabled="saving || !isFormValid"
              title="Применить"
            >
              <Icon :icon="uiIcons?.icons.save" width="20" height="20" /> Применить
            </button>
          </template>
          <template v-else>
            <button type="button" class="btn" @click="enterEdit" v-if="canEdit && mode !== 'create' && mode !== 'view'">
              <Icon :icon="uiIcons?.icons.editOutline" width="20" height="20" /> Редактировать
            </button>
          </template>
          <button class="close-btn" @click="close" title="Закрыть">
            <Icon :icon="uiIcons?.icons.close" class="close-btn-icon" width="36" height="36" />
          </button>
        </div>
      </header>

      <div class="org-modal__body">
        <!-- Режим просмотра -->
        <template v-if="!isEditing">
          <div class="org-grid">
            <section class="org-main">
              <div class="org-section">
                <h3 class="subheading">Основная информация</h3>
                <div class="two-columns">
                  <UITextarea 
                    :modelValue="localGroup.name" 
                    placeholder="Название отсутствует"
                    label="Название группы"
                    :maxLength="100"
                    :showCharCount="true"
                    :rows="3"
                    :minHeight="'45px'"
                    :maxHeight="'90px'"
                    :readonly="true"
                  />
                  <UITextarea 
                    :modelValue="localGroup.description" 
                    placeholder="Описание отсутствует"
                    label="Описание"
                    :maxLength="100"
                    :showCharCount="true"
                    :rows="3"
                    :minHeight="'45px'"
                    :maxHeight="'90px'"
                    :readonly="true"
                  />
                </div>
              </div>
              <div class="org-section">
                <h3 class="subheading">Инженеры группы поддержки</h3>
                <div class="engineers-table-view">
                  <div v-if="localGroup.engineers && localGroup.engineers.length > 0" class="engineers-list">
                    <div 
                      v-for="engineer in localGroup.engineers" 
                      :key="engineer.id" 
                      class="engineer-item"
                    >
                    <div class="engineer-avatar" :style="getAvatarGradient(engineer)">
                      {{ getUserInitials(engineer) }}
                    </div>
                    <div class="engineer-info">
                      <span class="engineer-name">{{ getEngineerFullName(engineer) }}</span>
                      <span class="engineer-email">{{ engineerEmail(engineer) }}</span>
                    </div>
                  </div>
                  </div>
                  <div v-else class="no-engineers">
                    Инженеры не назначены
                  </div>
                </div>
              </div>
            </section>
          </div>
        </template>

        <!-- Режим редактирования (оставляем без изменений) -->
        <template v-else>
          <div class="org-grid">
            <section class="org-main">
              <div class="org-section">
                <h3 class="subheading">Основная информация</h3>
                <div class="two-columns">
                  <div class="form-row">
                    <UITextarea 
                      v-model="localGroup.name"
                      placeholder="Введите название"
                      label="Название группы"
                      :required="true"
                      :maxLength="100"
                      :showCharCount="true"
                      :rows="3"
                      :minHeight="'45px'"
                      :maxHeight="'120px'"
                      :readonly="false"
                    />
                  </div>
                  <div class="form-row">
                    <UITextarea 
                      v-model="localGroup.description"
                      placeholder="Описание отсутствует"
                      label="Описание"
                      :maxLength="100"
                      :showCharCount="true"
                      :rows="3"
                      :minHeight="'45px'"
                      :maxHeight="'120px'"
                      :readonly="false"
                    />
                  </div>
                </div>
              </div>
              <div class="org-section">
                <h3 class="subheading">Инженеры группы поддержки</h3>
                
                <!-- Таблица инженеров -->
                <div class="engineers-table">
                  <div class="engineers-row header-row">
                    <div class="engineer-col name-col">Инженер</div>
                    <div class="engineer-col actions-col"></div>
                  </div>

                  <div v-for="(engineer, index) in localGroup.engineersCombobox" :key="engineer.id || index" class="engineers-row">
                    <div class="engineer-col name-col">
                      <UIComboBox
                        :ref="el => setEngineerComboRef(el, index)"
                        v-model="localGroup.engineersCombobox[index]"
                        :return-object="true"
                        :options="[]"
                        option-label="name"
                        option-value="id"
                        placeholder="Выберите инженера"
                        :search-debounce="500"
                        :max-length="30"
                        :load-options="(searchStr, url) => loadEngineersOptions(searchStr, url, index)"
                        @update:model-value="(val) => onEngineerChange(index, val)"
                      />
                    </div>
                    <div class="engineer-col actions-col">
                      <button 
                        class="remove-engineer-btn"
                        @click="removeEngineer(index)"
                        title="Удалить инженера"
                      >
                        <Icon :icon="uiIcons?.icons.close" width="22" height="22" />
                      </button>
                    </div>
                  </div>
                  
                  <!-- Кнопка добавления инженера -->
                  <div class="engineers-row add-row">
                    <div class="engineer-col add-button-col">
                      <button 
                        class="add-engineer-btn"
                        @click="addEngineer"
                      >
                        + Добавить инженера
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="org-modal__footer">
                <div class="left-actions"></div>
                <div class="right-actions">
                  <template v-if="mode !== 'create'">
                    <button type="button" class="btn" @click="cancelEdit" :disabled="saving">Отменить изменения</button>
                    <button type="button" class="btn danger" v-if="canDelete" @click.stop="deleteGroup" title="Удалить группу">
                      <Icon :icon="uiIcons?.icons.deleteOutline" width="20" height="20" /> Удалить
                    </button>
                  </template>
                  <template v-else>
                    <button 
                      v-if="hasAnyInput" 
                      type="button" 
                      class="btn" 
                      @click="resetForm"
                    >
                      <Icon :icon="uiIcons?.icons.reload" width="20" height="20" />Сбросить
                    </button>
                  </template>
                </div>
              </div>
            </section>
          </div>
        </template>
      </div>
    </div>
  </div>
  <UIIcons ref="uiIcons" />
  <DeleteNotification ref="deleteGroupModal" />
  <SuccessNotification ref="successGroupModal" />
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import UIComboBox from '@/components/common/UI/UIComboBox.vue'
import UITextarea from '@/components/common/UI/UITextarea.vue'
import { Icon } from '@iconify/vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import DeleteNotification from '@/components/notifications/DeleteNotification.vue'
import SuccessNotification from '@/components/notifications/SuccessNotification.vue'
import { useSupportGroupsStore } from '@/stores/support.groups.store'
import { getUserRole } from '@/utils/auth.utils'
import { getAvatarGradient, getUserInitials, getUserFullName } from '@/utils/profile.utils'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'view' },
  object: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'saved', 'deleted'])

const uiIcons = ref()
const supportGroupsStore = useSupportGroupsStore()
const deleteGroupModal = ref()
const successGroupModal = ref()

const visible = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const serverError = ref(null)
const duplicateError = ref('')
const nameField = ref(null)
const engineerComboRefs = ref([])

// Форма группы
const localGroup = reactive({
  id: null,
  name: '',
  description: '',
  engineers: [], // Основной массив для сохранения
  engineersCombobox: [] // Массив для отображения в комбобоксах
})

// Клон для отслеживания изменений
const formClone = {
  id: null,
  name: '',
  description: '',
  engineers: []
}

// Получение полного имени инженера (используем утилиту)
const getEngineerFullName = (engineer) => {
  return getUserFullName(engineer)
}

// Функция для сохранения рефов комбобоксов
const setEngineerComboRef = (el, index) => {
  if (el) {
    engineerComboRefs.value[index] = el
  }
}

// Получение списка ID уже добавленных инженеров
const getSelectedEngineerIds = (currentIndex = null) => {
  return localGroup.engineers
    .filter((eng, idx) => eng && eng.id && idx !== currentIndex)
    .map(eng => eng.id)
}

const loadEngineersOptions = async (searchStr, url = null, currentIndex = null) => {
  try {
    // Используем engineers для проверки уже выбранных ID
    const selectedIds = getSelectedEngineerIds(currentIndex)
    const response = await supportGroupsStore.loadEngineers(searchStr, url)
    let engineers = []
    
    if (response && Array.isArray(response.data)) {
      engineers = response.data
    } else if (response && Array.isArray(response)) {
      engineers = response
    }
    
    // Форматируем инженеров для отображения в комбобоксе
    const formattedEngineers = engineers.map(eng => ({
      id: eng.id,
      name: `${eng.last_name} ${eng.first_name}`.trim(),
      ...eng
    }))
    
    const filteredEngineers = formattedEngineers.filter(
      engineer => !selectedIds.includes(engineer.id)
    )
    
    return {
      ...response,
      data: filteredEngineers
    }
  } catch (error) {
    console.error('Ошибка загрузки инженеров:', error)
    return {
      data: [],
      current_page: 1,
      last_page: 1,
      next_page_url: null,
      prev_page_url: null
    }
  }
}

// Обработчик изменения инженера
const onEngineerChange = (index, value) => {
  if (value && value.id) {
    // Обновляем оба массива
    localGroup.engineers[index] = value
    localGroup.engineersCombobox[index] = {
      id: value.id,
      name: value.name || `${value.last_name} ${value.first_name}`.trim()
    }
    duplicateError.value = ''
  } else if (!value) {
    // Если значение удалено, удаляем оба элемента
    localGroup.engineers.splice(index, 1)
    localGroup.engineersCombobox.splice(index, 1)
    engineerComboRefs.value.splice(index, 1)
    duplicateError.value = ''
  }
}

// Проверка на дубликаты инженеров
const checkDuplicateEngineers = () => {
  const engineerIds = localGroup.engineers
    .filter(eng => eng && eng.id)
    .map(eng => eng.id)
  
  const uniqueIds = new Set(engineerIds)
  if (engineerIds.length !== uniqueIds.size) {
    duplicateError.value = 'Нельзя добавить одного инженера несколько раз'
    return false
  }
  duplicateError.value = ''
  return true
}

// Добавление инженера
const addEngineer = () => {
  const hasEmptyRow = localGroup.engineersCombobox.some(eng => !eng || !eng.id)
  if (hasEmptyRow) {
    duplicateError.value = 'Сначала заполните или удалите пустую строку'
    return
  }
  
  // Добавляем в оба массива
  localGroup.engineers.push({ id: null, full_name: '' })
  localGroup.engineersCombobox.push({ id: null, name: '' })
  
  duplicateError.value = ''
  nextTick(() => {
    const lastIndex = localGroup.engineersCombobox.length - 1
    if (engineerComboRefs.value[lastIndex]) {
      engineerComboRefs.value[lastIndex].focus()
    }
  })
}

// Удаление инженера
const removeEngineer = (index) => {
  localGroup.engineers.splice(index, 1)
  localGroup.engineersCombobox.splice(index, 1)
  engineerComboRefs.value.splice(index, 1)
  duplicateError.value = ''
}

watch(() => props.modelValue, async (v) => {
  visible.value = v
  if (v) {
    await openAndLoad()
  } else {
    resetState()
  }
})

watch(visible, (v) => emit('update:modelValue', v))

const modalTitle = computed(() => {
  if (props.mode === 'create') return 'Создание группы поддержки'
  if (isEditing.value) return `Редактирование группы`
  return `Профиль группы поддержки`
})

const canEdit = computed(() => {
  return props.mode === 'create' || props.mode === 'edit'
})

const canDelete = computed(() => {
  return getUserRole() === 'admin'
})

async function openAndLoad() {
  serverError.value = null
  saving.value = false
  duplicateError.value = ''

  if (props.mode === 'create') {
    resetForm()
    isEditing.value = true
    await nextTick()
    nameField.value?.focus()
    return
  }

  const src = props.object
  if (!src) {
    resetForm()
    isEditing.value = false
    return
  }

  fillForm(src)
  isEditing.value = false
  await nextTick()
}

function fillForm(src) {
  console.log("Заполнение группы: ", src)
  localGroup.id = src.id || null
  localGroup.name = src.name || ''
  localGroup.description = src.description || ''
  
  // Основной массив engineers - полные данные
  localGroup.engineers = src.users ? [...src.users] : []
  
  // Массив для комбобоксов - только id и name для отображения
  localGroup.engineersCombobox = src.users ? src.users.map(user => ({
    id: user.id,
    name: `${user.last_name} ${user.first_name}`.trim()
  })) : []
  
  cloneForm()
}

function cloneForm() {
  formClone.id = localGroup.id
  formClone.name = localGroup.name
  formClone.description = localGroup.description
  formClone.engineers = [...localGroup.engineers]
  // Не клонируем engineersCombobox, так как он нужен только для отображения
}

function resetForm() {
  localGroup.id = null
  localGroup.name = ''
  localGroup.description = ''
  localGroup.engineers = []
  localGroup.engineersCombobox = []
  engineerComboRefs.value = []
  duplicateError.value = ''
  // Принудительно обновляем состояние кнопок
  nextTick(() => {
  })
}

function resetState() {
  isEditing.value = props.mode === 'create'
  saving.value = false
  serverError.value = null
  duplicateError.value = ''
  resetForm()
  clearErrors()
}

function clearErrors() {
  serverError.value = null
  duplicateError.value = ''
  if (nameField.value && typeof nameField.value.clearError === 'function') {
    nameField.value.clearError()
  }
}

function enterEdit() {
  if (!canEdit.value) return
  isEditing.value = true
  nextTick(async () => {
    clearErrors()
  })
}

function cancelEdit() {
  isEditing.value = false
  if (props.mode === 'create') {
    close()
  } else if (props.object) {
    fillForm(props.object)
  }
}

function validateForm() {
  if (!localGroup.name || !localGroup.name.trim()) {
    serverError.value = 'Название группы обязательно'
    return false
  }
  
  serverError.value = null
  return true
}

function hasChanges() {
  if (formClone.id !== localGroup.id) return true
  if (formClone.name !== localGroup.name) return true
  if (formClone.description !== localGroup.description) return true
  
  if (formClone.engineers.length !== localGroup.engineers.length) return true
  
  for (let i = 0; i < localGroup.engineers.length; i++) {
    const oldEng = formClone.engineers[i]
    const newEng = localGroup.engineers[i]
    if (oldEng?.id !== newEng?.id) return true
  }
  
  return false
}

function preparePayload() {
  const engineersIds = localGroup.engineers
    .filter(eng => eng && eng.id)
    .map(eng => eng.id)
  
  const payload = {
    name: localGroup.name,
    description: localGroup.description || '',
    engineers: engineersIds
  }
  
  if (props.mode !== 'create' && localGroup.id) {
    payload.support_group_id = localGroup.id
  }
  
  return payload
}

const onSave = async () => {
  if (saving.value) return
  
  if (!validateForm()) {
    return
  }
  
  if (!checkDuplicateEngineers()) {
    return
  }
  
  if (props.mode !== "create" && !hasChanges()) {
    close()
    return
  }
  
  saving.value = true
  serverError.value = null
  duplicateError.value = ''
  
  try {
    const payload = preparePayload()
    console.log('📤 Отправка запроса:', payload)
    
    let response
    let confirmed
    
    if (props.mode === 'create') {
      response = await supportGroupsStore.createGroup(payload)
      
      if (!response.validator_fails && !response.errors) {
        confirmed = await successGroupModal.value.open({
          title: '',
          mainMessage: 'Группа поддержки успешно создана',
          type: 'success',
        })
        if (confirmed) {
          emit('saved', response)
          close()
        }
      } else {
        await successGroupModal.value.open({
          title: '',
          mainMessage: 'Ошибка при создании группы поддержки',
          type: 'notSuccess',
        })
        handleServerErrors(response)
      }
    } else {
      response = await supportGroupsStore.updateGroup(payload)
      
      if (!response.validator_fails && !response.errors) {
        confirmed = await successGroupModal.value.open({
          title: '',
          mainMessage: 'Группа поддержки успешно обновлена',
          type: 'success',
        })
        if (confirmed) {
          isEditing.value = false
          emit('saved', response)
          close()
        }
      } else {
        await successGroupModal.value.open({
          title: '',
          mainMessage: 'Ошибка при обновлении группы поддержки',
          type: 'notSuccess',
        })
        handleServerErrors(response)
      }
    }
  } catch (err) {
    console.error('Ошибка сохранения:', err)
    serverError.value = err?.message || 'Ошибка сохранения'
    
    await successGroupModal.value.open({
      title: '',
      mainMessage: serverError.value,
      type: 'notSuccess',
    })
  } finally {
    saving.value = false
  }
}

function handleServerErrors(response) {
  const errors = response.errors || response.validator_fails || {}
  
  if (errors.name && nameField.value) {
    nameField.value.setError?.(errors.name[0])
  }
  
  if (errors.engineers) {
    duplicateError.value = Array.isArray(errors.engineers) ? errors.engineers[0] : errors.engineers
  }
  
  if (Object.keys(errors).length > 0 && !duplicateError.value) {
    serverError.value = Object.values(errors).flat()[0]
  }
}

const deleteGroup = async () => {
  let confirmed
  
  if (localGroup.name) {
    confirmed = await deleteGroupModal.value.open({
      title: 'Удаление группы поддержки',
      mainMessage: 'Вы действительно хотите удалить группу ',
      secondaryMessage: localGroup.name + '?'
    })
  } else {
    confirmed = await deleteGroupModal.value.open({
      title: 'Удаление группы поддержки',
      mainMessage: 'Вы действительно хотите удалить группу?',
      secondaryMessage: ''
    })
  }
  
  if (confirmed) {
    saving.value = true
    
    try {
      const payload = { support_groups: [localGroup.id] }
      const response = await supportGroupsStore.deleteGroups(payload)
      
      if (response.validator_fails || response.errors) {
        await successGroupModal.value.open({
          title: '',
          mainMessage: 'Ошибка при удалении группы поддержки',
          type: 'notSuccess',
        })
      } else {
        const confirmed2 = await successGroupModal.value.open({
          title: '',
          mainMessage: 'Группа поддержки успешно удалена',
          type: 'success',
        })
        if (confirmed2) {
          emit('deleted', localGroup.id)
          close()
        }
      }
    } catch (err) {
      console.error('Ошибка удаления:', err)
      await successGroupModal.value.open({
        title: '',
        mainMessage: 'Ошибка при удалении группы поддержки',
        type: 'notSuccess',
      })
    } finally {
      saving.value = false
    }
  }
}

const engineerEmail = (engineer) => {
  return engineer?.email || ''
}

const isFormValid = computed(() => {
  return localGroup.name && localGroup.name.trim().length > 0
})

const hasFormChanges = computed(() => {
  return hasChanges()
})

const hasAnyInput = computed(() => {
  return localGroup.name?.trim() || localGroup.description?.trim() || localGroup.engineersCombobox.length > 0
})

const close = () => {
  visible.value = false
}
</script>

<style scoped>
.org-modal-backdrop {
  position: fixed; 
  inset: 0; 
  z-index: 2200; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  background: rgba(0,0,0,0.45);
}

.org-modal {
  width: 50%; 
  max-width: 850px;
  max-height: 88vh;
  overflow-y: auto;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 30px 80px rgba(3,20,50,0.35);
  display: flex;
  flex-direction: column;
}

.modal-header {
  background: #ffffff;
  position: sticky;
  top: 0;
  z-index: 15;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 20px;
  border-bottom: 2px solid #969696;
  border-radius: 12px 12px 0 0;
}

.modal-title {
  font-size: 18px;
  margin: 0;
  color: #0b1630;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.save-btn {
  background: #3cc93a;
  color: white;
  border: none;
  padding: 4px 12px;
  border-radius: 16px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.save-btn:hover:not(:disabled) {
  background: #34bb32;
  transform: scale(1.03);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  color: rgb(46, 46, 46);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  margin-left: 6px;
}

.close-btn:hover {
  transform: scale(1.1);
}

.close-btn-icon:hover {
  color: rgb(255, 19, 19);
}

.org-modal__body {
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.org-grid {
  display: grid;
  grid-template-columns: 1fr;
  align-items: start;
}

.org-main {
  min-width: 0;
}

.org-section {
  border: 1px solid rgb(218, 218, 218);
  border-radius: 6px;
  background-color: #f7f7f7;
  margin-bottom: 10px;
  padding-left: 8px;
  padding-right: 8px;
  padding-top: 8px;
}

.two-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 6px;
}

.subheading {
  margin: 2px 0 6px;
  font-size: 14px;
  color: #374151;
}

.server-error {
  color: #b00020;
  margin: 8px 0;
  font-weight: 600;
}

.org-modal__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0 4px;
  gap: 8px;
}

.right-actions {
  margin-top: 10px;
  display: flex;
  gap: 16px;
  align-items: center;
}

.btn { 
  padding:4px 10px; 
  border-radius:6px; 
  cursor:pointer; 
  border:1px solid rgba(0,0,0,0.08);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn:hover{
  transform: scale(1.03);
}
.btn.primary { 
  background:#178aee; 
  color:#fff; 
  border:none; 
}
.btn.danger { 
  background:#ef4444; 
  color:#fff; 
  border:none; 
}

.save-btn-active {
  background: #3cc93a;
  opacity: 1;
  cursor: pointer;
}

.save-btn-active:hover:not(:disabled) {
  background: #34bb32;
  transform: scale(1.03);
}

.save-btn:disabled {
  background: #cccccc;
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.form-row {
  display: flex;
  flex-direction: column;
}

/* Стили для таблицы инженеров (режим редактирования) */
.engineers-table {
  border: 1px solid #c5c5c5;
  border-radius: 6px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #a3a3a3;
  max-height: 50%;
  background: white;
  margin-bottom: 8px;
}

.engineers-row {
  display: grid;
  grid-template-columns: 9fr 1fr;
  align-items: center;
  min-height: 36px;
  border-bottom: 1px solid #e0e0e0;
}

.engineers-row.header-row {
  background-color: #f8f9fa;
  font-weight: 500;
  border-bottom: 1px solid #c5c5c5;
}

.engineers-row:last-child {
  border-bottom: none;
}

.engineer-col {
  padding: 4px 8px;
}

.name-col {
  padding-right: 8px;
}

.actions-col {
  display: flex;
  justify-content: center;
  align-items: center;
}

.add-row {
  background-color: #ffffff;
}

.add-button-col {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  padding: 4px;
}

.add-engineer-btn {
  background: none;
  border: 1px dashed #178aee;
  color: #178aee;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.add-engineer-btn:hover {
  border-color: #2478d1;
  background-color: #e2f0ff;
  color: #2478d1;
}

.remove-engineer-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  border-radius: 50%;
  color: #dc3545;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-engineer-btn:hover {
  background-color: rgba(220, 53, 69, 0.1);
  transform: scale(1.1);
}

/* Стили для режима просмотра - кликабельные строки инженеров */
.engineers-table-view {
  border: 1px solid #e0e0e0;
  max-height: 50%;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #a3a3a3;
  border-radius: 6px;
  background: white;
  padding: 8px;
  margin-bottom: 8px;
}

.engineers-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.engineer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 2px 4px;
  border-radius: 8px;
  transition: all 0.2s ease;
  background-color: #f6f6f6;
  border: 1px solid transparent;
}

.engineer-item:hover {
  background-color: #e3f2fd;
}

.engineer-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  color: white;
  font-size: 14px;
  flex-shrink: 0;
  text-transform: uppercase;
}

.engineer-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.engineer-name {
  font-weight: 500;
  color: #212121;
  font-size: 14px;
}

.engineer-email {
  color: #2478d1;
  font-size: 12px;
  display: inline-block;
  width: fit-content;
}

.name-col :deep(.ui-combobox-wrapper) {
  position: relative;
  overflow: visible;
}

.name-col :deep(.combobox-dropdown) {
  z-index: 1000 !important;
}

.no-engineers {
  padding: 12px;
  text-align: center;
  color: #999;
  font-style: italic;
}

@media (max-width: 1200px) {
  .org-grid {
    grid-template-columns: 1fr;
  }
  .org-modal {
    width: calc(100% - 24px);
  }
}
</style>