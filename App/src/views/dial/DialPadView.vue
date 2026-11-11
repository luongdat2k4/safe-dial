<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { CallerInfo, Contact } from '@/types'
import { t } from '@/composables/useT'
import { useDialFlow } from '@/composables/useDialFlow'
import { useBlockStore } from '@/stores/block'
import { useContactsStore } from '@/stores/contacts'
import { useLookupStore } from '@/stores/lookup'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { formatNumber, nationalForm, toE164 } from '@/utils/numbers'
import { numberPath } from '@/utils/routes'
import AppBar from '@/components/AppBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import Avatar from '@/components/Avatar.vue'
import Keypad from '@/components/Keypad.vue'
import RecognitionStrip from '@/components/number/RecognitionStrip.vue'
import SimSheet from '@/components/calls/SimSheet.vue'

const router = useRouter()
const settings = useSettingsStore()
const contacts = useContactsStore()
const lookup = useLookupStore()
const block = useBlockStore()
const ui = useUiStore()
const { startCall, chooseSim, simSheetOpen, pendingNumber } = useDialFlow()

const raw = ref('')
const info = ref<CallerInfo | null>(null)
const loading = ref(false)
const home = () => settings.state.homeCountryDial

const route = useRoute()
onMounted(() => {
  contacts.load()
  block.load()
  // Mở từ ACTION_DIAL (tel:…) của app khác.
  const n = route.query.number
  if (typeof n === 'string' && n) raw.value = n.replace(/[^+\d*#]/g, '')
})

const digitCount = computed(() => raw.value.replace(/\D/g, '').length)
const e164 = computed(() => toE164(raw.value, home()))
const display = computed(() => {
  const r = raw.value
  if (!r || r.startsWith('+') || /[*#]/.test(r)) return r
  return formatNumber(toE164(r, home()), home()).replace(/^\+84 /, '0')
})
const suggestions = computed(() => (digitCount.value >= 2 || /[a-z]/i.test(raw.value) ? contacts.search(raw.value).slice(0, 30) : []))

// Nhận diện số (debounce 250ms, bỏ qua kết quả cũ)
let timer: ReturnType<typeof setTimeout> | undefined
let token = 0
watch(raw, (v) => {
  clearTimeout(timer)
  token += 1
  info.value = null
  const plausible = !/[*#]/.test(v) && v.replace(/\D/g, '').length >= 9
  loading.value = plausible
  if (!plausible) return
  const mine = token
  timer = setTimeout(async () => {
    const result = await lookup.identify(toE164(v, home()))
    if (mine !== token) return
    info.value = result
    loading.value = false
  }, 250)
})
onBeforeUnmount(() => clearTimeout(timer))

function press(k: string) {
  if (raw.value.length < 20) raw.value += k
}
const plus = () => {
  if (!raw.value) raw.value = '+'
  else press('+')
}

// Xoá: chạm = xoá 1 ký tự, giữ = xoá hết
let delTimer: ReturnType<typeof setTimeout> | undefined
let delLong = false
function delDown() {
  delLong = false
  delTimer = setTimeout(() => {
    delLong = true
    raw.value = ''
  }, 500)
}
function delUp() {
  clearTimeout(delTimer)
}
function delClick() {
  if (!delLong) raw.value = raw.value.slice(0, -1)
}

function pick(c: Contact) {
  raw.value = nationalForm(c.numbers[0] ?? '', home())
}
async function unblock() {
  if (!e164.value) return
  await block.unblockNumber(e164.value)
  if (info.value) info.value = { ...info.value, blocked: false }
  ui.showToast(t('dial.recognition.unblockToast', { number: formatNumber(e164.value, home()) }), 'success')
}
const call = () => startCall(e164.value)
</script>

<template>
  <div class="flex h-full flex-col bg-canvas">
    <AppBar :title="t('dial.title')" back />

    <div class="flex min-h-0 flex-1 flex-col justify-end gap-2 pt-2">
      <!-- Gợi ý danh bạ: danh sách dọc lấp khoảng trống phía trên số đang gõ. -->
      <div class="flex min-h-0 flex-1 flex-col justify-end overflow-hidden">
        <ul v-if="suggestions.length" class="min-h-0 overflow-y-auto px-2" :aria-label="t('dial.suggestions')">
          <li v-for="c in suggestions" :key="c.id">
            <button type="button" class="tap flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left active:bg-primary-soft/50" @click="pick(c)">
              <Avatar :name="c.name" risk="safe" :size="40" />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[15px] font-semibold">{{ c.name }}</span>
                <span class="block truncate text-[13px] text-muted">{{ formatNumber(c.numbers[0] ?? '', home()) }}</span>
              </span>
            </button>
          </li>
        </ul>
      </div>

      <div class="flex h-16 items-center justify-center gap-1 px-4">
        <p
          class="min-w-0 flex-1 truncate text-center font-semibold tracking-wide"
          :class="[!display ? 'text-xl' : display.length > 14 ? 'text-2xl' : 'text-[34px]', display ? 'text-ink' : 'text-muted/60']"
          aria-live="polite"
        >
          {{ display || t('dial.placeholder') }}
        </p>
        <button
          v-if="raw"
          type="button"
          class="tap grid size-11 shrink-0 place-items-center rounded-full text-muted"
          :aria-label="t('dial.backspace')"
          @pointerdown="delDown"
          @pointerup="delUp"
          @pointerleave="delUp"
          @click="delClick"
        >
          <AppIcon name="delete" :size="26" />
        </button>
      </div>

      <RecognitionStrip
        :number="e164"
        :info="info"
        :loading="loading"
        @unblock="unblock"
        @detail="router.push(numberPath(e164))"
      />

      <Keypad @press="press" @long-zero="plus" />

      <div class="pb-safe grid grid-cols-3 items-center px-10 pt-1 pb-4">
        <button
          type="button"
          class="tap mx-auto grid size-12 place-items-center rounded-full bg-surface text-primary-dark shadow-card disabled:opacity-40"
          :disabled="!raw"
          :aria-label="t('dial.save')"
          @click="ui.showToast(t('dial.saveToast'))"
        >
          <AppIcon name="user-plus" :size="22" />
        </button>
        <button
          type="button"
          class="tap mx-auto grid size-[68px] place-items-center rounded-full accent-gradient disabled:opacity-40"
          :disabled="!raw"
          :aria-label="t('dial.call')"
          @click="call"
        >
          <AppIcon name="phone" :size="30" />
        </button>
        <button
          type="button"
          class="tap mx-auto grid size-12 place-items-center rounded-full bg-surface text-primary-dark shadow-card disabled:opacity-40"
          :disabled="!raw"
          :aria-label="t('dial.message')"
          @click="ui.showToast(t('dial.messageToast', { number: display }))"
        >
          <AppIcon name="message-square" :size="22" />
        </button>
      </div>
    </div>

    <SimSheet v-model="simSheetOpen" :number="pendingNumber" @choose="chooseSim" />
  </div>
</template>
