<script setup lang="ts" generic="T extends { key: string | number }">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'

/**
 * Danh sách ảo: chỉ render các dòng đang nằm trong (hoặc gần) vùng nhìn thấy, nên danh sách
 * hàng nghìn dòng vẫn mượt. Cuộn theo phần tử cuộn gần nhất phía trên (vd. <main> của HomeLayout),
 * nên có thể đặt dưới các phần tử khác trong cùng vùng cuộn. Chiều cao dòng đo thực tế sau khi render.
 */
const props = withDefaults(
  defineProps<{
    items: T[]
    /** Chiều cao ước lượng (px) của một dòng trước khi đo. */
    estimate: (item: T) => number
    overscan?: number
    /** Phát `end` khi còn ít hơn số dòng này là tới cuối (để tải thêm). */
    endThreshold?: number
  }>(),
  { overscan: 8, endThreshold: 15 },
)
const emit = defineEmits<{ end: [] }>()
defineSlots<{ default(p: { item: T; index: number }): unknown }>()

const root = ref<HTMLElement | null>(null)
const scrollEl = shallowRef<HTMLElement | null>(null)
/** Khoảng cách từ đầu vùng cuộn tới đầu danh sách. */
const margin = ref(0)

function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let p = el?.parentElement; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY
    if (oy === 'auto' || oy === 'scroll') return p
  }
  return document.scrollingElement as HTMLElement | null
}

function measureMargin() {
  const s = scrollEl.value
  const r = root.value
  if (!s || !r) return
  const m = r.getBoundingClientRect().top - s.getBoundingClientRect().top + s.scrollTop
  if (Math.abs(m - margin.value) > 0.5) margin.value = m
}

const virtualizer = useVirtualizer(
  computed(() => {
    const el = scrollEl.value
    return {
      count: props.items.length,
      getScrollElement: () => el,
      estimateSize: (i: number) => props.estimate(props.items[i]!),
      getItemKey: (i: number) => props.items[i]!.key,
      overscan: props.overscan,
      scrollMargin: margin.value,
    }
  }),
)

const rows = computed(() => virtualizer.value.getVirtualItems())
const total = computed(() => virtualizer.value.getTotalSize())

function measure(el: unknown) {
  if (el instanceof HTMLElement) virtualizer.value.measureElement(el)
}

watch(rows, (v) => {
  const last = v[v.length - 1]
  if (last && last.index >= props.items.length - props.endThreshold) emit('end')
})

// Phần phía trên danh sách (tab lọc, thẻ tóm tắt, ...) đổi chiều cao → đo lại vị trí.
let ro: ResizeObserver | undefined
onMounted(() => {
  scrollEl.value = findScrollParent(root.value)
  measureMargin()
  ro = new ResizeObserver(measureMargin)
  if (root.value?.parentElement) ro.observe(root.value.parentElement)
})
onBeforeUnmount(() => ro?.disconnect())
</script>

<template>
  <div ref="root" class="relative" :style="{ height: `${total}px` }">
    <div
      v-for="r in rows"
      :key="r.key as PropertyKey"
      :ref="measure"
      :data-index="r.index"
      class="absolute top-0 left-0 w-full"
      :style="{ transform: `translateY(${r.start - margin}px)` }"
    >
      <slot :item="items[r.index]!" :index="r.index" />
    </div>
  </div>
</template>
