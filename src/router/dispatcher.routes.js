const dispatcherRoutes = [
  
  {
    path: '/dispatcher/tickets',
    name: 'dispatcher-tickets',
    component: () => import('@/views/admin/tickets/AllTickets.vue'),
    meta: {
      title: 'Все заявки',
      requiresAuth: true,
      role: 'dispatcher',
    },
  },
  {
    path: '/dispatcher/tickets/create',
    name: 'dispatcher-create-ticket',
    component: () => import('@/views/admin/tickets/CreateTicket.vue'),
    meta: {
      title: 'Создание заявки',
      requiresAuth: true,
      role: 'dispatcher',
    },
  },
  {
    path: '/dispatcher/tickets/:id',
    name: 'dispatcher-ticket-card',
    component: () => import('@/views/admin/tickets/TicketCard.vue'),
    meta: {
      title: 'Карточка заявки',
      requiresAuth: true,
      role: 'dispatcher',
    },
  },
  {
    path: '/dispatcher/directories/companies',
    name: 'dispatcher-companies',
    component: () => import('@/views/admin/directories/DOrganizations.vue'),
    meta: {
      title: 'Организации',
      requiresAuth: true,
      role: 'dispatcher',
    },
  },
  {
    path: '/dispatcher/directories/objects',
    name: 'dispatcher-objects',
    component: () => import('@/views/admin/directories/DObjects.vue'),
    meta: {
      title: 'Объекты',
      requiresAuth: true,
      role: 'dispatcher',
    },
  },
  {
    path: '/dispatcher/directories/users',
    name: 'dispatcher-users',
    component: () => import('@/views/admin/directories/DUsers.vue'),
    meta: {
      title: 'Пользователи',
      requiresAuth: true,
      role: 'dispatcher',
    },
  },
  {
    path: '/dispatcher/directories/supportGroups',
    name: 'dispatcher-support-groups',
    component: () => import('@/views/admin/directories/DSupportGroups.vue'),
    meta: {
      title: 'Группы поддержки',
      requiresAuth: true,
      role: 'dispatcher',
    },
  },
  {
    path: '/dispatcher/directories/businessProcesses',
    name: 'dispatcher-business-processes',
    component: () => import('@/views/admin/directories/DBusinessProcesses.vue'),
    meta: {
      title: 'Бизнес-процессы',
      requiresAuth: true,
      role: 'dispatcher',
    },
  },
  {
    path: '/dispatcher/analytics/general',
    name: 'dispatcher-analytics',
    component: () => import('@/views/admin/analytics/GeneralAnalytics.vue'),
    meta: {
      title: 'Аналитика',
      requiresAuth: true,
      role: 'dispatcher',
    },
  },
  {
    path: '/dispatcher/analytics/reports',
    name: 'dispatcher-analytics-reports',
    component: () => import('@/views/admin/analytics/ReportsAdmin.vue'),
    meta: {
      title: 'Отчеты',
      requiresAuth: true,
      role: 'dispatcher',
    },
  },
  {
    path: '/dispatcher',
    redirect: '/admin/tickets',
  },
]

export default dispatcherRoutes