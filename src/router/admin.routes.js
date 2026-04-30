/**
 * Маршруты панели администратора
 * Доступны только пользователям с ролью 'admin'
 * Разделы: Заявки (все/создание/карточка), Справочники, Аналитика
 * Вложенные маршруты с общим layout (Layout)
 */

const adminRoutes = [
  {
    path: '/admin/tickets',
    name: 'admin-tickets',
    component: () => import('@/views/admin/tickets/AllTickets.vue'),
    meta: {
      title: 'Все заявки',
      requiresAuth: true,
      role: 'admin',
    },
  },
  {
    path: '/admin/tickets/create',
    name: 'admin-create-ticket',
    component: () => import('@/views/admin/tickets/CreateTicket.vue'),
    meta: {
      title: 'Создание заявки',
      requiresAuth: true,
      role: 'admin',
    },
  },
  {
    path: '/admin/tickets/:id',
    name: 'admin-ticket-card',
    component: () => import('@/views/admin/tickets/TicketCard.vue'),
    meta: {
      title: 'Карточка заявки',
      requiresAuth: true,
      role: 'admin',
    },
  },
  {
    path: '/admin/directories/companies',
    name: 'admin-companies',
    component: () => import('@/views/admin/directories/DOrganizations.vue'),
    meta: {
      title: 'Организации',
      requiresAuth: true,
      role: 'admin',
    },
  },
  {
    path: '/admin/directories/objects',
    name: 'admin-objects',
    component: () => import('@/views/admin/directories/DObjects.vue'),
    meta: {
      title: 'Объекты',
      requiresAuth: true,
      role: 'admin',
    },
  },
  {
    path: '/admin/directories/users',
    name: 'admin-users',
    component: () => import('@/views/admin/directories/DUsers.vue'),
    meta: {
      title: 'Пользователи',
      requiresAuth: true,
      role: 'admin',
    },
  },
  {
    path: '/admin/directories/supportGroups',
    name: 'admin-support-groups',
    component: () => import('@/views/admin/directories/DSupportGroups.vue'),
    meta: {
      title: 'Группы поддержки',
      requiresAuth: true,
      role: 'admin',
    },
  },
  {
  path: '/admin/directories/classifications',
  name: 'DClassifications',
  component: () => import('@/views/admin/directories/DClassifications.vue'),
  meta: {
      title: 'Справочник классификаций',
      requiresAuth: true,
      role: 'admin',
    },
  },
  {
    path: '/admin/directories/businessProcesses',
    name: 'admin-business-processes',
    component: () => import('@/views/admin/directories/DBusinessProcesses.vue'),
    meta: {
      title: 'Бизнес-процессы',
      requiresAuth: true,
      role: 'admin',
    },
  },
  {
    path: '/admin/analytics/general',
    name: 'admin-analytics',
    component: () => import('@/views/admin/analytics/GeneralAnalytics.vue'),
    meta: {
      title: 'Аналитика',
      requiresAuth: true,
      role: 'admin',
    },
  },
  {
    path: '/admin/analytics/reports',
    name: 'admin-analytics-reports',
    component: () => import('@/views/admin/analytics/ReportsAdmin.vue'),
    meta: {
      title: 'Отчеты',
      requiresAuth: true,
      role: 'admin',
    },
  },
  {
    path: '/admin',
    redirect: '/admin/tickets',
  },
]

export default adminRoutes
