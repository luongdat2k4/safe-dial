<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'

export interface TabItem {
  key: string
  label: string
  badge?: number | string
}

/** Thanh tab dạng viên thuốc, cuộn ngang được; tab đang chọn được cuộn vào giữa. */
withDefaults(defineProps<{ items: TabItem[]; fill?: boolean }>(), { fill: false })
const model = defineModel<string>({ required: true })

const bar = ref<HTMLElement | null>(null)

/** Cuộn ngang (chỉ thanh tab, không đụng tới vùng cuộn dọc) để tab đang chọn nằm giữa. */
function centerActive(smooth = true) {
  const el = bar.value
  const tab = el?.querySelector<HTMLElement>('[aria-selected="true"]')
  if (!el || !tab || el.scrollWidth <= el.clientWidth) return
  const offset = tab.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft
  const left = offset - (el.clientWidth - tab.offsetWidth) / 2
  el.scrollTo({ left: Math.max(0, left), behavior: smooth ? 'smooth' : 'auto' })
}

// Cả khi bấm tab lẫn khi giá trị đổi từ bên ngoài (vd. bấm "đã chặn" ở thẻ tóm tắt).
watch(model, () => nextTick(() => centerActive()))
onMounted(() => centerActive(false))
</script>

<template>
  <div ref="bar" class="flex gap-1 overflow-x-auto px-5 py-2" role="tablist">
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
