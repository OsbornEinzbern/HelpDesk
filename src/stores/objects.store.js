/**
 * Хранилище объектов
 */

import { defineStore } from 'pinia'
import { useCache } from '@/utils/cashe.utils'
import globalApiClient from '@/api/axios.config'

export const useObjectsStore = defineStore('object', {
  state: () => ({
    objects: [],
    loading: false,
    currentObject: null,
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

    // Загрузка списка объектов с фильтрацией
    async fetchObjects(params = {}) {
      this.loading = true
      
      console.log("Параметры загрузки объектов: ", params)
      const cache = this.initCache()
      const cacheKey = this.generateCacheKey(params)
      
      if (cache.isCacheValid(cacheKey)) {
        console.log('📦 Используем кэшированные данные для ключа: ', cacheKey)
        const cached = cache.getFromCache(cacheKey)
        
        this.objects = cached.data.data || []
        this.pagination = cached.pagination
        
        this.loading = false
        return cached.response
      }
      
      try {
        let requestBody = {}
        if(params.organizations && params.organizations.length > 0){
          requestBody = {
            object_search: params.search || '',
            organizations: params.organizations || []
          }
        }
        else{
          requestBody = {
            object_search: params.search || ''
          }
        }
        
        let route
        if(params.url){
          route = params.url
        }
        else{
          route = '/objects/load_objects'
        }
      
        console.log('📤 Отправка запроса ', route, ' ', requestBody)
        
        const response = await globalApiClient.post(route, requestBody)
        console.log('📥 Ответ от сервера:', response)
      
        if (response.data) {
          this.objects = response.data.data || []
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
        console.error('❌ Ошибка загрузки объектов:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // Создание нового объекта
    async createObject(payload) {
      try {
        console.log('📤 Отправка запроса на создание объекта:', payload)
        const response = await globalApiClient.post('/objects/store', payload)
        console.log('📥 Ответ от сервера при создании объекта:', response)
        
        // Очищаем кэш после создания
        this.clearCache()
        
        return response.data
      } catch (err) {
        console.error('❌ Ошибка при создании объекта:', err)
        if (err.response?.data) {
          return err.response.data
        }
        throw err
      }
    },

    // Обновление объекта
    async updateObject(payload) {
      try {
        console.log('📤 Отправка запроса на обновление объекта:', payload)
        const response = await globalApiClient.post('/objects/update', payload)
        console.log('📥 Ответ от сервера при обновлении объекта:', response)
        
        // Очищаем кэш после обновления
        this.clearCache()
        
        return response.data
      } catch (err) {
        console.error('❌ Ошибка при обновлении объекта:', err)
        if (err.response?.data) {
          return err.response.data
        }
        throw err
      }
    },

    // Удаление объектов
    async deleteObjects(payload) {
      try {
        console.log("🗑️ Удаляем объекты: ", payload)
        const response = await globalApiClient.post('/objects/destroy', payload)
        console.log('📥 Ответ от сервера при удалении объектов:', response)
        
        // Очищаем кэш после удаления
        this.clearCache()
        
        return response.data
      } catch (err) {
        console.error('❌ Ошибка при удалении объектов:', err)
        if (err.response?.data) {
          return err.response.data
        }
        throw err
      }
    },

    // Очистка кэша по префиксу
    clearCacheByPrefix(prefix) {
      const cache = this.initCache()
      if (cache.cache?.value) {
        const keysToDelete = []
        cache.cache.value.forEach((_, key) => {
          if (key.startsWith(prefix)) {
            keysToDelete.push(key)
          }
        })
        keysToDelete.forEach(key => cache.cache.value.delete(key))
        if (keysToDelete.length > 0) {
          console.log(`🗑️ Удалено ${keysToDelete.length} ключей с префиксом ${prefix}:`, keysToDelete)
        }
      }
    },

    // Генерация ключа кэша на основе параметров
    generateCacheKey(params) {
      const search = params.search || ''
      const organizations = params.organizations || []
      let page = 1
      if(params.url){
        const pageParam = params.url.split('?')[1];
        page = pageParam.split('=')[1];
      }
      // Сортируем ID организаций для стабильности ключа
      const orgsKey = [...organizations].sort().join(',')
      return `objects_search_${search}_orgs_${orgsKey}_page_${page}`
    },
    
    invalidateCacheKey(params) {
      const cache = this.initCache()
      const cacheKey = cache.getCacheKey('objects', params)
      cache.invalidateCacheKey(cacheKey)
    },
    
    clearCache() {
      const cache = this.initCache()
      cache.clearCache()
      this.lastParams = null
    }
  }
})