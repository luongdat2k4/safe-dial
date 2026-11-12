import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { addCollection } from '@iconify/vue'
import lucide from '@iconify-json/lucide/icons.json'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { initNavigationBar } from './utils/statusBar'
import { Capacitor } from '@capacitor/core'
import { initializeAds } from '@/features/ads/adRuntime'
import './assets/main.css'

// Quảng cáo không cần dữ liệu của app nên SDK khởi động song song; lỗi khởi tạo không được chặn app.
// Chỉ có trên máy thật (bản web không có quảng cáo native).
if (Capacitor.isNativePlatform()) void initializeAds()

// Đóng gói sẵn bộ icon lucide để chạy offline trong Capacitor (không gọi api.iconify.design).
addCollection(lucide as Parameters<typeof addCollection>[0])

// Thanh trạng thái được đổi theo từng màn trong router.afterEach (src/router/index.ts).
createApp(App).use(createPinia()).use(router).use(i18n).mount('#app')
void initNavigationBar()
