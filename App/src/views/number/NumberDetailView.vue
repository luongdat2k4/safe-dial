<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { CallerInfo } from '@/types'
import { SafeDial, type CallNote } from '@/services'
import { t } from '@/composables/useT'
import { useDialFlow, useNumberActions } from '@/composables/useDialFlow'
import { useBlockStore } from '@/stores/block'
import { useCallsStore } from '@/stores/calls'
import { useContactsStore } from '@/stores/contacts'
import { useLookupStore } from '@/stores/lookup'
import { useUiStore } from '@/stores/ui'
import { numberPath, parseNumberParam } from '@/utils/routes'
import { formatDate, formatTime } from '@/utils/format'
import AppBar from '@/components/AppBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import Avatar from '@/components/Avatar.vue'
import RiskBadge from '@/components/RiskBadge.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import ListRow from '@/components/ListRow.vue'
import CallRow from '@/components/calls/CallRow.vue'
import SimSheet from '@/components/calls/SimSheet.vue'
import NumberInfoCard from '@/components/number/NumberInfoCard.vue'
import ReportSheet from '@/components/number/ReportSheet.vue'
import SuggestNameSheet from '@/components/number/SuggestNameSheet.vue'

const route = useRoute()
const router = useRouter()
const calls = useCallsStore()
const contacts = useContactsStore()
const lookup = useLookupStore()
const block = useBlockStore()
const ui = useUiStore()
const { startCall, chooseSim, simSheetOpen, pendingNumber } = useDialFlow()
const { toggleBlock, copyNumber, messageMock, saveMock, pretty } = useNumberActions()

const e164 = computed(() => parseNumberParam(route.params.number))
const hidden = computed(() => !e164.value)
const info = ref<CallerInfo | null>(null)
const notes = ref<CallNote[]>([])
const menuOpen = ref(false)
const reportOpen = ref(false)
const suggestOpen = ref(false)

async function refresh() {
  const target = e164.value
  info.value = null
  await Promise.all([calls.load(), contacts.load(), block.load()])
  const [r, n] = await Promise.all([lookup.identify(target), target ? SafeDial.listNotes({ number: target }) : Promise.resolve({ notes: [] })])
  if (target !== e164.value) return
  info.value = r
  notes.value = n.notes
}
watch(e164, refresh, { immediate: true })

const mark = computed(() => info.value?.mark)
const contact = computed(() => contacts.findByNumber(e164.value))
const risk = computed(() => info.value?.risk ?? 'unknown')
const history = computed(() => calls.forNumber(e164.value))
/** Dấu hiệu của lần gọi gần nhất có call_meta. */
const isBlocked = computed(() => !!e164.value && block.isBlocked(e164.value))
const title = computed(() => contact.value?.name ?? info.value?.name ?? (hidden.value ? t('number.hidden') : pretty(e164.value)))
const displayName = computed(() => contact.value?.name ?? info.value?.name)

const actions = computed(() => {
  const list: Array<{ key: string; icon: string; label: string; tone: string; disabled?: boolean; fill?: boolean; run: () => void }> = [
    { key: 'call', icon: 'phone', label: t('number.actions.call'), tone: 'accent-gradient', disabled: hidden.value, run: () => startCall(e164.value) },
    { key: 'msg', icon: 'message-square', label: t('number.actions.message'), tone: 'bg-[#e7f0fd] text-outgoing', disabled: hidden.value, run: () => messageMock(e164.value, displayName.value) },
  ]
  if (contact.value) {
    const c = contact.value
    list.push({
      key: 'fav',
      icon: 'star',
      label: c.favorite ? t('number.actions.unfavorite') : t('number.actions.favorite'),
      tone: 'bg-surface text-favorite border border-line',
      fill: c.favorite,
      run: async () => {
        if (!(await contacts.toggleFavorite(c.id))) return
        ui.showToast(t(c.favorite ? 'number.toast.favOn' : 'number.toast.favOff'), 'success')
      },
    })
  } else {
    list.push({ key: 'save', icon: 'user-plus', label: t('number.actions.save'), tone: 'bg-primary-soft text-primary-dark', disabled: hidden.value, run: () => saveMock(e164.value) })
  }
  list.push({
    key: 'block',
    icon: isBlocked.value ? 'circle-check' : 'ban',
    label: isBlocked.value ? t('number.actions.unblock') : t('number.actions.block'),
    tone: isBlocked.value ? 'bg-[#efe8fd] text-blocked' : 'bg-scam-soft text-scam',
    disabled: hidden.value,
    run: () => void toggleBlock(e164.value, displayName.value).then((changed) => (changed ? refresh() : undefined)),
  })
  return list
})

async function menu(action: 'copy' | 'share' | 'block' | 'trust' | 'clearMark' | 'clear') {
  menuOpen.value = false
  if (action === 'copy') return copyNumber(e164.value)
  if (action === 'share') {
    if (navigator.share) return void navigator.share({ text: e164.value }).catch(() => undefined)
    return ui.showToast(t('number.shareToast'))
  }
  if (action === 'block') {
    if (await toggleBlock(e164.value, displayName.value)) await refresh()
    return
  }
  if (action === 'trust') {
    const on = !mark.value?.trusted
    await lookup.trust(e164.value, on)
    if (on && block.isBlocked(e164.value)) await block.unblockNumber(e164.value)
    ui.showToast(on ? t('number.trust.done') : t('number.trust.undone'), 'success')
    return refresh()
  }
  if (action === 'clearMark') {
    await lookup.setMark(e164.value, { trusted: false, category: undefined, name: undefined, note: undefined })
    ui.showToast(t('number.toast.markCleared'), 'success')
    return refresh()
  }
  const ok = await ui.confirm({
    title: t('number.clear.title'),
    message: t('number.clear.message'),
    confirmText: t('common.actions.delete'),
    danger: true,
    icon: 'trash-2',
  })
  if (!ok) return
  await calls.removeNumber(e164.value)
  ui.showToast(t('number.clear.done'), 'success')
}

async function deleteNote(id: string) {
  await SafeDial.deleteNote({ id })
  notes.value = notes.value.filter((n) => n.id !== id)
  ui.showToast(t('number.notes.deleted'), 'success')
}

const iso = (ms: number) => new Date(ms).toISOString()
</script>

<template>
  <div class="flex h-full flex-col bg-canvas">
    <AppBar :title="t('number.title')" back>
      <template #right>
        <button class="tap grid size-10 place-items-center rounded-full" :aria-label="t('number.menu.open')" @click="menuOpen = true">
          <AppIcon name="ellipsis-vertical" :size="22" />
        </button>
      </template>
    </AppBar>

    <main class="min-h-0 flex-1 space-y-4 overflow-y-auto pb-10">
      <!-- Đầu trang -->
      <section class="number-hero flex flex-col items-center text-center">
        <Avatar :name="displayName" :risk="risk" :size="88" :is-private="hidden" />
        <h2 class="mt-3 max-w-full truncate text-2xl font-bold" :class="risk === 'scam' ? 'text-scam' : ''">{{ title }}</h2>
        <p v-if="displayName && !hidden" class="text-sm text-muted">{{ pretty(e164) }}</p>
        <div class="mt-2 flex flex-wrap items-center justify-center gap-2">
          <p v-if="!info" class="flex items-center gap-1.5 text-sm text-muted">
            <AppIcon name="loader-circle" :size="16" class="animate-spin" /> {{ t('number.loading') }}
          </p>
          <template v-else>
            <RiskBadge :risk="risk" :category="mark?.category" size="md" />
            <span v-if="contact" class="rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary-dark">{{ t('number.contact') }}</span>
            <span v-if="mark?.trusted" class="rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary-dark">{{ t('number.trusted') }}</span>
          </template>
        </div>
        <p v-if="hidden" class="mt-3 max-w-72 text-sm text-muted">{{ t('number.hiddenDesc') }}</p>
      </section>


      <p v-if="isBlocked" class="mx-4 flex items-center gap-2 rounded-2xl bg-[#efe8fd] px-4 py-3 text-sm font-semibold text-blocked">
        <AppIcon name="ban" :size="18" /> {{ t('number.blockedBanner') }}
      </p>

      <!-- Hàng thao tác -->
      <div class="grid grid-cols-4 gap-2 px-4">
        <button
          v-for="a in actions"
          :key="a.key"
          type="button"
          class="tap flex flex-col items-center gap-1.5 rounded-2xl py-1 disabled:opacity-40"
          :disabled="a.disabled"
          @click="a.run()"
        >
          <span class="grid size-12 place-items-center rounded-full shadow-card" :class="a.tone">
            <AppIcon :name="a.icon" :size="22" :style="a.fill ? 'fill: currentColor' : ''" />
          </span>
          <span class="text-xs font-semibold">{{ a.label }}</span>
        </button>
      </div>

      <template v-if="!hidden">
        <NumberInfoCard :e164="e164" :mark="mark" :last-call="history[0]?.startedAt" :call-count="history.length" />

        <!-- Ghi chú của người dùng (number_marks) -->
        <section class="mx-4 rounded-2xl border border-line bg-surface p-4 shadow-card">
          <h2 class="mb-2 text-sm font-bold">{{ t('number.community.title') }}</h2>
          <template v-if="mark?.name || mark?.note">
            <p v-if="mark?.name" class="text-[15px] font-semibold">{{ mark.name }}</p>
            <p v-if="mark?.note" class="mt-0.5 text-sm text-muted">{{ mark.note }}</p>
          </template>
          <p v-else class="mt-1 text-sm text-muted">{{ t('number.community.noNames') }}</p>
          <div class="mt-3 flex gap-2">
            <button class="tap flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-line text-sm font-semibold" @click="suggestOpen = true">
              <AppIcon name="pencil" :size="16" /> {{ t('number.actions.suggest') }}
            </button>
            <button class="tap flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-scam-soft text-sm font-semibold text-scam" @click="reportOpen = true">
              <AppIcon name="flag" :size="16" /> {{ t('number.actions.report') }}
            </button>
          </div>
        </section>
      </template>

      <!-- Ghi chú cuộc gọi (call_notes) -->
      <section v-if="notes.length" class="mx-4 rounded-2xl border border-line bg-surface p-4 shadow-card">
        <h2 class="mb-2 text-sm font-bold">{{ t('number.notes.title') }}</h2>
        <ul class="divide-y divide-line">
          <li v-for="n in notes" :key="n.id" class="flex items-start gap-2 py-2">
            <div class="min-w-0 flex-1">
              <p class="text-sm">{{ n.note }}</p>
              <p class="text-xs text-muted">{{ formatTime(iso(n.at)) }} · {{ formatDate(iso(n.at)) }}</p>
            </div>
            <button type="button" class="tap grid size-8 place-items-center rounded-full text-muted" :aria-label="t('number.notes.delete')" @click="deleteNote(n.id)">
              <AppIcon name="x" :size="16" />
            </button>
          </li>
        </ul>
      </section>

      <!-- Cuộc gọi gần đây -->
      <section class="mx-4 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <div class="flex items-center px-4 pt-3 pb-1">
          <h2 class="flex-1 text-sm font-bold">{{ t('number.recent.title') }}</h2>
          <button v-if="history.length > 3" class="tap text-sm font-semibold text-primary-dark" @click="router.push(numberPath(e164, 'history'))">
            {{ t('common.actions.viewAll') }}
          </button>
        </div>
        <CallRow v-for="e in history.slice(0, 3)" :key="e.id" :entry="e" @open="router.push(numberPath(e164, 'history'))" />
        <p v-if="!history.length" class="px-4 pt-1 pb-4 text-sm text-muted">{{ t('number.recent.empty') }}</p>
      </section>

      <button
        v-if="!hidden"
        type="button"
        class="tap mx-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left shadow-card"
        @click="router.push(numberPath(e164, 'stats'))"
      >
        <span class="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary-dark"><AppIcon name="chart-column" :size="20" /></span>
        <span class="min-w-0 flex-1">
          <span class="block text-[15px] font-semibold">{{ t('number.stats.title') }}</span>
          <span class="block text-xs text-muted">{{ t('number.stats.subtitle') }}</span>
        </span>
        <AppIcon name="chevron-right" :size="18" class="text-muted" />
      </button>
    </main>

    <BottomSheet v-model="menuOpen" :title="t('number.menu.title')">
      <div class="-mx-5">
        <ListRow v-if="!hidden" :title="t('number.menu.copy')" icon="copy" icon-tone="gray" clickable @click="menu('copy')" />
        <ListRow v-if="!hidden" :title="t('number.menu.share')" icon="share-2" icon-tone="blue" clickable @click="menu('share')" />
        <ListRow
          v-if="!hidden"
          :title="isBlocked ? t('number.menu.unblock') : t('number.menu.block')"
          :icon="isBlocked ? 'circle-check' : 'ban'"
          icon-tone="danger"
          clickable
          @click="menu('block')"
        />
        <ListRow
          v-if="!hidden && !contact"
          :title="mark?.trusted ? t('number.menu.untrust') : t('number.menu.trust')"
          icon="shield-check"
          icon-tone="brand"
          clickable
          @click="menu('trust')"
        />
        <ListRow v-if="mark" :title="t('number.menu.clearMark')" icon="tag" icon-tone="gray" clickable @click="menu('clearMark')" />
        <ListRow v-if="history.length" :title="t('number.menu.clear')" icon="trash-2" icon-tone="danger" danger clickable @click="menu('clear')" />
      </div>
    </BottomSheet>
    <ReportSheet v-model="reportOpen" :number="e164" @reported="refresh" />
    <SuggestNameSheet v-model="suggestOpen" :number="e164" @done="refresh" />
    <SimSheet v-model="simSheetOpen" :number="pendingNumber" @choose="chooseSim" />
  </div>
</template>
