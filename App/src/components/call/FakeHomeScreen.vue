<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

/** Màn hình chính giả lập làm nền cho popup caller-ID (chỉ để minh hoạ). */
const apps = [
  ['mail', 'Thư'], ['camera', 'Camera'], ['image', 'Ảnh'], ['map', 'Bản đồ'],
  ['calendar', 'Lịch'], ['music', 'Nhạc'], ['shopping-bag', 'Cửa hàng'], ['settings', 'Cài đặt'],
  ['message-circle', 'Tin nhắn'], ['globe', 'Trình duyệt'], ['wallet', 'Ví'], ['notebook-pen', 'Ghi chú'],
]
const dock = ['phone', 'message-square', 'globe', 'camera']
</script>

<template>
  <div class="absolute inset-0 flex flex-col bg-gradient-to-b from-[#bbb1eb] via-[#a78bd6] to-[#64539b] text-white" aria-hidden="true">
    <div class="pt-safe px-8 pt-16 text-center">
      <p class="text-6xl font-light tracking-tight">09:41</p>
      <p class="mt-1 text-sm opacity-75">Thứ Ba, 10 tháng 11</p>
    </div>
    <div class="mt-10 grid grid-cols-4 gap-y-5 px-6">
      <div v-for="a in apps" :key="a[0]" class="flex flex-col items-center gap-1">
        <span class="grid size-12 place-items-center rounded-2xl bg-white/15"><AppIcon :name="a[0]!" :size="24" /></span>
        <span class="text-[10px] opacity-85">{{ a[1] }}</span>
      </div>
    </div>
    <div class="pb-safe mt-auto">
      <div class="mx-4 mb-3 flex justify-around rounded-3xl bg-white/15 py-3">
        <span v-for="d in dock" :key="d" class="grid size-12 place-items-center rounded-2xl bg-white/20"><AppIcon :name="d" :size="24" /></span>
      </div>
    </div>
  </div>
</template>
