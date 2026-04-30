/**
 * Хэширование строки для генерации цвета
 * @param {string} str - строка для хэширования
 * @returns {number} хэш-значение
 */
export const hashString = (str) => {
  if (!str) return 0
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Генерация цвета на основе seed строки
 * @param {string} seed - строка для генерации цвета
 * @param {number} offset - смещение для второго цвета (0 или 1)
 * @returns {string} цвет в формате HSL
 */
export const generateColorFromUser = (seed, offset = 0) => {
  if (!seed) {
    // Если нет данных, возвращаем цвета по умолчанию
    const defaultColors = [
      { h: 210, s: 80, l: 50 }, // Синий
      { h: 120, s: 80, l: 45 }  // Зеленый
    ]
    return `hsl(${defaultColors[offset].h}, ${defaultColors[offset].s}%, ${defaultColors[offset].l}%)`
  }
  
  // Используем хэш для генерации оттенка
  const hash = hashString(seed)
  
  // Генерируем два разных оттенка на основе одного seed
  // Первый цвет: от 0 до 360
  const hue1 = hash % 360
  
  // Второй цвет: сдвигаем на 30-60 градусов для гармоничного сочетания
  const hue2 = (hue1 + 230 + (hash % 30)) % 360
  
  // Насыщенность: от 60% до 90%
  const saturation = 80 + (hash % 30)
  
  // Светлота: от 40% до 60% для насыщенных цветов
  const lightness1 = 40 + (hash % 20)
  const lightness2 = 40 + ((hash >> 8) % 20)
  
  if (offset === 0) {
    return `hsl(${hue1}, ${saturation}%, ${lightness1}%)`
  } else {
    return `hsl(${hue2}, ${saturation}%, ${lightness2}%)`
  }
}

/**
 * Получение seed для генерации цвета пользователя
 * @param {Object} user - объект пользователя
 * @returns {string|null} seed строка или null
 */
export const getUserColorSeed = (user) => {
  if (!user) return null
  
  // Собираем уникальные данные пользователя для генерации цвета
  const seedData = [
    user.id,
    user.firstName || user.first_name,
    user.lastName || user.last_name,
    user.middleName || user.middle_name
  ].filter(Boolean).join('_')
  
  return seedData || null
}

/**
 * Получение градиента для аватара пользователя
 * @param {Object} user - объект пользователя
 * @returns {Object} объект с CSS свойством background
 */
export const getAvatarGradient = (user) => {
  const seed = getUserColorSeed(user)
  const color1 = generateColorFromUser(seed, 0)
  const color2 = generateColorFromUser(seed, 1)
  
  return {
    background: `linear-gradient(135deg, ${color1}, ${color2})`
  }
}

/**
 * Получение инициалов пользователя (максимум 2 буквы)
 * @param {Object} user - объект пользователя
 * @returns {string} инициалы пользователя
 */
export const getUserInitials = (user) => {
  if (!user) return ''
  
  const lastName = user.last_name || user.lastName || ''
  const firstName = user.first_name || user.firstName || ''
  
  // Формируем инициалы из фамилии и имени
  if (lastName && firstName) {
    return (lastName[0] + firstName[0]).toUpperCase()
  }
  
  // Если есть только фамилия
  if (lastName) return lastName[0].toUpperCase()
  
  // Если есть только имя
  if (firstName) return firstName[0].toUpperCase()
  
  // Если есть email, берем первую букву
  const email = user.email || ''
  if (email) return email[0].toUpperCase()
  
  return 'П'
}

/**
 * Получение полного имени пользователя
 * @param {Object} user - объект пользователя
 * @returns {string} полное имя пользователя
 */
export const getUserFullName = (user) => {
  if (!user) return 'Пользователь'
  
  const lastName = user.last_name || user.lastName || ''
  const firstName = user.first_name || user.firstName || ''
  const middleName = user.middle_name || user.middleName || ''
  
  const parts = [lastName, firstName, middleName].filter(Boolean)
  
  if (parts.length > 0) {
    return parts.join(' ')
  }
  
  return user.email || user.login || 'Пользователь'
}

/**
 * Получение короткого имени для отображения (Фамилия И.)
 * @param {Object} user - объект пользователя
 * @returns {string} короткое имя пользователя
 */
export const getUserShortName = (user) => {
  if (!user) return 'Пользователь'
  
  const lastName = user.last_name || user.lastName || ''
  const firstName = user.first_name || user.firstName || ''
  
  if (lastName && firstName) {
    return `${lastName} ${firstName.charAt(0)}.`
  }
  
  if (lastName) return lastName
  if (firstName) return firstName
  
  const email = user.email || ''
  if (email) return email.split('@')[0]
  
  return 'Пользователь'
}

/**
 * Получение отображаемого имени пользователя для UIProfile
 * @param {Object} user - объект пользователя
 * @returns {string} отображаемое имя
 */
export const getDisplayUserName = (user) => {
  if (!user) return 'Пользователь'
  
  const lastName = user.lastName || user.last_name || ''
  const firstName = user.firstName || user.first_name || ''
  
  // Если есть фамилия и имя — возвращаем "Фамилия И."
  if (lastName && firstName) {
    const initialFirst = (firstName || '').trim()[0] || ''
    return `${lastName} ${initialFirst}.`
  }
  
  // Если нет фамилии/имени — пробуем более общие поля
  return user.name || user.login || user.email || 'Пользователь'
}