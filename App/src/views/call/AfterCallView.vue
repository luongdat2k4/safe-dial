<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBlockStore } from '@/stores/block'
import { useCallSessionStore } from '@/stores/callSession'
import { useCallsStore } from '@/stores/calls'
import { useLookupStore } from '@/stores/lookup'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { t } from '@/composables/useT'
import type { SpamCategory } from '@/types'
import { formatDuration, formatTime } from '@/utils/format'
import { formatNumber } from '@/utils/numbers'
import AppBar from '@/components/AppBar.vue'
import Avatar from '@/components/Avatar.vue'
import AppIcon from '@/components/AppIcon.vue'
import RiskBadge from '@/components/RiskBadge.vue'
import BaseButton from '@/components/BaseButton.vue'
import ListRow from '@/components/ListRow.vue'
import ReportSheet from '@/components/call/ReportSheet.vue'
import SuggestNameSheet from '@/components/call/SuggestNameSheet.vue'

const router = useRouter()
const session = useCallSessionStore()
const calls = useCallsStore()
const lookup = useLookupStore()
const block = useBlockStore()
const settings = useSettingsStore()
const ui = useUiStore()

const reportOpen = ref(false)
const suggestOpen = ref(false)
const reported = ref(false)

onMounted(() => {
  if (!session.lastEnded) router.replace('/home/calls')
})

const entry = computed(() => session.lastEnded)
const number = computed(() => entry.value?.number ?? '')
const isContact = computed(() => session.info?.isContact ?? !!(entry.value?.contactId || entry.value?.name))
const display = computed(() => formatNumber(number.value, settings.state.homeCountryDial))
const title = computed(() => entry.value?.name ?? display.value)
const risk = computed(() => session.info?.risk ?? entry.value?.risk ?? 'unknown')
const type = computed(() => entry.value?.type ?? 'incoming')
const alreadyBlocked = computed(() => !!block.isBlockedNumber(number.value))

async function report(category: SpamCategory) {
  reportOpen.value = false
  const p = await lookup.report(number.value, category)
  calls.applyRisk(number.value, p.risk, p.reportCount, p.category)
  if (session.info) session.info.risk = p.risk
  reported.value = true
  ui.showToast(t('call.after.reported'), 'success')
}

async function suggest(name: string) {
  suggestOpen.value = false
  await lookup.suggestName(number.value, name)
  ui.showToast(t('call.after.suggested'), 'success')
}

async function blockNumber() {
  const ok = await ui.confirm({
    title: t('call.incoming.blockTitle'),
    message: t('call.incoming.blockMsg', { number: display.value }),
    confirmText: t('common.actions.block'),
    danger: true,
    icon: 'ban',
  })
  if (!ok) return
  const r = block.addRule('number', number.value)
  ui.showToast(r ? t('call.incoming.blocked', { number: display.value }) : t('block.form.duplicate'), r ? 'success' : 'warning')
}

async function callBack() {
  await session.dial(number.value)
  router.replace('/call/active')
}

function close() {
  session.reset()
  router.replace('/home/calls')
}
</script>

<template>
  <div v-if="entry" class="flex h-full flex-col bg-canvas">
    <AppBar :title="t('call.after.title')">
      <template #right>
        <button type="button" class="tap grid size-10 place-items-center rounded-full" :aria-label="t('common.actions.close')" @click="close"><AppIcon name="x" :size="22" /></button>
      </template>
    </AppBar>

    <div class="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-6">
      <section class="rounded-card bg-surface p-4 shadow-card">
        <div class="flex items-center gap-3">
          <Avatar :name="entry.name" :risk="risk" :is-private="!number" :size="56" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-lg font-bold">{{ title }}</p>
            <p v-if="entry.name && number" class="truncate text-sm text-muted">{{ display }}</p>
            <div class="mt-1"><RiskBadge :risk="risk" :category="entry.category" /></div>
          </div>
        </div>
        <dl class="mt-3 divide-y divide-line text-[15px]">
          <div class="flex justify-between py-2"><dt class="text-muted">{{ t('call.after.type') }}</dt><dd class="font-semibold">{{ t(`common.callType.${type}`) }}</dd></div>
          <div class="flex justify-between py-2"><dt class="text-muted">{{ t('call.after.duration') }}</dt><dd class="font-semibold">{{ formatDuration(entry.durationSec) }}</dd></div>
          <div class="flex justify-between py-2"><dt class="text-muted">{{ t('call.after.time') }}</dt><dd class="font-semibold">{{ formatTime(entry.startedAt) }}</dd></div>
          <div v-if="entry.simSlot" class="flex justify-between py-2"><dt class="text-muted">SIM</dt><dd class="font-semibold">SIM {{ entry.simSlot }}</dd></div>
        </dl>
      </section>

      <section v-if="!isContact" class="mt-4 rounded-card bg-surface p-4 shadow-card">
        <h2 class="text-base font-bold">{{ t('call.after.whoTitle') }}</h2>
        <template v-if="number">
          <p class="mt-0.5 text-[13px] text-muted">{{ t('call.after.whoDesc') }}</p>
          <div class="mt-3 grid grid-cols-2 gap-2">
            <BaseButton variant="danger" icon="flag" :disabled="reported" @click="reportOpen = true">{{ reported ? t('call.after.reportedBtn') : t('call.after.spam') }}</BaseButton>
            <BaseButton variant="secondary" icon="shield-check" @click="ui.showToast(t('call.after.notSpamToast'), 'success')">{{ t('call.after.notSpam') }}</BaseButton>
            <BaseButton variant="ghost" icon="pencil" @click="suggestOpen = true">{{ t('call.after.suggest') }}</BaseButton>
            <BaseButton variant="ghost" icon="ban" :disabled="alreadyBlocked" @click="blockNumber">{{ alreadyBlocked ? t('call.after.alreadyBlocked') : t('common.actions.block') }}</BaseButton>
          </div>
          <ListRow class="-mx-4 mt-2" clickable icon="user-plus" :title="t('common.actions.addToContacts')" @click="ui.showToast(t('call.after.saveToast'), 'info')" />
        </template>
        <p v-else class="mt-1 text-[13px] text-muted">{{ t('call.after.hidden') }}</p>
      </section>

      <section v-else class="mt-4 flex gap-2">
        <BaseButton class="flex-1" icon="phone" @click="callBack">{{ t('call.after.callBack') }}</BaseButton>
        <BaseButton class="flex-1" variant="secondary" icon="message-square" @click="ui.showToast(t('call.after.messageToast'), 'info')">{{ t('common.actions.message') }}</BaseButton>
      </section>

      <BaseButton class="mt-6" block variant="ghost" @click="close">{{ t('common.actions.close') }}</BaseButton>
    </div>

    <ReportSheet v-model="reportOpen" @pick="report" />
    <SuggestNameSheet v-model="suggestOpen" @submit="suggest" />
  </div>
</template>
