<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { CallerInfo } from '@/types'
import { t } from '@/composables/useT'
import { useDialFlow, useNumberActions } from '@/composables/useDialFlow'
import { useBlockStore } from '@/stores/block'
import { useCallsStore } from '@/stores/calls'
import { useContactsStore } from '@/stores/contacts'
import { useLookupStore } from '@/stores/lookup'
import { useUiStore } from '@/stores/ui'
import { numberPath, parseNumberParam } from '@/utils/routes'
import AppBar from '@/components/AppBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import Avatar from '@/components/Avatar.vue'
import RiskBadge from '@/components/RiskBadge.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import ListRow from '@/components/ListRow.vue'
import CallRow from '@/components/calls/CallRow.vue'
import SimSheet from '@/components/calls/SimSheet.vue'
import ScamWarning from '@/components/number/ScamWarning.vue'
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
const menuOpen = ref(false)
const reportOpen = ref(false)
const suggestOpen = ref(false)

async function refresh() {
  const target = e164.value
  info.value = null
  await Promise.all([calls.load(), contacts.load()])
  const r = await lookup.identify(target)
  if (target === e164.value) info.value = r
}
watch(e164, refresh, { immediate: true })

const profile = computed(() => info.value?.profile)
const contact = computed(() => contacts.findByNumber(e164.value))
const risk = computed(() => info.value?.risk ?? 'unknown')
const dangerous = computed(() => risk.value === 'scam' || risk.value === 'spam')
const history = computed(() => calls.forNumber(e164.value))
const blockRule = computed(() => (e164.value ? block.isBlockedNumber(e164.value) : undefined))
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
        await contacts.toggleFavorite(c.id)
        ui.showToast(t(c.favorite ? 'number.toast.favOn' : 'number.toast.favOff'), 'success')
      },
    })
  } else {
    list.push({ key: 'save', icon: 'user-plus', label: t('number.actions.save'), tone: 'bg-primary-soft text-primary-dark', disabled: hidden.value, run: saveMock })
  }
  list.push({
    key: 'block',
    icon: blockRule.value ? 'circle-check' : 'ban',
    label: blockRule.value ? t('number.actions.unblock') : t('number.actions.block'),
    tone: blockRule.value ? 'bg-[#efe8fd] text-blocked' : 'bg-scam-soft text-scam',
    disabled: hidden.value,
    run: () => void toggleBlock(e164.value, displayName.value),
  })
  return list
})

async function menu(action: 'copy' | 'share' | 'block' | 'clear') {
  menuOpen.value = false
  if (action === 'copy') return copyNumber(e164.value)
  if (action === 'share') return ui.showToast(t('number.shareToast'))
  if (action === 'block') return void (await toggleBlock(e164.value, displayName.value))
  const ok = await ui.confirm({
    title: t('number.clear.title'),
    message: t('number.clear.message'),
    confirmText: t('common.actions.delete'),
    danger: true,
    icon: 'trash-2',
  })
  if (!ok) return
  await calls.remove(history.value.map((e) => e.id))
  ui.showToast(t('number.clear.done'), 'success')
}
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
            <RiskBadge :risk="risk" :category="profile?.category" size="md" />
            <span v-if="contact" class="rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary-dark">{{ t('number.contact') }}</span>
          </template>
        </div>
        <p v-if="hidden" class="mt-3 max-w-72 text-sm text-muted">{{ t('number.hiddenDesc') }}</p>
      </section>

      <ScamWarning v-if="info && dangerous && profile" :profile="profile" />

      <p v-if="blockRule" class="mx-4 flex items-center gap-2 rounded-2xl bg-[#efe8fd] px-4 py-3 text-sm font-semibold text-blocked">
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
        <NumberInfoCard :e164="e164" :profile="profile" :last-call="history[0]?.startedAt" />

        <!-- Cộng đồng -->
        <section class="mx-4 rounded-2xl border border-line bg-surface p-4 shadow-card">
          <h2 class="mb-2 text-sm font-bold">{{ t('number.community.title') }}</h2>
          <p class="text-xs text-muted">{{ t('number.community.suggestedNames') }}</p>
          <div v-if="profile?.suggestedNames?.length" class="mt-1.5 flex flex-wrap gap-1.5">
            <span v-for="n in profile.suggestedNames" :key="n" class="rounded-full bg-canvas px-3 py-1 text-sm font-medium">{{ n }}</span>
          </div>
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

      <!-- Cuộc gọi gần đây -->
      <section class="overflow-hidden rounded-2xl border border-line bg-surface shadow-card mx-4">
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
          :title="blockRule ? t('number.menu.unblock') : t('number.menu.block')"
          :icon="blockRule ? 'circle-check' : 'ban'"
          icon-tone="danger"
          clickable
          @click="menu('block')"
        />
        <ListRow v-if="history.length" :title="t('number.menu.clear')" icon="trash-2" icon-tone="danger" danger clickable @click="menu('clear')" />
      </div>
    </BottomSheet>
    <ReportSheet v-model="reportOpen" :number="e164" @reported="refresh" />
    <SuggestNameSheet v-model="suggestOpen" :number="e164" @done="refresh" />
    <SimSheet v-model="simSheetOpen" :number="pendingNumber" @choose="chooseSim" />
  </div>
</template>
