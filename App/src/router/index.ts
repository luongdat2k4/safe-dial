import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { applyStatusBar, type StatusBarConfig } from '@/utils/statusBar'

declare module 'vue-router' {
  interface RouteMeta {
    /** Thanh trạng thái của màn này; bỏ trống = nền sáng mặc định. */
    statusBar?: StatusBarConfig
    /** Chặn nút Back (splash, cuộc gọi đang diễn ra). */
    noBack?: boolean
    /** Khoá để Transition coi các tab con là cùng một trang. */
    layoutKey?: string
  }
}

const routes: RouteRecordRaw[] = [
  // Khởi động
  { path: '/', name: 'splash', component: () => import('@/views/boot/SplashView.vue'), meta: { noBack: true } },
  { path: '/language', name: 'language', component: () => import('@/views/boot/LanguageView.vue') },
  { path: '/onboarding', name: 'onboarding', component: () => import('@/views/boot/OnboardingView.vue') },
  { path: '/permissions', name: 'permissions', component: () => import('@/views/boot/PermissionsView.vue') },

  // Màn chính: 4 tab
  {
    path: '/home',
    component: () => import('@/views/home/HomeLayout.vue'),
    meta: { layoutKey: 'home' },
    redirect: '/home/calls',
    children: [
      { path: 'calls', name: 'calls', component: () => import('@/views/home/CallsTab.vue') },
      { path: 'contacts', name: 'contacts', component: () => import('@/views/home/ContactsTab.vue') },
      { path: 'block', name: 'block', component: () => import('@/views/home/BlockTab.vue') },
      { path: 'stats', name: 'stats', component: () => import('@/views/home/StatsTab.vue') },
    ],
  },

  // Quay số, tra cứu, chi tiết số
  { path: '/dialpad', name: 'dialpad', component: () => import('@/views/dial/DialPadView.vue') },
  { path: '/search', name: 'search', component: () => import('@/views/dial/SearchView.vue') },
  { path: '/number/:number', name: 'number', component: () => import('@/views/number/NumberDetailView.vue') },
  { path: '/number/:number/history', name: 'number-history', component: () => import('@/views/number/NumberHistoryView.vue') },
  { path: '/number/:number/stats', name: 'number-stats', component: () => import('@/views/stats/NumberStatsView.vue') },

  // Chặn số
  { path: '/block/rule/new', name: 'block-rule-new', component: () => import('@/views/block/BlockRuleFormView.vue') },
  { path: '/block/test', name: 'block-test', component: () => import('@/views/block/BlockTestView.vue') },

  // Cuộc gọi (mô phỏng)
  { path: '/call/simulate', name: 'call-simulate', component: () => import('@/views/call/SimulateView.vue') },
  { path: '/call/blocked-preview', name: 'call-blocked-preview', component: () => import('@/views/call/BlockedCallPreviewView.vue'), meta: { statusBar: { style: 'dark', color: '#bbb1eb' } } },
  { path: '/call/incoming', name: 'call-incoming', component: () => import('@/views/call/IncomingCallView.vue'), meta: { noBack: true, statusBar: { style: 'dark', color: '#bbb1eb' } } },
  { path: '/call/active', name: 'call-active', component: () => import('@/views/call/ActiveCallView.vue'), meta: { noBack: true } },
  { path: '/call/after', name: 'call-after', component: () => import('@/views/call/AfterCallView.vue') },

  // Cài đặt
  { path: '/settings', name: 'settings', component: () => import('@/views/settings/SettingsView.vue') },
  { path: '/settings/notifications', name: 'settings-notifications', component: () => import('@/views/settings/NotificationsView.vue') },
  { path: '/settings/sound', name: 'settings-sound', component: () => import('@/views/settings/SoundView.vue') },
  { path: '/settings/caller-id', name: 'settings-caller-id', component: () => import('@/views/settings/CallerIdPrefsView.vue') },
  { path: '/settings/feedback', name: 'settings-feedback', component: () => import('@/views/settings/FeedbackView.vue') },
  { path: '/settings/about', name: 'settings-about', component: () => import('@/views/settings/AboutView.vue') },

  { path: '/:pathMatch(.*)*', redirect: '/home/calls' },
]

// Hash history để chạy được trong WebView của Capacitor (capacitor://localhost) mà không cần cấu hình server.
const router = createRouter({ history: createWebHistory(import.meta.env.BASE_URL), routes })

// Đổi thanh trạng thái theo màn hình (route con ghi đè route cha).
router.afterEach((to) => {
  void applyStatusBar(to.meta.statusBar)
})

export default router
