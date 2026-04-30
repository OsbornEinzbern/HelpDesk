<template>
  <div v-if="visible" class="classification-modal-backdrop" @keydown.esc="close" tabindex="-1" role="dialog" aria-modal="true">
    <div class="classification-modal" ref="modalRoot" role="document" :aria-label="modalTitle">
      <UIIcons ref="uiIcons" />

      <header class="modal-header">
        <h2 class="modal-title">{{ modalTitle }}</h2>

        <div class="header-right">
          <template v-if="isEditing">
            <button class="save-btn" @click="onSave" :disabled="saving" title="Сохранить изменения">
              <span>{{ mode === 'create' ? 'Создать классификацию' : 'Сохранить изменения' }}</span>
            </button>
          </template>

          <template v-else>
            <button type="button" class="btn" @click="enterEdit" v-if="canEdit">Редактировать</button>
          </template>

          <button class="close-btn" @click="close" title="Закрыть">
            <span>×</span>
          </button>
        </div>
      </header>

      <div class="classification-modal__body">
        <template v-if="!isEditing">
          <section class="classification-section">
            <h3 class="subheading">Карточка классификации</h3>

            <div class="view-grid">
              <UILabel v-model="localClassification.name" label="Название" :show-empty-indicator="true" />
              <UILabel :modelValue="localClassification.description || ''" label="Описание" :show-empty-indicator="true" />
            </div>
          </section>

          <section class="classification-section">
            <h3 class="subheading">Организации</h3>

            <div class="chips-list">
              <div
                v-for="org in selectedOrganizations"
                :key="getOrganizationKey(org)"
                class="organization-chip"
              >
                {{ getOrganizationLabel(org) }}
              </div>

              <div v-if="selectedOrganizations.length === 0" class="empty-hint">
                Организации не назначены
              </div>
            </div>
          </section>
        </template>

        <template v-else>
          <section class="classification-section">
            <h3 class="subheading">Карточка классификации</h3>

            <div class="edit-grid">
              <UIInput
                ref="nameInput"
                v-model="localClassification.name"
                label="Название"
                :required="true"
                :max-length="125"
                :min-length="1"
                placeholder="Введите название"
              />

              <UITextarea
                ref="descriptionInput"
                v-model="localClassification.description"
                label="Описание"
                :required="false"
                :max-length="300"
                :rows="4"
                :minHeight="'92px'"
                :maxHeight="'140px'"
                placeholder="Введите описание"
              />
            </div>
          </section>

          <section class="classification-section">
            <h3 class="subheading">Организации клиентов</h3>

            <div class="organizations-select">
              <UIInput
                v-model="organizationSearchQuery"
                label="Поиск организации клиента"
                placeholder="Начните вводить наименование..."
                :required="true"
                :max-length="125"
                @focus="handleOrganizationSearchFocus"
                @blur="handleOrganizationSearchBlur"
              />

              <div v-if="organizationSearchOpen" class="search-dropdown">
                <div v-if="organizationSearchLoading" class="search-dropdown__state">
                  Загрузка...
                </div>

                <div v-else-if="filteredOrganizations.length === 0" class="search-dropdown__state">
                  Ничего не найдено
                </div>

                <button
                  v-else
                  v-for="org in filteredOrganizations"
                  :key="getOrganizationKey(org)"
                  type="button"
                  class="search-dropdown__item"
                  @mousedown.prevent="selectOrganization(org)"
                >
                  <span class="search-dropdown__name">{{ getOrganizationLabel(org) }}</span>
                </button>
              </div>

              <div class="selected-organizations">
                <div
                  v-for="org in selectedOrganizations"
                  :key="getOrganizationKey(org)"
                  class="selected-chip"
                >
                  <span>{{ getOrganizationLabel(org) }}</span>
                  <button type="button" class="remove-chip-btn" @click="removeOrganization(getOrganizationId(org))">×</button>
                </div>

                <div v-if="selectedOrganizations.length === 0" class="empty-hint">
                  Добавьте хотя бы одну организацию клиента
                </div>
              </div>

              <div v-if="organizationsTouched && organizationsError" class="field-error">
                {{ organizationsError }}
              </div>
            </div>
          </section>

          <div class="classification-modal__footer">
            <div class="left-actions">
              <span v-if="serverError" class="server-error">{{ serverError }}</span>
            </div>

            <div class="right-actions">
              <button type="button" class="btn" @click="cancelEdit" :disabled="saving">
                Отменить изменения
              </button>
            </div>
          </div>
        </template>

        <div v-if="!isEditing && serverError" class="server-error bottom-error">{{ serverError }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import UIInput from '@/components/common/UI/UIInput.vue'
import UITextarea from '@/components/common/UI/UITextarea.vue'
import UILabel from '@/components/common/UI/UILabel.vue'
import { useClassificationsStore } from '@/stores/classifications.store'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'view' }, // 'view', 'edit', 'create'
  classification: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'saved', 'deleted'])

const classificationsStore = useClassificationsStore()

const uiIcons = ref()
const visible = ref(Boolean(props.modelValue))
const isEditing = ref(props.mode === 'create')
const saving = ref(false)
const serverError = ref(null)

const nameInput = ref(null)
const descriptionInput = ref(null)

const organizationSearchQuery = ref('')
const organizationSearchOpen = ref(false)
const organizationSearchLoading = ref(false)
const organizationSearchResults = ref([])
const selectedOrganizations = ref([])
const organizationsTouched = ref(false)
const organizationsError = ref('')
let searchTimer = null

const localClassification = reactive({
  id: null,
  name: '',
  description: '',
  organizations: [],
})

const initialSnapshot = ref('')

watch(() => props.modelValue, (v) => {
  visible.value = v
  if (v) openAndLoad()
  else resetState()
})

watch(visible, (v) => emit('update:modelValue', v))

watch(organizationSearchQuery, () => {
  if (!organizationSearchOpen.value) return

  if (searchTimer) {
    clearTimeout(searchTimer)
  }

  searchTimer = setTimeout(() => {
    loadOrganizationOptions()
  }, 300)
})

const modalTitle = computed(() => {
  if (props.mode === 'create') return 'Создание классификации'
  if (isEditing.value) return 'Редактирование классификации'
  return `Профиль классификации — ${localClassification.name || ''}`
})

const canEdit = computed(() => {
  return props.mode === 'create' || props.mode === 'edit'
})

function resetForm() {
  localClassification.id = null
  localClassification.name = ''
  localClassification.description = ''
  localClassification.organizations = []
  selectedOrganizations.value = []
  organizationSearchQuery.value = ''
  organizationSearchOpen.value = false
  organizationSearchLoading.value = false
  organizationSearchResults.value = []
  organizationsTouched.value = false
  organizationsError.value = ''
  initialSnapshot.value = ''
}

function getOrganizationId(org) {
  if (!org) return null
  if (typeof org === 'number' || typeof org === 'string') return Number(org)
  return Number(org.id ?? org.organization_id ?? org.value ?? null)
}

function getOrganizationLabel(org) {
  if (!org) return ''
  if (typeof org === 'string' || typeof org === 'number') return String(org)
  return org.name || org.organization_name || org.title || org.label || `#${getOrganizationId(org) || ''}`
}

function getOrganizationKey(org) {
  const id = getOrganizationId(org)
  return id ?? getOrganizationLabel(org)
}

function normalizeOrganizations(rawOrganizations) {
  if (!Array.isArray(rawOrganizations)) return []

  return rawOrganizations
    .map((item) => {
      if (item && typeof item === 'object') {
        return {
          id: getOrganizationId(item),
          name: getOrganizationLabel(item),
        }
      }

      return {
        id: getOrganizationId(item),
        name: String(item),
      }
    })
    .filter((item) => item.id !== null && item.id !== undefined)
}

function loadFromSource(src) {
  const cloned = src ? JSON.parse(JSON.stringify(src)) : null
  if (!cloned) {
    resetForm()
    return
  }

  localClassification.id = cloned.id ?? cloned.classification_id ?? null
  localClassification.name = cloned.name ?? ''
  localClassification.description = cloned.description ?? ''

  const organizationsSource = cloned.organizations || cloned.client_organizations || cloned.organization_list || []
  selectedOrganizations.value = normalizeOrganizations(organizationsSource)

  localClassification.organizations = selectedOrganizations.value.map((org) => org.id)
  initialSnapshot.value = JSON.stringify(buildPayload(true))
}

function openAndLoad() {
  serverError.value = null
  saving.value = false

  if (!props.classification || props.mode === 'create') {
    resetForm()
    isEditing.value = props.mode === 'create'
    nextTick(() => nameInput.value?.focus?.())
    return
  }

  loadFromSource(props.classification)
  isEditing.value = false
  nextTick(() => nameInput.value?.focus?.())
}

function resetState() {
  saving.value = false
  serverError.value = null
  resetForm()
}

function enterEdit() {
  if (!canEdit.value) return
  isEditing.value = true
  nextTick(() => clearAllErrors())
}

function cancelEdit() {
  isEditing.value = false
  if (props.mode === 'create') {
    close()
  } else {
    openAndLoad()
  }
}

function close() {
  visible.value = false
}

function clearAllErrors() {
  if (nameInput.value && typeof nameInput.value.clearError === 'function') {
    nameInput.value.clearError()
  }
  if (descriptionInput.value && typeof descriptionInput.value.clearError === 'function') {
    descriptionInput.value.clearError()
  }
  organizationsTouched.value = false
  organizationsError.value = ''
  serverError.value = null
}

function validateOrganizations(markTouched = false) {
  if (markTouched) organizationsTouched.value = true

  if (!Array.isArray(selectedOrganizations.value) || selectedOrganizations.value.length === 0) {
    organizationsError.value = 'Выберите хотя бы одну организацию клиента'
    return false
  }

  organizationsError.value = ''
  return true
}

function validateAll() {
  let isValid = true

  if (nameInput.value && typeof nameInput.value.validate === 'function') {
    const ok = nameInput.value.validate()
    if (!ok) isValid = false
  }

  if (descriptionInput.value && typeof descriptionInput.value.validate === 'function') {
    const ok = descriptionInput.value.validate()
    if (!ok) isValid = false
  }

  if (!validateOrganizations(true)) {
    isValid = false
  }

  return isValid
}

function buildPayload(includeId = false) {
  const payload = {
    name: (localClassification.name ?? '').trim(),
    description: (localClassification.description ?? '').trim(),
    organizations: Array.isArray(selectedOrganizations.value)
      ? selectedOrganizations.value.map((item) => item.id)
      : [],
  }

  if (includeId && localClassification.id) {
    payload.classification_id = localClassification.id
  }

  return payload
}

function applyServerErrors(fieldErrors) {
  const getFirst = (key) => {
    const value = fieldErrors?.[key]
    if (Array.isArray(value)) return value[0]
    if (typeof value === 'string') return value
    return ''
  }

  const nameError = getFirst('name')
  if (nameError && nameInput.value && typeof nameInput.value.setError === 'function') {
    nameInput.value.setError(nameError)
  }

  const descriptionError = getFirst('description')
  if (descriptionError && descriptionInput.value && typeof descriptionInput.value.setError === 'function') {
    descriptionInput.value.setError(descriptionError)
  }

  const organizationsError = getFirst('organizations')
  if (organizationsError) {
    organizationsTouched.value = true
    organizationsError.value = organizationsError
  }
}

async function loadOrganizationOptions() {
  const query = organizationSearchQuery.value?.trim() || ''

  if (!query) {
    organizationSearchResults.value = []
    return
  }

  organizationSearchLoading.value = true

  try {
    const response = await classificationsStore.loadClientOrganizations(query)
    const data = response?.data?.data || response?.data || []
    const normalized = normalizeOrganizations(data)

    const selectedIds = new Set(selectedOrganizations.value.map((item) => item.id))
    organizationSearchResults.value = normalized.filter((item) => !selectedIds.has(item.id))
  } catch (error) {
    console.error('Ошибка загрузки организаций клиентов:', error)
    organizationSearchResults.value = []
  } finally {
    organizationSearchLoading.value = false
  }
}

function handleOrganizationSearchFocus() {
  organizationSearchOpen.value = true
  if (organizationSearchQuery.value?.trim()) {
    loadOrganizationOptions()
  }
}

function handleOrganizationSearchBlur() {
  setTimeout(() => {
    organizationSearchOpen.value = false
    validateOrganizations(true)
  }, 150)
}

function selectOrganization(org) {
  const normalized = {
    id: getOrganizationId(org),
    name: getOrganizationLabel(org),
  }

  if (!normalized.id) return

  const exists = selectedOrganizations.value.some((item) => item.id === normalized.id)
  if (!exists) {
    selectedOrganizations.value = [...selectedOrganizations.value, normalized]
  }

  localClassification.organizations = selectedOrganizations.value.map((item) => item.id)
  organizationsTouched.value = true
  validateOrganizations(true)

  organizationSearchQuery.value = ''
  organizationSearchResults.value = []
  organizationSearchOpen.value = false
}

function removeOrganization(orgId) {
  selectedOrganizations.value = selectedOrganizations.value.filter((item) => item.id !== orgId)
  localClassification.organizations = selectedOrganizations.value.map((item) => item.id)
  organizationsTouched.value = true
  validateOrganizations(true)
}

async function onSave() {
  serverError.value = null

  if (!validateAll()) {
    return
  }

  const payload = buildPayload(props.mode === 'edit')

  if (props.mode === 'edit') {
    const snapshot = JSON.stringify(payload)
    if (snapshot === initialSnapshot.value) {
      close()
      return
    }
  }

  saving.value = true

  try {
    let response

    if (props.mode === 'create') {
      response = await classificationsStore.createClassification(payload)
    } else {
      response = await classificationsStore.updateClassification(payload)
    }

    const data = response?.data ?? response
    if (data?.validator_fails || data?.errors) {
      const fieldErrors = data?.errors || data?.validator_fails || {}
      applyServerErrors(fieldErrors)
      serverError.value = 'Исправьте ошибки в форме'
      return
    }

    initialSnapshot.value = JSON.stringify(payload)
    isEditing.value = false
    emit('saved', data)
    close()
  } catch (err) {
    console.error('Classification save error:', err)

    const responseData = err?.response?.data
    if (err?.response?.status === 422) {
      const fieldErrors = responseData?.errors || responseData?.validator_fails || {}
      applyServerErrors(fieldErrors)
      serverError.value = responseData?.message || 'Проверьте корректность заполнения полей'
      return
    }

    serverError.value = responseData?.message || err?.message || 'Ошибка сохранения'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.classification-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
}

.classification-modal {
  width: calc(min(90vw, 1100px));
  max-width: 1500px;
  max-height: 84vh;
  overflow-y: auto;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 30px 80px rgba(3, 20, 50, 0.35);
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
  transition: all 0.2s;
}

.save-btn:hover {
  background: #34bb32;
  transform: scale(1.03);
}

.save-btn:disabled {
  opacity: 0.7;
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
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  margin-left: 6px;
}

.close-btn:hover {
  transform: scale(1.1);
}

.classification-modal__body {
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.classification-section {
  border: 1px solid rgb(218, 218, 218);
  border-radius: 6px;
  background-color: #f7f7f7;
  padding: 10px;
}

.subheading {
  margin: 2px 0 10px;
  font-size: 14px;
  color: #374151;
}

.view-grid,
.edit-grid {
  display: grid;
  gap: 12px;
}

.view-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.edit-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.organizations-select {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-dropdown {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
  max-height: 220px;
  overflow-y: auto;
}

.search-dropdown__state {
  padding: 10px 12px;
  color: #6b7280;
  font-size: 13px;
}

.search-dropdown__item {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border: none;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
  border-top: 1px solid #f3f4f6;
}

.search-dropdown__item:hover {
  background: #f8fafc;
}

.search-dropdown__name {
  font-size: 13px;
  color: #111827;
}

.selected-organizations,
.chips-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 42px;
  padding: 8px 0 0;
}

.selected-chip,
.organization-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border-radius: 999px;
  background: #eaf2ff;
  color: #1f3b73;
  font-size: 12px;
  max-width: 100%;
  word-break: break-word;
}

.remove-chip-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  color: #1f3b73;
  font-size: 18px;
  line-height: 1;
  padding: 0;
}

.empty-hint {
  font-size: 13px;
  color: #6b7280;
  font-style: italic;
}

.field-error {
  color: #b00020;
  font-size: 12px;
  margin-top: 4px;
}

.server-error {
  color: #b00020;
  font-weight: 600;
}

.bottom-error {
  margin-top: 10px;
}

.classification-modal__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0 4px;
  gap: 8px;
}

.left-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.right-actions {
  margin-top: 10px;
  display: flex;
  gap: 16px;
  align-items: center;
}

.btn {
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.2s;
  font-size: 14px;
}

.btn:hover {
  transform: scale(1.05);
}

@media (max-width: 1200px) {
  .view-grid,
  .edit-grid {
    grid-template-columns: 1fr;
  }

  .classification-modal {
    width: calc(100% - 24px);
  }
}
</style>