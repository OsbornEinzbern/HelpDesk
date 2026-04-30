<template>
  <div class="all-classifications-page">
    <DeleteNotification ref="deleteNotification" />
    <SuccessNotification ref="successClassificationModal" />

    <div class="table-controls">
      <div class="table-controls-left">
        <button
          v-if="canDeleteClassification"
          type="button"
          class="btn danger"
          @click.stop="deleteSelectedClassifications"
          :disabled="!selectedClassificationIds || selectedClassificationIds.length === 0"
          :title="getDeleteButtonTitle"
        >
          Удалить
        </button>

        <div class="search-section">
          <UIInput
            v-model="searchQuery"
            placeholder="Поиск по классификациям..."
            type="text"
            :max-length="30"
            @keyup.enter="handleSearch"
            class="search-input"
            customClass="search-ui-input"
          />
          <button class="search-btn" @click="handleSearch">
            Найти
          </button>
        </div>
      </div>

      <div class="table-controls-right">
        <UIButton
          class="create-classification-btn"
          @click="openCreateModal"
          v-if="canCreateClassification"
        >
          Создать классификацию
        </UIButton>
      </div>
    </div>

    <div class="table-section">
      <ClassificationsTable
        :classifications="classifications || []"
        :loading="loading"
        :pagination-data="paginationData"
        :selectedClassificationIds="selectedClassificationIds || []"
        @update:selectedClassificationIds="handleSelectionChange"
        @rowClick="handleRowClick"
        @pageChange="handlePageChange"
      />
    </div>

    <ClassificationsProfileModal
      v-model="modalVisible"
      :mode="modalMode"
      :classification="selectedClassification"
      @saved="handleClassificationSaved"
      @deleted="handleClassificationDeleted"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { getUserRole } from '@/utils/auth.utils'
import { useClassificationsStore } from '@/stores/classifications.store'
import ClassificationsTable from '@/components/tables/ClassificationsTable.vue'
import UIInput from '@/components/common/UI/UIInput.vue'
import UIButton from '@/components/common/UI/UIButton.vue'
import ClassificationsProfileModal from '@/components/modal/ClassificationsProfileModal.vue'
import DeleteNotification from '@/components/notifications/DeleteNotification.vue'
import SuccessNotification from '@/components/notifications/SuccessNotification.vue'

const classificationsStore = useClassificationsStore()
const deleteNotification = ref()
const successClassificationModal = ref()

const searchQuery = ref('')
const classifications = ref([])
const loading = ref(false)
const selectedClassificationIds = ref([])

const selectedClassification = ref(null)
const modalVisible = ref(false)
const modalMode = ref('create')

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

const canCreateClassification = computed(() => {
  return getUserRole() === 'admin'
})

const canDeleteClassification = computed(() => {
  return getUserRole() === 'admin'
})

const getDeleteButtonTitle = computed(() => {
  if (!selectedClassificationIds.value || selectedClassificationIds.value.length === 0) {
    return 'Выберите классификации для удаления'
  }
  return `Удалить выбранные классификации (${selectedClassificationIds.value.length})`
})

const handleClickOutside = (event) => {
  const dropdown = document.querySelector('.active-filters-dropdown')
  if (dropdown && !dropdown.contains(event.target)) {
    // на будущее, если появятся фильтры
  }
}

const handleSelectionChange = (newSelection) => {
  selectedClassificationIds.value = newSelection || []
}

const loadClassifications = async (url) => {
  loading.value = true

  try {
    const params = {
      search: searchQuery.value || '',
      page: paginationData.value.current_page,
      perPage: paginationData.value.per_page,
    }

    if (url) {
      params.url = url
    }

    console.log('Параметры загрузки классификаций: ', params)

    const response = await classificationsStore.fetchClassifications(params)
    console.log('Ответ от API:', response)

    if (response && response.data) {
      if (response.data.data) {
        classifications.value = response.data.data || []
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
        classifications.value = []
        console.warn('Неожиданный формат ответа:', response.data)
      }

      console.log('Загружено классификаций:', classifications.value.length)
    } else {
      console.warn('Пустой ответ от API')
      classifications.value = []
    }
  } catch (error) {
    console.error('Ошибка загрузки классификаций:', error)
    classifications.value = []
  } finally {
    loading.value = false
  }
}

const deleteSelectedClassifications = async () => {
  if (!selectedClassificationIds.value || selectedClassificationIds.value.length === 0) return

  const confirmed = await deleteNotification.value?.open({
    title: 'Подтверждение массового удаления',
    mainMessage: `Вы действительно хотите удалить выбранные классификации?`,
    secondaryMessage: `Выбрано классификаций: ${selectedClassificationIds.value.length}. Это действие необратимо.`,
    confirmText: 'Удалить',
  })

  if (!confirmed) return

  loading.value = true

  try {
    const payload = { classifications: selectedClassificationIds.value }
    const result = await classificationsStore.deleteClassifications(payload)

    if (!result?.data?.validator_fails && !result?.data?.errors && !result?.validator_fails && !result?.errors) {
      const confirmed2 = await successClassificationModal.value.open({
        title: '',
        mainMessage: 'Классификации успешно удалены',
        type: 'success',
      })

      if (confirmed2) {
        selectedClassificationIds.value = []
        await loadClassifications()
      }
    } else {
      console.error('Ошибка при удалении классификаций:', result)
      await successClassificationModal.value.open({
        title: '',
        mainMessage: 'Ошибка при удалении классификаций',
        type: 'notSuccess',
      })
    }
  } catch (error) {
    console.error('Ошибка при удалении классификаций:', error)
    await successClassificationModal.value.open({
      title: '',
      mainMessage: 'Ошибка при удалении классификаций',
      type: 'notSuccess',
    })
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  selectedClassification.value = null
  modalMode.value = 'create'
  modalVisible.value = true
}

const handleClassificationSaved = () => {
  classificationsStore.clearCache()
  selectedClassificationIds.value = []
  loadClassifications()
}

const handleClassificationDeleted = () => {
  classificationsStore.clearCache()
  selectedClassificationIds.value = []
  loadClassifications()
}

const handleRowClick = (classification) => {
  if (!classification) return
  selectedClassification.value = classification
  modalMode.value = 'edit'
  modalVisible.value = true
}

const handlePageChange = (page) => {
  paginationData.value.current_page = page
  loadClassifications()
}

const handleSearch = () => {
  paginationData.value.current_page = 1
  loadClassifications()
}

onMounted(() => {
  loadClassifications()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.all-classifications-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-controls {
  display: flex;
  position: sticky;
  top: 0;
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
  padding: 4px 12px;
  border-radius: 20px;
  cursor: pointer;
  border: 1px solid rgba(0,0,0,0.08);
  transition: all 0.2s;
  display: flex;
  align-items: center;
}

.btn.danger {
  background: #ef4444;
  color: #fff;
  border: none;
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
  padding: 1px 12px 0px 12px;
  cursor: pointer;
  margin-left: 4px;
  transition: all 0.2s;
}

.search-btn:hover {
  background: #299eff;
  border-color: #339af0;
  transform: scale(1.05);
}

.create-classification-btn {
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

.create-classification-btn:hover {
  background: #28a23e;
  transform: scale(1.02);
}

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
}

@media (max-width: 768px) {
  .search-section {
    max-width: 100%;
  }
}
</style>