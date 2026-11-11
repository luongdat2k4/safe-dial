<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBlockStore } from '@/stores/block'
import { useCallSessionStore } from '@/stores/callSession'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { t } from '@/composables/useT'
import { SCENARIOS } from '@/data/seed'
import { isPlausibleNumber, toE164 } from '@/utils/numbers'
import type { CallerInfo, PopupPosition, PopupSize } from '@/types'
import type { NativeDecision } from '@/services'
import { reasonFromBits } from '@/utils/blockEngine'
import { useLookupStore } from '@/stores/lookup'
import AppBar from '@/components/AppBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BaseButton from '@/components/BaseButton.vue'
import SegmentedTabs from '@/components/SegmentedTabs.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import ScenarioCard from '@/components/call/ScenarioCard.vue'
import ReasonChip from '@/components/block/ReasonChip.vue'

const router = useRouter()
const block = useBlockStore()
const session = useCallSessionStore()
const settings = useSettingsStore()
const ui = useUiStore()

const custom = ref('')
const busy = ref(false)
const lookup = useLookupStore()
const result = ref<{ decision: NativeDecision; title: string } | null>(null)
const resultReason = computed(() => (result.value ? reasonFromBits(result.value.decision.reasons) : undefined))
const previews = reactive<Record<string, { info: CallerInfo; decision: NativeDecision }>>({})

async function refreshPreviews() {
  for (const s of SCENARIOS) {
    const number = s.isPrivate ? '' : s.number
    const [info, decision] = await Promise.all([lookup.identify(number), block.evaluate(number)])
    previews[s.id] = { info, decision }
  }
}
onMounted(async () => {
  await block.load()
  await refreshPreviews()
})
watch(() => [block.rules, block.settings], refreshPreviews, { deep: true })

const sizeItems = computed(() => [
  { key: 'classic', label: t('call.simulate.sizeClassic') },
  { key: 'full', label: t('call.simulate.sizeFull') },
])
const posItems = computed(() => [
  { key: 'top', label: t('call.simulate.posTop') },
  { key: 'center', label: t('call.simulate.posCenter') },
  { key: 'bottom', label: t('call.simulate.posBottom') },
])

async function run(number: string, isPrivate: boolean, title: string) {
  if (busy.value) return
  busy.value = true
  result.value = null
  try {
    const r = await session.simulate(isPrivate ? '' : number)
    if (r.blocked) result.value = { decision: r.decision, title }
    else router.push('/call/incoming')
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
  run(n, false, n)
}
</script>

<template>
  <div class="flex h-full flex-col bg-canvas">
    <AppBar :title="t('call.simulate.title')" back />
    <div class="min-h-0 flex-1 overflow-y-auto pb-8">
      <p class="mx-4 mt-3 flex items-start gap-2 rounded-xl bg-primary-soft px-3 py-2 text-[13px] leading-snug text-primary-dark">
        <AppIcon name="info" :size="16" class="mt-0.5 shrink-0" />{{ t('call.simulate.intro') }}
      </p>

      <section v-if="result" class="mx-4 mt-3 rounded-card bg-[#efe8fd] p-4" role="status">
        <div class="flex items-center gap-2 text-blocked">
          <AppIcon name="shield-ban" :size="22" />
          <p class="text-[15px] font-bold">
            {{ result.decision.action === 'silenced' ? t('call.simulate.silenced') : t('call.simulate.blocked') }}
            {{ resultReason ? t(`common.blockReason.${resultReason}`) : '' }}
          </p>
        </div>
        <p v-if="result.decision.ruleLabel" class="mt-1 text-sm text-ink">{{ t('call.simulate.detail', { d: result.decision.ruleLabel }) }}</p>
        <div class="mt-2 flex items-center justify-between gap-2">
          <ReasonChip v-if="resultReason" :reason="resultReason" />
          <BaseButton size="sm" variant="secondary" @click="router.push('/home/block')">{{ t('call.simulate.viewBlocked') }}</BaseButton>
        </div>
      </section>

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
          v-for="s in SCENARIOS"
          :key="s.id"
          :title="s.title"
          :description="s.description"
          :number="s.number"
          :is-private="'isPrivate' in s && !!s.isPrivate"
          :info="previews[s.id]?.info"
          :decision="previews[s.id]?.decision"
          :busy="busy"
          @run="run(s.number, 'isPrivate' in s && !!s.isPrivate, s.title)"
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
