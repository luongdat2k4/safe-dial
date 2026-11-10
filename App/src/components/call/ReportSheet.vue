<script setup lang="ts">
import type { SpamCategory } from '@/types'
import { t } from '@/composables/useT'
import BottomSheet from '@/components/BottomSheet.vue'
import ListRow from '@/components/ListRow.vue'

const open = defineModel<boolean>({ default: false })
const emit = defineEmits<{ pick: [category: SpamCategory] }>()

const CATS: Array<{ key: SpamCategory; icon: string; tone: 'danger' | 'warn' | 'violet' | 'blue' }> = [
  { key: 'scam', icon: 'shield-alert', tone: 'danger' },
  { key: 'impersonation', icon: 'badge-alert', tone: 'danger' },
  { key: 'fakeJob', icon: 'briefcase-business', tone: 'danger' },
  { key: 'loan', icon: 'banknote', tone: 'warn' },
  { key: 'telemarketing', icon: 'megaphone', tone: 'warn' },
  { key: 'robocall', icon: 'bot', tone: 'violet' },
  { key: 'spam', icon: 'shield-x', tone: 'warn' },
]
</script>

<template>
  <BottomSheet v-model="open" :title="t('call.after.reportTitle')">
    <p class="mb-1 text-sm text-muted">{{ t('call.after.reportDesc') }}</p>
    <ul class="-mx-5 divide-y divide-line">
      <li v-for="c in CATS" :key="c.key">
        <ListRow clickable :icon="c.icon" :icon-tone="c.tone" :title="t(`common.category.${c.key}`)" @click="emit('pick', c.key)" />
      </li>
    </ul>
  </BottomSheet>
</template>
