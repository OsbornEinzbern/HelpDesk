<template>
  <div class="ui-combobox-wrapper" :class="[customClass, { 'required-field': required }]">
    <span class="ui-combobox-label">
      {{ label }}
      <span v-if="required" class="required-asterisk">*</span>
      <span v-if="showError" class="combobox-error">{{ errorMessage }}</span>
    </span>
    
    <div class="combobox-container" :class="{ 'has-error': showError }">
      <input
        ref="inputRef"
        :value="searchValue"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :maxlength="maxLength"
        class="ui-combobox-input"
      />
    </div>
    <Teleport to="body">
      <div 
        v-if="showDropdown && !isSearching" 
        class="combobox-dropdown teleported-dropdown"
        :style="dropdownStyle"
        ref="dropdownRef"
        @scroll="handleDropdownScroll"
        @mousedown.prevent
      >
        <div
          v-for="item in allOptions"
          :key="getOptionValue(item)"
          class="combobox-option"
          :class="{ 
            'combobox-option-checked': multiple && isItemChecked(item)
          }"
        >
          <span v-if="multiple" class="checkbox-indicator" @click.stop="toggleSelection(item)">
            <Icon v-if="isItemChecked(item)" :icon="uiIcons?.icons.checkboxChecked" width="16" height="16" />
            <Icon v-else :icon="uiIcons?.icons.checkboxUnchecked" width="16" height="16" />
          </span>
          <span v-if="!multiple" @click="toggleSelection(item)" class="option-label">{{ getOptionLabel(item) }}</span>
          <span v-else class="option-label" @click.stop="toggleSelection(item)">{{ getOptionLabel(item) }}</span>
        </div>
        
        <div v-if="loadingNextPage" class="combobox-loading-more">
          Загрузка...
        </div>
      </div>
      
      <div 
        v-if="showDropdown && allOptions.length === 0 && !isSearching" 
        class="combobox-dropdown combobox-no-results"
        :style="dropdownStyle"
      >
        <div class="combobox-no-results-text">
          Ничего не найдено
        </div>
      </div>
      
      <div 
        v-if="showDropdown && isSearching" 
        class="combobox-dropdown combobox-loading"
        :style="dropdownStyle"
      >
        <div class="combobox-loading-text">
          Поиск...
        </div>
      </div>
    </Teleport>
    
    <!-- Выпадающий список 
    <div 
      v-if="showDropdown && !isSearching" 
      class="combobox-dropdown"
      :style="{ maxHeight: dropdownMaxHeight }"
      ref="dropdownRef"
      @scroll="handleDropdownScroll"
      @mousedown.prevent
    >
      <div
        v-for="item in allOptions"
        :key="getOptionValue(item)"
        class="combobox-option"
        :class="{ 
          'combobox-option-checked': multiple && isItemChecked(item)
        }"
      >
        <span v-if="multiple" class="checkbox-indicator" @click.stop="toggleSelection(item)">
          <Icon v-if="isItemChecked(item)" :icon="uiIcons?.icons.checkboxChecked" width="16" height="16" />
          <Icon v-else :icon="uiIcons?.icons.checkboxUnchecked" width="16" height="16" />
        </span>
        <span v-if="!multiple" @click="toggleSelection(item)" class="option-label">{{ getOptionLabel(item) }}</span>
        <span v-else class="option-label" @click.stop="toggleSelection(item)">{{ getOptionLabel(item) }}</span>
      </div>
      
      <div v-if="loadingNextPage" class="combobox-loading-more">
        Загрузка...
      </div>
    </div>
    
    <div 
      v-if="showDropdown && allOptions.length === 0 && !isSearching" 
      class="combobox-dropdown combobox-no-results"
    >
      <div class="combobox-no-results-text">
        Ничего не найдено
      </div>
    </div>
    
    <div 
      v-if="showDropdown && isSearching" 
      class="combobox-dropdown combobox-loading"
    >
      <div class="combobox-loading-text">
        Поиск...
      </div>
    </div>-->
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'

const uiIcons = ref()

const props = defineProps({
  modelValue: [String, Number, Object, Array],
  options: {
    type: Array,
    default: () => []
  },
  maxLength: {  
    type: [Number, String],
    default: null
  },
  placeholder: {
    type: String,
    default: 'Выберите или введите...'
  },
  label: {
    type: String,
    default: ''
  },
  optionLabel: {
    type: String,
    default: 'label'
  },
  optionValue: {
    type: String,
    default: 'id'
  },
  required: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  dropdownMaxHeight: {
    type: String,
    default: '190px'
  },
  customClass: String,
  rules: {
    type: Array,
    default: () => []
  },
  requiredMessage: {
    type: String,
    default: 'Обязательное поле'
  },
  validateOnBlur: {
    type: Boolean,
    default: true
  },
  returnObject: {
    type: Boolean,
    default: true
  },
  searchDebounce: {
    type: Number,
    default: 20
  },
  loadOptions: {
    type: Function,
    default: null
  },
  multiple: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'blur', 'valid', 'error'])

const inputRef = ref(null)
const dropdownRef = ref(null)
const searchValue = ref('')
const showDropdown = ref(false)
const isTouched = ref(false)
const internalError = ref('')
const isSearching = ref(false)
const searchTimeout = ref(null)
const localOptions = ref([])
const loadingNextPage = ref(false)
const pagination = ref({
  currentPage: 1,
  lastPage: 1,
  nextPageUrl: null,
  prevPageUrl: null,
  hasMorePages: false
})
const dropdownStyle = ref({})

const updateDropdownPosition = () => {
  if (!inputRef.value) return
  
  const rect = inputRef.value.getBoundingClientRect()
  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + window.scrollY}px`,
    left: `${rect.left + window.scrollX}px`,
    width: `${rect.width}px`,
    maxHeight: props.dropdownMaxHeight,
    zIndex: 9999
  }
}

// Выбранные элементы для множественного режима
const selectedItems = computed(() => {
  if (!props.multiple) return []
  const value = props.modelValue
  if (!value) return []
  if (Array.isArray(value)) return value
  return []
})

const allOptions = computed(() => {
  if (localOptions.value.length > 0) {
    return localOptions.value
  }
  return props.options
})

const validate = () => {
  const value = props.modelValue
  
  if (props.required) {
    if (props.multiple) {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        return props.requiredMessage
      }
    } else {
      if (value === null || value === undefined || value === '') {
        return props.requiredMessage
      }
      if (typeof value === 'string' && !value.trim()) {
        return props.requiredMessage
      }
    }
  }
  
  for (const rule of props.rules) {
    if (typeof rule === 'function') {
      const result = rule(value)
      if (typeof result === 'string') {
        return result
      }
    } else if (rule && rule.validator && rule.message) {
      if (!rule.validator(value)) {
        return rule.message
      }
    }
  }
  
  return ''
}

watch(() => props.modelValue, () => {
  if (isTouched.value) {
    internalError.value = validate()
    emit('valid', !internalError.value)
    emit('error', internalError.value)
  }
}, { deep: true })

const showError = computed(() => {
  return (isTouched.value || !props.validateOnBlur) && internalError.value
})

const errorMessage = computed(() => internalError.value)

const getOptionValue = (option) => {
  return typeof option === 'object' ? option[props.optionValue] : option
}

const getOptionLabel = (option) => {
  return typeof option === 'object' ? option[props.optionLabel] : String(option)
}

const isOptionSelected = (option) => {
  if (props.multiple) {
    return selectedItems.value.some(item => getOptionValue(item) === getOptionValue(option))
  }
  const optionValue = getOptionValue(option)
  const currentValue = props.modelValue
  if (typeof currentValue === 'object') {
    return currentValue && getOptionValue(currentValue) === optionValue
  }
  return currentValue === optionValue
}

const isItemChecked = (option) => {
  return isOptionSelected(option)
}

const toggleSelection = (item) => {
  if (!props.multiple) {
    // Одиночный режим - закрываем список
    const optionLabel = getOptionLabel(item)
    searchValue.value = optionLabel
    emit('update:modelValue', props.returnObject ? item : optionLabel)
    showDropdown.value = false
  } else {
    // Множественный режим - НЕ закрываем список
    const currentSelection = [...selectedItems.value]
    const exists = currentSelection.some(i => getOptionValue(i) === getOptionValue(item))
    
    if (exists) {
      const newSelection = currentSelection.filter(i => getOptionValue(i) !== getOptionValue(item))
      emit('update:modelValue', newSelection)
    } else {
      currentSelection.push(item)
      emit('update:modelValue', currentSelection)
    }
    
    // Очищаем поиск после выбора для удобства
    searchValue.value = ''
    // Фокусируемся на инпуте, чтобы можно было продолжать ввод
    nextTick(() => {
      inputRef.value?.focus()
    })
    // Список НЕ закрываем
  }
  
  isTouched.value = true
  internalError.value = validate()
  emit('valid', !internalError.value)
  emit('error', internalError.value)
}

const loadOptionsFromServer = async (searchTerm, url = null, append = false) => {
  if (!props.loadOptions) return
  
  if (!append) {
    isSearching.value = true
    localOptions.value = []
  } else {
    loadingNextPage.value = true
  }
  
  try {
    const responseData = await props.loadOptions(searchTerm, url)
    console.log("Load in combobox: ", responseData)
    
    pagination.value = {
      currentPage: responseData.current_page,
      lastPage: responseData.last_page,
      nextPageUrl: responseData.next_page_url,
      prevPageUrl: responseData.prev_page_url,
      hasMorePages: responseData.current_page < responseData.last_page
    }
    
    const items = responseData.data || []
    
    if (append) {
      localOptions.value = [...localOptions.value, ...items]
    } else {
      localOptions.value = items
    }
  } catch (error) {
    console.error('Ошибка загрузки опций:', error)
    if (!append) {
      localOptions.value = []
    }
  } finally {
    if (!append) {
      isSearching.value = false
    } else {
      loadingNextPage.value = false
    }
  }
}

const loadNextPageFromUrl = async () => {
  if (!pagination.value.nextPageUrl || loadingNextPage.value || isSearching.value) {
    return
  }
  await loadOptionsFromServer(null, pagination.value.nextPageUrl, true)
}

const debouncedSearch = (searchTerm) => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  
  if (props.loadOptions) {
    searchTimeout.value = setTimeout(async () => {
      await loadOptionsFromServer(searchTerm, null, false)
      searchTimeout.value = null
    }, props.searchDebounce)
  } else {
    isSearching.value = false
    emit('search', searchTerm)
  }
}

const handleDropdownScroll = async (event) => {
  if (!pagination.value.nextPageUrl || loadingNextPage.value || isSearching.value) {
    return
  }
  
  const { scrollTop, scrollHeight, clientHeight } = event.target
  const scrollBottom = scrollHeight - scrollTop - clientHeight
  
  if (scrollBottom < 50) {
    await loadNextPageFromUrl()
  }
}

const handleFocus = () => {
  if (props.disabled) return
  
  showDropdown.value = true
  isSearching.value = true
  
  // Обновляем позицию перед открытием
  nextTick(() => {
    updateDropdownPosition()
    debouncedSearch('', true)
  })
  
  emit('focus')
}

const handleWindowScroll = () => {
  if (showDropdown.value) {
    updateDropdownPosition()
  }
}

const handleInput = (event) => {
  const inputValue = event.target.value
  searchValue.value = inputValue
  showDropdown.value = true
  debouncedSearch(inputValue)
  
  if (!props.multiple) {
    emit('update:modelValue', inputValue)
  }
}

const handleBlur = () => {
  // Задерживаем закрытие, чтобы дать время на клик по опции
  setTimeout(() => {
    // Проверяем, не наведен ли курсор на выпадающий список
    const dropdown = dropdownRef.value
    if (dropdown && dropdown.contains(document.activeElement)) {
      return
    }
    
    showDropdown.value = false
    isTouched.value = true
    
    if (!props.multiple && searchValue.value && allOptions.value.length > 0) {
      const matchingOption = allOptions.value.find(option => 
        getOptionLabel(option).toLowerCase() === searchValue.value.toLowerCase()
      )
      
      if (!matchingOption) {
        searchValue.value = ''
        emit('update:modelValue', null)
      }
    }
    
    internalError.value = validate()
    emit('blur')
    emit('valid', !internalError.value)
    emit('error', internalError.value)
  }, 150)
  
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
    searchTimeout.value = null
    isSearching.value = false
  }
}

const validateField = () => {
  isTouched.value = true
  internalError.value = validate()
  emit('valid', !internalError.value)
  emit('error', internalError.value)
  return !internalError.value
}

const clearError = () => {
  internalError.value = ''
  isTouched.value = false
  emit('error', '')
}

const setError = (message) => {
  isTouched.value = true
  internalError.value = message
  emit('error', message)
}

watch(() => props.modelValue, (newValue) => {
  if (!props.multiple) {
    if (newValue && typeof newValue === 'object') {
      searchValue.value = getOptionLabel(newValue)
    } else if (newValue && typeof newValue === 'string') {
      searchValue.value = newValue
    } else if (newValue === null || newValue === undefined || newValue === '') {
      searchValue.value = ''
    }
  }
}, { immediate: true, deep: true })

const focus = () => {
  if (inputRef.value) {
    inputRef.value.focus()
  }
}

const clear = () => {
  searchValue.value = ''
  emit('update:modelValue', props.multiple ? [] : null)
  clearError()
  localOptions.value = []
  
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
    searchTimeout.value = null
    isSearching.value = false
  }
}

const clearLocalOptions = () => {
  localOptions.value = []
}

const reloadOptions = async (searchTerm = '') => {
  if (props.loadOptions) {
    await loadOptionsFromServer(searchTerm)
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleWindowScroll, true)
  window.addEventListener('resize', handleWindowScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleWindowScroll, true)
  window.removeEventListener('resize', handleWindowScroll)
})

defineExpose({
  focus,
  clear,
  validate: validateField,
  clearError,
  setError,
  reloadOptions,
  clearLocalOptions,
  isValid: computed(() => !internalError.value),
  modelValue: props.modelValue
})
</script>

<style scoped>
.ui-combobox-wrapper {
  position: relative;
  width: 100%;
}

.combobox-container {
  position: relative;
  width: 100%;
}

.combobox-container.has-error .ui-combobox-input {
  border-color: #b00020;
  background-color: #fff5f5;
}

.ui-combobox-input {
  width: 100%;
  padding-top: 2px;
  padding-bottom: 2px;
  padding-left: 6px;
  padding-right: 3px;
  border: 1px solid #c5c5c5;
  border-radius: 6px;
  font-size: 14px;
  color: #141414;
  background-color: white;
  transition: all 0.2s ease;
  min-height: 28px;
  box-sizing: border-box;
}

.ui-combobox-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.combobox-container.has-error .ui-combobox-input:focus {
  border-color: #b00020;
  box-shadow: 0 0 0 2px rgba(176, 0, 32, 0.1);
}

.ui-combobox-input::placeholder {
  color: #9a9a9a;
  font-style: italic;
}

.ui-combobox-label {
  font-size: 12px;
  color: #8c8c8c;
  font-weight: 500;
}

.required-asterisk {
  color: #b00020;
  margin-left: 2px;
}

.teleported-dropdown {
  position: fixed !important;
  top: 0;
  left: 0;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  scrollbar-width: thin;
  z-index: 9999;
}

.combobox-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 9;
  margin-top: 2px;
  overflow-y: auto;
  scrollbar-width: thin;
  max-height: 190px;
}

.combobox-option {
  padding: 8px 12px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  cursor: pointer;
  flex-shrink: 0;
}

.option-label {
  flex: 1;
  cursor: pointer;
}

.combobox-option:hover {
  background-color: #e3ecff;
}

/* Стиль для выбранного элемента в выпадающем списке */
.combobox-option-checked {
  background-color: #eff6ff;
  color: #1d4ed8;
}

.combobox-option-checked .option-label {
  color: #1d4ed8;
  font-weight: 500;
}

.combobox-no-results {
  padding: 12px;
  color: #6b7280;
  font-size: 14px;
  text-align: center;
}

.combobox-no-results-text {
  font-style: italic;
}

.combobox-error {
  font-size: 11px;
  color: #b00020;
  margin-top: 4px;
  padding-left: 4px;
}

.ui-combobox-input:disabled {
  background-color: #ebebeb;
  opacity: 0.7;
}

.combobox-loading {
  padding: 12px;
  color: #6b7280;
  font-size: 14px;
  text-align: center;
}

.combobox-loading-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.combobox-loading-text::after {
  content: '';
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top-color: #2171f3;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.combobox-loading-more {
  padding: 8px;
  text-align: center;
  font-size: 12px;
  color: #888;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>