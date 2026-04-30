/**
 * Хранилище заявок
 * Список заявок, текущие фильтры, сортировка, пагинация
 * Кэширование данных, оптимизация запросов к серверу
 */

import { defineStore } from 'pinia'

export const useTicketsStore = defineStore('tickets', {
  state: () => ({
    tickets: [],
    total: 0,
    loading: false,
  }),

  actions: {
    
  },
})
