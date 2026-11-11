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
import VirtualList from '@/components/VirtualList.vue'
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

onMounted(() => {
  void contacts.load()
  // Yêu thích cần quyền chỉnh sửa danh bạ: kiểm tra để nhắc người dùng cấp.
  void contacts.checkEdit()
})

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

const results = computed(() => contacts.search(query.value))

const collator = new Intl.Collator('vi', { sensitivity: 'base' })

type Row = { key: string; kind: 'letter'; letter: string } | { key: string; kind: 'contact'; contact: Contact }

/**
 * Gom theo chữ cái đầu của tên (từ cuối) rồi làm phẳng thành các dòng cho danh sách ảo.
 * Khoá sắp xếp tính một lần cho mỗi liên hệ (không bỏ dấu lại ở mỗi lần so sánh).
 */
const rows = computed<Row[]>(() => {
  const keyed = results.value.map((c) => {
    const last = fold(c.name.trim().split(/\s+/).pop() ?? '')
    const ch = last.charAt(0).toUpperCase()
    return { c, last, letter: /[A-Z]/.test(ch) ? ch : '#' }
  })
  keyed.sort(
    (a, b) =>
      (a.letter === '#' ? 1 : 0) - (b.letter === '#' ? 1 : 0) ||
      a.letter.localeCompare(b.letter) ||
      collator.compare(a.last, b.last) ||
      collator.compare(a.c.name, b.c.name),
  )
  const out: Row[] = []
  let letter = ''
  for (const k of keyed) {
    if (k.letter !== letter) {
      letter = k.letter
      out.push({ key: 'letter:' + letter, kind: 'letter', letter })
    }
    out.push({ key: k.c.id, kind: 'contact', contact: k.c })
  }
  return out
})
const estimate = (r: Row) => (r.kind === 'letter' ? 40 : 78)

const openContact = (c: Contact) => router.push(numberPath(c.numbers[0] ?? ''))
const call = (c: Contact) => startCall(c.numbers[0] ?? '')
</script>

<template>
  <div class="pb-28">
    <SegmentedTabs v-model="tab" :items="tabs" fill class="sticky top-0 z-10 bg-canvas" />

    <template v-if="tab === 'all'">
      <div class="px-4 pb-2"><SearchBar v-model="query" :placeholder="t('home.contacts.search')" /></div>
      <div v-if="rows.length" class="contact-list bg-surface">
        <VirtualList :items="rows" :estimate="estimate">
          <template #default="{ item: r }">
            <SectionHeader v-if="r.kind === 'letter'" :title="r.letter" />
            <div v-else class="contact-row">
              <ContactItem
                :contact="r.contact"
                show-favorite
                @open="openContact(r.contact)"
                @call="call(r.contact)"
                @favorite="contacts.toggleFavorite(r.contact.id)"
              />
            </div>
          </template>
        </VirtualList>
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
      <div v-if="contacts.canEdit === false" class="mx-4 mt-2 mb-1 flex items-center gap-3 rounded-card border border-line bg-primary-soft p-4" role="status">
        <AppIcon name="user-pen" :size="22" class="shrink-0 text-primary-dark" />
        <p class="min-w-0 flex-1 text-[13px] leading-snug text-ink/80">{{ t('home.contacts.editPrompt') }}</p>
        <button type="button" class="tap shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white" @click="contacts.grantEdit()">
          {{ t('home.contacts.editGrant') }}
        </button>
      </div>
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
