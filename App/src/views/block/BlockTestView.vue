<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBlockStore } from '@/stores/block'
import { useLookupStore } from '@/stores/lookup'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { t } from '@/composables/useT'
import { SCENARIOS } from '@/data/seed'
import { isNative, type DecisionStep, type NativeDecision } from '@/services'
import { isPlausibleNumber, toE164, formatNumber } from '@/utils/numbers'
import { countryOf } from '@/utils/countries'
import { signalsFromBits } from '@/utils/blockEngine'
import type { CallerInfo } from '@/types'
import AppBar from '@/components/AppBar.vue'
import Avatar from '@/components/Avatar.vue'
import RiskBadge from '@/components/RiskBadge.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import BaseButton from '@/components/BaseButton.vue'
import TraceStepRow, { type TraceRow } from '@/components/block/TraceStepRow.vue'
import TraceVerdict from '@/components/block/TraceVerdict.vue'

const block = useBlockStore()
const lookup = useLookupStore()
const settings = useSettingsStore()
const ui = useUiStore()

const raw = ref('')
const isPrivate = ref(false)
const info = ref<CallerInfo | null>(null)
const decision = ref<NativeDecision | null>(null)
const busy = ref(false)

const home = computed(() => settings.state.homeCountryDial)
const e164 = computed(() => (isPrivate.value ? '' : toE164(raw.value, home.value)))
const canRun = computed(() => isPrivate.value || isPlausibleNumber(raw.value, home.value))
const country = computed(() => countryOf(info.value?.number ?? ''))

const ORDER: DecisionStep['id'][] = ['system', 'trusted', 'contact', 'rule', 'private', 'international', 'nonContact', 'signals']

/** Các bước native đã chạy + các bước phía sau đánh dấu "Không chạy". */
const rows = computed<TraceRow[]>(() => {
  const d = decision.value
  if (!d) return []
  const enabledRules = block.rules.filter((r) => r.enabled).length
  const signals = signalsFromBits(d.reasons).map((s) => t(`common.signal.${s}`)).join(', ')
  return ORDER.map((id) => {
    const s = d.steps.find((x) => x.id === id)
    if (!s) return { id, state: 'stopped', detail: t('block.trace.stoppedHint') }
    if (s.state === 'off') return { id, state: 'off', detail: t('block.trace.offHint') }
    const state = s.state === 'match' ? 'match' : 'pass'
    return {
      id,
      state,
      detail: t(`block.trace.detail.${id}.${state}`, { name: s.detail ?? d.ruleLabel ?? '', n: enabledRules, list: signals }),
    }
  })
})

async function run(number = e164.value) {
  busy.value = true
  try {
    const [i, d] = await Promise.all([lookup.identify(number), block.evaluate(number)])
    info.value = i
    decision.value = d
  } finally {
    busy.value = false
  }
}

function submit() {
  if (!canRun.value) {
    ui.showToast(t('block.test.invalid'), 'warning')
    return
  }
  run()
}

function fill(s: { number: string; isPrivate?: boolean }) {
  isPrivate.value = !!s.isPrivate
  raw.value = s.number
  run(s.isPrivate ? '' : s.number)
}
</script>

<template>
  <div class="flex h-full flex-col bg-canvas">
    <AppBar :title="t('block.test.title')" back />
    <div class="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-8">
      <p class="text-sm leading-snug text-muted">{{ t('block.test.intro') }}</p>

      <section class="mt-3 rounded-card bg-surface p-4 shadow-card">
        <label class="block">
          <span class="text-[13px] font-semibold">{{ t('block.test.numberLabel') }}</span>
          <input
            v-model="raw"
            inputmode="tel"
            :disabled="isPrivate"
            autocomplete="off"
            :placeholder="t('block.test.placeholder')"
            class="mt-1 h-12 w-full rounded-xl border border-line bg-canvas px-4 text-lg tracking-wide outline-none focus:border-primary disabled:opacity-45"
            @keydown.enter="submit"
          />
        </label>
        <div class="mt-3 flex items-center gap-3">
          <div class="min-w-0 flex-1">
            <p class="text-[15px] font-medium">{{ t('block.test.private') }}</p>
            <p class="text-xs text-muted">{{ t('block.test.privateDesc') }}</p>
          </div>
          <ToggleSwitch v-model="isPrivate" :label="t('block.test.private')" />
        </div>
        <BaseButton block class="mt-4" icon="play" :disabled="busy" @click="submit">{{ t('block.test.run') }}</BaseButton>
      </section>

      <template v-if="!isNative">
        <h2 class="mt-4 mb-1.5 text-xs font-bold tracking-wide text-muted uppercase">{{ t('block.test.quick') }}</h2>
        <div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button
            v-for="s in SCENARIOS"
            :key="s.id"
            type="button"
            class="tap shrink-0 rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium"
            @click="fill(s)"
          >{{ s.title }}</button>
        </div>
      </template>

      <template v-if="info && decision">
        <section class="mt-5 flex items-center gap-3 rounded-card bg-surface p-4 shadow-card">
          <Avatar :name="info.name" :risk="info.risk" :is-private="!info.number" :size="52" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-base font-bold">{{ info.name ?? formatNumber(info.number, home) }}</p>
            <p v-if="info.name && info.number" class="truncate text-sm text-muted">{{ formatNumber(info.number, home) }}</p>
            <p class="truncate text-xs text-muted">
              {{ info.isContact ? t('block.test.inContacts') : t('block.test.notContact') }}
              <template v-if="country"> · {{ country.flag }} {{ country.name }}</template>
            </p>
            <div class="mt-1.5 flex flex-wrap items-center gap-2">
              <RiskBadge :risk="info.risk" :category="info.mark?.category" />
            </div>
          </div>
        </section>

        <h2 class="mt-5 mb-1.5 text-xs font-bold tracking-wide text-muted uppercase">{{ t('block.test.traceHeader') }}</h2>
        <ol class="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
          <TraceStepRow v-for="(s, i) in rows" :key="s.id" :step="s" :index="i" />
        </ol>
        <div class="mt-3"><TraceVerdict :decision="decision" /></div>
      </template>
    </div>
  </div>
</template>
