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
  <div class="flex gap-1 overflow-x-auto px-5 py-2" role="tablist">
    <button
      v-for="it in items"
      :key="it.key"
      role="tab"
      :aria-selected="model === it.key"
      class="tap flex shrink-0 items-center gap-1.5 rounded-full min-h-10 px-4 py-2 text-sm font-medium"
      :class="[
        model === it.key ? 'accent-gradient' : 'bg-primary-soft/55 text-muted hover:bg-primary-soft',
        fill ? 'flex-1 justify-center' : '',
      ]"
      @click="model = it.key"
    >
      {{ it.label }}
      <span
        v-if="it.badge !== undefined && it.badge !== 0"
        class="rounded-full px-1.5 text-[11px] leading-5"
        :class="model === it.key ? 'bg-white/20 text-white' : 'bg-primary/5 text-primary-dark'"
      >{{ it.badge }}</span>
    </button>
  </div>
</template>
