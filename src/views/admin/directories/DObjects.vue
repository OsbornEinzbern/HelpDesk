<template>
  <!-- Основной контент страницы -->
  <div class="all-objects-page">
    <UIIcons ref="uiIcons" />
    <DeleteNotification ref="deleteNotification" />
    <SuccessNotification ref="successObjectModal" />
    <!-- Панель с кнопками над таблицей -->
    <div class="table-controls">
      <div class="table-controls-left">
        <button 
          v-if="canDeleteObject"
          type="button" 
          class="btn danger" 
          @click.stop="deleteSelectedObjects" 
          :disabled="!selectedObjectIds || selectedObjectIds.length === 0"
          :title="getDeleteButtonTitle"
        >
          <Icon :icon="uiIcons?.icons.deleteOutline" width="22" height="22" />
        </button>
        
        <div class="search-section">
          <UIInput
            v-model="searchQuery"
            placeholder="Поиск по объектам..."
            type="text"
            :max-length="30"
            @keyup.enter="handleSearch"
            class="search-input"
            customClass="search-ui-input"
          />
          <button class="search-btn" @click="handleSearch">
            <Icon :icon="uiIcons?.icons.objectSearch" width="25" height="25" />
          </button>
        </div>
        
        <!-- Фильтр по организациям -->
        <div class="organizations-filter" v-if="canFilterByOrganizations">
          <UIComboBox
            ref="organizationsFilterInput"
            v-model="selectedOrganizations"
            :return-object="true"
            :options="[]"
            option-label="name"
            option-value="id"
            placeholder="Выберите организации"
            :search-debounce="500"
            :max-length="30"
            :multiple="true"
            :load-options="getOrgOptions"
            @update:model-value="handleOrganizationsFilterChange"
          />
        </div>

        <!-- Активные фильтры (выпадающий список) -->
        <div class="active-filters-dropdown" v-if="selectedOrganizations && selectedOrganizations.length > 0">
          <button 
            type="button" 
            class="filters-dropdown-btn"
            @click="toggleFiltersDropdown"
          >
            <Icon :icon="uiIcons?.icons.filter" width="18" height="18" class="filter-icon"/>
            <span>Активные фильтры</span>
            <span class="filters-count">{{ selectedOrganizations.length }}</span>
            <Icon 
              :icon="uiIcons?.icons.arrowDown" 
              width="18" 
              height="18" 
              class="dropdown-arrow"
              :class="{ 'dropdown-arrow-open': isFiltersDropdownOpen }"
            />
          </button>
          
          <div v-if="isFiltersDropdownOpen" class="filters-dropdown-menu" @click.stop>
            <div class="dropdown-header">
              <span>Выбранные организации ({{ selectedOrganizations ? selectedOrganizations.length : 0 }})</span>
              <button 
                v-if="selectedOrganizations && selectedOrganizations.length > 0" 
                class="clear-all-btn"
                @click="clearAllFilters"
              >
                Очистить все
              </button>
            </div>
            <div class="dropdown-list">
              <div 
                v-for="org in selectedOrganizations" 
                :key="org.id" 
                class="filter-item"
              >
                <span class="filter-item-label">{{ org.name }}</span>
                <button 
                  type="button" 
                  class="remove-filter-btn"
                  @click="removeOrganizationFilter(org.id)"
                  title="Убрать фильтр"
                >
                  <Icon :icon="uiIcons?.icons.close" width="18" height="18" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="table-controls-right">
        <UIButton
          class="create-object-btn"
          @click="openCreateModal"
          v-if="canCreateObject"
        >
          <span class="btn-content">
            <Icon :icon="uiIcons?.icons.objectCreate" width="22" height="22" />
            <span>Создать объект</span>
          </span>
        </UIButton>
      </div>
    </div>

    <!-- Таблица объектов -->
    <div class="table-section">
      <ObjectsTable
        :objects="objects || []"
        :loading="loading"
        :pagination="paginationData"
        :selectedObjectIds="selectedObjectIds || []"
        @update:selectedObjectIds="handleSelectionChange"
        @rowClick="handleRowClick"
        @pageChange="handlePageChange"
      />
    </div>

    <!-- Модалка профиля -->
    <ObjectProfileModal
      v-model="modalVisible"
      :mode="modalMode"
      :object="selectedObject"
      @saved="handleObjectSaved"
      @deleted="handleObjectDeleted"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { getUserRole } from '@/utils/auth.utils'
import { useObjectsStore } from '@/stores/objects.store'
import ObjectsTable from '@/components/tables/ObjectsTable.vue'
import UIInput from '@/components/common/UI/UIInput.vue'
import UIButton from '@/components/common/UI/UIButton.vue'
import UIComboBox from '@/components/common/UI/UIComboBox.vue'
import ObjectProfileModal from '@/components/modal/ObjectProfileModal.vue'
import DeleteNotification from '@/components/notifications/DeleteNotification.vue'
import SuccessNotification from '@/components/notifications/SuccessNotification.vue'
import { Icon } from '@iconify/vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import { getOrgOptions } from '@/utils/select.options.utils'

const uiIcons = ref()
const objectsStore = useObjectsStore()
const deleteNotification = ref()
const successObjectModal = ref()
const organizationsFilterInput = ref()

// Состояние
const searchQuery = ref('')
// Массив выбранных организаций для фильтра (всегда массив)
const selectedOrganizations = ref([])

const objects = ref([])
const loading = ref(false)
const selectedObjectIds = ref([])
const selectedObject = ref(null)
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
const canCreateObject = computed(() => {
  return getUserRole() === 'admin'
})

const canDeleteObject = computed(() => {
  return getUserRole() === 'admin'
})

const canFilterByOrganizations = computed(() => {
  return getUserRole() === 'admin'
})

// Текст подсказки для кнопки удаления
const getDeleteButtonTitle = computed(() => {
  if (!selectedObjectIds.value || selectedObjectIds.value.length === 0) {
    return 'Выберите объекты для удаления'
  }
  return `Удалить выбранные объекты (${selectedObjectIds.value.length})`
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
  selectedObjectIds.value = newSelection || []
}

// Загрузка объектов
const loadObjects = async (url) => {
  loading.value = true

  try {
    // Получаем ID организаций из массива
    const organizationsIds = selectedOrganizations.value && Array.isArray(selectedOrganizations.value)
      ? selectedOrganizations.value.filter(org => org && org.id).map(org => org.id)
      : []

    console.log('IDs организаций для фильтрации:', organizationsIds)

    
    const params = {
      search: searchQuery.value || '',
      organizations: organizationsIds,
    }
    if(url){
      params.url = url
    }

    console.log('Параметры загрузки объектов: ', params)

    const response = await objectsStore.fetchObjects(params)
    console.log('Ответ от API:', response)

    if (response && response.data) {
      if (response.data.data) {
        objects.value = response.data.data || []
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
        objects.value = []
        console.warn('Неожиданный формат ответа:', response.data)
      }

      console.log('Загружено объектов:', objects.value.length)
    } else {
      console.warn('Пустой ответ от API')
      objects.value = []
    }
  } catch (error) {
    console.error('Ошибка загрузки объектов:', error)
    objects.value = []
  } finally {
    loading.value = false
  }
}

// Множественное удаление выбранных объектов
const deleteSelectedObjects = async () => {
  if (!selectedObjectIds.value || selectedObjectIds.value.length === 0) return
  
  const confirmed = await deleteNotification.value?.open({
    title: 'Подтверждение массового удаления',
    mainMessage: `Вы действительно хотите удалить выбранные объекты?`,
    secondaryMessage: `Выбрано объектов: ${selectedObjectIds.value.length}. Это действие необратимо.`,
    confirmText: 'Удалить'
  })
  
  if (!confirmed) return
  
  loading.value = true
  
  try {
    const payload = { objects: selectedObjectIds.value }
    const result = await objectsStore.deleteObjects(payload)
    
    if (!result.validator_fails && !result.errors) {
      const confirmed2 = await successObjectModal.value.open({
        title: '',
        mainMessage: 'Объекты успешно удалены',
        type: 'success',
      })
      if (confirmed2) {
        selectedObjectIds.value = []
        await loadObjects()
      }
    } else {
      console.error('Ошибка при удалении объектов:', result)
      await successObjectModal.value.open({
        title: '',
        mainMessage: 'Ошибка при удалении объектов',
        type: 'notSuccess',
      })
    }
  } catch (error) {
    console.error('Ошибка при удалении объектов:', error)
    await successObjectModal.value.open({
      title: '',
      mainMessage: 'Ошибка при удалении объектов',
      type: 'notSuccess',
    })
  } finally {
    loading.value = false
  }
}

// Переключение выпадающего списка фильтров
const toggleFiltersDropdown = () => {
  isFiltersDropdownOpen.value = !isFiltersDropdownOpen.value
}

// Удаление фильтра по организации
const removeOrganizationFilter = (orgId) => {
  if (!selectedOrganizations.value || !Array.isArray(selectedOrganizations.value)) {
    selectedOrganizations.value = []
    return
  }
  selectedOrganizations.value = selectedOrganizations.value.filter(org => org && org.id !== orgId)
  paginationData.value.current_page = 1
  loadObjects()
}

// Очистка всех фильтров
const clearAllFilters = () => {
  selectedOrganizations.value = []
  paginationData.value.current_page = 1
  loadObjects()
  isFiltersDropdownOpen.value = false
}

// Открыть модалку создания
const openCreateModal = () => {
  selectedObject.value = null
  modalMode.value = 'create'
  modalVisible.value = true
}

// После сохранения
const handleObjectSaved = () => {
  objectsStore.clearCache()
  loadObjects()
}

// После удаления
const handleObjectDeleted = () => {
  objectsStore.clearCache()
  loadObjects()
}

// Клик по строке таблицы
const handleRowClick = (object) => {
  if (!object) return
  selectedObject.value = object
  modalMode.value = 'edit'
  modalVisible.value = true
}

// Обработчик изменения страницы - принимает URL
const handlePageChange = async (url) => {
  if (!url) return
  loadObjects(url)
}

// Поиск
const handleSearch = () => {
  paginationData.value.current_page = 1
  loadObjects()
}

// Фильтр по организациям (вызывается при изменении в комбобоксе)
const handleOrganizationsFilterChange = (value) => {
  console.log('handleOrganizationsFilterChange received value:', value)
  
  // Убеждаемся что value - массив
  if (value && Array.isArray(value)) {
    selectedOrganizations.value = value
  } else if (value && !Array.isArray(value)) {
    selectedOrganizations.value = [value]
  } else {
    selectedOrganizations.value = []
  }
  
  console.log('selectedOrganizations после обработки:', selectedOrganizations.value)
  
  paginationData.value.current_page = 1
  loadObjects()
}

// Инициализация
onMounted(() => {
  selectedOrganizations.value = []
  loadObjects()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.all-objects-page{
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