<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCallSessionStore } from '@/stores/callSession'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { t } from '@/composables/useT'
import { formatClock } from '@/utils/format'
import { formatNumber } from '@/utils/numbers'
import { isNative } from '@/services'
import BrandOrb from '@/components/BrandOrb.vue'
import AppIcon from '@/components/AppIcon.vue'
import Keypad from '@/components/Keypad.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import BaseButton from '@/components/BaseButton.vue'

const router = useRouter()
const session = useCallSessionStore()
const settings = useSettingsStore()
const ui = useUiStore()
const typed = ref('')
const noteOpen = ref(false)
const noteText = ref('')

onMounted(() => {
  if (session.phase === 'idle') router.replace('/home/calls')
})

const info = computed(() => session.info)
const danger = computed(() => info.value?.risk === 'scam' || info.value?.risk === 'spam')
const status = computed(() => (session.phase === 'dialing' ? t('call.active.dialing') : formatClock(session.seconds)))
const title = computed(() => info.value?.name ?? formatNumber(info.value?.number ?? '', settings.state.homeCountryDial))

type CtrlKey = 'muted' | 'speaker' | 'hold' | 'keypad'
const ALL: Array<{ key: string; icon: string; on?: CtrlKey }> = [
  { key: 'mute', icon: 'mic-off', on: 'muted' },
  { key: 'keypad', icon: 'grid-3x3', on: 'keypad' },
  { key: 'speaker', icon: 'volume-2', on: 'speaker' },
  { key: 'hold', icon: 'pause', on: 'hold' },
  { key: 'add', icon: 'user-plus' },
  { key: 'note', icon: 'notebook-pen' },
]
// Máy thật: chưa hỗ trợ giao diện nhiều cuộc gọi cùng lúc → ẩn "Thêm cuộc gọi".
const grid = ALL.filter((g) => !(isNative && g.key === 'add'))

function press(item: (typeof grid)[number]) {
  if (item.on) {
    void session.toggle(item.on)
    return
  }
  if (item.key === 'add') router.push('/dialpad')
  else {
    noteText.value = ''
    noteOpen.value = true
  }
}

function key(k: string) {
  typed.value += k
  session.dtmf(k)
}

async function saveNote() {
  const v = noteText.value.trim()
  if (!v) return
  await session.addNote(v)
  noteOpen.value = false
  ui.showToast(t('call.active.noteSaved'), 'success')
}

/** Điều hướng sau khi kết thúc do App.vue xử lý (sự kiện callEnded). */
function hangup() {
  void session.hangup()
}
</script>

<template>
  <div v-if="info" class="call-screen pt-safe pb-safe flex h-full flex-col">
    <div v-if="danger && settings.state.scamWarning" class="mx-4 mt-3 flex items-center gap-2 rounded-2xl px-3 py-2 text-[13px] font-semibold text-white" :class="info.risk === 'scam' ? 'bg-scam' : 'bg-spam'" role="alert">
      <AppIcon :name="info.risk === 'scam' ? 'shield-alert' : 'shield-x'" :size="18" class="warn-blink shrink-0" />
      {{ info.risk === 'scam' ? t('call.active.warnScam') : t('call.active.warnSpam') }}
    </div>

    <div class="call-identity flex shrink-0 flex-col items-center px-6 pt-5 text-center">
      <div class="mb-1 flex w-full items-center justify-between text-sm"><span class="font-semibold">Safe Dial</span><span class="flex items-center gap-2 rounded-full border border-white bg-white/75 px-3 py-1.5 text-xs text-primary"><span class="size-1.5 rounded-full bg-primary" />{{ status }}</span></div>
      <BrandOrb active />
      <h2 class="mt-2 text-[26px] font-semibold tracking-tight break-words">{{ title }}</h2>
      <p v-if="info.name && info.number" class="text-sm opacity-75">{{ formatNumber(info.number, settings.state.homeCountryDial) }}</p>
      <p v-if="session.controls.hold" class="mt-2 text-sm text-primary" aria-live="polite">
        {{ t('call.active.onHold') }}
      </p>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto pt-6">
      <div v-if="session.controls.keypad" class="pb-3">
        <p class="mb-3 h-8 text-center text-2xl tracking-widest tabular-nums">{{ typed }}</p>
        <Keypad @press="key" />
        <button type="button" class="tap mx-auto mt-3 block rounded-full px-4 py-2 text-sm font-semibold opacity-85" @click="session.toggle('keypad')">
          {{ t('call.active.hideKeypad') }}
        </button>
      </div>
      <div v-else class="grid grid-cols-3 gap-y-5 px-8">
        <button v-for="g in grid" :key="g.key" type="button" class="tap flex flex-col items-center gap-1.5 text-xs" :aria-pressed="g.on ? session.controls[g.on] : undefined" @click="press(g)">
          <span class="grid call-control size-14 place-items-center rounded-[20px] transition-colors" :class="g.on && session.controls[g.on] ? 'call-control-on' : 'text-ink'">
            <AppIcon :name="g.icon" :size="24" />
          </span>
          {{ t(`call.active.controls.${g.key}`) }}
        </button>
      </div>
    </div>

    <div class="flex shrink-0 justify-center pt-8 pb-9">
      <button type="button" class="tap grid size-[70px] place-items-center rounded-full hangup-button" :aria-label="t('call.active.end')" @click="hangup">
        <AppIcon name="phone-off" :size="32" />
      </button>
    </div>

    <BottomSheet v-model="noteOpen" :title="t('call.active.noteTitle')">
      <textarea
        v-model="noteText"
        rows="3"
        maxlength="500"
        :placeholder="t('call.active.notePlaceholder')"
        class="w-full resize-none rounded-2xl border border-line bg-canvas px-3 py-2.5 text-[15px] text-ink outline-none focus:border-primary"
      />
      <BaseButton class="mt-3" block :disabled="!noteText.trim()" @click="saveNote">{{ t('call.active.noteSave') }}</BaseButton>
    </BottomSheet>
  </div>
</template>
