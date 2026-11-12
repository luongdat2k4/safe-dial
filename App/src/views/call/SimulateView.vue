<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCallSessionStore } from '@/stores/callSession'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { t } from '@/composables/useT'
import { fakeScenarios, type BlockedPreviewState, type FakeScenario } from '@/data/fakeScenarios'
import { isPlausibleNumber, toE164 } from '@/utils/numbers'
import type { PopupPosition, PopupSize } from '@/types'
import AppBar from '@/components/AppBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BaseButton from '@/components/BaseButton.vue'
import SegmentedTabs from '@/components/SegmentedTabs.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import ScenarioCard from '@/components/call/ScenarioCard.vue'

const router = useRouter()
const session = useCallSessionStore()
const settings = useSettingsStore()
const ui = useUiStore()

const custom = ref('')
const busy = ref(false)
/** Kịch bản giả với kết quả định sẵn (giống nhau trên web và máy thật). */
const scenarios = computed(() => fakeScenarios())
onMounted(() => {
  // Rời màn cuộc gọi giả lập bằng nút Quay lại: kết thúc phiên giả lập đó.
  if (session.simulated) session.reset()
})

const sizeItems = computed(() => [
  { key: 'classic', label: t('call.simulate.sizeClassic') },
  { key: 'full', label: t('call.simulate.sizeFull') },
])
const posItems = computed(() => [
  { key: 'top', label: t('call.simulate.posTop') },
  { key: 'center', label: t('call.simulate.posCenter') },
  { key: 'bottom', label: t('call.simulate.posBottom') },
])

async function run(number: string, isPrivate: boolean, preset?: FakeScenario) {
  if (busy.value) return
  busy.value = true
  try {
    const r = await session.simulate(isPrivate ? '' : number, preset)
    if (r.blocked) {
      // Bị chặn / tắt chuông: không có màn cuộc gọi đến, chỉ có thông báo trên màn hình chính.
      const d = r.decision
      const blockedPreview: BlockedPreviewState = {
        number: isPrivate ? '' : number,
        name: preset?.info.name ?? d.name ?? null,
        silenced: d.action === 'silenced',
        reasons: d.reasons,
        ruleLabel: d.ruleLabel ?? null,
        risk: d.risk,
        category: d.category ?? null,
      }
      router.push({ path: '/call/blocked-preview', state: { blockedPreview } })
    } else router.push('/call/incoming')
  } catch (e) {
    // Đang có cuộc gọi thật: không giả lập chồng lên.
    if (e instanceof Error && e.message === 'busy') ui.showToast(t('call.simulate.busy'), 'warning')
    else console.error('[simulate]', e)
  } finally {
    busy.value = false
  }
}

function runCustom() {
  if (!isPlausibleNumber(custom.value)) {
    ui.showToast(t('call.simulate.invalid'), 'warning')
    return
  }
  const n = toE164(custom.value, settings.state.homeCountryDial)
  run(n, false)
}
</script>

<template>
  <div class="flex h-full flex-col bg-canvas">
    <AppBar :title="t('call.simulate.title')" back />
    <div class="min-h-0 flex-1 overflow-y-auto pb-8">
      <p class="mx-4 mt-3 flex items-start gap-2 rounded-xl bg-primary-soft px-3 py-2 text-[13px] leading-snug text-primary-dark">
        <AppIcon name="info" :size="16" class="mt-0.5 shrink-0" />{{ t('call.simulate.intro') }}
      </p>

      <SectionHeader :title="t('call.simulate.displayHeader')" />
      <div class="mx-4 rounded-card bg-surface py-2 shadow-card">
        <p class="px-4 pt-1 text-[13px] font-medium text-muted">{{ t('call.simulate.displayStyle') }}</p>
        <SegmentedTabs :model-value="settings.state.popupSize" :items="sizeItems" fill @update:model-value="settings.patch({ popupSize: $event as PopupSize })" />
        <template v-if="settings.state.popupSize === 'classic'">
          <p class="px-4 text-[13px] font-medium text-muted">{{ t('call.simulate.position') }}</p>
          <SegmentedTabs :model-value="settings.state.popupPosition" :items="posItems" fill @update:model-value="settings.patch({ popupPosition: $event as PopupPosition })" />
        </template>
      </div>

      <SectionHeader :title="t('call.simulate.scenarios')" />
      <div class="space-y-2.5 px-4">
        <ScenarioCard
          v-for="s in scenarios"
          :key="s.id"
          :title="s.title"
          :description="s.description"
          :number="s.number"
          :is-private="s.isPrivate"
          :info="s.info"
          :decision="s.decision"
          :busy="busy"
          @run="run(s.number, s.isPrivate, s)"
        />
      </div>

      <SectionHeader :title="t('call.simulate.customHeader')" />
      <div class="mx-4 flex gap-2 rounded-card bg-surface p-3 shadow-card">
        <input
          v-model="custom"
          inputmode="tel"
          :placeholder="t('call.simulate.customPlaceholder')"
          :aria-label="t('call.simulate.customHeader')"
          class="h-11 min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 text-[15px] outline-none focus:border-primary"
          @keydown.enter="runCustom"
        />
        <BaseButton icon="phone-incoming" :disabled="busy" @click="runCustom">{{ t('call.simulate.customRun') }}</BaseButton>
      </div>
    </div>
  </div>
</template>
