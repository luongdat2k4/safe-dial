import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { addCollection } from '@iconify/vue'
import lucide from '@iconify-json/lucide/icons.json'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

import App from './App.vue'
import router from './router'
import './assets/main.css'

// Đóng gói sẵn bộ icon lucide để chạy offline trong Capacitor (không gọi api.iconify.design).
addCollection(lucide as Parameters<typeof addCollection>[0])

createApp(App).use(createPinia()).use(router).mount('#app')

if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined)
  StatusBar.setBackgroundColor({ color: '#0B6E4F' }).catch(() => undefined)
}
