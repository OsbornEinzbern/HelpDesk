import { defineStore } from 'pinia'
import { useCache } from '@/utils/cashe.utils'
import globalApiClient from '@/api/axios.config'

export const useClassificationsStore = defineStore('classifications', {
  state: () => ({
    classifications: [],
    loading: false,
    currentClassification: null,
    pagination: null,
    cacheInstance: null,
    lastParams: null,
  }),

  actions: {
    initCache() {
      if (!this.cacheInstance) {
        const {
          getCacheKey,
          isCacheValid,
          getFromCache,
          saveToCache,
          invalidateCacheKey,
          clearCache,
          cache,
        } = useCache(5 * 60 * 1000)

        this.cacheInstance = {
          getCacheKey,
          isCacheValid,
          getFromCache,
          saveToCache,
          invalidateCacheKey,
          clearCache,
          cache,
        }
      }
      return this.cacheInstance
    },

    async fetchClassifications(params = {}) {
      this.loading = true
      const cache = this.initCache()
      const cacheKey = cache.getCacheKey('classifications', params)

      if (cache.isCacheValid(cacheKey)) {
        console.log('📦 Используем кэшированные данные для ключа: ', cacheKey)
        const cached = cache.getFromCache(cacheKey)

        this.classifications = cached.data.data || []
        this.pagination = cached.pagination

        this.loading = false
        return cached.response
      }

      try {
        const requestBody = {
          search: params.search || '',
          classification_search: params.search || '',
          page: params.page || 1,
          per_page: params.perPage || 20,
        }

        console.log('📤 Отправка запроса /classifications/load_classifications:', requestBody)

        const response = params.url
          ? await globalApiClient.post(params.url, requestBody)
          : await globalApiClient.post('/classifications/load_classifications', requestBody)

        console.log('📥 Ответ от сервера:', response)

        if (response.data) {
          this.classifications = response.data.data || []
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
            total: response.data.total,
          }

          cache.saveToCache(cacheKey, response.data, this.pagination, response)
          this.lastParams = { ...params }
        }

        return response
      } catch (error) {
        console.error('❌ Ошибка загрузки классификаций:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async loadClientOrganizations(searchStr = '') {
      try {
        const requestBody = {
          organization_search: searchStr,
        }

        console.log('📤 Загружаем client organizations:', requestBody)
        const response = await globalApiClient.post('/classifications/load_client_organizations', requestBody)
        console.log('📥 Ответ от сервера:', response)
        return response
      } catch (error) {
        console.error('❌ Ошибка загрузки организаций клиентов:', error)
        throw error
      }
    },

    async createClassification(payload) {
      try {
        const response = await globalApiClient.post('/classifications/store', payload)
        this.clearCache()
        return response
      } catch (error) {
        console.error('❌ Ошибка создания классификации:', error)
        throw error
      }
    },

    async updateClassification(payload) {
      try {
        const response = await globalApiClient.post('/classifications/update', payload)
        this.clearCache()
        return response
      } catch (error) {
        console.error('❌ Ошибка обновления классификации:', error)
        throw error
      }
    },

    async deleteClassifications(payload) {
      try {
        const requestBody = Array.isArray(payload)
          ? { classifications: payload }
          : payload

        const response = await globalApiClient.post('/classifications/destroy', requestBody)
        this.clearCache()
        return response
      } catch (error) {
        console.error('❌ Ошибка удаления классификаций:', error)
        throw error
      }
    },

    clearCacheByPrefix(prefix) {
      const cache = this.initCache()
      if (cache.cache?.value) {
        const keysToDelete = []
        cache.cache.value.forEach((_, key) => {
          if (key.startsWith(prefix)) {
            keysToDelete.push(key)
          }
        })
        keysToDelete.forEach((key) => cache.cache.value.delete(key))
        if (keysToDelete.length > 0) {
          console.log(`🗑️ Удалено ${keysToDelete.length} ключей с префиксом ${prefix}:`, keysToDelete)
        }
      }
    },

    invalidateCacheKey(params) {
      const cache = this.initCache()
      const cacheKey = cache.getCacheKey('classifications', params)
      cache.invalidateCacheKey(cacheKey)
    },

    clearCache() {
      const cache = this.initCache()
      cache.clearCache()
      this.lastParams = null
    },
  },
})