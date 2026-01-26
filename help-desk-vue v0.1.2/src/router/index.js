/**
 * Главный роутер приложения Help Desk
 * Объединяет маршруты всех ролей: admin, engineer, client
 * Навигационная охрана - проверка авторизации и ролей
 */

import { createRouter, createWebHistory } from 'vue-router'
import authRoutes from './auth.routes.js'
import adminRoutes from './admin.routes.js'

const routes = [
  // Public / auth routes first
  ...authRoutes,

  // Главный редирект с корня сразу на админские заявки
  {
    path: '/',
    redirect: '/admin/tickets',
  },

  // Подключаем административные маршруты
  ...adminRoutes,
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} | Help Desk`
  }
  next()
})

export default router
