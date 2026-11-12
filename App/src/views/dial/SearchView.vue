<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { CallerInfo } from '@/types'
import { t } from '@/composables/useT'
import { useNumberActions } from '@/composables/useDialFlow'
import { SCENARIOS } from '@/data/seed'
import { SafeDial, isNative } from '@/services'
import { useBlockStore } from '@/stores/block'
import { useCallsStore } from '@/stores/calls'
import { useContactsStore } from '@/stores/contacts'
import { useLookupStore } from '@/stores/lookup'
import { useSettingsStore } from '@/stores/settings'
import { isPlausibleNumber, normalizeNumber, toE164 } from '@/utils/numbers'
import { loadList, saveJSON } from '@/utils/storage'
import { numberPath } from '@/utils/routes'
import SearchBar from '@/components/SearchBar.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import ListRow from '@/components/ListRow.vue'
import Avatar from '@/components/Avatar.vue'
import EmptyState from '@/components/EmptyState.vue'
import AppIcon from '@/components/AppIcon.vue'
import LookupResultCard from '@/components/number/LookupResultCard.vue'

const KEY_RECENT = 'safedial.search.recent.v1'
const router = useRouter()
const settings = useSettingsStore()
const contacts = useContactsStore()
const calls = useCallsStore()
const lookup = useLookupStore()
const block = useBlockStore()
const { toggleBlock: toggleBlockRaw, pretty } = useNumberActions()

/** Chặn / bỏ chặn rồi cập nhật lại thẻ thông tin. */
async function toggleBlock(e164: string, name?: string) {
  if (await toggleBlockRaw(e164, name)) info.value = await lookup.identify(e164)
}

const query = ref('')
const recent = ref<string[]>(loadList<string>(KEY_RECENT, []).slice(0, 8))
const info = ref<CallerInfo | null>(null)
const looking = ref(false)

onMounted(() => {
  contacts.load()
  calls.load()
  block.load()
})

const q = computed(() => query.value.trim())
const home = () => settings.state.homeCountryDial
const looksLikeNumber = computed(() => /^[+\d\s().-]+$/.test(q.value) && isPlausibleNumber(q.value, home()))
const e164 = computed(() => (looksLikeNumber.value ? toE164(q.value, home()) : ''))

const contactHits = computed(() => (q.value ? contacts.search(q.value).slice(0, 8) : []))
const historyHits = computed(() => {
  if (!q.value) return []
  const s = q.value.toLowerCase()
  const digits = normalizeNumber(q.value).replace(/^\+/, '').replace(/^0/, '')
  const map = new Map<string, { number: string; name?: string; count: number }>()
  for (const e of calls.entries) {
    if (!e.number || e.isContact) continue
    const hit = (e.name ?? '').toLowerCase().includes(s) || (digits.length >= 3 && e.number.includes(digits))
    if (!hit) continue
    const cur = map.get(e.number)
    if (cur) cur.count += 1
    else map.set(e.number, { number: e.number, name: e.name, count: 1 })
  }
  return [...map.values()].slice(0, 6)
})

/** Số mẫu chỉ có ở bản web (dữ liệu giả lập). */
const examples = isNative ? [] : SCENARIOS.filter((s) => s.number && !s.isPrivate).slice(0, 4)

let timer: ReturnType<typeof setTimeout> | undefined
let token = 0
watch(e164, (v) => {
  clearTimeout(timer)
  token += 1
  info.value = null
  looking.value = !!v
  if (!v) return
  const mine = token
  timer = setTimeout(async () => {
    const r = await lookup.identify(v)
    if (mine !== token) return
    info.value = r
    looking.value = false
  }, 300)
})
onBeforeUnmount(() => clearTimeout(timer))

/** Tìm gần đây: localStorage cho UI + SharedPreferences `ui.search.recent` (schema mục 3). */
function persistRecent() {
  saveJSON(KEY_RECENT, recent.value)
  void SafeDial.setSettings({ values: { 'ui.search.recent': [...recent.value] } }).catch(() => undefined)
}
function remember(term: string) {
  const v = term.trim()
  if (!v) return
  recent.value = [v, ...recent.value.filter((x) => x !== v)].slice(0, 8)
  persistRecent()
}
function removeRecent(term: string) {
  recent.value = recent.value.filter((x) => x !== term)
  persistRecent()
}
function clearRecent() {
  recent.value = []
  persistRecent()
}
function go(number: string) {
  remember(query.value)
  router.push(numberPath(number))
}
const hasResults = computed(() => contactHits.value.length > 0 || historyHits.value.length > 0 || looksLikeNumber.value)
</script>

<template>
  <div class="flex h-full flex-col bg-canvas">
    <header class="pt-safe shrink-0 border-b border-line bg-surface">
      <div class="flex h-14 items-center gap-1 px-2">
        <button class="tap grid size-10 shrink-0 place-items-center rounded-full" :aria-label="t('dial.search.back')" @click="router.back()">
          <AppIcon name="arrow-left" :size="22" />
        </button>
        <SearchBar v-model="query" class="flex-1" :placeholder="t('dial.search.placeholder')" autofocus @submit="remember(query)" />
      </div>
    </header>

    <main class="min-h-0 flex-1 overflow-y-auto pb-8">
      <template v-if="q">
        <div v-if="looksLikeNumber" class="px-4 pt-4">
          <LookupResultCard :info="info" :loading="looking" :number="e164" @detail="go(e164)" @block="toggleBlock(e164, info?.name)" />
        </div>

        <template v-if="contactHits.length">
          <SectionHeader :title="t('dial.search.contacts')" />
          <div class="bg-surface">
            <ListRow v-for="c in contactHits" :key="c.id" :title="c.name" :subtitle="pretty(c.numbers[0] ?? '')" clickable @click="go(c.numbers[0] ?? '')">
              <template #leading><Avatar :name="c.name" risk="safe" /></template>
            </ListRow>
          </div>
        </template>

        <template v-if="historyHits.length">
          <SectionHeader :title="t('dial.search.history')" />
          <div class="bg-surface">
            <ListRow
              v-for="h in historyHits"
              :key="h.number"
              :title="h.name ?? pretty(h.number)"
              :subtitle="`${pretty(h.number)} · ${t('dial.search.callCount', { n: h.count })}`"
              clickable
              @click="go(h.number)"
            >
              <template #leading><Avatar :name="h.name" :risk="lookup.riskOf({ isContact: false, mark: lookup.marks[h.number] })" /></template>
            </ListRow>
          </div>
        </template>

        <EmptyState
          v-if="!hasResults"
          icon="search-x"
          :title="t('dial.search.noResult.title')"
          :description="t('dial.search.noResult.description', { q })"
        />
      </template>

      <template v-else>
        <template v-if="recent.length">
          <SectionHeader :title="t('dial.search.recent')">
            <button class="tap px-2 text-xs font-semibold text-primary-dark" @click="clearRecent">{{ t('dial.search.clearAll') }}</button>
          </SectionHeader>
          <div class="flex flex-wrap gap-2 px-4">
            <span v-for="r in recent" :key="r" class="flex items-center rounded-full border border-line bg-surface text-sm">
              <button class="tap py-1.5 pr-1 pl-3" @click="query = r">{{ r }}</button>
              <button class="tap grid size-8 place-items-center text-muted" :aria-label="t('dial.search.removeRecent')" @click="removeRecent(r)">
                <AppIcon name="x" :size="14" />
              </button>
            </span>
          </div>
        </template>

        <EmptyState icon="radar" :title="t('dial.search.initial.title')" :description="t('dial.search.initial.description')" class="!pb-4" />
        <template v-if="examples.length">
          <SectionHeader :title="t('dial.search.examplesTitle')" />
          <p class="px-4 pb-2 text-sm text-muted">{{ t('dial.search.examplesDesc') }}</p>
          <div class="bg-surface">
            <ListRow
              v-for="p in examples"
              :key="p.number"
              :title="pretty(p.number)"
              :subtitle="p.title"
              icon="flask-conical"
              icon-tone="violet"
              clickable
              @click="query = p.number"
            >
              <template #right><AppIcon name="chevron-right" :size="18" class="text-muted" /></template>
            </ListRow>
          </div>
        </template>
      </template>
    </main>
  </div>
</template>
