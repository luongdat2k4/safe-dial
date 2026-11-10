<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/composables/useT'
import BottomSheet from '@/components/BottomSheet.vue'
import ListRow from '@/components/ListRow.vue'

export type SheetMode = 'more' | 'message' | 'remind' | null

const mode = defineModel<SheetMode>({ default: null })
const emit = defineEmits<{ reply: [text: string]; remind: [label: string]; block: [] }>()

const isOpen = (m: Exclude<SheetMode, null>) =>
  computed({
    get: () => mode.value === m,
    set: (v: boolean) => {
      if (!v && mode.value === m) mode.value = null
    },
  })
const moreOpen = isOpen('more')
const messageOpen = isOpen('message')
const remindOpen = isOpen('remind')

const REPLIES = ['r1', 'r2', 'r3', 'r4'] as const
const REMINDS = ['10s', '1m', '5m', '15m', '30m'] as const

function pickBlock() {
  mode.value = null
  emit('block')
}
</script>

<template>
  <BottomSheet v-model="moreOpen" :title="t('call.sheets.moreTitle')">
    <ul class="-mx-5 divide-y divide-line">
      <li><ListRow clickable icon="message-square-text" :title="t('call.overlay.quick.message')" @click="mode = 'message'" /></li>
      <li><ListRow clickable icon="alarm-clock" icon-tone="blue" :title="t('call.overlay.quick.remind')" @click="mode = 'remind'" /></li>
      <li><ListRow clickable icon="ban" icon-tone="danger" :title="t('call.overlay.quick.block')" @click="pickBlock" /></li>
    </ul>
  </BottomSheet>

  <BottomSheet v-model="messageOpen" :title="t('call.sheets.messageTitle')">
    <p class="mb-2 text-sm text-muted">{{ t('call.sheets.messageDesc') }}</p>
    <ul class="space-y-2">
      <li v-for="r in REPLIES" :key="r">
        <button
          type="button"
          class="tap w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-left text-[15px]"
          @click="emit('reply', t(`call.sheets.replies.${r}`))"
        >{{ t(`call.sheets.replies.${r}`) }}</button>
      </li>
    </ul>
  </BottomSheet>

  <BottomSheet v-model="remindOpen" :title="t('call.sheets.remindTitle')">
    <p class="mb-2 text-sm text-muted">{{ t('call.sheets.remindDesc') }}</p>
    <ul class="grid grid-cols-2 gap-2">
      <li v-for="r in REMINDS" :key="r">
        <button
          type="button"
          class="tap h-12 w-full rounded-2xl border border-line bg-canvas text-[15px] font-semibold"
          @click="emit('remind', t(`call.sheets.reminds.${r}`))"
        >{{ t(`call.sheets.reminds.${r}`) }}</button>
      </li>
    </ul>
  </BottomSheet>
</template>
