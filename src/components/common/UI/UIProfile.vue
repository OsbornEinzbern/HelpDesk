<template>
  <div
    class="user-profile"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    :title="userNameDisplay"
  >
    <div class="profile-info">
      <div class="user-details">
        <div class="user-name">{{ userNameDisplay }}</div>
        <div class="user-role">{{ getRoleLabel(userRoleStr) }}</div>
      </div>
      <div class="avatar" :style="avatarGradient" aria-hidden="true">
        {{ userInitials }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { getUserRole, getRoleLabel } from '@/utils/auth.utils'
import { getUserColorSeed, generateColorFromUser, getDisplayUserName, getUserInitials } from '@/utils/profile.utils'

// Emit для открытия модалки (MainLayout слушает)
const emit = defineEmits(['openProfile'])

const authStore = useAuthStore()

// Надёжный геттер user: сначала из store, затем fallback на localStorage (если нужно)
const userData = computed(() => {
  return authStore.user || (() => {
    try {
      const raw = localStorage.getItem('user')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      // Поддержка двух форматов: { user: {...}, token: '...' } или сам user object
      if (parsed && typeof parsed === 'object') {
        if (parsed.user) return parsed.user
        if (parsed.id || parsed.email || parsed.login) return parsed
      }
      return null
    } catch {
      return null
    }
  })()
})

// Формирование отображаемого имени
const userNameDisplay = computed(() => {
  return getDisplayUserName(userData.value)
})

// Нормализация роли для отображения
const userRoleStr = getUserRole()

// Формирование инициалов (max 2 буквы)
const userInitials = computed(() => {
  return getUserInitials(userData.value)
})

// Клик — эмитим событие наверх (layout откроет модалку)
function handleClick() {
  emit('openProfile')
}

// Генерация seed для цветов на основе данных пользователя
const colorSeed = computed(() => {
  return getUserColorSeed(userData.value)
})

// Градиент для аватара
const avatarGradient = computed(() => {
  const seed = colorSeed.value
  const color1 = generateColorFromUser(seed, 0)
  const color2 = generateColorFromUser(seed, 1)
  
  return {
    background: `linear-gradient(135deg, ${color1}, ${color2})`
  }
})
</script>

<style scoped>
.user-profile {
  cursor: pointer;
  outline: none;
}

.profile-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 4px 12px;
  border-radius: 10px;
  transition: background-color 0.2s ease;
  background-color: #031432;;
}

.profile-info:hover {
  background-color: #299f1990;
}

.user-details {
  text-align: right;
}

.user-name {
  font-weight: 500;
  font-size: 14px;
  color: #ffffff;
  line-height: 1.2;
  white-space: nowrap;
  max-width: 170px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 12px;
  color: #bec9d7;
  line-height: 1.2;
  text-align: right;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 400;
  color: rgb(255, 255, 255);
  font-size: 14px;
  flex-shrink: 0;
  text-transform: uppercase;
}
</style>
