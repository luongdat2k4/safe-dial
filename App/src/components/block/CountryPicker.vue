<script setup lang="ts">
import { computed, ref } from 'vue'
import { COUNTRIES, type Country } from '@/utils/countries'
import { t } from '@/composables/useT'
import SearchBar from '@/components/SearchBar.vue'
import AppIcon from '@/components/AppIcon.vue'

/** Danh sách quốc gia có ô tìm kiếm. `taken` = các mã đã có trong danh sách chặn. */
const props = defineProps<{ taken?: string[]; selected?: string; hideHome?: string }>()
const emit = defineEmits<{ pick: [country: Country] }>()
const q = ref('')

const list = computed(() => {
  const s = q.value.trim().toLowerCase()
  const digits = s.replace(/[^0-9]/g, '')
  return COUNTRIES.filter((c) => c.dial !== props.hideHome).filter(
    (c) => !s || c.name.toLowerCase().includes(s) || c.iso.toLowerCase() === s || (digits && c.dial.includes(digits)),
  )
})
</script>

<template>
  <div>
    <SearchBar v-model="q" :placeholder="t('block.country.search')" />
    <ul class="mt-2 divide-y divide-line">
      <li v-for="c in list" :key="c.iso">
        <button
          type="button"
          class="tap flex min-h-12 w-full items-center gap-3 py-2 text-left"
          :aria-pressed="selected === c.dial"
          @click="emit('pick', c)"
        >
          <span class="text-2xl">{{ c.flag }}</span>
          <span class="min-w-0 flex-1 truncate text-[15px] font-medium">{{ c.name }}</span>
          <span class="text-sm text-muted">{{ c.dial }}</span>
          <span v-if="taken?.includes(c.dial)" class="rounded-full bg-scam-soft px-2 py-0.5 text-[11px] font-semibold text-scam">{{ t('block.country.blocked') }}</span>
          <AppIcon v-else-if="selected === c.dial" name="check" :size="18" class="text-primary" />
        </button>
      </li>
    </ul>
    <p v-if="!list.length" class="py-8 text-center text-sm text-muted">{{ t('block.country.none') }}</p>
  </div>
</template>
