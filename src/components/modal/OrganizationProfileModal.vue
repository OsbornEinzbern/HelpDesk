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
            <section class="org-main">
              <div class="org-section">
                <h3 class="subheading">Основная информация</h3>
                <div class="form-row">
                  <UILabel v-model="localOrg.name" label="Наименование организации" :show-empty-indicator="true" />
                </div>
                <div class="form-row">
                  <span class="ui-field-label">Роли</span>
                  <div class="roles-display">
                    <span 
                      v-for="role in localOrg.roles" 
                      :key="role"
                      class="role-badge"
                      :class="getRoleBadgeClass(role)"
                    >
                      {{ getRoleLabel(role) }}
                    </span>
                    <span v-if="!localOrg.roles.length && isMainOrganizationById" class="role-badge role-badge--main">
                      Основная организация
                    </span>
                    <span v-if="!localOrg.roles.length" class="empty-roles">Роли не назначены</span>
                  </div>
                </div>
                <UITextarea 
                  :modelValue="localOrg.description" 
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
                  :modelValue="localOrg.address" 
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
                  <UILabel v-model="localOrg.building" label="Дом, строение" :show-empty-indicator="true" />
                  <UILabel v-model="localOrg.office" label="Офис" :show-empty-indicator="true" />
                </div>
                <div class="two-columns">
                  <UILabel v-model="displayPhone" label="Телефон" :show-empty-indicator="true" />
                  <UILabel v-model="localOrg.index" label="Почтовый индекс" :show-empty-indicator="true" />
                </div>
              </div>
            </section>
          </div>
          <div v-if="isMainOrganization" class="main-org-note">
            Основную организацию нельзя удалять и менять её роли.
          </div>
        </template>

        <!-- Режим редактирования -->
        <template v-else>
          <div class="org-grid">
            <section class="org-main">
              <div class="org-section">
                <h3 class="subheading">Основная информация</h3>
                <div class="form-row">
                  <UIInput
                    ref="nameField"
                    v-model="localOrg.name"
                    label="Наименование организации"
                    placeholder="Введите наименование"
                    :required="true"
                    :maxLength="50"
                    :customClass="'mb-8'"
                  />
                </div>

                <div class="form-row">
                  <div class="roles-group" :class="{ 'has-error': rolesTouched && rolesError }">
                    <div class="roles-group__header">
                      <span class="ui-field-label">
                        Роли
                        <span class="required-asterisk">*</span>
                      </span>
                      <span v-if="rolesTouched && rolesError" class="input-error">{{ rolesError }}</span>
                    </div>
                    <div class="roles-buttons">
                      <button
                        v-for="role in getRolesOptions(isMainOrganizationById)"
                        :key="role.value"
                        type="button"
                        class="role-btn"
                        :class="getRoleButtonClass(role.value, isMainOrganizationById)"
                        :disabled="isMainOrganizationById"
                        @click="toggleRole(role.value)"
                      >
                        {{ getRoleEditLabel(role.value, isMainOrganizationById) }}
                      </button>
                    </div>
                  </div>
                </div>

                <div class="form-row">
                  <UITextarea 
                    v-model="localOrg.description"
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
                    v-model="localOrg.address"
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
                      v-model="localOrg.building"
                      label="Дом, строение"
                      placeholder="Введите № дома или строения"
                      :maxLength="20"
                      :customClass="'mb-8'"
                    />
                  </div>
                  <div class="form-row">
                    <UIInput
                      v-model="localOrg.office"
                      label="Офис"
                      placeholder="Введите № офиса"
                      :maxLength="20"
                      :customClass="'mb-8'"
                    />
                  </div>
                </div>
                <div class="two-columns">
                  <div class="form-row">
                    <UIInput
                      ref="phoneField"
                      v-model="localOrg.phone_number"
                      label="Телефон"
                      type="tel"
                      placeholder="Введите телефон"
                      :max-length="20"
                      :required="false"
                    />
                  </div>
                  <div class="form-row">
                    <UIInput
                      v-model="localOrg.index"
                      label="Почтовый индекс"
                      placeholder="Введите индекс"
                      :maxLength="20"
                      :customClass="'mb-8'"
                    />
                  </div>
                </div>
              </div>

              <div class="org-modal__footer">
                <div class="left-actions">
                  <span v-if="serverError" class="server-error">{{ serverError }}</span>
                </div>
                <div class="right-actions">
                  <template v-if="mode !== 'create'">
                    <button type="button" class="btn" @click="cancelEdit" :disabled="saving">Отменить изменения</button>
                    <button type="button" class="btn danger" 
                      v-if="canDelete && !isMainOrganizationById" 
                      @click.stop="deleteOrganization" 
                      title="Удалить организацию">
                      Удалить
                    </button>
                  </template>
                  <template v-else>
                    <button v-if="hasAnyInput" type="button" class="btn" @click="resetForm">
                      <Icon :icon="uiIcons?.icons.reload" width="20" height="20" /> Сбросить
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
import UITextarea from '@/components/common/UI/UITextarea.vue'
import { Icon } from '@iconify/vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import DeleteNotification from '@/components/notifications/DeleteNotification.vue'
import SuccessNotification from '@/components/notifications/SuccessNotification.vue'
import { useOrganizationsStore } from '@/stores/organizations.store'
import { getUserRole } from '@/utils/auth.utils'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'view' }, // 'view', 'edit', 'create'
  organization: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'saved', 'deleted'])

const uiIcons = ref()
const organizationsStore = useOrganizationsStore()
const deleteObjectModal = ref()
const successObjectModal = ref()

const visible = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const serverError = ref(null)
const nameField = ref(null)
const phoneField = ref(null)

// Форма организации
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

// Клон для отслеживания изменений
const formClone = {
  id: null,
  name: '',
  description: '',
  roles: [],
  phone_number: '',
  address: '',
  index: '',
  building: '',
  office: '',
}

const rolesTouched = ref(false)
const rolesError = ref('')

function getRolesOptions(isMain){
  if(isMain){
    return [ { value: 1, label: 'Основная организация' }, { value: 2, label: 'Подрядчик' },
              { value: 3, label: 'Субподрядчик' }, { value: 4, label: 'Заказчик' }, ]
  }
  else{
    return [ { value: 2, label: 'Подрядчик' }, { value: 3, label: 'Субподрядчик' }, { value: 4, label: 'Заказчик' }, ]
  }
}

const roleOptions = [
  { value: 1, label: 'Основная организация' },
  { value: 2, label: 'Подрядчик' },
  { value: 3, label: 'Субподрядчик' },
  { value: 4, label: 'Заказчик' },
]

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
  if (props.mode === 'create') return 'Создание организации'
  if (isEditing.value) return `Редактирование организации`
  return `Профиль организации`
})

const canEdit = computed(() => {
  return props.mode === 'create' || props.mode === 'edit'
})

const canDelete = computed(() => {
  return getUserRole() === 'admin'
})

const isMainOrganization = computed(() => {
  return isMainOrganizationById.value ||  // организация с id=1
    Boolean(
      localOrg.is_main ||
      localOrg.is_main_organization ||
      localOrg.type_org === 3 ||
      localOrg.roles.includes(1)
    )
})

const isMainOrganizationById = computed(() => {
  return localOrg.id === 1
})

const displayPhone = computed(() => {
  if (!localOrg.phone_number) return ''
  return localOrg.phone_number
})

function getRoleLabel(roleValue) {
  switch (roleValue) {
    case 1: return 'Основная организация'
    case 2: return 'Подрядчик'
    case 3: return 'Субподрядчик'
    case 4: return 'Заказчик'
    default: return ''
  }
}

function getRoleEditLabel(roleValue, isMain) {
  if(isMain){
    switch (roleValue) {
      case 1: return 'Основная организация'
      case 2: return 'Подрядчик'
      case 3: return 'Субподрядчик'
      case 4: return 'Заказчик'
      default: return ''
    }
  }
  else{
    switch (roleValue) {
      case 2: return 'Подрядчик'
      case 3: return 'Субподрядчик'
      case 4: return 'Заказчик'
      default: return ''
    }
  }
}

function getRoleBadgeClass(roleValue) {
  switch (roleValue) {
    case 1: return 'role-badge--main'
    case 2: return 'role-badge--contractor'
    case 3: return 'role-badge--subcontractor'
    case 4: return 'role-badge--customer'
    default: return ''
  }
}

function getRoleButtonClass(roleValue, isMain) {
  const isActive = localOrg.roles.includes(roleValue)
  if(isMain){
    switch (roleValue) {
      case 1: return { 'role-btn--main': true, 'role-btn--active': isActive }
      case 2: return { 'role-btn--contractor': true, 'role-btn--active': isActive }
      case 3: return { 'role-btn--subcontractor': true, 'role-btn--active': isActive }
      case 4: return { 'role-btn--customer': true, 'role-btn--active': isActive }
      default: return {}
    }
  }
  else{
    switch (roleValue) {
      case 2: return { 'role-btn--contractor': true, 'role-btn--active': isActive }
      case 3: return { 'role-btn--subcontractor': true, 'role-btn--active': isActive }
      case 4: return { 'role-btn--customer': true, 'role-btn--active': isActive }
      default: return {}
    }
  }
}

async function openAndLoad() {
  serverError.value = null
  saving.value = false

  if (props.mode === 'create') {
    resetForm()
    isEditing.value = true
    await nextTick()
    return
  }

  const src = props.organization
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
  localOrg.id = src.id || null
  localOrg.name = src.name || ''
  localOrg.description = src.description || ''
  // Извлекаем ID ролей из массива объектов roles
  if (src.roles && Array.isArray(src.roles)) {
    localOrg.roles = src.roles.map(role => role.id)
  } else {
    localOrg.roles = normalizeRoles(src)
  }
  localOrg.phone_number = normalizePhone(src.phone_number?.phone_number)
  localOrg.address = src.contact?.address || ''
  localOrg.index = src.contact?.index || ''
  localOrg.building = src.contact?.building || ''
  localOrg.office = src.contact?.office || ''
  localOrg.is_main = Boolean(src.is_main)
  localOrg.is_main_organization = Boolean(src.is_main_organization)
  localOrg.type_org = src.type_org || null
  
  cloneForm()
}

function normalizeRoles(src) {
  // Если roles уже массив объектов с id
  if (src?.roles && Array.isArray(src.roles) && src.roles[0]?.id) {
    return src.roles.map(role => role.id)
  }
  
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
  const cleaned = value
  if(value === null || value === ''){
    return ''
  }
  if (cleaned && !cleaned.startsWith('+') && cleaned !== 'Не указан') {
    return '+' + cleaned.replace(/\D/g, '')
  }
  return cleaned
}

function cloneForm() {
  formClone.id = localOrg.id
  formClone.name = localOrg.name
  formClone.description = localOrg.description
  formClone.roles = [...localOrg.roles]
  formClone.phone_number = localOrg.phone_number
  formClone.address = localOrg.address
  formClone.index = localOrg.index
  formClone.building = localOrg.building
  formClone.office = localOrg.office
}

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
  
  rolesTouched.value = false
  rolesError.value = ''
  cloneForm()
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
  rolesTouched.value = false
  rolesError.value = ''
  
  const inputs = [nameField, phoneField]
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
  } else if (props.organization) {
    fillForm(props.organization)
  }
}

function validateRoles(markTouched = false) {
  if (markTouched) rolesTouched.value = true
  
  // Для организации с id=1 валидация ролей не требуется
  if (isMainOrganizationById.value || isMainOrganization.value) {
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

function validateForm() {
  if (!localOrg.name || !localOrg.name.trim()) {
    serverError.value = 'Наименование организации обязательно'
    return false
  }
  
  if (!validateRoles(true)) {
    if (!serverError.value) serverError.value = rolesError.value
    return false
  }
  
  serverError.value = null
  return true
}

function hasChanges() {
  if (formClone.id !== localOrg.id) return true
  if (formClone.name !== localOrg.name) return true
  if (formClone.description !== localOrg.description) return true
  if (JSON.stringify(formClone.roles) !== JSON.stringify(localOrg.roles)) return true
  if (formClone.phone_number !== localOrg.phone_number) return true
  if (formClone.address !== localOrg.address) return true
  if (formClone.index !== localOrg.index) return true
  if (formClone.building !== localOrg.building) return true
  if (formClone.office !== localOrg.office) return true
  
  return false
}

function preparePayload() {
  const digits = (localOrg.phone_number || '').replace(/\D/g, '')
  let phoneNumber = ''
  if (digits) {
    phoneNumber = '+' + digits
  }
  
  const payload = {
    name: localOrg.name.trim(),
    description: localOrg.description || '',
    roles: [...localOrg.roles],
    phone_number: phoneNumber,
    address: localOrg.address || '',
    index: localOrg.index || '',
    building: localOrg.building || '',
    office: localOrg.office || '',
  }
  
  if (props.mode !== 'create' && localOrg.id) {
    payload.organization_id = localOrg.id
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
  if (nameError && nameField.value && typeof nameField.value.setError === 'function') {
    nameField.value.setError(nameError)
  }
  
  const phoneError = getFirst('phone_number')
  if (phoneError && phoneField.value && typeof phoneField.value.setError === 'function') {
    phoneField.value.setError(phoneError)
  }
  
  const rolesMessage = getFirst('roles')
  if (rolesMessage) {
    rolesTouched.value = true
    rolesError.value = rolesMessage
  }
}

function toggleRole(roleId) {
  // Запрещаем любые изменения ролей для организации с id=1
  if (isMainOrganizationById.value) return
  
  const id = Number(roleId)
  const exists = localOrg.roles.includes(id)
  
  if (exists) {
    localOrg.roles = localOrg.roles.filter((r) => r !== id)
  } else {
    localOrg.roles = [...localOrg.roles, id]
  }
  
  validateRoles(true)
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
      response = await organizationsStore.createOrganization(payload)
      
      if (!response.validator_fails && !response.errors) {
        confirmed = await successObjectModal.value.open({
          title: '',
          mainMessage: 'Организация успешно создана',
          type: 'success',
        })
        if (confirmed) {
          emit('saved', response)
          close()
        }
      } else {
        await successObjectModal.value.open({
          title: '',
          mainMessage: 'Ошибка при создании организации',
          type: 'notSuccess',
        })
        const fieldErrors = response?.errors || response?.validator_fails || {}
        applyServerErrors(fieldErrors)
        if (Object.keys(fieldErrors).length > 0) {
          serverError.value = Object.values(fieldErrors).flat()[0]
        }
      }
    } else {
      response = await organizationsStore.updateOrganization(payload)
      
      if (!response.validator_fails && !response.errors) {
        confirmed = await successObjectModal.value.open({
          title: '',
          mainMessage: 'Организация успешно обновлена',
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
          mainMessage: 'Ошибка при обновлении организации',
          type: 'notSuccess',
        })
        const fieldErrors = response?.errors || response?.validator_fails || {}
        applyServerErrors(fieldErrors)
        if (Object.keys(fieldErrors).length > 0) {
          serverError.value = Object.values(fieldErrors).flat()[0]
        }
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

const deleteOrganization = async () => {
  if (isMainOrganizationById.value) {
    serverError.value = 'Основную организацию удалять нельзя'
    return
  }
  
  let confirmed
  
  if (localOrg.name) {
    confirmed = await deleteObjectModal.value.open({
      title: 'Удаление организации',
      mainMessage: 'Вы действительно хотите удалить организацию ',
      secondaryMessage: localOrg.name + '?'
    })
  } else {
    confirmed = await deleteObjectModal.value.open({
      title: 'Удаление организации',
      mainMessage: 'Вы действительно хотите удалить организацию?',
      secondaryMessage: ''
    })
  }
  
  if (confirmed) {
    saving.value = true
    
    try {
      const response = await organizationsStore.deleteOrganizations([localOrg.id])
      
      if (response.data.validator_fails || response.errors) {
        await successObjectModal.value.open({
          title: '',
          mainMessage: 'Ошибка при удалении организации. Организация не удалена',
          type: 'notSuccess',
        })
      } else {
        const confirmed2 = await successObjectModal.value.open({
          title: '',
          mainMessage: 'Организация успешно удалена',
          type: 'success',
        })
        if (confirmed2) {
          emit('deleted', localOrg.id)
          close()
        }
      }
    } catch (err) {
      console.error('Ошибка удаления:', err)
      await successObjectModal.value.open({
        title: '',
        mainMessage: 'Ошибка при удалении организации',
        type: 'notSuccess',
      })
    } finally {
      saving.value = false
    }
  }
}

const isFormValid = computed(() => {
  if (!localOrg.name?.trim()) return false
  // Для организации с id=1 не проверяем роли
  if (!isMainOrganizationById.value && !isMainOrganization.value && (!localOrg.roles || localOrg.roles.length === 0)) return false
  return true
})

const hasFormChanges = computed(() => {
  return hasChanges()
})

const hasAnyInput = computed(() => {
  return localOrg.name?.trim() || localOrg.description?.trim() || 
         (localOrg.roles && localOrg.roles.length > 0) ||
         localOrg.address?.trim() || localOrg.building?.trim() || 
         localOrg.office?.trim() || localOrg.index?.trim() || 
         localOrg.phone_number?.trim()
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
  scrollbar-color: #9c9c9c #eaeaea;
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

.org-section {
  border: 1px solid rgb(218, 218, 218);
  border-radius: 6px;
  background-color: #f7f7f7;
  padding: 8px;
}

.two-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 2px;
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
  padding: 4px 10px; 
  border-radius: 6px; 
  cursor: pointer; 
  border: 1px solid rgba(0,0,0,0.08);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn:hover {
  transform: scale(1.03);
}

.btn.primary { 
  background: #178aee; 
  color: #fff; 
  border: none; 
}

.btn.danger { 
  background: #ef4444; 
  color: #fff; 
  border: none; 
}

.form-row { 
  display: flex; 
  flex-direction: column; 
  margin-bottom: 8px;
}

.form-row:last-child {
  margin-bottom: 0;
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

.form-row :deep(.ui-select-custom),
.form-row :deep(.ui-input-field) {
  height: 30px !important;
  min-height: 30px !important;
  box-sizing: border-box;
}

.roles-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.roles-group.has-error .roles-buttons {
  border-color: #b00020;
  background-color: #fff5f5;
}

.roles-group__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.org-name-view{
  margin-bottom: 4px;
}

.ui-field-label {
  font-size: 12px;
  color: #8c8c8c;
  font-weight: 500;
}

.roles-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding: 8px;
  border: 1px solid #c5c5c5;
  border-radius: 6px;
  background: #fff;
}

.role-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 13px;
  border: 1px solid #c5c5c5;
  background-color: #f5f5f5;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
}

.role-btn:hover:not(:disabled) {
  transform: scale(1.02);
}

.role-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Основная организация */
.role-btn--main {
  border-color: #15109f;
  color: #15109f;
}

.role-btn--main.role-btn--active {
  background-color: #15109f;
  color: white;
  border-color: #15109f;
}

/* Подрядчик */
.role-btn--contractor {
  border-color: #11af8a;
  color: #11af8a;
}

.role-btn--contractor.role-btn--active {
  background-color: #11af8a;
  color: white;
  border-color: #11af8a;
}

/* Субподрядчик */
.role-btn--subcontractor {
  border-color: #1a7ccc;
  color: #1a7ccc;
}

.role-btn--subcontractor.role-btn--active {
  background-color: #1a7ccc;
  color: white;
  border-color: #1a7ccc;
}

/* Заказчик */
.role-btn--customer {
  border-color: #16961a;
  color: #16961a;
}

.role-btn--customer.role-btn--active {
  background-color: #16961a;
  color: white;
  border-color: #16961a;
}

/* Отображение ролей в режиме просмотра */
.roles-display {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 4px 0;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.role-badge--main {
  background-color: #15109f;
  color: white;
}

.role-badge--contractor {
  background-color: #11af8a;
  color: white;
}

.role-badge--subcontractor {
  background-color: #1a7ccc;
  color: white;
}

.role-badge--customer {
  background-color: #16961a;
  color: white;
}

.empty-roles {
  color: #999;
  font-size: 13px;
  font-style: italic;
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

.main-org-note {
  margin-top: 8px;
  padding: 8px 10px;
  border: 1px solid #d7c57a;
  background: #fff8db;
  border-radius: 6px;
  color: #7b5f00;
  font-size: 13px;
}

@media (max-width: 1200px) {
  .org-grid {
    grid-template-columns: 1fr;
  }
  .org-modal {
    width: calc(100% - 24px);
  }
  .roles-buttons {
    flex-direction: column;
  }
  .role-btn {
    justify-content: center;
  }
}
</style>