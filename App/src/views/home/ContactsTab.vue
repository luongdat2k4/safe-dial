<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Contact } from '@/types'
import { t } from '@/composables/useT'
import { useDialFlow } from '@/composables/useDialFlow'
import { useContactsStore } from '@/stores/contacts'
import { numberPath } from '@/utils/routes'
import SegmentedTabs from '@/components/SegmentedTabs.vue'
import SearchBar from '@/components/SearchBar.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import ContactItem from '@/components/ContactItem.vue'
import EmptyState from '@/components/EmptyState.vue'
import Avatar from '@/components/Avatar.vue'
import AppIcon from '@/components/AppIcon.vue'
import SimSheet from '@/components/calls/SimSheet.vue'

const router = useRouter()
const contacts = useContactsStore()
const { startCall, chooseSim, simSheetOpen, pendingNumber } = useDialFlow()

const tab = ref('all')
const query = ref('')

onMounted(() => contacts.load())

const tabs = computed(() => [
  { key: 'all', label: t('home.contacts.tabs.all') },
  { key: 'favorites', label: t('home.contacts.tabs.favorites'), badge: contacts.favorites.length },
])

/** Bỏ dấu tiếng Việt để sắp xếp / lấy chữ cái đầu. */
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()

function letterOf(name: string): string {
  const last = name.trim().split(/\s+/).pop() ?? ''
  const ch = fold(last).charAt(0).toUpperCase()
  return /[A-Z]/.test(ch) ? ch : '#'
}

const results = computed(() => contacts.search(query.value))
const sections = computed(() => {
  const map = new Map<string, Contact[]>()
  for (const c of results.value) {
    const k = letterOf(c.name)
    map.set(k, [...(map.get(k) ?? []), c])
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
    .map(([letter, items]) => ({
      letter,
      items: [...items].sort((x, y) => fold(x.name.split(/\s+/).pop() ?? '').localeCompare(fold(y.name.split(/\s+/).pop() ?? '')) || x.name.localeCompare(y.name, 'vi')),
    }))
})

const openContact = (c: Contact) => router.push(numberPath(c.numbers[0] ?? ''))
const call = (c: Contact) => startCall(c.numbers[0] ?? '')
</script>

<template>
  <div class="pb-28">
    <SegmentedTabs v-model="tab" :items="tabs" fill class="sticky top-0 z-10 bg-canvas" />

    <template v-if="tab === 'all'">
      <div class="px-4 pb-2"><SearchBar v-model="query" :placeholder="t('home.contacts.search')" /></div>
      <div v-if="sections.length" class="contact-list bg-surface">
        <section v-for="s in sections" :key="s.letter">
          <SectionHeader :title="s.letter" />
          <ContactItem
            v-for="c in s.items"
            :key="c.id"
            :contact="c"
            show-favorite
            @open="openContact(c)"
            @call="call(c)"
            @favorite="contacts.toggleFavorite(c.id)"
          />
        </section>
        <p class="py-4 text-center text-xs text-muted">{{ t('home.contacts.count', { n: results.length }) }}</p>
      </div>
      <EmptyState
        v-else-if="query"
        icon="search-x"
        :title="t('home.contacts.emptySearch.title')"
        :description="t('home.contacts.emptySearch.description', { q: query })"
      />
      <EmptyState v-else icon="contact" :title="t('home.contacts.emptyAll.title')" :description="t('home.contacts.emptyAll.description')" />
    </template>

    <template v-else>
      <div v-if="contacts.favorites.length" class="grid grid-cols-2 gap-3 px-4 pt-2">
        <article
          v-for="c in contacts.favorites"
          :key="c.id"
          class="relative flex flex-col items-center rounded-2xl border border-line bg-surface p-4 shadow-card"
        >
          <button
            type="button"
            class="tap absolute top-1.5 right-1.5 grid size-9 place-items-center rounded-full text-favorite"
            :aria-label="t('home.contacts.favOn', { name: c.name })"
            @click="contacts.toggleFavorite(c.id)"
          >
            <AppIcon name="star" :size="20" style="fill: currentColor" />
          </button>
          <button type="button" class="tap flex w-full flex-col items-center" @click="openContact(c)">
            <Avatar :name="c.name" risk="safe" :size="64" />
            <span class="mt-2 w-full truncate text-center text-[15px] font-semibold">{{ c.name }}</span>
            <span v-if="c.group" class="text-xs text-muted">{{ c.group }}</span>
          </button>
          <button
            type="button"
            class="tap mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary-soft text-sm font-semibold text-primary-dark"
            :aria-label="t('home.contacts.quickCall', { name: c.name })"
            @click="call(c)"
          >
            <AppIcon name="phone" :size="18" /> {{ t('common.actions.call') }}
          </button>
        </article>
      </div>
      <EmptyState v-else icon="star" :title="t('home.contacts.emptyFav.title')" :description="t('home.contacts.emptyFav.description')">
        <button type="button" class="tap rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white" @click="tab = 'all'">
          {{ t('home.contacts.goContacts') }}
        </button>
      </EmptyState>
    </template>

    <SimSheet v-model="simSheetOpen" :number="pendingNumber" @choose="chooseSim" />
  </div>
</template>
