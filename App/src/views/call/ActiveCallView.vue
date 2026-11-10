<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCallSessionStore } from '@/stores/callSession'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { t } from '@/composables/useT'
import { formatClock } from '@/utils/format'
import { formatNumber } from '@/utils/numbers'
import Avatar from '@/components/Avatar.vue'
import AppIcon from '@/components/AppIcon.vue'
import Keypad from '@/components/Keypad.vue'

const router = useRouter()
const session = useCallSessionStore()
const settings = useSettingsStore()
const ui = useUiStore()
const typed = ref('')

onMounted(() => {
  if ((session.phase !== 'dialing' && session.phase !== 'active') || !session.info) router.replace('/home/calls')
})

const info = computed(() => session.info)
const danger = computed(() => info.value?.risk === 'scam' || info.value?.risk === 'spam')
const status = computed(() => (session.phase === 'dialing' ? t('call.active.dialing') : formatClock(session.seconds)))
const title = computed(() => info.value?.name ?? formatNumber(info.value?.number ?? '', settings.state.homeCountryDial))

type CtrlKey = 'muted' | 'speaker' | 'hold' | 'keypad'
const grid: Array<{ key: string; icon: string; on?: CtrlKey }> = [
  { key: 'mute', icon: 'mic-off', on: 'muted' },
  { key: 'keypad', icon: 'grid-3x3', on: 'keypad' },
  { key: 'speaker', icon: 'volume-2', on: 'speaker' },
  { key: 'hold', icon: 'pause', on: 'hold' },
  { key: 'add', icon: 'user-plus' },
  { key: 'note', icon: 'notebook-pen' },
]

function press(item: (typeof grid)[number]) {
  if (item.on) {
    session.controls[item.on] = !session.controls[item.on]
    return
  }
  if (item.key === 'add') router.push('/dialpad')
  else ui.showToast(t('call.active.noteToast'), 'info')
}

function hangup() {
  session.hangup()
  router.replace(settings.state.showAfterCall ? '/call/after' : '/home/calls')
}
</script>

<template>
  <div v-if="info" class="pt-safe pb-safe flex h-full flex-col bg-gradient-to-b from-[#16302a] via-[#0f2420] to-[#08130f] text-white">
    <div v-if="danger && settings.state.scamWarning" class="mx-4 mt-3 flex items-center gap-2 rounded-2xl px-3 py-2 text-[13px] font-semibold" :class="info.risk === 'scam' ? 'bg-scam' : 'bg-spam'" role="alert">
      <AppIcon :name="info.risk === 'scam' ? 'shield-alert' : 'shield-x'" :size="18" class="warn-blink shrink-0" />
      {{ info.risk === 'scam' ? t('call.active.warnScam') : t('call.active.warnSpam') }}
    </div>

    <div class="flex flex-col items-center px-6 pt-10 text-center">
      <Avatar :name="info.name" :risk="info.risk" :is-private="!info.number" :size="96" />
      <h2 class="mt-4 text-2xl font-bold break-words">{{ title }}</h2>
      <p v-if="info.name && info.number" class="text-sm opacity-75">{{ formatNumber(info.number, settings.state.homeCountryDial) }}</p>
      <p class="mt-2 text-lg tabular-nums" :class="session.controls.hold ? 'text-favorite' : 'opacity-90'" aria-live="polite">
        {{ session.controls.hold ? t('call.active.onHold') : status }}
      </p>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto pt-6">
      <div v-if="session.controls.keypad" class="pb-3">
        <p class="mb-3 h-8 text-center text-2xl tracking-widest tabular-nums">{{ typed }}</p>
        <Keypad dark @press="(k) => (typed += k)" />
        <button type="button" class="tap mx-auto mt-3 block rounded-full px-4 py-2 text-sm font-semibold opacity-85" @click="session.controls.keypad = false">
          {{ t('call.active.hideKeypad') }}
        </button>
      </div>
      <div v-else class="grid grid-cols-3 gap-y-5 px-8">
        <button v-for="g in grid" :key="g.key" type="button" class="tap flex flex-col items-center gap-1.5 text-xs" :aria-pressed="g.on ? session.controls[g.on] : undefined" @click="press(g)">
          <span class="grid size-14 place-items-center rounded-full transition-colors" :class="g.on && session.controls[g.on] ? 'bg-white text-ink' : 'bg-white/12'">
            <AppIcon :name="g.icon" :size="24" />
          </span>
          {{ t(`call.active.controls.${g.key}`) }}
        </button>
      </div>
    </div>

    <div class="flex justify-center py-6">
      <button type="button" class="tap grid size-[70px] place-items-center rounded-full bg-scam shadow-sheet" :aria-label="t('call.active.end')" @click="hangup">
        <AppIcon name="phone-off" :size="32" />
      </button>
    </div>
  </div>
</template>
