<!-- 
    Компонент-хранилище иконок из библиотеки Iconify
    Используется во всем приложении для единообразия иконок
    Иконки соответствуют макетам из Figma
-->

<template>
  <!-- Этот компонент не рендерит ничего сам, только предоставляет иконки -->
  <slot></slot>
</template>

<script setup>

// Словарь всех иконок проекта
const icons = {
  // Навигация и стрелки
  arrowRight: 'mdi:chevron-right',
  arrowLeft: 'mdi:chevron-left',
  arrowDown: 'mdi:chevron-down',
  arrowUp: 'mdi:chevron-up',
  arrowDoubleRight: 'mdi:chevron-double-right',
  arrowDoubleLeft: 'mdi:chevron-double-left',
  menu: 'mdi:menu',
  menuOpen: 'mdi:menu-open',
  menuClose: 'mdi:menu-close',
  
  // Разделы меню
  tickets: 'mdi:email-multiple-outline',
  directories: 'mdi:folder-multiple-outline',
  analytics: 'mdi:graph-line',
  calendar: 'mdi:calendar-outline',
  
  // Подразделы
  allTickets: 'mdi:format-list-bulleted',
  createTicket: 'mdi:plus-circle-outline',
  companies: 'mdi:briefcase-variant',
  users: 'mdi:account-group-outline',
  generalAnalytics: 'mdi:chart-bar',
  reports: 'mdi:file-document-outline',
  supportGroup: 'mdi:account-wrench-outline',
  businessProcess: 'mdi:transit-connection-variant',

  // Объекты
  objectSearch: 'mdi:home-search-outline',
  objectCreate: 'mdi:house-add-outline',
  objectLoadEmpty: 'mdi:home-off-outline',
  countOffices: 'mdi:office-building-location-outline',

  // Группы поддержки
  supportGroupCreate: 'mdi:account-multiple-add-outline',

  // Бизнес-процессы
  processSearch: 'mdi:text-box-search-outline',

  // Заявки
  ticketsLoadEmpty: 'mdi:email-off-outline',
  ticketSearch: 'mdi:email-search-outline',

  // UI элементы
  menuSidebar: 'mdi:menu-open',
  usersLoadEmpty: 'mdi:account-off-outline',
  userCreate: 'mdi:account-plus-outline',
  userSearch: 'mdi:account-search-outline',
  organizationsLoadEmpty: 'mdi:briefcase-variant-off-outline',
  organizationSearch: 'mdi:briefcase-search-outline',
  organizationCreate: 'mdi:briefcase-plus-outline',
  filter: 'mdi-filter-outline',
  notificationsBell: 'mdi:notifications',
  save: 'mdi:checkbox-marked-outline',
  changeHistory: 'mdi:history',
  warning: 'mdi:warning-circle-outline',
  eye: 'mdi:eye-outline',
  eyeOff: 'mdi:eye-off-outline',
  success: 'mdi:success-circle-outline',
  editPassword: 'mdi:shield-edit-outline',
  info: 'mdi:information-variant-circle-outline',

  // Кнопки профилей
  engineerProfile: 'mdi:account-wrench',
  clientProfile: 'mdi:user-tie',
  organizationProfile: 'mdi:briefcase-variant',
  
  // Действия
  ticketEdit: 'mdi:email-edit-outline',
  close: 'mdi:close-circle-outline',
  edit: 'mdi:pencil',
  editOutline: 'mdi:pencil-outline',
  delete: 'mdi:delete',
  deleteOutline: 'mdi:delete-outline',
  reload: 'mdi:reload',
  add: 'mdi:plus',
  search: 'mdi:search',
  download: 'mdi:download',
  upload: 'mdi:upload',
  refresh: 'mdi:refresh',
  checkBoxArrow: 'mdi:check-bold',
}

// Просто экспортируем объект с иконками
defineExpose({
  icons
})
</script>
