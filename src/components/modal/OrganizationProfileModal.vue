<template>
  <div v-if="visible" class="org-modal-backdrop" @keydown.esc="close" tabindex="-1" role="dialog" aria-modal="true">
    <div class="org-modal" ref="modalRoot" role="document" :aria-label="modalTitle">
      <UIIcons ref="uiIcons" />

      <header class="modal-header">
        <h2 class="modal-title">{{ modalTitle }}</h2>

        <div class="header-right">
          <template v-if="isEditing">
            <button class="save-btn" @click="onSave" :disabled="saving" title="Сохранить изменения">
              <Icon :icon="uiIcons?.icons.save" width="24" height="24" />
              {{ mode === 'create' ? 'Создать организацию' : 'Сохранить изменения' }}
            </button>
          </template>

          <template v-else>
            <button type="button" class="btn" @click="enterEdit" v-if="canEdit">Редактировать</button>
          </template>

          <button class="close-btn" @click="close" title="Закрыть">
            <Icon :icon="uiIcons?.icons.close" class="close-btn-icon" width="36" height="36" />
          </button>
        </div>
      </header>

      <div class="org-modal__body">
        <!-- Режим просмотра -->
        <template v-if="!isEditing">
          <section class="org-section">
            <h3 class="subheading">Основная информация</h3>

            <div class="view-grid">
              <UILabel v-model="localOrg.name" label="Наименование организации" :show-empty-indicator="true" />
              <UILabel :modelValue="localOrg.description || ''" label="Описание" :show-empty-indicator="true" />
              <UILabel :modelValue="rolesDisplay" label="Роли" :show-empty-indicator="true" />
              <UILabel v-model="localOrg.phone_number" label="Телефон" :show-empty-indicator="true" />
            </div>
          </section>

          <section class="org-section">
            <h3 class="subheading">Адресные данные</h3>

            <div class="view-grid">
              <UILabel v-model="localOrg.address" label="Адрес" :show-empty-indicator="true" />
              <UILabel v-model="localOrg.index" label="Почтовый индекс" :show-empty-indicator="true" />
              <UILabel v-model="localOrg.building" label="Дом, строение" :show-empty-indicator="true" />
              <UILabel v-model="localOrg.office" label="Офис" :show-empty-indicator="true" />
            </div>
          </section>

          <div v-if="isMainOrganization" class="main-org-note">
            Основную организацию нельзя удалять и нельзя менять её роли.
          </div>
        </template>

        <!-- Режим редактирования -->
        <template v-else>
          <section class="org-section">
            <h3 class="subheading">Основная информация</h3>

            <div class="edit-grid">
              <UIInput
                ref="nameInput"
                v-model="localOrg.name"
                label="Наименование организации"
                :required="true"
                :max-length="50"
                placeholder="Введите наименование"
                :customClass="'mb-8'"
              />

              <UITextarea
                ref="descriptionInput"
                v-model="localOrg.description"
                label="Описание"
                :required="false"
                :max-length="125"
                :rows="3"
                :minHeight="'72px'"
                :maxHeight="'72px'"
                placeholder="Введите описание"
              />

              <div class="roles-group" :class="{ 'has-error': rolesTouched && rolesError }" @focusout="validateRoles(true)">
                <div class="roles-group__header">
                  <span class="ui-field-label">
                    Роли
                    <span class="required-asterisk">*</span>
                  </span>
                  <span v-if="rolesTouched && rolesError" class="input-error">{{ rolesError }}</span>
                </div>

                <div class="roles-list">
                  <label
                    v-for="role in roleOptions"
                    :key="role.value"
                    class="role-item"
                    :class="{ 'role-item--disabled': isMainOrganization }"
                  >
                    <input
                      type="checkbox"
                      :checked="localOrg.roles.includes(role.value)"
                      @change="toggleRole(role.value)"
                      :disabled="isMainOrganization"
                    />
                    <span>{{ role.label }}</span>
                  </label>
                </div>
              </div>

              <UIInput
                ref="phoneInput"
                v-model="localOrg.phone_number"
                label="Телефон"
                type="tel"
                :required="false"
                :max-length="20"
                placeholder="Введите телефон"
              />
            </div>
          </section>

          <section class="org-section">
            <h3 class="subheading">Адресные данные</h3>

            <div class="edit-grid">
              <UITextarea
                ref="addressInput"
                v-model="localOrg.address"
                label="Адрес"
                :required="false"
                :max-length="400"
                :rows="3"
                :minHeight="'72px'"
                :maxHeight="'120px'"
                placeholder="Введите адрес"
              />

              <div class="three-columns">
                <UIInput
                  ref="indexInput"
                  v-model="localOrg.index"
                  label="Почтовый индекс"
                  :required="false"
                  :max-length="20"
                  placeholder="Введите индекс"
                />
                <UIInput
                  ref="buildingInput"
                  v-model="localOrg.building"
                  label="Дом, строение"
                  :required="false"
                  :max-length="20"
                  placeholder="Введите дом/строение"
                />
                <UIInput
                  ref="officeInput"
                  v-model="localOrg.office"
                  label="Офис"
                  :required="false"
                  :max-length="20"
                  placeholder="Введите офис"
                />
              </div>
            </div>
          </section>

          <div v-if="isMainOrganization" class="main-org-note">
            Основную организацию нельзя удалять и нельзя менять её роли.
          </div>

          <div class="org-modal__footer">
            <div class="left-actions">
              <span v-if="serverError" class="server-error">{{ serverError }}</span>
            </div>

            <div class="right-actions">
              <button type="button" class="btn" @click="cancelEdit" :disabled="saving">Отменить изменения</button>
              <button
                type="button"
                class="btn danger"
                v-if="mode === 'edit' && !isMainOrganization"
                @click="onDelete"
                :disabled="saving"
              >
                Удалить
              </button>
            </div>
          </div>
        </template>

        <div v-if="!isEditing && serverError" class="server-error">{{ serverError }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import UIInput from '@/components/common/UI/UIInput.vue'
import UITextarea from '@/components/common/UI/UITextarea.vue'
import UILabel from '@/components/common/UI/UILabel.vue'
import { useOrganizationsStore } from '@/stores/organizations.store'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'view' }, // 'view', 'edit', 'create'
  organization: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'saved', 'deleted'])

const organizationsStore = useOrganizationsStore()

const uiIcons = ref()
const visible = ref(Boolean(props.modelValue))
const isEditing = ref(props.mode === 'create')
const saving = ref(false)
const serverError = ref(null)

const nameInput = ref(null)
const descriptionInput = ref(null)
const phoneInput = ref(null)
const addressInput = ref(null)
const indexInput = ref(null)
const buildingInput = ref(null)
const officeInput = ref(null)

const rolesTouched = ref(false)
const rolesError = ref('')

const roleOptions = [
  { value: 1, label: 'Основная организация' },
  { value: 2, label: 'Подрядчик' },
  { value: 3, label: 'Субподрядчик' },
  { value: 4, label: 'Заказчик' },
]

const localOrg = reactive({
  id: null,
  name: '',
  description: '',
  roles: [],
  phone_number: '',
  address: '',
  index: '',
  building: '',
  office: '',
  is_main: false,
  is_main_organization: false,
  type_org: null,
})

const initialSnapshot = ref('')

watch(() => props.modelValue, (v) => {
  visible.value = v
  if (v) openAndLoad()
  else resetState()
})

watch(visible, (v) => emit('update:modelValue', v))

const modalTitle = computed(() => {
  if (props.mode === 'create') return 'Создание организации'
  if (isEditing.value) return 'Редактирование организации'
  return `Профиль организации — ${localOrg.name || ''}`
})

const canEdit = computed(() => props.mode === 'create' || props.mode === 'edit')

const isMainOrganization = computed(() => {
  return Boolean(
    localOrg.is_main ||
    localOrg.is_main_organization ||
    localOrg.type_org === 3
  )
})

const rolesDisplay = computed(() => {
  if (!Array.isArray(localOrg.roles) || !localOrg.roles.length) return ''
  return localOrg.roles
    .map((roleId) => roleOptions.find((r) => r.value === Number(roleId))?.label)
    .filter(Boolean)
    .join(', ')
})

function resetForm() {
  localOrg.id = null
  localOrg.name = ''
  localOrg.description = ''
  localOrg.roles = []
  localOrg.phone_number = ''
  localOrg.address = ''
  localOrg.index = ''
  localOrg.building = ''
  localOrg.office = ''
  localOrg.is_main = false
  localOrg.is_main_organization = false
  localOrg.type_org = null
  initialSnapshot.value = ''
  rolesTouched.value = false
  rolesError.value = ''
}

function normalizeRoles(src) {
  const raw = src?.roles ?? src?.role_ids ?? src?.roleId ?? src?.role_id ?? []
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (item && typeof item === 'object') {
        return Number(item.id ?? item.value ?? item.role_id ?? item.roleId)
      }
      return Number(item)
    }).filter(Boolean)
  }

  if (raw && typeof raw === 'object') {
    const value = Number(raw.id ?? raw.value ?? raw.role_id ?? raw.roleId)
    return value ? [value] : []
  }

  if (typeof raw === 'number' || typeof raw === 'string') {
    const value = Number(raw)
    return value ? [value] : []
  }

  return []
}

function normalizePhone(value) {
  return (value ?? '').toString().trim()
}

function loadFromSource(src) {
  const cloned = src ? JSON.parse(JSON.stringify(src)) : null
  if (!cloned) {
    resetForm()
    return
  }

  localOrg.id = cloned.id ?? cloned.organization_id ?? null
  localOrg.name = cloned.name ?? ''
  localOrg.description = cloned.description ?? ''
  localOrg.roles = normalizeRoles(cloned)
  localOrg.phone_number = normalizePhone(cloned.phone_number?.phone_number ?? cloned.phone_number)
  localOrg.address = cloned.address ?? ''
  localOrg.index = cloned.index ?? ''
  localOrg.building = cloned.building ?? ''
  localOrg.office = cloned.office ?? ''
  localOrg.is_main = Boolean(cloned.is_main)
  localOrg.is_main_organization = Boolean(cloned.is_main_organization)
  localOrg.type_org = cloned.type_org ?? null

  initialSnapshot.value = JSON.stringify(buildPayload(true))
}

function openAndLoad() {
  serverError.value = null
  saving.value = false

  if (!props.organization || props.mode === 'create') {
    resetForm()
    isEditing.value = props.mode === 'create'
    nextTick(() => nameInput.value?.focus?.())
    return
  }

  loadFromSource(props.organization)
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
  ;[nameInput, descriptionInput, phoneInput, addressInput, indexInput, buildingInput, officeInput].forEach((input) => {
    if (input.value && typeof input.value.clearError === 'function') {
      input.value.clearError()
    }
  })
  rolesTouched.value = false
  rolesError.value = ''
  serverError.value = null
}

function validateRoles(markTouched = false) {
  if (markTouched) rolesTouched.value = true

  if (isMainOrganization.value) {
    rolesError.value = ''
    return true
  }

  if (!Array.isArray(localOrg.roles) || localOrg.roles.length === 0) {
    rolesError.value = 'Выберите хотя бы одну роль'
    return false
  }

  rolesError.value = ''
  return true
}

function validateAll() {
  const inputs = [
    nameInput,
    descriptionInput,
    phoneInput,
    addressInput,
    indexInput,
    buildingInput,
    officeInput,
  ]

  let isValid = true

  for (const input of inputs) {
    if (input.value && typeof input.value.validate === 'function') {
      const ok = input.value.validate()
      if (!ok) isValid = false
    }
  }

  if (!validateRoles(true)) {
    isValid = false
  }

  return isValid
}

function buildPayload(includeId = false) {
  const payload = {
    name: (localOrg.name ?? '').trim(),
    description: (localOrg.description ?? '').trim(),
    roles: Array.isArray(localOrg.roles) ? [...localOrg.roles] : [],
    phone_number: '',
    address: (localOrg.address ?? '').trim(),
    index: (localOrg.index ?? '').trim(),
    building: (localOrg.building ?? '').trim(),
    office: (localOrg.office ?? '').trim(),
  }

  const digits = normalizePhone(localOrg.phone_number).replace(/\D/g, '')
  if (digits) {
    payload.phone_number = `+${digits}`
  }

  if (includeId && localOrg.id) {
    payload.organization_id = localOrg.id
  }

  return payload
}

function payloadEquals(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function applyServerErrors(fieldErrors) {
  const getFirst = (key) => {
    const value = fieldErrors?.[key]
    if (Array.isArray(value)) return value[0]
    if (typeof value === 'string') return value
    return ''
  }

  const mapping = [
    ['name', nameInput],
    ['description', descriptionInput],
    ['phone_number', phoneInput],
    ['address', addressInput],
    ['index', indexInput],
    ['building', buildingInput],
    ['office', officeInput],
  ]

  mapping.forEach(([key, inputRef]) => {
    const message = getFirst(key)
    if (message && inputRef.value && typeof inputRef.value.setError === 'function') {
      inputRef.value.setError(message)
    }
  })

  const rolesMessage = getFirst('roles')
  if (rolesMessage) {
    rolesTouched.value = true
    rolesError.value = rolesMessage
  }
}

function toggleRole(roleId) {
  if (isMainOrganization.value) return

  const id = Number(roleId)
  const exists = localOrg.roles.includes(id)

  if (exists) {
    localOrg.roles = localOrg.roles.filter((r) => r !== id)
  } else {
    localOrg.roles = [...localOrg.roles, id]
  }

  validateRoles(true)
}

async function onSave() {
  serverError.value = null

  if (!validateAll()) {
    return
  }

  const payload = buildPayload(props.mode === 'edit')
  const snapshot = JSON.stringify(payload)

  if (props.mode === 'edit' && snapshot === initialSnapshot.value) {
    close()
    return
  }

  saving.value = true

  try {
    let response

    if (props.mode === 'create') {
      response = await organizationsStore.createOrganization(payload)
    } else {
      response = await organizationsStore.updateOrganization(payload)
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
    console.error('Organization save error:', err)

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

async function onDelete() {
  if (isMainOrganization.value) {
    serverError.value = 'Основную организацию удалять нельзя'
    return
  }

  if (!localOrg.id) return
  if (!confirm('Удалить организацию? Это действие необратимо.')) return

  saving.value = true
  serverError.value = null

  try {
    const response = await organizationsStore.deleteOrganizations([localOrg.id])
    const data = response?.data ?? response

    if (data?.validator_fails || data?.errors) {
      serverError.value = data?.message || 'Ошибка удаления'
      return
    }

    emit('deleted', localOrg.id)
    close()
  } catch (err) {
    console.error('Organization delete error:', err)
    serverError.value = err?.response?.data?.message || err?.message || 'Ошибка удаления'
  } finally {
    saving.value = false
  }
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
  background: rgba(0, 0, 0, 0.45);
}

.org-modal {
  width: calc(min(90vw, 1200px));
  max-width: 1600px;
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
  display: flex;
  align-items: center;
  gap: 6px;
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

.org-section {
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

.three-columns {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.roles-group {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.roles-group.has-error .roles-list {
  border-color: #b00020;
  background-color: #fff5f5;
}

.roles-group__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ui-field-label {
  font-size: 12px;
  color: #8c8c8c;
  font-weight: 500;
}

.roles-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
  padding: 10px;
  border: 1px solid #c5c5c5;
  border-radius: 6px;
  background: #fff;
}

.role-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #1f2937;
  cursor: pointer;
  user-select: none;
}

.role-item--disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.required-asterisk {
  color: #b00020;
  margin-left: 2px;
}

.input-error {
  font-size: 11px;
  color: #b00020;
  padding-left: 4px;
  margin-top: 4px;
  display: inline-block;
}

.server-error {
  color: #b00020;
  margin-top: 10px;
  font-weight: 600;
}

.main-org-note {
  margin-top: 8px;
  padding: 8px 10px;
  border: 1px solid #d7c57a;
  background: #fff8db;
  border-radius: 6px;
  color: #7b5f00;
  font-size: 13px;
}

.org-modal__footer {
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

.btn.danger {
  background: #ef4444;
  color: #fff;
  border: none;
}

@media (max-width: 1200px) {
  .view-grid,
  .edit-grid {
    grid-template-columns: 1fr;
  }

  .roles-list {
    grid-template-columns: 1fr;
  }

  .three-columns {
    grid-template-columns: 1fr;
  }

  .org-modal {
    width: calc(100% - 24px);
  }
}
</style>