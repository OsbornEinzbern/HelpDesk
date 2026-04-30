<template>
  <div class="basic-info-editor" :class="{ 'view-mode': readonly }">
    <div class="org-grid">
    <section class="info-section">
      <div class="section-header">
        <h3 class="subheading">Основная информация</h3>
      </div>
      <div class="two-columns">
        <div class="form-row">
          <UIInput
            v-if="!readonly"
            ref="nameField"
            v-model="formData.name"
            label="Название бизнес процесса"
            placeholder="Введите название"
            :required="true"
            :maxLength="60"
          />
          <UILabel v-else v-model="formData.name" label="Название бизнес процесса" :show-empty-indicator="true" />
        </div>
      </div>
      <div class="form-row">
        <UITextarea 
          v-if="!readonly"
          v-model="formData.description"
          placeholder="Описание отсутствует"
          label="Описание"
          :maxLength="300"
          :showCharCount="true"
          :rows="3"
          :minHeight="'45px'"
          :maxHeight="'90px'"
        />
        <UITextarea 
          v-else
          :modelValue="formData.description"
          placeholder="Описание отсутствует"
          label="Описание"
          :maxLength="300"
          :rows="3"
          :readonly="true"
        />
      </div>
    </section>

    <section class="info-section">
      <h3 class="subheading">Настройки процесса</h3>
      <div class="two-columns">
        
      </div>
    </section>
    </div>
    <button 
          v-if="!readonly && hasChanges" 
          class="reset-section-btn" 
          @click="resetSection" 
          title="Сбросить изменения в этом разделе"
        >
          <Icon :icon="uiIcons?.icons.reload" width="16" height="16" />
          Сбросить
        </button>
  </div>
  <UIIcons ref="uiIcons" />
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import UIInput from '@/components/common/UI/UIInput.vue'
import UILabel from '@/components/common/UI/UILabel.vue'
import UITextarea from '@/components/common/UI/UITextarea.vue'
import UIComboBox from '@/components/common/UI/UIComboBox.vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      name: '',
      code: '',
      description: '',
      category: null,
      version: '',
      is_active: true
    })
  },
  categoryOptions: {
    type: Array,
    default: () => []
  },
  readonly: {
    type: Boolean,
    default: false
  },
  initialData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'validity-change', 'reset'])

const uiIcons = ref()
const nameField = ref(null)
const categoryField = ref(null)

const formData = reactive({
  name: '',
  code: '',
  description: '',
  category: null,
  version: '',
  is_active: true
})

// Храним начальное состояние для сброса
let initialFormState = null

// Синхронизация с props
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    const newData = {
      name: newVal.name || '',
      code: newVal.code || '',
      description: newVal.description || '',
      category: newVal.category || null,
      version: newVal.version || '',
      is_active: newVal.is_active !== undefined ? newVal.is_active : true
    }
    Object.assign(formData, newData)
    
    // Сохраняем начальное состояние, если его еще нет
    if (!initialFormState && props.initialData) {
      initialFormState = { ...newData }
    }
  }
}, { immediate: true, deep: true })

// Отслеживание изменений формы (только если не readonly)
watch(formData, (newVal) => {
  if (!props.readonly) {
    emit('update:modelValue', { ...newVal })
    validate()
  }
}, { deep: true })

// Проверка наличия изменений
const hasChanges = computed(() => {
  if (!initialFormState) return false
  return JSON.stringify(formData) !== JSON.stringify(initialFormState)
})

// Сброс раздела
function resetSection() {
  if (initialFormState) {
    Object.assign(formData, { ...initialFormState })
    emit('reset', 'basic-info')
  }
}

// Валидация (только для режима редактирования)
const validationErrors = ref([])

function validate() {
  if (props.readonly) {
    validationErrors.value = []
    return true
  }
  
  const errors = []
  
  if (!formData.name || !formData.name.trim()) {
    errors.push('Название бизнес процесса обязательно')
  } else if (formData.name.length > 50) {
    errors.push('Название не должно превышать 50 символов')
  }
  
  if (formData.code && formData.code.length > 30) {
    errors.push('Код процесса не должен превышать 30 символов')
  }
  
  if (formData.version && formData.version.length > 20) {
    errors.push('Версия не должна превышать 20 символов')
  }
  
  validationErrors.value = errors
  const isValid = errors.length === 0 && !!formData.name?.trim()
  emit('validity-change', isValid)
  return isValid
}

// Геттер валидности для родителя
const isValid = computed(() => {
  if (props.readonly) return true
  return validationErrors.value.length === 0 && !!formData.name?.trim()
})

function setInitialState() {
  initialFormState = { ...formData }
}

defineExpose({
  validate,
  isValid,
  hasChanges,
  resetSection,
  setInitialState,
  getData: () => ({ ...formData }),
  setData: (data) => {
    if (data) {
      Object.assign(formData, data)
      initialFormState = { ...formData }
    }
  }
})
</script>

<style scoped>
.basic-info-editor {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.basic-info-editor.view-mode {
  gap: 0;
}

.org-grid {
  display: grid;
  grid-template-columns: 5fr 5fr;
  gap: 12px;
  min-height: calc(30vh);
}

.info-section {
  border: 1px solid rgb(218, 218, 218);
  border-radius: 8px;
  background-color: #f8f9fa;
  padding: 16px;
}

.view-mode .info-section {
  background-color: #ffffff;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.subheading {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #374151;
  padding-bottom: 0;
}

.reset-section-btn { 
  max-width: 10%;
  padding: 4px 10px; 
  border-radius: 6px; 
  cursor: pointer; 
  border: 1px solid rgba(0,0,0,0.08);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.reset-section-btn:hover {
  transform: scale(1.03);
}

.two-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-row :deep(.ui-input-field),
.form-row :deep(.ui-combobox-input),
.form-row :deep(.ui-textarea) {
  width: 100%;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.hint {
  font-size: 11px;
  color: #6c757d;
  margin-top: 2px;
  margin-left: 24px;
}

.validation-errors {
  margin-top: 12px;
  padding: 10px;
  background: #fee2e2;
  border-radius: 6px;
  border-left: 3px solid #ef4444;
}

.error-item {
  font-size: 12px;
  color: #b91c1c;
  margin: 4px 0;
}

@media (max-width: 640px) {
  .two-columns {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>