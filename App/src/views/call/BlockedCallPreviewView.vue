<script setup lang="ts">
import { computed, onMounted, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { t } from '@/composables/useT'
import { formatNumber } from '@/utils/numbers'
import { reasonFromBits } from '@/utils/blockEngine'
import AppIcon from '@/components/AppIcon.vue'
import Avatar from '@/components/Avatar.vue'
import BaseButton from '@/components/BaseButton.vue'
import RiskBadge from '@/components/RiskBadge.vue'
import FakeHomeScreen from '@/components/call/FakeHomeScreen.vue'
import appIcon from '@/assets/app-icon.webp'
import type { BlockedPreviewState } from '@/data/fakeScenarios'
import { useCallWallpaper } from '@/composables/useCallWallpaper'
import { applyStatusBar } from '@/utils/statusBar'

/**
 * Mô phỏng cuộc gọi bị chặn: điện thoại không đổ chuông, chỉ có thông báo của Safe Dial trượt xuống
 * (cùng nội dung với thông báo thật ở Notifs.blocked). Dữ liệu kịch bản đi qua history.state.
 */

const router = useRouter()
const settings = useSettingsStore()
const data = (window.history.state?.blockedPreview ?? null) as BlockedPreviewState | null
const shown = ref(false)
const wallpaper = useCallWallpaper()
watchEffect(() => void applyStatusBar({ style: 'dark', color: wallpaper.barColor.value }))

onMounted(() => {
  if (!data) {
    router.replace('/call/simulate')
    return
  }
  // Thông báo đến sau một nhịp, như lúc cuộc gọi vừa bị chặn.
  setTimeout(() => (shown.value = true), 450)
})

const who = computed(() => {
  if (!data) return ''
  if (data.name) return data.name
  return data.number ? formatNumber(data.number, settings.state.homeCountryDial) : t('call.overlay.hiddenCaller')
})
const reason = computed(() => {
  if (!data) return ''
  const r = reasonFromBits(data.reasons)
  const text = r ? t(`common.blockReason.${r}`) : ''
  return data.ruleLabel ? `${text} · ${data.ruleLabel}` : text
})

function exit() {
  if (window.history.state?.back === '/call/simulate') router.back()
  else router.replace('/call/simulate')
}
const openBlocked = () => router.replace('/home/block')
</script>

<template>
  <div v-if="data" class="relative h-full overflow-hidden bg-ink">
    <FakeHomeScreen />

    <div class="pt-safe pointer-events-none absolute inset-x-0 top-0 z-10 px-3">
      <button
        type="button"
        class="tap pointer-events-auto mt-3 grid size-10 place-items-center rounded-full bg-white/25 text-white backdrop-blur"
        :aria-label="t('common.actions.back')"
        @click="exit"
      >
        <AppIcon name="arrow-left" :size="22" />
      </button>
    </div>

    <!-- Thông báo hệ thống của Safe Dial -->
    <Transition name="notif">
      <button
        v-if="shown"
        type="button"
        class="notif tap absolute inset-x-3 z-10 rounded-3xl bg-white/95 p-3.5 text-left text-ink shadow-sheet backdrop-blur"
        role="status"
        @click="openBlocked"
      >
        <span class="flex items-center gap-1.5 text-[12px] text-muted">
          <img :src="appIcon" alt="" width="16" height="16" class="size-4 rounded-[5px]" />
          Safe Dial · {{ t('call.simulate.notif.now') }}
        </span>
        <span class="mt-1.5 flex items-start gap-3">
          <span class="grid size-9 shrink-0 place-items-center rounded-full bg-[#efe8fd] text-blocked">
            <AppIcon :name="data.silenced ? 'bell-off' : 'shield-ban'" :size="19" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[15px] font-semibold">
              {{ data.silenced ? t('call.simulate.silenced') : t('call.simulate.blocked') }} {{ who }}
            </span>
            <span v-if="reason" class="block truncate text-[13px] text-muted">{{ reason }}</span>
          </span>
        </span>
      </button>
    </Transition>

    <!-- Giải thích chuyện gì đã xảy ra -->
    <div class="pb-safe absolute inset-x-0 bottom-0 z-10 px-3">
      <div class="mb-3 rounded-3xl bg-surface p-4 shadow-sheet">
        <div class="flex items-center gap-3">
          <Avatar :name="data.name ?? undefined" :risk="data.risk" :is-private="!data.number" :size="48" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-base font-bold">{{ who }}</p>
            <div class="mt-1"><RiskBadge :risk="data.risk" :category="data.category ?? undefined" /></div>
          </div>
          <span class="grid size-10 shrink-0 place-items-center rounded-full bg-[#efe8fd] text-blocked">
            <AppIcon name="bell-off" :size="20" />
          </span>
        </div>
        <p class="mt-3 text-[14px] leading-snug text-muted">
          {{ data.silenced ? t('call.simulate.notif.silencedHint') : t('call.simulate.notif.blockedHint') }}
        </p>
        <div class="mt-4 flex gap-2">
          <BaseButton class="min-w-0 flex-1 whitespace-nowrap" variant="secondary" @click="openBlocked">{{ t('call.simulate.viewBlocked') }}</BaseButton>
          <BaseButton class="shrink-0" @click="exit">{{ t('common.actions.done') }}</BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notif { top: calc(var(--sai-top) + 64px); }
.notif-enter-active { transition: transform 0.38s cubic-bezier(0.2, 0.9, 0.3, 1.1), opacity 0.25s ease; }
.notif-enter-from { transform: translateY(-140%); opacity: 0; }
@media (prefers-reduced-motion: reduce) { .notif-enter-active { transition: opacity 0.2s ease; } .notif-enter-from { transform: none; } }
</style>
