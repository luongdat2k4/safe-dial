<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCallsStore } from '@/stores/calls'
import { useBlockStore } from '@/stores/block'
import { t } from '@/composables/useT'
import SegmentedTabs from '@/components/SegmentedTabs.vue'
import BlockedList from '@/components/block/BlockedList.vue'
import RuleList from '@/components/block/RuleList.vue'
import BlockSettingsPanel from '@/components/block/BlockSettingsPanel.vue'

const calls = useCallsStore()
const block = useBlockStore()
const tab = ref('blocked')

onMounted(() => calls.load())

const items = computed(() => [
  { key: 'blocked', label: t('block.tabs.blocked'), badge: calls.blocked.length },
  { key: 'list', label: t('block.tabs.list'), badge: block.rules.length },
  { key: 'settings', label: t('block.tabs.settings') },
])
</script>

<template>
  <div class="min-h-full bg-canvas">
    <div class="sticky top-0 z-10 bg-canvas"><SegmentedTabs v-model="tab" :items="items" /></div>
    <BlockedList v-if="tab === 'blocked'" />
    <RuleList v-else-if="tab === 'list'" />
    <BlockSettingsPanel v-else />
  </div>
</template>
