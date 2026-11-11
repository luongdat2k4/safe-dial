<script setup lang="ts">
import { ref, watch } from 'vue'
import type { SpamCategory } from '@/types'
import { t } from '@/composables/useT'
import { useBlockStore } from '@/stores/block'
import { useLookupStore } from '@/stores/lookup'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { formatNumber } from '@/utils/numbers'
import BottomSheet from '@/components/BottomSheet.vue'
import BaseButton from '@/components/BaseButton.vue'
import AppIcon from '@/components/AppIcon.vue'

/** Sheet đánh dấu số (dùng ở danh sách cuộc gọi và màn chi tiết số). */
const props = defineProps<{ number: string }>()
const open = defineModel<boolean>({ default: false })
const emit = defineEmits<{ reported: [] }>()

const lookup = useLookupStore()
const block = useBlockStore()
const ui = useUiStore()
const settings = useSettingsStore()

const CATEGORIES: Array<{ key: SpamCategory; icon: string }> = [
  { key: 'scam', icon: 'shield-alert' },
  { key: 'impersonation', icon: 'user-round-x' },
  { key: 'fakeJob', icon: 'briefcase' },
  { key: 'loan', icon: 'banknote' },
  { key: 'telemarketing', icon: 'megaphone' },
  { key: 'robocall', icon: 'bot' },
  { key: 'spam', icon: 'mail-warning' },
]

const category = ref<SpamCategory>('scam')
const note = ref('')
const sending = ref(false)

watch(open, (v) => {
  if (v) {
    category.value = 'scam'
    note.value = ''
  }
})

async function submit() {
  if (sending.value || !props.number) return
  sending.value = true
  try {
    await lookup.report(props.number, category.value, note.value.trim() || undefined)
    open.value = false
    emit('reported')
    ui.showToast(t('number.report.thanks'), 'success')
    if (block.isBlocked(props.number)) return
    const num = formatNumber(props.number, settings.state.homeCountryDial)
    const ok =
      block.settings.autoBlockReported ||
      (await ui.confirm({
        title: t('number.report.offerTitle'),
        message: t('number.report.offerMessage', { number: num }),
        confirmText: t('number.report.offerYes'),
        cancelText: t('number.report.offerNo'),
        danger: true,
        icon: 'ban',
      }))
    if (!ok) return
    if (await block.blockNumber(props.number)) ui.showToast(t('number.block.done', { number: num }), 'success')
    else ui.showToast(t('number.block.failed'), 'warning')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <BottomSheet v-model="open" :title="t('number.report.title')" tall>
    <p class="mb-3 text-sm text-muted">{{ t('number.report.subtitle') }}</p>
    <div role="radiogroup" class="space-y-2">
      <button
        v-for="c in CATEGORIES"
        :key="c.key"
        type="button"
        role="radio"
        :aria-checked="category === c.key"
        class="tap flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left"
        :class="category === c.key ? 'border-primary bg-primary-soft' : 'border-line bg-surface'"
        @click="category = c.key"
      >
        <span class="grid size-9 place-items-center rounded-xl bg-canvas text-primary-dark"><AppIcon :name="c.icon" :size="18" /></span>
        <span class="flex-1 text-[15px] font-medium">{{ t(`common.category.${c.key}`) }}</span>
        <span class="grid size-5 place-items-center rounded-full border-2" :class="category === c.key ? 'border-primary bg-primary text-white' : 'border-line'">
          <AppIcon v-if="category === c.key" name="check" :size="12" />
        </span>
      </button>
    </div>
    <label class="mt-4 block text-sm font-semibold">
      {{ t('number.report.note') }}
      <textarea
        v-model="note"
        rows="2"
        maxlength="200"
        :placeholder="t('number.report.notePlaceholder')"
        class="mt-1.5 w-full resize-none rounded-2xl border border-line bg-canvas px-3 py-2.5 text-[15px] font-normal outline-none focus:border-primary"
      />
    </label>
    <BaseButton class="mt-4" block variant="danger" icon="send" :disabled="sending" @click="submit">{{ t('number.report.send') }}</BaseButton>
  </BottomSheet>
</template>
