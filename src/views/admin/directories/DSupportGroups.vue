<template>
  <!-- Основной контент страницы -->
  <div class="all-groups-page">
    <UIIcons ref="uiIcons" />
    <DeleteNotification ref="deleteNotification" />
    <SuccessNotification ref="successGroupModal" />
    <!-- Панель с кнопками над таблицей -->
    <div class="table-controls">
      <div class="table-controls-left">
        <button 
          v-if="canDeleteGroup"
          type="button" 
          class="btn danger" 
          @click.stop="deleteSelectedGroups" 
          :disabled="!selectedGroupIds || selectedGroupIds.length === 0"
          :title="getDeleteButtonTitle"
        >
          <Icon :icon="uiIcons?.icons.deleteOutline" width="22" height="22" />
        </button>
        
        <div class="search-section">
          <UIInput
            v-model="searchQuery"
            placeholder="Поиск по группам поддержки..."
            type="text"
            :max-length="30"
            @keyup.enter="handleSearch"
            class="search-input"
            customClass="search-ui-input"
          />
          <button class="search-btn" @click="handleSearch">
            <Icon :icon="uiIcons?.icons.userSearch" width="24" height="24" />
          </button>
        </div>
      </div>

      <div class="table-controls-right">
        <UIButton
          class="create-object-btn"
          @click="openCreateModal"
          v-if="canCreateGroup"
        >
          <span class="btn-content">
            <Icon :icon="uiIcons?.icons.supportGroupCreate" width="22" height="22" />
            <span>Создать группу поддержки</span>
          </span>
        </UIButton>
      </div>
    </div>

    <!-- Таблица объектов -->
    <div class="table-section">
      <SupportGroupsTable
        :groups="groups || []"
        :loading="loading"
        :pagination="paginationData"
        :selectedGroupIds="selectedGroupIds || []"
        @update:selectedGroupIds="handleSelectionChange"
        @rowClick="handleRowClick"
        @pageChange="handlePageChange"
      />
    </div>

    <!-- Модалка профиля -->
    <SupportGroupProfileModal
      v-model="modalVisible"
      :mode="modalMode"
      :object="selectedGroup"
      @saved="handleGroupSaved"
      @deleted="handleGroupDeleted"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { getUserRole } from '@/utils/auth.utils'
import { useSupportGroupsStore } from '@/stores/support.groups.store'
import SupportGroupsTable from '@/components/tables/SupportGroupsTable.vue'
import UIInput from '@/components/common/UI/UIInput.vue'
import UIButton from '@/components/common/UI/UIButton.vue'
import SupportGroupProfileModal from '@/components/modal/SupportGroupProfileModal.vue'
import DeleteNotification from '@/components/notifications/DeleteNotification.vue'
import SuccessNotification from '@/components/notifications/SuccessNotification.vue'
import { Icon } from '@iconify/vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'

const uiIcons = ref()
const supportGroupsStore = useSupportGroupsStore()
const deleteNotification = ref()
const successGroupModal = ref()

// Состояние
const searchQuery = ref('')
const groups = ref([])
const loading = ref(false)
const selectedGroupIds = ref([])
const selectedGroup = ref(null)
const modalVisible = ref(false)
const modalMode = ref('create')
const isFiltersDropdownOpen = ref(false)

// Пагинация
const paginationData = ref({
  current_page: 1,
  last_page: 1,
  per_page: 20,
  prev_page_url: null,
  next_page_url: null,
  total: 0,
  links: [],
  from: 0,
  to: 0,
})

// Права доступа
const canCreateGroup = computed(() => {
  return getUserRole() === 'admin'
})

const canDeleteGroup = computed(() => {
  return getUserRole() === 'admin'
})

// Текст подсказки для кнопки удаления
const getDeleteButtonTitle = computed(() => {
  if (!selectedGroupIds.value || selectedGroupIds.value.length === 0) {
    return 'Выберите группы для удаления'
  }
  return `Удалить выбранные группы поддержки (${selectedGroupIds.value.length})`
})

// Закрытие выпадающего списка при клике вне его
const handleClickOutside = (event) => {
  const dropdown = document.querySelector('.active-filters-dropdown')
  if (dropdown && !dropdown.contains(event.target)) {
    isFiltersDropdownOpen.value = false
  }
}

// Обработка изменения выбранных объектов
const handleSelectionChange = (newSelection) => {
  selectedGroupIds.value = newSelection || []
}

// Загрузка объектов
const loadGroups = async (url) => {
  loading.value = true

  try {
    const params = {
      search: searchQuery.value || ''
    }
    if(url){
      params.url = url
    }

    console.log('Параметры загрузки групп: ', params)

    const response = await supportGroupsStore.fetchSupportGroups(params)
    console.log('Ответ от API:', response)

    if (response && response.data) {
      if (response.data.data) {
        groups.value = response.data.data || []
        paginationData.value = {
          current_page: response.data.current_page || 1,
          last_page: response.data.last_page || 1,
          per_page: response.data.per_page || 20,
          prev_page_url: response.data.prev_page_url || null,
          next_page_url: response.data.next_page_url || null,
          total: response.data.total || 0,
          links: response.data.links || [],
          from: response.data.from || 0,
          to: response.data.to || 0,
        }
      } else {
        groups.value = []
        console.warn('Неожиданный формат ответа:', response.data)
      }

      console.log('Загружено объектов:', groups.value.length)
    } else {
      console.warn('Пустой ответ от API')
      groups.value = []
    }
  } catch (error) {
    console.error('Ошибка загрузки объектов:', error)
    groups.value = []
  } finally {
    loading.value = false
  }
}

// Удаление групп
const deleteSelectedGroups = async () => {
  if (!selectedGroupIds.value || selectedGroupIds.value.length === 0) return
  
  const confirmed = await deleteNotification.value?.open({
    title: 'Подтверждение массового удаления',
    mainMessage: `Вы действительно хотите удалить выбранные группы поддержки?`,
    secondaryMessage: `Выбрано групп: ${selectedGroupIds.value.length}. Это действие необратимо.`,
    confirmText: 'Удалить'
  })
  
  if (!confirmed) return
  
  loading.value = true
  
  try {
    const payload = { support_groups: selectedGroupIds.value }
    const result = await supportGroupsStore.deleteGroups(payload)
    
    if (!result.validator_fails && !result.errors) {
      const confirmed2 = await successGroupModal.value.open({
        title: '',
        mainMessage: 'Группы поддержки успешно удалены',
        type: 'success',
      })
      if (confirmed2) {
        selectedGroupIds.value = []
        await loadGroups()
      }
    } else {
      console.error('Ошибка при удалении групп:', result)
      await successGroupModal.value.open({
        title: '',
        mainMessage: 'Ошибка при удалении групп поддержки',
        type: 'notSuccess',
      })
    }
  } catch (error) {
    console.error('Ошибка при удалении групп:', error)
    await successGroupModal.value.open({
      title: '',
      mainMessage: 'Ошибка при удалении групп поддержки',
      type: 'notSuccess',
    })
  } finally {
    loading.value = false
  }
}

// Открыть модалку создания
const openCreateModal = () => {
  selectedGroup.value = null
  modalMode.value = 'create'
  modalVisible.value = true
}

// После сохранения
const handleGroupSaved = () => {
  supportGroupsStore.clearCache()
  loadGroups()
}

// После удаления
const handleGroupDeleted = () => {
  supportGroupsStore.clearCache()
  loadGroups()
}

// Клик по строке таблицы
const handleRowClick = (object) => {
  if (!object) return
  selectedGroup.value = object
  modalMode.value = 'edit'
  modalVisible.value = true
}

// Изменение страницы
const handlePageChange = (page) => {
  paginationData.value.current_page = page
  loadGroups()
}

// Поиск
const handleSearch = () => {
  paginationData.value.current_page = 1
  loadGroups()
}

// Инициализация
onMounted(() => {
  loadGroups()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.all-groups-page{
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.table-controls {
  display: flex;
  position: sticky;
  top: 0px;  
  gap: 20px;
  border-bottom: 3px solid rgb(210, 210, 210);
  width: 100%;
  padding-bottom: 10px;
}

.table-controls-left {
  display: flex;
  align-items: center;
  width: 70%;
  gap: 20px;
  padding-left: 20px;
  flex-wrap: wrap;
}

.table-controls-right {
  align-content: end;
  width: 30%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-right: 20px;
}

.table-section {
  padding: 10px;
  margin: 0 20px 0 20px;
  flex: 1;
  overflow: hidden;
  min-height: 0; 
}

.btn { 
  padding: 4px 4px; 
  border-radius: 50%; 
  cursor: pointer; 
  border: 1px solid rgba(0,0,0,0.08);
  transition: all 0.2s;
  display: flex;
  align-items: center;
}

.btn.danger:disabled {
  background: #b8b8b8; 
  color: #f0f0f0; 
  cursor: not-allowed;
  transform: none;
}

.btn:disabled:hover {
  transform: none;
}

.btn:hover:not(:disabled) {
  transform: scale(1.03);
  background: #c52727; 
}

.btn.danger { 
  background: #ef4444; 
  color: #fff; 
  border: none; 
}

.search-section {
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 300px;
}

.search-ui-input :deep(.ui-input) {
  padding-top: 2px !important;
  padding-left: 10px !important;
  padding-bottom: 2px !important;
  border-radius: 20px 0 0 20px !important;
  font-size: 14px !important;
}

.search-btn {
  background: #319ef8;
  color: white;
  border: 1px solid #1296e8;
  border-radius: 0 20px 20px 0;
  padding: 1px 6px 0px 4px;
  cursor: pointer;
  font-size: 12px;
  margin-left: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-btn:hover {
  background: #299eff;
  border-color: #339af0;
  transform: scale(1.05);
}

.organizations-filter {
  min-width: 250px;
  max-width: 350px;
}

.organizations-filter :deep(.ui-combobox-wrapper) {
  width: 100%;
}

/* Стили для выпадающего списка активных фильтров */
.active-filters-dropdown {
  position: relative;
}

.filters-dropdown-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  color: #495057;
  transition: all 0.2s;
  white-space: nowrap;
}

.filters-dropdown-btn:hover {
  background-color: #e9ecef;
  border-color: #ced4da;
}

.filters-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  background-color: #319ef8;
  color: white;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  padding: 0 5px;
}

.dropdown-arrow {
  transition: transform 0.2s;
}

.dropdown-arrow-open {
  transform: rotate(180deg);
}

.filter-icon {
  color: #319ef8;
}

.filters-dropdown-menu {
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  min-width: 280px;
  max-width: 350px;
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  font-size: 12px;
  font-weight: 500;
  color: #495057;
}

.clear-all-btn {
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.clear-all-btn:hover {
  background-color: rgba(220, 53, 69, 0.1);
  text-decoration: underline;
}

.dropdown-list {
  max-height: 300px;
  overflow-y: auto;
}

.filter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.filter-item:hover {
  background-color: #f8f9fa;
}

.filter-item-label {
  font-size: 13px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}

.remove-filter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px;
  border-radius: 50%;
  color: #888;
  transition: all 0.2s;
  flex-shrink: 0;
}

.remove-filter-btn:hover {
  color: #dc3545;
  background-color: rgba(220, 53, 69, 0.1);
  transform: scale(1.1);
}

/* Кнопка создания */
.create-object-btn {
  background: #3cc93a;
  color: white;
  border: none;
  padding: 5px 14px;
  border-radius: 20px;
  font-weight: 400 !important;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
}

.create-object-btn:hover {
  background: #28a23e;
  transform: scale(1.02);
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1;
}

.btn-content .iconify {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Адаптивность */
@media (max-width: 1200px) {
  .table-controls {
    flex-wrap: wrap;
    gap: 15px;
  }

  .table-controls-left {
    flex-wrap: wrap;
    width: 100%;
  }

  .search-section {
    max-width: 250px;
  }

  .organizations-filter-wrapper {
    min-width: 200px;
  }
  
  .filters-dropdown-menu {
    right: auto;
    left: 0;
    min-width: 260px;
  }
}

@media (max-width: 768px) {
  .organizations-filter-wrapper {
    min-width: 100%;
  }
  
  .filters-dropdown-btn span:not(.filters-count) {
    display: none;
  }
  
  .filters-dropdown-btn {
    padding: 6px 10px;
  }
}
</style>