import { defineStore } from 'pinia'
import { useCache } from '@/utils/cashe.utils'
import globalApiClient from '@/api/axios.config'

export const useOrganizationsStore = defineStore('organizations', {
  state: () => ({
    organizations: [],
    loading: false,
    currentOrganization: null,
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

    async sendRequestPage(url) {
      console.log('📤 Загружаем опции следующей страницы: ', url)
      const response = await globalApiClient.post(url)
      console.log('📥 Ответ от сервера:', response)
      return response
    },

    async sendRequestLoadOrganizations(searchStr) {
      const requestBody = {
        organization_search: searchStr,
      }
      console.log('📤 Загружаем опции для комбобокс организаций: ', requestBody)
      const response = await globalApiClient.post('/organizations/load_organizations', requestBody)
      console.log('📥 Ответ от сервера:', response)
      return response
    },

    async sendRequestLoadObjects(searchStr) {
      const requestBody = {
        object_search: searchStr,
      }
      console.log('📤 Загружаем опции для комбобокс объектов: ', requestBody)
      const response = await globalApiClient.post('/objects/load_objects', requestBody)
      console.log('📥 Ответ от сервера:', response)
      return response
    },

    async fetchOrganizations(params = {}) {
      this.loading = true
      const cache = this.initCache()
      const cacheKey = cache.getCacheKey('orgs', params)

      if (cache.isCacheValid(cacheKey)) {
        console.log('📦 Используем кэшированные данные для ключа: ', cacheKey)
        const cached = cache.getFromCache(cacheKey)

        this.organizations = cached.data.data || []
        this.pagination = cached.pagination

        this.loading = false
        return cached.response
      }

      try {
        const roles = params.roles ?? params.types ?? []

        const requestBody = {
          organization_search: params.search || '',
          roles,
          type: roles, // оставлено для совместимости, если backend где-то ещё ждёт старое имя
          page: params.page || 1,
          per_page: params.perPage || 20,
        }

        console.log('📤 Отправка запроса /organizations/load_organizations:', requestBody)
        const response = await globalApiClient.post('/organizations/load_organizations', requestBody)
        console.log('📥 Ответ от сервера:', response)

        if (response.data) {
          this.organizations = response.data.data || []
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
        console.error('❌ Ошибка загрузки организаций:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async createOrganization(payload) {
      try {
        const response = await globalApiClient.post('/organizations/store', payload)
        this.clearCache()
        return response
      } catch (error) {
        console.error('❌ Ошибка создания организации:', error)
        throw error
      }
    },

    async updateOrganization(payload) {
      try {
        const response = await globalApiClient.post('/organizations/update', payload)
        this.clearCache()
        return response
      } catch (error) {
        console.error('❌ Ошибка обновления организации:', error)
        throw error
      }
    },

    async deleteOrganizations(organizations) {
      try {
        const payload = {
          organizations: Array.isArray(organizations) ? organizations : [organizations],
        }
        const response = await globalApiClient.post('/organizations/destroy', payload)
        this.clearCache()
        return response
      } catch (error) {
        console.error('❌ Ошибка удаления организаций:', error)
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
      const cacheKey = cache.getCacheKey('orgs', params)
      cache.invalidateCacheKey(cacheKey)
    },

    clearCache() {
      const cache = this.initCache()
      cache.clearCache()
      this.lastParams = null
    },
  },
})