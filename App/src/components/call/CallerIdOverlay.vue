<script setup lang="ts">
import { computed } from 'vue'
import type { CallerInfo, PopupPosition, PopupSize, RiskLevel } from '@/types'
import type { NativeDecision } from '@/services'
import { signalsFromBits } from '@/utils/blockEngine'
import { useSettingsStore } from '@/stores/settings'
import { t } from '@/composables/useT'
import { countryOf } from '@/utils/countries'
import { formatNumber } from '@/utils/numbers'
import Avatar from '@/components/Avatar.vue'
import AppIcon from '@/components/AppIcon.vue'
import RiskBadge from '@/components/RiskBadge.vue'
import FakeHomeScreen from './FakeHomeScreen.vue'
import { useCallTheme } from '@/composables/useCallTheme'
import { seeThrough } from '@/composables/useSeeThrough'

// preview: đang xem thử, có nút quay lại ở góc trên nên popup đặt ở trên được đẩy xuống để không che nút.
const props = defineProps<{ info: CallerInfo; decision?: NativeDecision | null; size: PopupSize; position: PopupPosition; preview?: boolean }>()
const emit = defineEmits<{ answer: []; reject: []; more: []; message: []; remind: []; block: [] }>()
const settings = useSettingsStore()
/** Giao diện người dùng chọn cho thẻ popup / màn toàn màn hình (dải màu rủi ro giữ nguyên). */
const theme = useCallTheme()
const muted = computed(() => (theme.light.value ? 'text-white/75' : 'text-muted'))
// Nền tím / kính / ảnh: nút Trả lời màu trắng để không lẫn vào nền.
const answerAlt = computed(() => ['gradient', 'glass', 'photo'].includes(theme.current.value))

const risk = computed<RiskLevel>(() => props.info.risk)
const danger = computed(() => risk.value === 'scam' || risk.value === 'spam')
const showWarning = computed(() => danger.value && settings.state.scamWarning)
const title = computed(() => props.info.name ?? formatNumber(props.info.number, settings.state.homeCountryDial))
const category = computed(() => props.info.mark?.category)
const signals = computed(() => (props.decision ? signalsFromBits(props.decision.reasons).map((s) => t(`common.signal.${s}`)).join(', ') : ''))
const subline = computed(() =>
  category.value ? t('call.overlay.marked', { category: t(`common.category.${category.value}`) }) : signals.value ? t('call.overlay.signals', { list: signals.value }) : '',
)

const place = computed(() => {
  const c = countryOf(props.info.number)
  const parts: string[] = []
  if (!props.info.number) return t('call.overlay.hiddenCaller')
  const loc = c ? c.name : t('call.overlay.localCountry')
  parts.push(`${c ? c.flag + ' ' : ''}${loc}`)
  return parts.join(' · ')
})

const head = computed(
  () =>
    ({
      // Dải tiêu đề hoà theo nền của giao diện: chỉ phủ nhẹ màu rủi ro (tint); chấm biểu tượng giữ màu rủi ro đậm.
      safe: { tint: 'bg-primary/10', dot: 'bg-primary', icon: 'shield-check', pulse: false },
      unknown: { tint: 'bg-unknown/10', dot: 'bg-unknown', icon: 'circle-help', pulse: false },
      spam: { tint: 'bg-spam/15', dot: 'bg-spam', icon: 'shield-x', pulse: false },
      scam: { tint: 'bg-scam/20', dot: 'bg-scam', icon: 'shield-alert', pulse: true },
    })[risk.value],
)

const bgFull = computed(
  () =>
    ({
      safe: 'from-[#f4edff] to-[#fffaff]',
      unknown: 'from-[#f2effa] to-[#fffaff]',
      spam: 'from-[#fff4e9] to-[#fffaff]',
      scam: 'from-[#ffe9f1] to-[#fffaff]',
    })[risk.value],
)

const edge = computed(
  () => ({ top: props.preview ? 'top-24' : 'top-10', center: 'top-1/2 -translate-y-1/2', bottom: 'bottom-6' })[props.position],
)

const warnText = computed(() =>
  category.value ? t('call.overlay.warnMarked', { category: t(`common.category.${category.value}`) }) : t('call.overlay.warnGeneric'),
)
</script>

<template>
  <!-- Toàn màn hình -->
  <div v-if="size === 'full'" class="absolute inset-0 overflow-hidden">
  <!-- Máy thật: phía sau là màn hình thật của điện thoại (cửa sổ trong suốt); web: màn hình chính giả. -->
  <FakeHomeScreen v-if="theme.glass.value && !seeThrough" />
  <div
    class="pt-safe pb-safe absolute inset-0 flex flex-col"
    :class="[theme.fullStyle.value ? '' : `bg-gradient-to-b ${bgFull}`, theme.light.value ? 'text-white' : 'text-ink', theme.glass.value ? 'backdrop-blur-xl' : '']"
    :style="theme.fullStyle.value"
  >
    <div class="flex items-center justify-center gap-2 pt-6 text-sm font-semibold opacity-90">
      <AppIcon :name="head.icon" :size="18" :class="head.pulse ? 'warn-blink' : ''" />{{ t(`common.risk.${risk}`) }} · {{ t('call.overlay.incoming') }}
    </div>
    <div class="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <Avatar :name="info.name" :risk="risk" :is-private="!info.number" :size="112" />
      <h2 class="mt-5 text-3xl leading-tight font-bold break-words">{{ title }}</h2>
      <p v-if="info.name && info.number" class="mt-1 text-lg opacity-85">{{ formatNumber(info.number, settings.state.homeCountryDial) }}</p>
      <p class="mt-1 text-sm opacity-75">{{ place }}</p>
      <div class="mt-3"><RiskBadge :risk="risk" :category="info.mark?.category" size="md" /></div>
      <p v-if="subline" class="mt-2 text-sm opacity-85">{{ subline }}</p>
      <div v-if="showWarning" class="mt-5 flex max-w-xs items-start gap-2 rounded-2xl bg-white/90 text-scam px-4 py-3 text-left text-sm leading-snug" role="alert">
        <AppIcon name="triangle-alert" :size="18" class="warn-blink mt-0.5 shrink-0" />{{ warnText }}
      </div>
    </div>
    <div class="mx-6 mb-4 flex justify-around">
      <button v-for="q in ['message', 'remind', 'block'] as const" :key="q" type="button" class="tap flex w-20 flex-col items-center gap-1.5 text-xs" @click="q === 'message' ? emit('message') : q === 'remind' ? emit('remind') : emit('block')">
        <span class="grid size-12 place-items-center rounded-full bg-white text-ink shadow-card">
          <AppIcon :name="q === 'message' ? 'message-square-text' : q === 'remind' ? 'alarm-clock' : 'ban'" :size="22" />
        </span>
        {{ t(`call.overlay.quick.${q}`) }}
      </button>
    </div>
    <div class="mb-8 flex items-center justify-around px-10">
      <button type="button" class="tap flex flex-col items-center gap-2 text-sm" @click="emit('reject')">
        <span class="grid size-[72px] place-items-center rounded-full hangup-button" :class="{ 'on-dark': theme.light.value }"><AppIcon name="phone-off" :size="32" /></span>
        {{ t('call.overlay.reject') }}
      </button>
      <button type="button" class="tap flex flex-col items-center gap-2 text-sm" @click="emit('answer')">
        <span class="ring-pulse grid size-[72px] place-items-center rounded-full" :class="answerAlt ? 'bg-white text-primary' : 'accent-gradient'"><AppIcon name="phone" :size="32" /></span>
        {{ t('call.overlay.answer') }}
      </button>
    </div>
  </div>
  </div>

  <!-- Popup kiểu cổ điển trên nền màn hình chính giả -->
  <div v-else class="absolute inset-0 overflow-hidden">
    <FakeHomeScreen v-if="!seeThrough" />
    <div class="absolute inset-0 bg-black/25" />
    <div class="absolute inset-x-0 px-3" :class="edge">
      <div
        class="overflow-hidden rounded-3xl shadow-sheet"
        :class="[theme.light.value ? 'text-white' : 'text-ink', theme.glass.value ? 'border border-white/35 backdrop-blur-xl' : '']"
        :style="theme.cardStyle.value"
        role="dialog"
        :aria-label="t('call.overlay.incoming')"
      >
        <div class="head-strip flex items-center gap-2.5 px-4 py-2 text-sm font-semibold" :class="head.tint">
          <span class="grid size-7 shrink-0 place-items-center rounded-full text-white" :class="head.dot">
            <AppIcon :name="head.icon" :size="16" :class="head.pulse ? 'warn-blink' : ''" />
          </span>
          <span class="flex-1">{{ t(`call.overlay.head.${risk}`) }}</span>
          <button
            type="button"
            class="tap grid size-8 place-items-center rounded-full"
            :class="theme.light.value ? 'bg-white/15' : 'bg-ink/5'"
            :aria-label="t('call.overlay.moreAria')"
            @click="emit('more')"
          >
            <AppIcon name="ellipsis" :size="18" />
          </button>
        </div>
        <div>
        <div class="flex items-center gap-3 px-4 pt-3">
          <Avatar :name="info.name" :risk="risk" :is-private="!info.number" :size="52" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-lg font-bold">{{ title }}</p>
            <p v-if="info.name && info.number" class="truncate text-sm" :class="muted">{{ formatNumber(info.number, settings.state.homeCountryDial) }}</p>
            <p class="truncate text-[13px]" :class="muted">{{ place }}</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2 px-4 pt-2.5">
          <RiskBadge :risk="risk" :category="info.mark?.category" size="md" />
          <span v-if="subline" class="text-[13px]" :class="muted">{{ subline }}</span>
        </div>
        <div v-if="showWarning" class="mx-4 mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-[13px] leading-snug" :class="risk === 'scam' ? 'bg-scam-soft text-scam' : 'bg-spam-soft text-spam'" role="alert">
          <AppIcon name="triangle-alert" :size="16" class="mt-0.5 shrink-0" />{{ warnText }}
        </div>
        <div class="flex gap-3 p-4">
          <button type="button" class="tap flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-scam font-semibold text-white" @click="emit('reject')">
            <AppIcon name="phone-off" :size="20" />{{ t('call.overlay.reject') }}
          </button>
          <button type="button" class="tap ring-pulse flex h-12 flex-1 items-center justify-center gap-2 rounded-full font-semibold" :class="answerAlt ? 'bg-white text-primary' : 'bg-primary text-white'" @click="emit('answer')">
            <AppIcon name="phone" :size="20" />{{ t('call.overlay.answer') }}
          </button>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Đường kẻ mảnh tách dải tiêu đề khỏi thân thẻ, hợp cả nền sáng lẫn nền tối. */
.head-strip { border-bottom: 1px solid color-mix(in srgb, currentColor 10%, transparent); }
</style>
