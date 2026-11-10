<script setup lang="ts">
import { computed } from 'vue'
import type { CallerInfo, PopupPosition, PopupSize, RiskLevel } from '@/types'
import type { Decision } from '@/utils/blockEngine'
import { useSettingsStore } from '@/stores/settings'
import { t } from '@/composables/useT'
import { countryOf } from '@/utils/countries'
import { formatNumber } from '@/utils/numbers'
import Avatar from '@/components/Avatar.vue'
import AppIcon from '@/components/AppIcon.vue'
import RiskBadge from '@/components/RiskBadge.vue'
import FakeHomeScreen from './FakeHomeScreen.vue'

const props = defineProps<{ info: CallerInfo; decision?: Decision | null; size: PopupSize; position: PopupPosition }>()
const emit = defineEmits<{ answer: []; reject: []; more: []; message: []; remind: []; block: [] }>()
const settings = useSettingsStore()

const risk = computed<RiskLevel>(() => props.info.risk)
const danger = computed(() => risk.value === 'scam' || risk.value === 'spam')
const showWarning = computed(() => danger.value && settings.state.scamWarning)
const title = computed(() => props.info.name ?? formatNumber(props.info.number, settings.state.homeCountryDial))
const reports = computed(() => props.info.profile?.reportCount ?? 0)

const place = computed(() => {
  const c = countryOf(props.info.number)
  const parts: string[] = []
  if (!props.info.number) return t('call.overlay.hiddenCaller')
  const loc = props.info.profile?.location ?? (c ? c.name : t('call.overlay.localCountry'))
  parts.push(`${c ? c.flag + ' ' : ''}${loc}`)
  if (props.info.profile?.carrier) parts.push(props.info.profile.carrier)
  return parts.join(' · ')
})

const head = computed(
  () =>
    ({
      safe: { cls: 'bg-primary text-white', icon: 'shield-check', pulse: false },
      unknown: { cls: 'bg-unknown text-white', icon: 'circle-help', pulse: false },
      spam: { cls: 'bg-spam text-white', icon: 'shield-x', pulse: false },
      scam: { cls: 'bg-scam text-white', icon: 'shield-alert', pulse: true },
    })[risk.value],
)

const bgFull = computed(
  () =>
    ({
      safe: 'from-[#0b6e4f] to-[#06382a]',
      unknown: 'from-[#475569] to-[#1e293b]',
      spam: 'from-[#b45f06] to-[#4a2702]',
      scam: 'from-[#b42318] to-[#4c0f0a]',
    })[risk.value],
)

const edge = computed(
  () => ({ top: 'top-10', center: 'top-1/2 -translate-y-1/2', bottom: 'bottom-6' })[props.position],
)

const warnText = computed(() =>
  reports.value > 0 ? t('call.overlay.warnReports', { n: reports.value.toLocaleString('vi-VN') }) : t('call.overlay.warnGeneric'),
)
</script>

<template>
  <!-- Toàn màn hình -->
  <div v-if="size === 'full'" class="pt-safe pb-safe absolute inset-0 flex flex-col bg-gradient-to-b text-white" :class="bgFull">
    <div class="flex items-center justify-center gap-2 pt-6 text-sm font-semibold opacity-90">
      <AppIcon :name="head.icon" :size="18" :class="head.pulse ? 'warn-blink' : ''" />{{ t(`common.risk.${risk}`) }} · {{ t('call.overlay.incoming') }}
    </div>
    <div class="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <Avatar :name="info.name" :risk="risk" :is-private="!info.number" :size="112" />
      <h2 class="mt-5 text-3xl leading-tight font-bold break-words">{{ title }}</h2>
      <p v-if="info.name && info.number" class="mt-1 text-lg opacity-85">{{ formatNumber(info.number, settings.state.homeCountryDial) }}</p>
      <p class="mt-1 text-sm opacity-75">{{ place }}</p>
      <div class="mt-3"><RiskBadge :risk="risk" :category="info.profile?.category" size="md" /></div>
      <p v-if="reports" class="mt-2 text-sm opacity-85">{{ t('call.overlay.reports', { n: reports.toLocaleString('vi-VN') }) }}</p>
      <div v-if="showWarning" class="mt-5 flex max-w-xs items-start gap-2 rounded-2xl bg-black/30 px-4 py-3 text-left text-sm leading-snug" role="alert">
        <AppIcon name="triangle-alert" :size="18" class="warn-blink mt-0.5 shrink-0" />{{ warnText }}
      </div>
    </div>
    <div class="mx-6 mb-4 flex justify-around">
      <button v-for="q in ['message', 'remind', 'block'] as const" :key="q" type="button" class="tap flex w-20 flex-col items-center gap-1.5 text-xs" @click="q === 'message' ? emit('message') : q === 'remind' ? emit('remind') : emit('block')">
        <span class="grid size-12 place-items-center rounded-full bg-white/15">
          <AppIcon :name="q === 'message' ? 'message-square-text' : q === 'remind' ? 'alarm-clock' : 'ban'" :size="22" />
        </span>
        {{ t(`call.overlay.quick.${q}`) }}
      </button>
    </div>
    <div class="mb-8 flex items-center justify-around px-10">
      <button type="button" class="tap flex flex-col items-center gap-2 text-sm" @click="emit('reject')">
        <span class="grid size-[72px] place-items-center rounded-full bg-scam shadow-sheet"><AppIcon name="phone-off" :size="32" /></span>
        {{ t('call.overlay.reject') }}
      </button>
      <button type="button" class="tap flex flex-col items-center gap-2 text-sm" @click="emit('answer')">
        <span class="ring-pulse grid size-[72px] place-items-center rounded-full bg-primary shadow-sheet"><AppIcon name="phone" :size="32" /></span>
        {{ t('call.overlay.answer') }}
      </button>
    </div>
  </div>

  <!-- Popup kiểu cổ điển trên nền màn hình chính giả -->
  <div v-else class="absolute inset-0 overflow-hidden">
    <FakeHomeScreen />
    <div class="absolute inset-0 bg-black/25" />
    <div class="absolute inset-x-0 px-3" :class="edge">
      <div class="overflow-hidden rounded-3xl bg-surface shadow-sheet" role="dialog" :aria-label="t('call.overlay.incoming')">
        <div class="flex items-center gap-2 px-4 py-2 text-sm font-semibold" :class="head.cls">
          <AppIcon :name="head.icon" :size="18" :class="head.pulse ? 'warn-blink' : ''" />
          <span class="flex-1">{{ t(`call.overlay.head.${risk}`) }}</span>
          <button type="button" class="tap grid size-8 place-items-center rounded-full bg-white/20" :aria-label="t('call.overlay.moreAria')" @click="emit('more')">
            <AppIcon name="ellipsis" :size="18" />
          </button>
        </div>
        <div class="flex items-center gap-3 px-4 pt-3">
          <Avatar :name="info.name" :risk="risk" :is-private="!info.number" :size="52" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-lg font-bold">{{ title }}</p>
            <p v-if="info.name && info.number" class="truncate text-sm text-muted">{{ formatNumber(info.number, settings.state.homeCountryDial) }}</p>
            <p class="truncate text-[13px] text-muted">{{ place }}</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2 px-4 pt-2.5">
          <RiskBadge :risk="risk" :category="info.profile?.category" size="md" />
          <span v-if="reports" class="text-[13px] text-muted">{{ t('call.overlay.reports', { n: reports.toLocaleString('vi-VN') }) }}</span>
        </div>
        <div v-if="showWarning" class="mx-4 mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-[13px] leading-snug" :class="risk === 'scam' ? 'bg-scam-soft text-scam' : 'bg-spam-soft text-spam'" role="alert">
          <AppIcon name="triangle-alert" :size="16" class="mt-0.5 shrink-0" />{{ warnText }}
        </div>
        <div class="flex gap-3 p-4">
          <button type="button" class="tap flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-scam font-semibold text-white" @click="emit('reject')">
            <AppIcon name="phone-off" :size="20" />{{ t('call.overlay.reject') }}
          </button>
          <button type="button" class="tap ring-pulse flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary font-semibold text-white" @click="emit('answer')">
            <AppIcon name="phone" :size="20" />{{ t('call.overlay.answer') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
