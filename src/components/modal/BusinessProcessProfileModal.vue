<template>
  <div v-if="visible" class="bp-modal-backdrop" @keydown.esc="close" tabindex="-1" role="dialog" aria-modal="true">
    <div class="bp-modal" ref="modalRoot" role="document" :aria-label="modalTitle">
      <header class="modal-header">
        <h2 class="modal-title">{{ modalTitle }}</h2>
        <div class="header-right">
          <!-- Кнопки переключения между редакторами (только в режиме редактирования) -->
          <div v-if="isEditing" class="tab-buttons">
            <button 
              class="tab-btn" 
              :class="{ active: activeTab === 'info' }"
              @click="activeTab = 'info'"
            >
              <Icon :icon="uiIcons?.icons.info" width="18" height="18" />
              Основная информация
            </button>
            <button 
              class="tab-btn" 
              :class="{ active: activeTab === 'statuses' }"
              @click="activeTab = 'statuses'"
            >
              <Icon :icon="uiIcons?.icons.businessProcess" width="18" height="18" />
              Статусы процесса
            </button>
          </div>

          <!-- Кнопка сохранения (только в режиме редактирования) -->
          <button 
            v-if="isEditing"
            class="save-btn" 
            :class="{ 'save-btn-active': isFormValid }"
            @click="onSave" 
            :disabled="saving || !isFormValid"
            :title="saveButtonTitle"
          >
            <Icon :icon="uiIcons?.icons.save" width="20" height="20" /> 
            {{ saveButtonText }}
          </button>

          <!-- Кнопка редактирования (режим просмотра) -->
          <button 
            v-if="!isEditing && mode !== 'create' && mode !== 'view'"
            type="button" 
            class="btn" 
            @click="enterEdit"
          >
            <Icon :icon="uiIcons?.icons.editOutline" width="20" height="20" /> 
            Редактировать
          </button>

          <!-- Кнопка закрытия -->
          <button class="close-btn" @click="close" title="Закрыть">
            <Icon :icon="uiIcons?.icons.close" class="close-btn-icon" width="36" height="36" />
          </button>
        </div>
      </header>

      <div class="bp-modal__body">
        <!-- Режим просмотра - показываем оба редактора в режиме readonly -->
        <template v-if="!isEditing">
          <div class="view-mode">
            <BasicInfoEditor 
              v-model="basicInfo"
              :category-options="categoryOptions"
              :readonly="true"
            />
            <StatusEditor 
              v-model="statusesList"
              :readonly="true"
            />
          </div>
        </template>

        <!-- Режим редактирования -->
        <template v-else>
          <div class="edit-mode">
            <div v-show="activeTab === 'info'" class="editor-container">
              <BasicInfoEditor 
                ref="basicInfoEditorRef"
                v-model="basicInfo"
                :category-options="categoryOptions"
                :readonly="false"
                :initial-data="initialBasicInfo"
                @validity-change="onBasicInfoValidityChange"
                @reset="onEditorReset"
              />
            </div>
            <div v-show="activeTab === 'statuses'" class="editor-container">
              <StatusEditor 
                ref="statusEditorRef"
                v-model="statusesList"
                :readonly="false"
                :initial-statuses="initialStatuses"
                @validity-change="onStatusesValidityChange"
                @reset="onEditorReset"
              />
            </div>
          </div>
        </template>
      </div>

      <div class="bp-modal__footer" v-if="isEditing && mode !== 'create'">
        <div class="left-actions"></div>
        <div class="right-actions">
          <button type="button" class="btn" @click="cancelEdit" :disabled="saving">
            Отменить изменения
          </button>
          <button type="button" class="btn danger" v-if="canDelete" @click="deleteProcess">
            <Icon :icon="uiIcons?.icons.deleteOutline" width="20" height="20" /> 
            Удалить
          </button>
        </div>
      </div>
    </div>
  </div>

  <UIIcons ref="uiIcons" />
  <SuccessNotification ref="successModal" />
  <DeleteNotification ref="deleteModal" />
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import SuccessNotification from '@/components/notifications/SuccessNotification.vue'
import DeleteNotification from '@/components/notifications/DeleteNotification.vue'
import BasicInfoEditor from './bpparts/BasicInfoEditor.vue'
import StatusEditor from './bpparts/StatusEditor.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'view' }, // 'view', 'edit', 'create'
  process: { type: Object, default: null },
  categoryOptions: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'saved', 'deleted'])

// Ключ для LocalStorage
const STORAGE_KEY = 'business_process_draft'

const uiIcons = ref()
const successModal = ref()
const deleteModal = ref()
const basicInfoEditorRef = ref()
const statusEditorRef = ref()

// Состояние
const visible = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const activeTab = ref('info')

// Данные форм
const basicInfo = ref({
  name: '',
  code: '',
  description: '',
  category: null,
  version: '',
  is_active: true
})

const statusesList = ref([])

// Начальные данные для сброса
const initialBasicInfo = ref(null)
const initialStatuses = ref(null)

// Валидность каждого редактора
const isBasicInfoValid = ref(false)
const isStatusesValid = ref(false)

// Общая валидность формы
const isFormValid = computed(() => {
  return isBasicInfoValid.value && isStatusesValid.value
})

// Проверка наличия любых изменений
const hasAnyChanges = computed(() => {
  const basicHasChanges = basicInfoEditorRef.value?.hasChanges || false
  const statusesHasChanges = statusEditorRef.value?.hasChanges || false
  return basicHasChanges || statusesHasChanges
})

const saveButtonText = computed(() => {
  return props.mode === 'create' ? 'Создать' : 'Сохранить изменения'
})

const saveButtonTitle = computed(() => {
  if (!isFormValid.value) {
    if (!isBasicInfoValid.value) return 'Заполните основную информацию'
    if (!isStatusesValid.value) return 'Настройте статусы процесса'
    return 'Форма не валидна'
  }
  return saveButtonText.value
})

// Сохранение в LocalStorage
function saveToLocalStorage() {
  if (props.mode !== 'create') return
  
  const draft = {
    basicInfo: basicInfo.value,
    statuses: statusesList.value,
    timestamp: Date.now()
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  console.log('💾 Прогресс сохранен в LocalStorage')
}

// Загрузка из LocalStorage
function loadFromLocalStorage() {
  if (props.mode !== 'create') return
  
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const draft = JSON.parse(saved)
      // Проверяем, не устарел ли draft (например, старше 24 часов)
      const isExpired = Date.now() - draft.timestamp > 24 * 60 * 60 * 1000
      
      if (!isExpired && draft.basicInfo && draft.statuses) {
        basicInfo.value = { ...draft.basicInfo }
        statusesList.value = JSON.parse(JSON.stringify(draft.statuses))
        console.log('📂 Загружен сохраненный прогресс из LocalStorage')
      } else if (isExpired) {
        // Очищаем устаревший draft
        localStorage.removeItem(STORAGE_KEY)
        console.log('🗑️ Удален устаревший draft')
      }
    } catch (e) {
      console.error('Ошибка загрузки из LocalStorage:', e)
    }
  }
}

// Очистка LocalStorage
function clearLocalStorage() {
  localStorage.removeItem(STORAGE_KEY)
  console.log('🗑️ LocalStorage очищен')
}

// Сохранение прогресса при изменении
watch([basicInfo, statusesList], () => {
  if (props.mode === 'create' && isEditing.value) {
    saveToLocalStorage()
  }
}, { deep: true })

// Обработчики валидности
function onBasicInfoValidityChange(isValid) {
  isBasicInfoValid.value = isValid
}

function onStatusesValidityChange(isValid) {
  isStatusesValid.value = isValid
}

// Сброс всех изменений
function resetAll() {
  if (props.mode === 'create') {
    // Очищаем localStorage и перезагружаем начальные данные
    clearLocalStorage()
    loadFromLocalStorage() // Загрузит сохраненный draft или пустые данные
  }
  
  // Сбрасываем редакторы
  if (basicInfoEditorRef.value) {
    basicInfoEditorRef.value.resetSection()
  }
  if (statusEditorRef.value) {
    statusEditorRef.value.resetStatuses()
  }
}

// Сброс конкретного редактора
function onEditorReset(editorType) {
  console.log(`Сброшен редактор: ${editorType}`)
  saveToLocalStorage()
}

// Загрузка данных
function loadData() {
  if (props.mode === 'create') {
    // В режиме создания пробуем загрузить из LocalStorage
    loadFromLocalStorage()
    if (!basicInfo.value.name && (!statusesList.value || !statusesList.value.length)) {
      // Нет сохраненных данных - используем стандартные
      resetBasicData()
    }
  } else if (props.process) {
    basicInfo.value = {
      name: props.process.name || '',
      code: props.process.code || '',
      description: props.process.description || '',
      category: props.process.category || null,
      version: props.process.version || '',
      is_active: props.process.is_active !== undefined ? props.process.is_active : true
    }
    statusesList.value = props.process.statuses ? JSON.parse(JSON.stringify(props.process.statuses)) : []
  } else {
    resetBasicData()
  }
  
  // Сохраняем начальные данные для сброса
  initialBasicInfo.value = { ...basicInfo.value }
  initialStatuses.value = JSON.parse(JSON.stringify(statusesList.value))
  
  // Устанавливаем начальное состояние в редакторах
  if (basicInfoEditorRef.value) {
    basicInfoEditorRef.value.setInitialState()
  }
  if (statusEditorRef.value) {
    statusEditorRef.value.setInitialState()
  }
}

function resetBasicData() {
  basicInfo.value = {
    name: '',
    code: '',
    description: '',
    category: null,
    version: '',
    is_active: true
  }
  statusesList.value = []
}

// Сохранение
async function onSave() {
  if (saving.value || !isFormValid.value) return
  
  saving.value = true
  
  try {
    const saveData = {
      name: basicInfo.value.name,
      code: basicInfo.value.code,
      description: basicInfo.value.description,
      category_id: basicInfo.value.category?.id || null,
      version: basicInfo.value.version,
      is_active: basicInfo.value.is_active,
      statuses: statusesList.value.map(({ id, name, color, position, previousStatuses, nextStatuses, isConstant }) => ({
        id,
        name,
        color,
        position: position || null,
        previousStatuses: previousStatuses || [],
        nextStatuses: nextStatuses || [],
        is_constant: isConstant || false
      }))
    }
    
    if (props.mode !== 'create' && props.process?.id) {
      saveData.id = props.process.id
    }
    
    console.log('📤 Сохранение бизнес процесса:', saveData)
    emit('saved', saveData)
    
    const confirmed = await successModal.value.open({
      title: '',
      mainMessage: props.mode === 'create' ? 'Бизнес процесс успешно создан' : 'Бизнес процесс успешно обновлен',
      type: 'success',
    })
    
    if (confirmed) {
      // Очищаем localStorage при успешном создании
      if (props.mode === 'create') {
        clearLocalStorage()
      }
      isEditing.value = false
      activeTab.value = 'info'
      close()
    }
  } catch (err) {
    console.error('Ошибка сохранения:', err)
    await successModal.value.open({
      title: '',
      mainMessage: err?.message || 'Ошибка сохранения',
      type: 'notSuccess',
    })
  } finally {
    saving.value = false
  }
}

// Удаление
async function deleteProcess() {
  const confirmed = await deleteModal.value.open({
    title: 'Удаление бизнес процесса',
    mainMessage: 'Вы действительно хотите удалить бизнес процесс',
    secondaryMessage: basicInfo.value.name ? `"${basicInfo.value.name}"?` : '?'
  })
  
  if (confirmed) {
    saving.value = true
    try {
      emit('deleted', props.process?.id)
      const confirmed2 = await successModal.value.open({
        title: '',
        mainMessage: 'Бизнес процесс успешно удален',
        type: 'success',
      })
      if (confirmed2) {
        close()
      }
    } catch (err) {
      console.error('Ошибка удаления:', err)
      await successModal.value.open({
        title: '',
        mainMessage: 'Ошибка при удалении',
        type: 'notSuccess',
      })
    } finally {
      saving.value = false
    }
  }
}

// Редактирование
function enterEdit() {
  if (!canEdit.value) return
  isEditing.value = true
  activeTab.value = 'info'
  isBasicInfoValid.value = false
  isStatusesValid.value = false
}

function cancelEdit() {
  if (props.mode === 'create') {
    // При отмене в режиме создания очищаем localStorage
    clearLocalStorage()
    close()
  } else {
    loadData()
    isEditing.value = false
    activeTab.value = 'info'
    isBasicInfoValid.value = false
    isStatusesValid.value = false
  }
}

// Закрытие
function close() {
  visible.value = false
  isEditing.value = false
  activeTab.value = 'info'
  isBasicInfoValid.value = false
  isStatusesValid.value = false
}

// Вычисляемые свойства
const modalTitle = computed(() => {
  if (props.mode === 'create') return 'Создание бизнес процесса'
  if (isEditing.value) return 'Редактирование бизнес процесса'
  return props.process?.name || 'Бизнес процесс'
})

const canEdit = computed(() => {
  return props.mode === 'create' || props.mode === 'edit'
})

const canDelete = computed(() => {
  return props.mode !== 'create' && props.process?.id
})

// Отслеживание видимости
watch(() => props.modelValue, async (v) => {
  visible.value = v
  if (v) {
    loadData()
    if (props.mode === 'create') {
      isEditing.value = true
      activeTab.value = 'info'
    } else {
      isEditing.value = false
    }
  } else if (props.mode === 'create') {
    // При закрытии окна создания без сохранения оставляем draft в localStorage
    // Пользователь сможет продолжить позже
  }
})

watch(visible, (v) => emit('update:modelValue', v))

// При размонтировании компонента в режиме создания сохраняем прогресс
onBeforeUnmount(() => {
  if (props.mode === 'create' && isEditing.value && hasAnyChanges.value) {
    saveToLocalStorage()
  }
})
</script>

<style scoped>
/* Добавляем стили для кнопки сброса всего */
.reset-all-btn {
  background: #f59e0b;
  color: white;
  border: none;
  padding: 6px 14px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.reset-all-btn:hover {
  background: #d97706;
  transform: scale(1.02);
}

/* Остальные стили остаются как в предыдущей версии */
.bp-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
}

.bp-modal {
  width: 90%;
  max-width: 1400px;
  height: 86vh;
  max-height: 86vh;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 30px 80px rgba(3, 20, 50, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  background: #ffffff;
  position: sticky;
  top: 0;
  z-index: 15;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #1f2937;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tab-buttons {
  display: flex;
  gap: 4px;
  background: #f3f4f6;
  padding: 4px;
  border-radius: 10px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #374151;
  background: #e5e7eb;
}

.tab-btn.active {
  background: white;
  color: #178aee;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.save-btn {
  background: #3cc93a;
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.save-btn:hover:not(:disabled) {
  background: #34bb32;
  transform: scale(1.02);
}

.save-btn:disabled {
  background: #c4c6c8;
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.save-btn-active {
  background: #3cc93a;
  opacity: 1;
}

.close-btn {
  background: transparent;
  color: #6b7280;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  transform: scale(1.05);
}

.close-btn-icon:hover {
  color: #ef4444;
}

.bp-modal__body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
}

.view-mode {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-mode {
  height: 100%;
}

.editor-container {
  height: 100%;
  min-height: 500px;
}

.bp-modal__footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 10px 12px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  flex-shrink: 0;
}

.right-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn {
  padding: 6px 16px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid #d1d5db;
  background: white;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn:hover {
  transform: scale(1.02);
  background: #f3f4f6;
}

.btn.danger {
  background: #ef4444;
  color: white;
  border: none;
}

.btn.danger:hover {
  background: #dc2626;
}

@media (max-width: 1200px) {
  .bp-modal {
    width: calc(100% - 24px);
  }
}

@media (max-width: 768px) {
  .modal-header {
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .tab-buttons {
    order: 1;
    width: 100%;
    justify-content: center;
  }
  
  .header-right {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}
</style>