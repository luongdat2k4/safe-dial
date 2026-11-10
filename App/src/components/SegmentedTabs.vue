<script setup lang="ts">
export interface TabItem {
  key: string
  label: string
  badge?: number | string
}

/** Thanh tab dạng viên thuốc, cuộn ngang được. */
withDefaults(defineProps<{ items: TabItem[]; fill?: boolean }>(), { fill: false })
const model = defineModel<string>({ required: true })
</script>

<template>
  <div class="flex gap-2 overflow-x-auto px-4 py-2" role="tablist">
    <button
      v-for="it in items"
      :key="it.key"
      role="tab"
      :aria-selected="model === it.key"
      class="tap flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold"
      :class="[
        model === it.key ? 'bg-primary text-white shadow-card' : 'bg-surface text-muted border border-line',
        fill ? 'flex-1 justify-center' : '',
      ]"
      @click="model = it.key"
    >
      {{ it.label }}
      <span
        v-if="it.badge !== undefined && it.badge !== 0"
        class="rounded-full px-1.5 text-[11px] leading-5"
        :class="model === it.key ? 'bg-white/25 text-white' : 'bg-primary-soft text-primary-dark'"
      >{{ it.badge }}</span>
    </button>
  </div>
</template>
