<script setup lang="ts">
import { ref, watch } from 'vue'
import { t } from '@/composables/useT'
import { formatNumber } from '@/utils/numbers'
import { useSettingsStore } from '@/stores/settings'
import BottomSheet from '@/components/BottomSheet.vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps<{ number: string }>()
const open = defineModel<boolean>({ default: false })
const emit = defineEmits<{ choose: [sim: 1 | 2, remember: boolean] }>()
const settings = useSettingsStore()
const remember = ref(false)
const SIMS = [1, 2] as const

watch(open, (v) => {
  if (v) remember.value = false
})
</script>

<template>
  <BottomSheet v-model="open" :title="t('home.sim.title')">
    <p class="mb-3 text-sm text-muted">{{ formatNumber(props.number, settings.state.homeCountryDial) }}</p>
    <div class="grid grid-cols-2 gap-3">
      <button
        v-for="sim in SIMS"
        :key="sim"
        type="button"
        class="tap flex flex-col items-center gap-1 rounded-2xl border border-line bg-canvas px-3 py-4 active:bg-primary-soft"
        @click="emit('choose', sim, remember)"
      >
        <span class="grid size-11 place-items-center rounded-full bg-primary text-white"><AppIcon name="phone" :size="22" /></span>
        <span class="mt-1 text-[15px] font-semibold">{{ t(`home.sim.sim${sim}`) }}</span>
        <span class="text-xs text-muted">{{ t(`home.sim.sim${sim}Desc`) }}</span>
      </button>
    </div>
    <label class="tap mt-4 flex items-center gap-3 py-2">
      <input v-model="remember" type="checkbox" class="size-5 accent-[var(--color-primary)]" />
      <span class="text-[15px]">{{ t('home.sim.remember') }}</span>
    </label>
  </BottomSheet>
</template>
