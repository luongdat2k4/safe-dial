<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBlockStore } from '@/stores/block'
import { useCallsStore } from '@/stores/calls'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { t } from '@/composables/useT'
import { ruleMatches } from '@/utils/blockEngine'
import { isPlausibleNumber, normalizeNumber, toE164, formatNumber } from '@/utils/numbers'
import type { Country } from '@/utils/countries'
import AppBar from '@/components/AppBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BaseButton from '@/components/BaseButton.vue'
import CountryPicker from '@/components/block/CountryPicker.vue'
import { RULE_KINDS, RULE_META, ruleValueText, type FormKind } from '@/components/block/ruleMeta'

const router = useRouter()
const block = useBlockStore()
const calls = useCallsStore()
const settings = useSettingsStore()
const ui = useUiStore()
const home = computed(() => settings.state.homeCountryDial)

const kind = ref<FormKind>('number')
const raw = ref('')
const label = ref('')
const country = ref<Country | null>(null)
const touched = ref(false)
const saving = ref(false)

onMounted(() => {
  calls.load()
  block.load()
})
watch(kind, () => {
  raw.value = ''
  country.value = null
  touched.value = false
})

/** Giá trị sẽ lưu: số cụ thể ở dạng E.164; quy tắc mẫu chỉ gồm chữ số (mã quốc gia không '+'). */
const value = computed(() => {
  if (kind.value === 'country') return country.value?.dial.replace('+', '') ?? ''
  const n = normalizeNumber(raw.value)
  return kind.value === 'number' ? toE164(n, home.value) : n.replace(/\+/g, '')
})

const error = computed(() => {
  if (kind.value === 'country') return country.value ? '' : t('block.form.errCountry')
  const digits = normalizeNumber(raw.value).replace(/\+/g, '')
  if (!digits) return t('block.form.errEmpty')
  if (kind.value === 'number') return isPlausibleNumber(raw.value, home.value) ? '' : t('block.form.errNumber')
  return digits.length >= 3 ? '' : t('block.form.errShort')
})

const duplicate = computed(() => {
  if (!value.value) return false
  if (kind.value === 'number') return block.isBlocked(value.value)
  return block.rules.some((r) => r.kind === kind.value && r.value === value.value)
})

const preview = computed(() => {
  if (error.value) return null
  const k = kind.value
  const hits = calls.entries.filter((e) => {
    if (!e.number) return false
    if (k === 'number') return e.number === value.value
    return !e.isContact && ruleMatches({ kind: k, value: value.value }, e.number, home.value)
  })
  const numbers = [...new Set(hits.map((e) => e.number))]
  return { calls: hits.length, numbers: numbers.slice(0, 3), totalNumbers: numbers.length }
})

const valueText = computed(() =>
  kind.value === 'number' ? formatNumber(value.value, home.value) : ruleValueText({ kind: kind.value, value: value.value }),
)

const showError = computed(() => touched.value && !!error.value)

async function save() {
  touched.value = true
  if (error.value || saving.value) return
  saving.value = true
  try {
    const r = kind.value === 'number' ? await block.addNumber(raw.value, label.value) : await block.addRule(kind.value, value.value, label.value)
    if (!r.ok) {
      ui.showToast(r.reason === 'duplicate' ? t('block.form.duplicate') : t('block.settings.noRole'), 'warning')
      return
    }
    ui.showToast(t('block.form.saved'), 'success')
    router.back()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex h-full flex-col bg-canvas">
    <AppBar :title="t('block.form.title')" back />
    <div class="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-6">
      <h2 class="mb-2 text-sm font-semibold text-muted">{{ t('block.form.kindHeader') }}</h2>
      <div class="grid grid-cols-3 gap-2" role="radiogroup" :aria-label="t('block.form.kindHeader')">
        <button
          v-for="k in RULE_KINDS"
          :key="k"
          type="button"
          role="radio"
          :aria-checked="kind === k"
          class="tap flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 bg-surface px-1 py-2 text-center shadow-card"
          :class="kind === k ? 'border-primary text-primary-dark' : 'border-transparent text-ink'"
          @click="kind = k"
        >
          <AppIcon :name="RULE_META[k].icon" :size="22" />
          <span class="text-xs leading-tight font-semibold">{{ t(`common.ruleKind.${k}`) }}</span>
        </button>
      </div>

      <section class="mt-4 rounded-card bg-surface p-4 shadow-card">
        <p class="text-sm leading-snug">{{ t(`block.form.help.${kind}`) }}</p>
        <p class="mt-1 flex items-start gap-1.5 text-[13px] leading-snug text-muted">
          <AppIcon name="lightbulb" :size="15" class="mt-0.5 shrink-0 text-spam" />{{ t(`block.form.example.${kind}`) }}
        </p>

        <div v-if="kind === 'country'" class="mt-3">
          <p v-if="country" class="mb-2 rounded-xl bg-primary-soft px-3 py-2 text-sm font-semibold text-primary-dark">
            {{ t('block.form.picked', { name: `${country.flag} ${country.name} (${country.dial})` }) }}
          </p>
          <div class="max-h-72 overflow-y-auto">
            <CountryPicker
              :selected="country?.dial"
              :taken="block.rules.filter((r) => r.kind === 'country').map((r) => '+' + r.value)"
              :hide-home="home"
              @pick="(c) => ((country = c), (touched = true))"
            />
          </div>
        </div>
        <label v-else class="mt-3 block">
          <span class="text-[13px] font-semibold">{{ t('block.form.valueLabel') }}</span>
          <input
            v-model="raw"
            inputmode="tel"
            autocomplete="off"
            :placeholder="t(`block.form.placeholder.${kind}`)"
            class="mt-1 h-12 w-full rounded-xl border bg-canvas px-4 text-lg tracking-wide outline-none focus:border-primary"
            :class="showError ? 'border-scam' : 'border-line'"
            @blur="touched = true"
          />
        </label>
        <p v-if="showError" class="mt-1.5 flex items-center gap-1 text-[13px] text-scam" role="alert">
          <AppIcon name="circle-alert" :size="14" />{{ error }}
        </p>
        <p v-else-if="duplicate" class="mt-1.5 flex items-center gap-1 text-[13px] text-spam" role="status">
          <AppIcon name="triangle-alert" :size="14" />{{ t('block.form.duplicate') }}
        </p>

        <label class="mt-3 block">
          <span class="text-[13px] font-semibold">{{ t('block.form.labelLabel') }}</span>
          <input
            v-model="label"
            maxlength="40"
            :placeholder="t('block.form.labelPlaceholder')"
            class="mt-1 h-11 w-full rounded-xl border border-line bg-canvas px-4 text-[15px] outline-none focus:border-primary"
          />
        </label>
      </section>

      <section v-if="preview" class="mt-4 rounded-card p-4" :class="preview.calls ? 'bg-[#efe8fd]' : 'bg-surface shadow-card'" aria-live="polite">
        <p class="flex items-center gap-2 text-[15px] font-semibold" :class="preview.calls ? 'text-blocked' : 'text-muted'">
          <AppIcon name="scan-search" :size="18" />
          {{ t('block.form.previewTitle', { n: preview.calls }) }}
        </p>
        <ul v-if="preview.numbers.length" class="mt-2 space-y-1 text-sm">
          <li v-for="n in preview.numbers" :key="n" class="flex items-center gap-2">
            <AppIcon name="phone-off" :size="14" class="text-blocked" />{{ formatNumber(n, home) }}
          </li>
          <li v-if="preview.totalNumbers > preview.numbers.length" class="text-xs text-muted">
            {{ t('block.form.previewMore', { n: preview.totalNumbers - preview.numbers.length }) }}
          </li>
        </ul>
        <p v-else class="mt-1 text-[13px] text-muted">{{ t('block.form.previewNone') }}</p>
        <p v-if="kind !== 'number'" class="mt-2 text-xs text-muted">{{ t('block.form.previewNote') }}</p>
        <p v-if="value" class="mt-1 text-xs text-muted">{{ valueText }}</p>
      </section>
    </div>

    <div class="pb-safe shrink-0 border-t border-line bg-surface">
      <div class="px-4 py-3">
        <BaseButton block size="lg" icon="shield-plus" :disabled="duplicate || saving" @click="save">{{ t('block.form.save') }}</BaseButton>
      </div>
    </div>
  </div>
</template>
