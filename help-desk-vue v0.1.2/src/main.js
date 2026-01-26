/*import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')*/

import { createApp } from 'vue'
import { createPinia } from 'pinia' // Импортируем Pinia
import App from './App.vue'
import router from './router'
import './assets/styles/main.css'
import './assets/styles/admin.css'

const app = createApp(App)
// Создаём и подключаем Pinia
const pinia = createPinia()
app.use(pinia)

app.use(router)

// Просто монтируем приложение
app.mount('#app')
