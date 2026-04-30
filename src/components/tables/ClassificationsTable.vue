<template>
  <UIIcons ref="uiIcons" />
  <div class="classifications-cards-wrapper">
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <span>Загрузка классификаций...</span>
    </div>

    <div v-else-if="!classifications || classifications.length === 0" class="empty-container">
      <h3>Классификации не найдены</h3>
      <p>Попробуйте изменить критерии поиска</p>
    </div>

    <div v-else class="cards-grid">
      <div
        v-for="item in classifications"
        :key="item.id"
        class="classification-card"
        @click="handleRowClick(item)"
      >
        <div class="card-content">
          <div class="classification-name" :title="item.name">
            <span>{{ truncateText(item.name, 42) }}</span>
          </div>

          <div class="classification-description">
            <span class="description-title">Описание:</span>
            <span class="description-text">
              {{ truncateText(item.description || 'Без описания', 120) }}
            </span>
          </div>

          <div class="classification-organizations">
            <div class="organizations-header">
              <span>Организации:</span>
            </div>

            <div class="organizations-list">
              <div
                v-for="org in getVisibleOrganizations(item.organizations)"
                :key="getOrganizationKey(org)"
                class="organization-chip"
                :title="getOrganizationLabel(org)"
              >
                {{ truncateText(getOrganizationLabel(org), 24) }}
              </div>

              <div
                v-if="getHiddenOrganizationsCount(item.organizations) > 0"
                class="organization-chip more-chip"
                :title="`Еще ${getHiddenOrganizationsCount(item.organizations)} организаций`"
              >
                + ...
              </div>

              <div v-if="!normalizeOrganizations(item.organizations).length" class="no-organizations">
                Не назначены
              </div>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <div class="checkbox-cell" @click.stop>
            <UIInput
              v-if="canSelectClassification()"
              type="checkbox"
              :model-value="isSelected(item.id)"
              @update:model-value="(checked) => toggleSelection(item.id, checked)"
              :disabled="false"
            />
          </div>

          <div class="organizations-count">
            <span>{{ normalizeOrganizations(item.organizations).length }} {{ getOrganizationsWord(normalizeOrganizations(item.organizations).length) }}</span>
          </div>
        </div>
      </div>
    </div>

    <UIPagination
      v-if="showPagination"
      :pagination-data="paginationData"
      :show-info="showPaginationInfo"
      :show-page-size-selector="showPageSizeSelector"
      :show-page-jump="showPageJump"
      :compact="compactPagination"
      :no-border="paginationNoBorder"
      @pageChange="handlePageChange"
      class="table-pagination"
    />
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed, ref } from 'vue'
import UIInput from '@/components/common/UI/UIInput.vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import UIPagination from '@/components/common/UI/UIPagination.vue'
import { getUserRole } from '@/utils/auth.utils'

const uiIcons = ref()
const MAX_VISIBLE_ORGANIZATIONS = 5

const props = defineProps({
  classifications: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  paginationData: {
    type: Object,
    default: () => ({
      current_page: 1,
      last_page: 1,
      per_page: 20,
      total: 0,
      links: [],
      from: 0,
      to: 0,
      prev_page_url: null,
      next_page_url: null,
    }),
  },
  showPaginationInfo: { type: Boolean, default: true },
  showPageSizeSelector: { type: Boolean, default: false },
  showPageJump: { type: Boolean, default: false },
  compactPagination: { type: Boolean, default: false },
  paginationNoBorder: { type: Boolean, default: false },
  selectedClassificationIds: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['rowClick', 'pageChange', 'openProfile', 'update:selectedClassificationIds'])

const canSelectAnyClassification = computed(() => {
  return getUserRole() === 'admin'
})

const canSelectClassification = () => {
  return canSelectAnyClassification.value
}

const isSelected = (classificationId) => {
  return props.selectedClassificationIds.includes(classificationId)
}

const toggleSelection = (classificationId, isChecked) => {
  let newSelection = [...props.selectedClassificationIds]

  if (isChecked) {
    if (!newSelection.includes(classificationId)) {
      newSelection.push(classificationId)
    }
  } else {
    newSelection = newSelection.filter(id => id !== classificationId)
  }

  emit('update:selectedClassificationIds', newSelection)
}

const normalizeOrganizations = (organizations) => {
  if (!organizations) return []

  if (Array.isArray(organizations)) {
    return organizations.map((item) => {
      if (item && typeof item === 'object') {
        return {
          id: item.id ?? item.organization_id ?? null,
          name: item.name ?? item.organization_name ?? item.title ?? item.label ?? '',
        }
      }

      return {
        id: item,
        name: String(item),
      }
    })
  }

  return []
}

const getOrganizationLabel = (organization) => {
  if (!organization) return ''
  if (typeof organization === 'string' || typeof organization === 'number') return String(organization)
  return organization.name || organization.organization_name || organization.title || organization.label || `#${organization.id ?? ''}`
}

const getOrganizationKey = (organization) => {
  if (!organization) return ''
  if (typeof organization === 'string' || typeof organization === 'number') return String(organization)
  return organization.id ?? organization.organization_id ?? getOrganizationLabel(organization)
}

const getVisibleOrganizations = (organizations) => {
  const normalized = normalizeOrganizations(organizations)
  return normalized.slice(0, MAX_VISIBLE_ORGANIZATIONS)
}

const getHiddenOrganizationsCount = (organizations) => {
  const normalized = normalizeOrganizations(organizations)
  if (normalized.length <= MAX_VISIBLE_ORGANIZATIONS) return 0
  return normalized.length - MAX_VISIBLE_ORGANIZATIONS
}

const getOrganizationsWord = (count) => {
  if (count === 0) return 'организаций'
  const lastDigit = count % 10
  const lastTwoDigits = count % 100

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'организаций'
  if (lastDigit === 1) return 'организация'
  if (lastDigit >= 2 && lastDigit <= 4) return 'организации'
  return 'организаций'
}

const truncateText = (text, maxLength) => {
  if (!text) return ''
  const stringText = String(text)
  if (stringText.length <= maxLength) return stringText
  return stringText.substring(0, maxLength) + '...'
}

const showPagination = computed(() => {
  return props.paginationData?.last_page > 1
})

const handleRowClick = (item) => {
  emit('rowClick', item)
  emit('openProfile', item)
}

const handlePageChange = (url) => {
  emit('pageChange', url)
}
</script>

<style scoped>
.classifications-cards-wrapper {
  background: transparent;
  min-height: 400px;
  height: 100%;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: #9c9c9c #eaeaea;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.classification-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e9ecef;
}

.classification-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: #dee2e6;
}

.card-content {
  padding: 12px;
  flex: 1;
}

.classification-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
  color: #1a1a2e;
  margin-bottom: 10px;
  word-break: break-word;
  min-height: 42px;
}

.classification-description {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #6c757d;
  margin-bottom: 14px;
  line-height: 1.4;
}

.description-title {
  font-weight: 500;
  color: #495057;
}

.description-text {
  word-break: break-word;
}

.classification-organizations {
  margin-top: 8px;
}

.organizations-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #495057;
  margin-bottom: 8px;
}

.organizations-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.organization-chip {
  background: #f1f3f5;
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 11px;
  color: #495057;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  transition: background 0.2s;
}

.organization-chip:hover {
  background: #e9ecef;
}

.more-chip {
  background: #e9ecef;
  color: #6c757d;
  font-weight: 500;
}

.more-chip:hover {
  background: #dee2e6;
}

.no-organizations {
  font-size: 12px;
  color: #adb5bd;
  font-style: italic;
  padding: 4px 0;
}

.card-footer {
  padding: 8px 10px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.checkbox-cell {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.organizations-count {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6c757d;
}

.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px;
  color: #666;
  min-height: 400px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-container h3 {
  margin: 0;
  color: #333;
}

.empty-container p {
  margin: 0;
  color: #777;
}

@media (max-width: 1400px) {
  .cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 1000px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }

  .classifications-cards-wrapper {
    padding: 0;
  }
}
</style>