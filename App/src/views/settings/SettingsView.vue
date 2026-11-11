<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppBar from '@/components/AppBar.vue'
import BrandOrb from '@/components/BrandOrb.vue'
import AppIcon from '@/components/AppIcon.vue'
import ListRow from '@/components/ListRow.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import RadioSheet from '@/components/settings/RadioSheet.vue'
import RateSheet from '@/components/settings/RateSheet.vue'
import { useSettingsStore } from '@/stores/settings'
import { useCallsStore } from '@/stores/calls'
import { useStatsStore } from '@/stores/stats'
import { SafeDial, isNative } from '@/services'
import { useUiStore } from '@/stores/ui'
import type { SimChoice } from '@/types'
import { t } from '@/composables/useT'

const APP_VERSION = '0.1.0'

const router = useRouter()
const settings = useSettingsStore()
const calls = useCallsStore()
const ui = useUiStore()

const simSheet = ref(false)
const rateSheet = ref(false)

const simOptions: { value: SimChoice; label: string }[] = [
  { value: 'ask', label: t('settings.sim.ask') },
  { value: 'sim1', label: t('settings.sim.sim1') },
  { value: 'sim2', label: t('settings.sim.sim2') },
]
const simLabel = computed(() => simOptions.find((o) => o.value === settings.state.defaultSim)?.label ?? '')
const langLabel = computed(() => t(`settings.rows.languageValue.${settings.state.language}`))

const defaultSim = computed({
  get: () => settings.state.defaultSim,
  set: (v: SimChoice) => settings.patch({ defaultSim: v }),
})

async function clearHistory() {
  const ok = await ui.confirm({
    title: t('settings.clear.title'),
    message: t('settings.clear.message'),
    confirmText: t('settings.clear.confirm'),
    danger: true,
    icon: 'trash-2',
  })
  if (!ok) return
  await calls.clear()
  ui.showToast(t('settings.clear.done'), 'success')
}

const stats = useStatsStore()
async function clearStats() {
  const ok = await ui.confirm({
    title: t('settings.clearStats.title'),
    message: t('settings.clearStats.message'),
    confirmText: t('settings.clear.confirm'),
    danger: true,
    icon: 'chart-no-axes-combined',
  })
  if (!ok) return
  await stats.clear()
  ui.showToast(t('settings.clearStats.done'), 'success')
}

/** Chỉ bản web: tạo lại dữ liệu giả lập. */
async function resetDemo() {
  await SafeDial.resetDemo?.()
  location.reload()
}

async function share() {
  try {
    await navigator.clipboard.writeText(t('settings.share.link'))
  } catch {
    // Trình duyệt chặn clipboard: vẫn báo như đã sao chép vì đây là bản demo.
  }
  ui.showToast(t('settings.share.copied'), 'success')
}
</script>

<template>
  <div class="flex flex-col bg-canvas">
    <AppBar :title="t('settings.title')" back />
    <div class="min-h-0 flex-1 overflow-y-auto pb-8">
      <section class="soft-panel mx-4 mt-1 flex items-center gap-4 rounded-card p-5">
        <BrandOrb compact />
        <div class="min-w-0 flex-1"><h2 class="text-lg font-semibold tracking-tight">Safe Dial</h2><p class="mt-1 text-xs leading-relaxed text-muted">{{ t('common.tagline') }}</p></div>
        <AppIcon name="sparkles" :size="20" class="shrink-0 text-primary/60" />
      </section>
      <SectionHeader :title="t('settings.groups.general')" />
      <div class="mx-4 divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
        <ListRow :title="t('settings.rows.notifications')" icon="bell" chevron @click="router.push('/settings/notifications')" />
        <ListRow :title="t('settings.rows.sound')" icon="volume-2" icon-tone="blue" chevron @click="router.push('/settings/sound')" />
        <ListRow :title="t('settings.rows.language')" icon="languages" icon-tone="violet" chevron @click="router.push('/language?from=settings')">
          <template #right><span class="text-sm text-muted">{{ langLabel }}</span></template>
        </ListRow>
      </div>

      <SectionHeader :title="t('settings.groups.calls')" />
      <div class="mx-4 divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
        <ListRow :title="t('settings.rows.sim')" icon="smartphone" chevron @click="simSheet = true">
          <template #right><span class="text-sm text-muted">{{ simLabel }}</span></template>
        </ListRow>
        <ListRow
          :title="t('settings.rows.callerId')"
          :subtitle="t('settings.rows.callerIdSub')"
          icon="contact-round"
          icon-tone="blue"
          chevron
          @click="router.push('/settings/caller-id')"
        />
      </div>

      <SectionHeader :title="t('settings.groups.protection')" />
      <div class="mx-4 divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
        <ListRow :title="t('settings.rows.scamWarning')" :subtitle="t('settings.rows.scamWarningSub')" icon="shield-alert" icon-tone="danger">
          <template #right>
            <ToggleSwitch v-model="settings.state.scamWarning" :label="t('settings.rows.scamWarning')" />
          </template>
        </ListRow>
        <ListRow
          :title="t('settings.rows.blockRules')"
          :subtitle="t('settings.rows.blockRulesSub')"
          icon="ban"
          icon-tone="violet"
          chevron
          @click="router.push('/home/block')"
        />
      </div>

      <SectionHeader :title="t('settings.groups.data')" />
      <div class="mx-4 overflow-hidden rounded-card bg-surface shadow-card">
        <ListRow
          :title="t('settings.rows.clearHistory')"
          :subtitle="t('settings.rows.clearHistorySub')"
          icon="trash-2"
          icon-tone="danger"
          danger
          clickable
          @click="clearHistory"
        />
        <ListRow
          :title="t('settings.rows.clearStats')"
          :subtitle="t('settings.rows.clearStatsSub')"
          icon="chart-no-axes-combined"
          icon-tone="danger"
          danger
          clickable
          @click="clearStats"
        />
        <ListRow
          v-if="!isNative"
          :title="t('settings.rows.resetDemo')"
          icon="rotate-ccw"
          icon-tone="gray"
          clickable
          @click="resetDemo"
        />
      </div>

      <SectionHeader v-if="!isNative" :title="t('settings.groups.lab')" />
      <div v-if="!isNative" class="mx-4 overflow-hidden rounded-card bg-surface shadow-card">
        <ListRow
          :title="t('settings.rows.simulate')"
          :subtitle="t('settings.rows.simulateSub')"
          icon="flask-conical"
          icon-tone="warn"
          chevron
          @click="router.push('/call/simulate')"
        >
          <template #right>
            <span class="rounded-full bg-spam-soft px-2 py-0.5 text-[11px] font-bold text-spam">{{ t('settings.rows.demoTag') }}</span>
          </template>
        </ListRow>
      </div>

      <SectionHeader :title="t('settings.groups.support')" />
      <div class="mx-4 divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
        <ListRow :title="t('settings.rows.rate')" icon="star" icon-tone="warn" clickable @click="rateSheet = true" />
        <ListRow :title="t('settings.rows.feedback')" icon="message-square-text" icon-tone="blue" chevron @click="router.push('/settings/feedback')" />
        <ListRow :title="t('settings.rows.share')" icon="share-2" clickable @click="share" />
        <ListRow :title="t('settings.rows.about')" icon="info" icon-tone="gray" chevron @click="router.push('/settings/about')" />
      </div>

      <p class="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted">
        <AppIcon name="shield-check" :size="14" /> {{ t('settings.version', { v: APP_VERSION }) }}
      </p>
    </div>

    <RadioSheet v-model="defaultSim" v-model:open="simSheet" :title="t('settings.sim.title')" :options="simOptions" />
    <RateSheet v-model="rateSheet" />
  </div>
</template>
