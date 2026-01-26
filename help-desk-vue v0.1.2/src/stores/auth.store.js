/**
 * Хранилище аутентификации
 * Текущий пользователь, токен, роль, права доступа
 * Сохранение в localStorage (токен и основные данные)
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient from '@/api/axios.config'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  // Состояние
  const user = ref(null)
  const token = ref(localStorage.getItem('auth_token'))
  const refreshToken = ref(localStorage.getItem('refresh_token'))
  const csrfToken = ref(localStorage.getItem('csrf_token'))
  const isAuthenticated = computed(() => !!token.value)
  const userRole = computed(() => user.value?.role || null)

  // Действия
  const login = async (credentials) => {
    try {
      // Сначала получаем CSRF токен, если его нет
      if (!csrfToken.value) {
        await fetchCsrfToken()
      }
      
      const response = await apiClient.post('/login', credentials)
      
      const { user: userData, accessToken, refreshToken } = response.data
      
      // Сохраняем данные
      user.value = userData
      token.value = accessToken
      refreshToken.value = refreshToken
      
      // Сохраняем в localStorage
      localStorage.setItem('auth_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
      localStorage.setItem('user', JSON.stringify(userData))
      
      return response.data
    } catch (error) {
      console.error('Ошибка входа:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      // Отправляем запрос на выход, если есть токен
      if (token.value) {
        await apiClient.post('/logout')
      }
    } catch (error) {
      console.error('Ошибка при выходе:', error)
    } finally {
      // Очищаем состояние
      clearAuthData()
      
      // Перенаправляем на страницу входа
      router.push({ name: 'login' })
    }
  }

  const refreshTokenRequest = async () => {
    if (!refreshToken.value) {
      throw new Error('No refresh token available')
    }
    
    try {
      const response = await apiClient.post('/refresh-token', {
        refreshToken: refreshToken.value
      })
      
      const { accessToken, refreshToken } = response.data
      
      // Обновляем токены
      token.value = accessToken
      refreshToken.value = refreshToken
      
      // Сохраняем в localStorage
      localStorage.setItem('auth_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
      
      return response.data
    } catch (error) {
      // Если не удалось обновить токен - выходим
      clearAuthData()
      throw error
    }
  }

  const fetchCsrfToken = async () => {
    try {
      const response = await apiClient.get('/csrf-token')
      csrfToken.value = response.data.csrf_token
      localStorage.setItem('csrf_token', csrfToken.value)
      return csrfToken.value
    } catch (error) {
      console.error('Ошибка получения CSRF токена:', error)
      throw error
    }
  }

  const refreshCsrfToken = async () => {
    return await fetchCsrfToken()
  }

  const clearAuthData = () => {
    user.value = null
    token.value = null
    refreshToken.value = null
    
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    localStorage.removeItem('csrf_token')
  }

  const initialize = async () => {
    // Проверяем, есть ли сохраненный токен
    const savedToken = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('user')
    
    if (savedToken && savedUser) {
      try {
        token.value = savedToken
        user.value = JSON.parse(savedUser)
        
        // Получаем CSRF токен при инициализации
        if (!csrfToken.value) {
          await fetchCsrfToken()
        }
        
      } catch (error) {
        console.error('Ошибка инициализации авторизации:', error)
        clearAuthData()
      }
    }
  }

  // Проверка ролей
  const hasRole = (role) => {
    return userRole.value === role
  }

  const hasAnyRole = (roles) => {
    return roles.includes(userRole.value)
  }

  return {
    // Состояние
    user,
    token,
    refreshToken,
    csrfToken,
    isAuthenticated,
    userRole,
    
    // Действия
    login,
    logout,
    refreshTokenRequest,
    fetchCsrfToken,
    refreshCsrfToken,
    initialize,
    clearAuthData,
    
    // Геттеры
    hasRole,
    hasAnyRole,
  }
})