<script setup lang="ts" generic="T extends string">
import AppIcon from '@/components/AppIcon.vue'
import BottomSheet from '@/components/BottomSheet.vue'

/** Bottom sheet chọn một giá trị (radio). */
defineProps<{ title: string; options: { value: T; label: string }[] }>()
const open = defineModel<boolean>('open', { default: false })
const model = defineModel<T>({ required: true })

function pick(v: T) {
  model.value = v
  open.value = false
}
</script>

<template>
  <BottomSheet v-model="open" :title="title">
    <div role="radiogroup" :aria-label="title" class="-mx-2 flex flex-col">
      <button
        v-for="o in options"
        :key="o.value"
        type="button"
        role="radio"
        :aria-checked="model === o.value"
        class="tap flex min-h-12 items-center gap-3 rounded-xl px-3 text-left"
        :class="model === o.value ? 'bg-primary-soft' : ''"
        @click="pick(o.value)"
      >
        <span class="flex-1 text-[15px] font-medium">{{ o.label }}</span>
        <AppIcon v-if="model === o.value" name="check" :size="20" class="text-primary-dark" />
      </button>
    </div>
  </BottomSheet>
</template>
