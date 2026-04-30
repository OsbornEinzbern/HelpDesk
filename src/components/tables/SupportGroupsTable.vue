<!--
    Карточки групп поддержки
    Отображение списка групп в виде карточек
-->

<template>
  <UIIcons ref="uiIcons" />
  <div class="groups-cards-wrapper">
    <!-- Состояние загрузки -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <span>Загрузка групп поддержки...</span>
    </div>

    <!-- Состояние "нет данных" -->
    <div v-else-if="!groups || groups.length === 0" class="empty-container">
      <Icon 
        :icon="uiIcons?.icons.usersLoadEmpty"
        class="empty-icon"
        width="80"
        height="80"
      />
      <h3>Группы поддержки не найдены</h3>
      <p>Попробуйте изменить критерии поиска</p>
    </div>

    <!-- Сетка карточек -->
    <div v-else class="cards-grid">
      <div 
        v-for="group in groups" 
        :key="group.id" 
        class="group-card"
        @click="handleRowClick(group)"
      >

        <!-- Основное содержимое карточки -->
        <div class="card-content">
          <!-- Название группы -->
          <div class="group-name" :title="group.name">
            <Icon :icon="uiIcons?.icons.supportGroup" width="22" height="22" class="group-icon" />
            <span>{{ truncateText(group.name, 40) }}</span>
          </div>

          <!-- Инженеры -->
          <div class="group-engineers">
            <div class="engineers-header">
              <span>Инженеры группы:</span>
            </div>
            <div class="engineers-list">
              <div 
                v-for="engineer in getVisibleEngineers(group.users)" 
                :key="engineer.id" 
                class="engineer-chip"
                :title="getEngineerFullName(engineer)"
              >
                {{ getEngineerShortName(engineer) }}
              </div>
              <div 
                v-if="getHiddenEngineersCount(group.users) > 0" 
                class="engineer-chip more-chip"
                :title="`Еще ${getHiddenEngineersCount(group.users)} инженеров`"
              >
                + ...
              </div>
              <div v-if="!group.users || group.users.length === 0" class="no-engineers">
                Не назначены
              </div>
            </div>
          </div>
        </div>

        <!-- Футер карточки с количеством инженеров -->
        <div class="card-footer">
          <!-- Чекбокс -->
          <div class="checkbox-cell" @click.stop>
            <UIInput
              v-if="canSelectGroup()"
              type="checkbox"
              :model-value="isSelected(group.id)"
              @update:model-value="(checked) => toggleSelection(group.id, checked)"
              :disabled="false"
            />
          </div>
          <div class="engineers-count">
            <Icon :icon="uiIcons?.icons.users" width="16" height="16" />
            <span>{{ group.users?.length || 0 }} {{ getEngineersWord(group.users?.length || 0) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Пагинация -->
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
import { Icon } from '@iconify/vue'
import UIIcons from '@/components/common/UI/UIIcons.vue'
import { getUserRole } from '@/utils/auth.utils'
import UIPagination from '@/components/common/UI/UIPagination.vue'

const uiIcons = ref()
const MAX_VISIBLE_ENGINEERS = 5

const props = defineProps({
  groups: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
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
      next_page_url: null
    })
  },
  showPaginationInfo: { type: Boolean, default: true },
  showPageSizeSelector: { type: Boolean, default: false },
  showPageJump: { type: Boolean, default: false },
  compactPagination: { type: Boolean, default: false },
  paginationNoBorder: { type: Boolean, default: false },
  selectedGroupIds: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['rowClick', 'pageChange', 'sortChange', 'openProfile', 'update:selectedGroupIds'])

// Проверка прав на выбор групп
const canSelectAnyGroup = computed(() => {
  return getUserRole() === 'admin'
})

// Проверка, можно ли выбрать группу
const canSelectGroup = () => {
  // Нельзя выбрать: 
  // 1. Если текущий пользователь не админ
  if (!canSelectAnyGroup.value) return false
  return true
}

// Проверка выбрана ли группа
const isSelected = (groupId) => {
  return props.selectedGroupIds.includes(groupId)
}

// Переключение выбора группы
const toggleSelection = (groupId, isChecked) => {
  let newSelection = [...props.selectedGroupIds]
  
  if (isChecked) {
    if (!newSelection.includes(groupId)) {
      newSelection.push(groupId)
    }
  } else {
    newSelection = newSelection.filter(id => id !== groupId)
  }
  emit('update:selectedGroupIds', newSelection)
}

// Получение полного имени инженера
const getEngineerFullName = (engineer) => {
  const parts = [engineer.last_name, engineer.first_name].filter(Boolean)
  return parts.join(' ') || engineer.email || 'Без имени'
}

// Получение короткого имени для чипса
const getEngineerShortName = (engineer) => {
  if (engineer.last_name && engineer.first_name) {
    return `${engineer.last_name} ${engineer.first_name.charAt(0)}.`
  }
  if (engineer.last_name) return engineer.last_name
  if (engineer.first_name) return engineer.first_name
  return engineer.email?.split('@')[0] || 'Инженер'
}

// Склонение слова "инженер"
const getEngineersWord = (count) => {
  if (count === 0) return 'инженеров'
  const lastDigit = count % 10
  const lastTwoDigits = count % 100
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'инженеров'
  if (lastDigit === 1) return 'инженер'
  if (lastDigit >= 2 && lastDigit <= 4) return 'инженера'
  return 'инженеров'
}

// Получение ограниченного списка инженеров для отображения
const getVisibleEngineers = (engineers) => {
  if (!engineers || engineers.length === 0) return []
  let result = engineers.slice(0, MAX_VISIBLE_ENGINEERS)
  return result
}

const getHiddenEngineersCount = (engineers) => {
  if (!engineers || engineers.length <= MAX_VISIBLE_ENGINEERS) return 0
  return engineers.length - MAX_VISIBLE_ENGINEERS
}

// Обрезка текста
const truncateText = (text, maxLength) => {
  if (!text) return ''
  const stringText = String(text)
  if (stringText.length <= maxLength) return stringText
  return stringText.substring(0, maxLength) + '...'
}

// Вычисление видимых страниц пагинации
const showPagination = computed(() => {
  return props.paginationData?.last_page > 1
})

// Обработчик клика по карточке
const handleRowClick = (group) => {
  emit('rowClick', group)
  emit('openProfile', group)
}

// Обработчик изменения страницы
const handlePageChange = (url) => {
  emit('pageChange', url)
}
</script>

<style scoped>
.groups-cards-wrapper {
  background: transparent;
  min-height: 400px;
  height: 100%;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: #9c9c9c #eaeaea;
}

/* Сетка карточек - 4 карточки в строку */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

/* Карточка */
.group-card {
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

.group-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: #dee2e6;
}

/* Шапка карточки */
.card-header {
  padding: 12px 12px 0 12px;
  display: flex;
  justify-content: flex-end;
}

/* Содержимое карточки */
.card-content {
  padding: 12px;
  flex: 1;
}

/* Название группы */
.group-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
  color: #1a1a2e;
  margin-bottom: 12px;
  word-break: break-word;
  max-height: 44px;
}

.group-icon {
  flex-shrink: 0;
  color: #178aee;
}

/* Описание группы */
.group-description {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 13px;
  color: #6c757d;
  margin-bottom: 16px;
  line-height: 1.4;
  word-break: break-word;
}

.description-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: #adb5bd;
}

/* Блок инженеров */
.group-engineers {
  margin-top: 8px;
}

.engineers-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #495057;
  margin-bottom: 8px;
}

.engineers-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.engineer-chip {
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

.engineer-chip:hover {
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

.no-engineers {
  font-size: 12px;
  color: #adb5bd;
  font-style: italic;
  padding: 4px 0;
}

/* Футер карточки */
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

.checkbox-placeholder {
  width: 16px;
}

.engineers-count {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6c757d;
}

/* Пагинация */
.pagination-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 30px;
  padding: 20px;
}

.pagination-btn {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #495057;
}

.pagination-btn:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #178aee;
  color: #178aee;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-pages {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pagination-page {
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #495057;
}

.pagination-page:hover:not(.active) {
  background: #f8f9fa;
  border-color: #178aee;
}

.pagination-page.active {
  background: #178aee;
  border-color: #178aee;
  color: white;
}

.pagination-dots {
  padding: 0 4px;
  color: #6c757d;
}

/* Состояние загрузки */
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

.empty-icon {
  opacity: 0.5;
}

/* Адаптивность */
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
  
  .groups-cards-wrapper {
    padding: 0;
  }
}
</style>