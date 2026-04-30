<template>
  <UIIcons ref="uiIcons" />
  <DeleteNotification ref="deleteObjectModal" />
  <SuccessNotification ref="successObjectModal" />
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
              :disabled="saving || !isFormValid"
              @click="onSave" 
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
            <!-- Правый блок - информация об организации в режиме просмотра -->
            <section class="org-main">
                <div class="org-section">
                    <h3 class="subheading">Основная информация</h3>
                    <div class="two-columns">
                        <UILabel v-model="localObject.name" label="Название объекта" :show-empty-indicator="true" />
                        <UILabel v-model="localObject.organization.name" label="Организация" :show-empty-indicator="true" />
                    </div>
                    <UITextarea 
                        :modelValue="localObject.description" 
                        placeholder="Описание отсутствует"
                        label="Описание"
                        :maxLength="125"
                        :showCharCount="true"
                        :rows="4"
                        :minHeight="'45px'"
                        :maxHeight="'120px'"
                        :readonly="true"
                    />
                </div>
            </section>
            <section class="org-main">
                <div class="org-section">
                    <h3 class="subheading">Контактная информация</h3>
                    <UITextarea 
                        :modelValue="localObject.contact.address" 
                        placeholder="Адрес не указан"
                        label="Адрес"
                        :maxLength="400"
                        :showCharCount="true"
                        :rows="2"
                        :minHeight="'45px'"
                        :maxHeight="'180px'"
                        :readonly="true"
                    />
                    <div class="two-columns">
                        <UILabel v-model="localObject.contact.building" label="Дом" :show-empty-indicator="true" />
                        <UILabel v-model="localObject.contact.office" label="Помещение" :show-empty-indicator="true" />
                    </div>
                    <div class="two-columns">
                        <UILabel v-model="localObject.phone_number.phone_number" label="Телефон" :show-empty-indicator="true" />
                        <UILabel v-model="localObject.contact.index" label="Почтовый индекс" :show-empty-indicator="true" />
                    </div>
                </div>
            </section>
        </div>
        </template>

        <!-- Режим редактирования -->
        <template v-else>
          <div class="org-grid">
            <section class="org-main">
                <div class="org-section">
                    <h3 class="subheading">Основная информация</h3>
                    <div class="two-columns">
                      <div class="form-row">
                      <UIInput
                        ref="nameField"
                        v-model="localObject.name"
                        label="Название объекта"
                        placeholder="Введите название"
                        :required="true"
                        :maxLength="50"
                        :customClass="'mb-8'"
                      />
                      </div>

                      <div class="form-row">
                      <UIComboBox
                        ref="organizationInput"
                        v-model="localObject.organization"
                        :return-object="true"
                        :options="[]"
                        label="Организация"
                        option-label="name"
                        option-value="id"
                        placeholder="Выберите организацию"
                        :search-debounce="1000"
                        :max-length="50"
                        :required="true"
                        :load-options="getOrgOptions"
                      />
                      </div>
                    </div>
                    <div class="form-row">
                    <UITextarea 
                      v-model="localObject.description"
                      placeholder="Описание отсутствует"
                      label="Описание"
                      :maxLength="125"
                      :showCharCount="true"
                      :rows="3"
                      :minHeight="'45px'"
                      :maxHeight="'90px'"
                      :readonly="false"
                    />
                  </div>
                </div>
            </section>
            <section class="org-main">
                <div class="org-section">
                    <h3 class="subheading">Контактная информация</h3>
                    <div class="form-row">
                    <UITextarea 
                        v-model="localObject.contact.address"
                        placeholder="Введите адрес"
                        label="Адрес"
                        :maxLength="400"
                        :showCharCount="true"
                        :rows="2"
                        :minHeight="'45px'"
                        :maxHeight="'80px'"
                        :readonly="false"
                    />
                    </div>
                    <div class="two-columns">
                      <div class="form-row">
                      <UIInput
                        v-model="localObject.contact.building"
                        label="Дом"
                        placeholder="Введите № дома или строения"
                        :maxLength="20"
                        :customClass="'mb-8'"
                      /></div>

                      <div class="form-row">
                      <UIInput
                        v-model="localObject.contact.office"
                        label="Помещение"
                        placeholder="Введите № помещения"
                        :maxLength="20"
                        :customClass="'mb-8'"
                      /></div>
                    </div>
                    <div class="two-columns">
                      <div class="form-row">
                      <UIInput
                        ref="phoneInput"
                        v-model="localObject.phone_number.phone_number"
                        label="Телефон"
                        type="tel"
                        placeholder="Введите телефон"
                        :max-length="20"
                        :required="false"
                      /></div>

                      <div class="form-row">
                      <UIInput
                        v-model="localObject.contact.index"
                        label="Почтовый индекс"
                        placeholder="Введите индекс"
                        :maxLength="20"
                        :customClass="'mb-8'"
                      /></div>
                    </div>
                </div>
              <div class="org-modal__footer">
                <div class="left-actions"></div>
                <div class="right-actions">
                  <template v-if="mode !== 'create'">
                    <button type="button" class="btn" @click="cancelEdit" :disabled="saving">Отменить изменения</button>
                    <button type="button" class="btn danger" v-if="canDelete" @click.stop="deleteObject" title="Удалить объект">
                      <Icon :icon="uiIcons?.icons.deleteOutline" width="20" height="20" /> Удалить
                    </button>
                  </template>
                  <template v-else>
                    <button v-if="hasAnyInput" type="button" class="btn" @click="resetForm">
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
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import UIInput from '@/components/common/UI/UIInput.vue'
import UILabel from '@/components/common/UI/UILabel.vue'
import UIComboBox from '@/components/common/UI/UIComboBox.vue'
import UITextarea from '@/components/common/UI/UITextarea.vue'
import { Icon } from '@iconify/vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import DeleteNotification from '@/components/notifications/DeleteNotification.vue'
import SuccessNotification from '@/components/notifications/SuccessNotification.vue'
import { useObjectsStore } from '@/stores/objects.store'
import { getOrgOptions } from '@/utils/select.options.utils'
import { getUserRole } from '@/utils/auth.utils'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'view' }, // 'view', 'edit', 'create'
  object: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'saved', 'deleted'])

const uiIcons = ref()
const objectsStore = useObjectsStore()
const deleteObjectModal = ref()
const successObjectModal = ref()

const visible = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const serverError = ref(null)
const nameField = ref(null)
const organizationInput = ref(null)
const phoneInput = ref(null)

// Форма объекта
const localObject = reactive({
  id: null, 
  name: '', 
  organization: null,
  description: '',
  contact: {
    id: null, 
    address: '', 
    building: '', 
    office: '', 
    index: ''
  },
  phone_number: {
    id: null, 
    phone_number: ''
  }
})

// Клон для отслеживания изменений
const formClone = {
  id: null,
  name: '',
  organization: null,
  description: '',
  contact: {
    address: '',
    building: '',
    office: '',
    index: ''
  },
  phone_number: {
    phone_number: ''
  }
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
  if (props.mode === 'create') return 'Создание объекта'
  if (isEditing.value) return `Редактирование объекта`
  return `Профиль объекта`
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

  if (props.mode === 'create') {
    resetForm()
    isEditing.value = true
    await nextTick()
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
  localObject.id = src.id || null
  localObject.name = src.name || ''
  localObject.organization = src.organization ? { ...src.organization } : null
  localObject.description = src.description || ''
  localObject.contact = {
    id: src.contact?.id || null,
    address: src.contact?.address || '',
    building: src.contact?.building || '',
    office: src.contact?.office || '',
    index: src.contact?.index || ''
  }
  localObject.phone_number = {
    id: src.phone_number?.id || null,
    phone_number: src.phone_number?.phone_number || ''
  }
  cloneForm()
}

function cloneForm() {
  formClone.id = localObject.id
  formClone.name = localObject.name
  formClone.organization = localObject.organization ? { ...localObject.organization } : null
  formClone.description = localObject.description
  formClone.contact = {
    address: localObject.contact.address,
    building: localObject.contact.building,
    office: localObject.contact.office,
    index: localObject.contact.index
  }
  formClone.phone_number = {
    phone_number: localObject.phone_number.phone_number
  }
}

function resetForm() {
  localObject.id = null
  localObject.name = ''
  localObject.organization = null
  localObject.description = ''
  localObject.contact = {
    id: null,
    address: '',
    building: '',
    office: '',
    index: ''
  }
  localObject.phone_number = {
    id: null,
    phone_number: ''
  }
}

function resetState() {
  isEditing.value = props.mode === 'create'
  saving.value = false
  serverError.value = null
  resetForm()
  clearErrors()
}

function clearErrors() {
  serverError.value = null
  const inputs = [nameField, organizationInput, phoneInput]
  inputs.forEach(input => {
    if (input.value && typeof input.value.clearError === 'function') {
      input.value.clearError()
    }
  })
}

function enterEdit() {
  if (!canEdit.value) return
  isEditing.value = true
  nextTick(() => clearErrors())
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
  if (!localObject.name || !localObject.name.trim()) {
    serverError.value = 'Название объекта обязательно'
    return false
  }
  
  if (!localObject.organization || !localObject.organization.id) {
    serverError.value = 'Организация обязательна'
    if (organizationInput.value && typeof organizationInput.value.setError === 'function') {
      organizationInput.value.setError('Выберите организацию')
    }
    return false
  }
  
  serverError.value = null
  return true
}

function hasChanges() {
  if (formClone.id !== localObject.id) return true
  if (formClone.name !== localObject.name) return true
  if (formClone.description !== localObject.description) return true
  
  // Проверка организации
  const oldOrgId = formClone.organization?.id || null
  const newOrgId = localObject.organization?.id || null
  if (oldOrgId !== newOrgId) return true
  
  // Проверка контактов
  if (formClone.contact.address !== localObject.contact.address) return true
  if (formClone.contact.building !== localObject.contact.building) return true
  if (formClone.contact.office !== localObject.contact.office) return true
  if (formClone.contact.index !== localObject.contact.index) return true
  
  // Проверка телефона
  if (formClone.phone_number.phone_number !== localObject.phone_number.phone_number) return true
  
  return false
}

function preparePayload() {
  const payload = {
    name: localObject.name,
    description: localObject.description || '',
    phone_number: localObject.phone_number.phone_number || '',
    address: localObject.contact.address || '',
    index: localObject.contact.index || '',
    building: localObject.contact.building || '',
    office: localObject.contact.office || '',
    organization: localObject.organization?.id
  }
  
  if (props.mode !== 'create' && localObject.id) {
    payload.object_id = localObject.id
  }
  
  return payload
}

const onSave = async () => {
  if (saving.value) return
  
  if (!validateForm()) {
    return
  }
  
  if (props.mode !== "create" && !hasChanges()) {
    close()
    return
  }
  
  saving.value = true
  serverError.value = null
  
  try {
    const payload = preparePayload()
    console.log('📤 Отправка запроса:', payload)
    
    let response
    let confirmed
    
    if (props.mode === 'create') {
      response = await objectsStore.createObject(payload)
      
      if (!response.validator_fails && !response.errors) {
        confirmed = await successObjectModal.value.open({
          title: '',
          mainMessage: 'Объект успешно создан',
          type: 'success',
        })
        if (confirmed) {
          emit('saved', response)
          close()
        }
      } else {
        await successObjectModal.value.open({
          title: '',
          mainMessage: 'Ошибка при создании объекта',
          type: 'notSuccess',
        })
        handleServerErrors(response)
      }
    } else {
      response = await objectsStore.updateObject(payload)
      
      if (!response.validator_fails && !response.errors) {
        confirmed = await successObjectModal.value.open({
          title: '',
          mainMessage: 'Объект успешно обновлен',
          type: 'success',
        })
        if (confirmed) {
          isEditing.value = false
          emit('saved', response)
          close()
        }
      } else {
        await successObjectModal.value.open({
          title: '',
          mainMessage: 'Ошибка при обновлении объекта',
          type: 'notSuccess',
        })
        handleServerErrors(response)
      }
    }
  } catch (err) {
    console.error('Ошибка сохранения:', err)
    serverError.value = err?.message || 'Ошибка сохранения'
    
    await successObjectModal.value.open({
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
  if (errors.organization && organizationInput.value) {
    organizationInput.value.setError?.(errors.organization[0])
  }
  if (errors.phone_number && phoneInput.value) {
    phoneInput.value.setError?.(errors.phone_number[0])
  }
  
  if (Object.keys(errors).length > 0) {
    serverError.value = Object.values(errors).flat()[0]
  }
}

const deleteObject = async () => {
  let confirmed
  
  if (localObject.name) {
    confirmed = await deleteObjectModal.value.open({
      title: 'Удаление объекта',
      mainMessage: 'Вы действительно хотите удалить объект ',
      secondaryMessage: localObject.name + '?'
    })
  } else {
    confirmed = await deleteObjectModal.value.open({
      title: 'Удаление объекта',
      mainMessage: 'Вы действительно хотите удалить объект?',
      secondaryMessage: ''
    })
  }
  
  if (confirmed) {
    saving.value = true
    
    try {
      const payload = { objects: [localObject.id] }
      const response = await objectsStore.deleteObjects(payload)
      
      if (response.validator_fails || response.errors) {
        await successObjectModal.value.open({
          title: '',
          mainMessage: 'Ошибка при удалении объекта. Объект не удален',
          type: 'notSuccess',
        })
      } else {
        const confirmed2 = await successObjectModal.value.open({
          title: '',
          mainMessage: 'Объект успешно удален',
          type: 'success',
        })
        if (confirmed2) {
          emit('deleted', localObject.id)
          close()
        }
      }
    } catch (err) {
      console.error('Ошибка удаления:', err)
      await successObjectModal.value.open({
        title: '',
        mainMessage: 'Ошибка при удалении объекта',
        type: 'notSuccess',
      })
    } finally {
      saving.value = false
    }
  }
}

const isFormValid = computed(() => {
  return localObject.name?.trim() && localObject.organization?.id
})

const hasFormChanges = computed(() => {
  return hasChanges()
})

const hasAnyInput = computed(() => {
  return localObject.name?.trim() || localObject.description?.trim() || 
         localObject.organization || localObject.contact.address?.trim() ||
         localObject.contact.building?.trim() || localObject.contact.office?.trim() ||
         localObject.contact.index?.trim() || localObject.phone_number.phone_number?.trim()
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
  width: 60%; 
  max-width: 820px;
  max-height: 80vh;
  overflow-y: auto;
  overflow-x: none;
  scrollbar-width: thin;
  scrollbar-color: rgb(156, 156, 156);
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

.save-btn:hover {
  background: #34bb32;
  transform: scale(1.03);
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
  gap: 12px;
  align-items: start;
}

.org-main {
  min-width: 0;
  min-width: 300px;
  max-width: 800px;
}

.org-section{
  border: 1px solid rgb(218, 218, 218);
  border-radius: 6px;
  background-color: #f7f7f7;
  padding: 8px;
}

.org-offices {
  border: 1px solid rgb(218, 218, 218);
  border-radius: 6px;
  background-color: #f7f7f7;
  padding: 8px;
}

.two-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 6px;
}

.three-columns {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  margin-bottom: 6px;
}

.bank-section {
  margin: 12px 0;
  border: 1px solid rgb(218, 218, 218);
  border-radius: 6px;
  background-color: #f7f7f7;
  padding: 8px;
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

.left-actions .muted {
  color: #6b7280;
  font-size: 13px;
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

.form-row { 
  display:flex; 
  flex-direction:column; 
}

.form-row :deep(.ui-input),
.form-row :deep(.ui-select-custom),
.form-row :deep(.ui-combobox-input) {
  width: 100%;
}

.form-row.has-error :deep(.ui-input),
.form-row.has-error :deep(.ui-select-custom),
.form-row.has-error :deep(.ui-combobox-input) {
  border-color: #b00020;
}

.form-row :deep(.ui-select-wrapper),
.form-row :deep(.ui-combobox-wrapper),
.form-row :deep(.ui-input-wrapper) {
  display: flex;
  flex-direction: column;
}

/* Фиксируем высоту поля ввода */
.form-row :deep(.ui-select-custom),
.form-row :deep(.ui-input-field) {
  height: 30px !important;
  min-height: 30px !important;
  box-sizing: border-box;
}

.form-row :deep(.ui-combobox-input){
  height: 28px !important;
  min-height: 28px !important;
  box-sizing: border-box;
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