import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { addCollection } from '@iconify/vue'
import lucide from '@iconify-json/lucide/icons.json'

import App from './App.vue'
import router from './router'
import { initNavigationBar } from './utils/statusBar'
import './assets/main.css'

// Đóng gói sẵn bộ icon lucide để chạy offline trong Capacitor (không gọi api.iconify.design).
addCollection(lucide as Parameters<typeof addCollection>[0])

// Thanh trạng thái được đổi theo từng màn trong router.afterEach (src/router/index.ts).
createApp(App).use(createPinia()).use(router).mount('#app')
void initNavigationBar()
