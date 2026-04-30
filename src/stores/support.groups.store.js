/**
 * Хранилище групп поддержки
 */

import { defineStore } from 'pinia'
import { useCache } from '@/utils/cashe.utils'
import globalApiClient from '@/api/axios.config'

export const useSupportGroupsStore = defineStore('support_group', {
  state: () => ({
    groups: [],
    loading: false,
    currentGroup: null,
    pagination: null,
    cacheInstance: null,
    lastParams: null
  }),

  actions: {
    // Инициализация кэша
    initCache() {
      if (!this.cacheInstance) {
        const { 
          getCacheKey, 
          isCacheValid, 
          getFromCache, 
          saveToCache,
          invalidateCacheKey,
          clearCache,
          cache
        } = useCache(5 * 60 * 1000)
        
        this.cacheInstance = {
          getCacheKey,
          isCacheValid,
          getFromCache,
          saveToCache,
          invalidateCacheKey,
          clearCache,
          cache 
        }
      }
      return this.cacheInstance
    },

    // Загрузка списка групп поддержки с фильтрацией
    async fetchSupportGroups(params = {}) {
      this.loading = true
      
      console.log("Параметры загрузки групп поддержки: ", params)
      const cache = this.initCache()
      const cacheKey = this.generateCacheKey(params)
      
      if (cache.isCacheValid(cacheKey)) {
        console.log('📦 Используем кэшированные данные для ключа: ', cacheKey)
        const cached = cache.getFromCache(cacheKey)
        
        this.groups = cached.data.data || []
        this.pagination = cached.pagination
        
        this.loading = false
        return cached.response
      }
      
      try {
        const requestBody = {
          support_group_search: params.search || '',
        }
      
        let route
        if(params.url){
          route = params.url
        }
        else{
          route = '/support_groups/load_support_groups'
        }
      
        console.log('📤 Отправка запроса: ', route, ' ', requestBody)
        const response = await globalApiClient.post(route, requestBody)
        console.log('📥 Ответ от сервера:', response)
      
        if (response.data) {
          this.groups = response.data.data || []
          this.pagination = {
            current_page: response.data.current_page,
            data: response.data.data,
            first_page_url: response.data.first_page_url,
            from: response.data.from,
            last_page: response.data.last_page,
            last_page_url: response.data.last_page_url,
            links: response.data.links,
            next_page_url: response.data.next_page_url,
            path: response.data.path,
            per_page: response.data.per_page,
            prev_page_url: response.data.prev_page_url,
            to: response.data.to,
            total: response.data.total
          }
          
          cache.saveToCache(cacheKey, response.data, this.pagination, response)
          this.lastParams = { ...params }
        }
        return response
      } catch (error) {
        console.error('❌ Ошибка загрузки групп поддержки:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // Загрузка инженеров для комбобокса
    async loadEngineers(searchStr, url = null) {
    try {
      let requestBody = {
        engineer_search: searchStr || ''
      }
    
      let response
      if (url) {
        response = await globalApiClient.get(url)
      } else {
        response = await globalApiClient.post('/support_groups/load_engineers', requestBody)
      }
    
      // Форматируем данные для комбобокса
      const formattedData = {
        ...response.data,
        data: response.data.data.map(engineer => ({
          id: engineer.id,
          full_name: `${engineer.last_name || ''} ${engineer.first_name || ''} ${engineer.middle_name || ''}`.trim(),
          first_name: engineer.first_name,
          last_name: engineer.last_name,
          middle_name: engineer.middle_name,
          email: engineer.email
        }))
      }
    
      return formattedData
    } catch (error) {
      console.error('❌ Ошибка загрузки инженеров:', error)
      return {
        data: [],
        current_page: 1,
        last_page: 1,
        next_page_url: null,
        prev_page_url: null,
        links: []
      }
    }
  },

    // Создание новой группы поддержки
    async createGroup(payload) {
      try {
        console.log('📤 Отправка запроса на создание группы поддержки:', payload)
        const response = await globalApiClient.post('/support_groups/store', payload)
        console.log('📥 Ответ от сервера при создании группы поддержки:', response)
        
        this.clearCache()
        
        return response.data
      } catch (err) {
        console.error('❌ Ошибка при создании группы поддержки:', err)
        if (err.response?.data) {
          return err.response.data
        }
        throw err
      }
    },

    // Обновление группы поддержки
    async updateGroup(payload) {
      try {
        console.log('📤 Отправка запроса на обновление группы поддержки:', payload)
        const response = await globalApiClient.post('/support_groups/update', payload)
        console.log('📥 Ответ от сервера при обновлении группы поддержки:', response)
        
        this.clearCache()
        
        return response.data
      } catch (err) {
        console.error('❌ Ошибка при обновлении группы поддержки:', err)
        if (err.response?.data) {
          return err.response.data
        }
        throw err
      }
    },

    // Удаление групп поддержки
    async deleteGroups(payload) {
      try {
        console.log("🗑️ Удаляем группы поддержки: ", payload)
        const response = await globalApiClient.post('/support_groups/destroy', payload)
        console.log('📥 Ответ от сервера при удалении групп поддержки:', response)
        
        this.clearCache()
        
        return response.data
      } catch (err) {
        console.error('❌ Ошибка при удалении групп поддержки:', err)
        if (err.response?.data) {
          return err.response.data
        }
        throw err
      }
    },

    // Генерация ключа кэша
    generateCacheKey(params) {
      const search = params.search || ''
      let page = 1
      if(params.url){
        const pageParam = params.url.split('?')[1];
        page = pageParam.split('=')[1];
      }
      return `support_groups_search_${search}_page_${page}`
    },
    
    invalidateCacheKey(params) {
      const cache = this.initCache()
      const cacheKey = this.generateCacheKey(params)
      cache.invalidateCacheKey(cacheKey)
    },
    
    clearCache() {
      const cache = this.initCache()
      cache.clearCache()
      this.lastParams = null
    }
  }
})