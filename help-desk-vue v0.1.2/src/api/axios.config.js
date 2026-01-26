// src/api/axios.config.js
import axios from 'axios'
import { useAuthStore } from '@/stores/auth.store'
import router from '@/router'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Для сессий
  withXSRFToken: true, // Для CSRF токенов
})

// Интерцептор запросов - добавляем CSRF токен
apiClient.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    
    // Добавляем CSRF токен из хранилища
    if (authStore.csrfToken) {
      config.headers['X-CSRF-TOKEN'] = authStore.csrfToken
    }
    
    // Добавляем токен авторизации
    if (authStore.token) {
      config.headers['Authorization'] = `Bearer ${authStore.token}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Интерцептор ответов - обработка ошибок сессии
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const authStore = useAuthStore()
    const originalRequest = error.config
    
    // Обработка 419 ошибки (CSRF токен истек/невалиден)
    if (error.response?.status === 419 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        // Пытаемся обновить CSRF токен
        await authStore.refreshCsrfToken()
        
        // Повторяем оригинальный запрос с новым токеном
        if (authStore.csrfToken) {
          originalRequest.headers['X-CSRF-TOKEN'] = authStore.csrfToken
        }
        
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Не удалось обновить токен - выходим
        authStore.logout()
        router.push({ name: 'login' })
        return Promise.reject(refreshError)
      }
    }
    
    // Обработка 401 ошибки (неавторизован)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      // Проверяем, есть ли refresh токен
      if (authStore.refreshToken) {
        try {
          // Пытаемся обновить access токен
          await authStore.refreshToken()
          
          // Повторяем запрос с новым токеном
          if (authStore.token) {
            originalRequest.headers['Authorization'] = `Bearer ${authStore.token}`
          }
          
          return apiClient(originalRequest)
        } catch (refreshError) {
          // Не удалось обновить токен - выходим
          authStore.logout()
          router.push({ name: 'login' })
          return Promise.reject(refreshError)
        }
      } else {
        // Нет refresh токена - выходим
        authStore.logout()
        router.push({ name: 'login' })
      }
    }
    
    // Обработка 403 ошибки - доступ запрещен
    if (error.response?.status === 403) {
      // Можно показать уведомление о недостатке прав
      console.warn('Доступ запрещен')
      // Или перенаправить на страницу с ошибкой 403
      // router.push({ name: 'forbidden' })
    }
    
    // Обработка 429 ошибки - слишком много запросов
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 5
      console.warn(`Слишком много запросов. Повтор через ${retryAfter} секунд`)
      
      // Ждем и повторяем запрос
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
      return apiClient(originalRequest)
    }
    
    return Promise.reject(error)
  }
)

export default apiClient