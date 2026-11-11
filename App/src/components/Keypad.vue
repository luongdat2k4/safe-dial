<script setup lang="ts">
/** Bàn phím số 3x4 dùng chung (quay số, bàn phím trong cuộc gọi). Phát `press`; giữ phím 0 phát `longZero` (dấu +). */
defineProps<{ dark?: boolean }>()
const emit = defineEmits<{ press: [key: string]; longZero: [] }>()

const KEYS: Array<{ k: string; sub?: string }> = [
  { k: '1' },
  { k: '2', sub: 'ABC' },
  { k: '3', sub: 'DEF' },
  { k: '4', sub: 'GHI' },
  { k: '5', sub: 'JKL' },
  { k: '6', sub: 'MNO' },
  { k: '7', sub: 'PQRS' },
  { k: '8', sub: 'TUV' },
  { k: '9', sub: 'WXYZ' },
  { k: '*' },
  { k: '0', sub: '+' },
  { k: '#' },
]

let timer: ReturnType<typeof setTimeout> | undefined
let long = false

function down(key: string) {
  long = false
  if (key === '0') {
    timer = setTimeout(() => {
      long = true
      emit('longZero')
    }, 450)
  }
}
function cancel() {
  clearTimeout(timer)
}
function click(key: string) {
  if (!long) emit('press', key)
}
</script>

<template>
  <div class="grid grid-cols-3 gap-x-5 gap-y-3 px-6">
    <button
      v-for="key in KEYS"
      :key="key.k"
      type="button"
      class="tap mx-auto flex size-[68px] flex-col items-center justify-center rounded-full"
      :class="dark ? 'bg-white/12 text-white' : 'border border-line bg-white text-ink shadow-card'"
      :aria-label="`Phím ${key.k}`"
      @pointerdown="down(key.k)"
      @pointerup="cancel"
      @pointerleave="cancel"
      @click="click(key.k)"
    >
      <span class="text-[26px] leading-none font-medium">{{ key.k }}</span>
      <span class="mt-0.5 h-3 text-[9px] font-semibold tracking-widest opacity-55">{{ key.sub ?? '' }}</span>
    </button>
  </div>
</template>
