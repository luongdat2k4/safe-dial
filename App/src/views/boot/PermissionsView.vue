<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { App as CapApp } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import AppIcon from '@/components/AppIcon.vue'
import BaseButton from '@/components/BaseButton.vue'
import ListRow from '@/components/ListRow.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { t } from '@/composables/useT'
import { SafeDial, isNative, type PermAlias, type Status } from '@/services'

type PermKey = 'calls' | 'contacts' | 'notifications'

const router = useRouter()
const settings = useSettingsStore()
const ui = useUiStore()
const status = ref<Status | null>(null)
let resumeHandle: PluginListenerHandle | undefined

/** Mỗi mục trên UI ứng với một hoặc nhiều nhóm quyền của plugin. */
const ALIASES: Record<PermKey, PermAlias[]> = {
  calls: ['callLog', 'phone'],
  contacts: ['contacts'],
  notifications: ['notifications'],
}

const permItems: { key: PermKey; icon: string; tone: 'brand' | 'blue' | 'violet' | 'warn' }[] = [
  { key: 'contacts', icon: 'contact-round', tone: 'blue' },
  { key: 'calls', icon: 'phone', tone: 'brand' },
  { key: 'notifications', icon: 'bell', tone: 'warn' },
]

async function refresh() {
  status.value = await SafeDial.getStatus()
}

onMounted(async () => {
  await refresh()
  // Người dùng có thể bật quyền trong Cài đặt Android rồi quay lại.
  if (isNative) resumeHandle = await CapApp.addListener('resume', refresh)
})
onBeforeUnmount(() => resumeHandle?.remove())

function granted(k: PermKey): boolean {
  const s = status.value
  return !!s && ALIASES[k].every((a) => s[a] === 'granted')
}

const canContinue = computed(() => granted('contacts'))
const allOn = computed(() => permItems.every((p) => granted(p.key)) && !!status.value?.dialerRole)

async function request(k: PermKey) {
  if (granted(k)) return
  await SafeDial.requestPermissions({ permissions: ALIASES[k] })
  await refresh()
}

async function requestRole() {
  if (status.value?.dialerRole) return
  // Màn hình cuộc gọi đến dựa vào thông báo full-screen → xin quyền thông báo trước.
  if (!granted('notifications')) await request('notifications')
  try {
    const r = await SafeDial.requestDialerRole()
    if (r.granted) ui.showToast(t('boot.permissions.roles.done'), 'success')
  } catch {
    ui.showToast(t('boot.permissions.roles.unavailable'), 'warning')
  }
  await refresh()
}

async function allowAll() {
  const missing = permItems.filter((p) => !granted(p.key)).flatMap((p) => ALIASES[p.key])
  if (missing.length) await SafeDial.requestPermissions({ permissions: missing })
  await refresh()
  if (!status.value?.dialerRole) await requestRole()
}

function finish(limited = false) {
  settings.patch({ permissionsDone: true })
  if (limited) ui.showToast(t('boot.permissions.laterWarn'), 'warning', 3200)
  router.replace('/home/calls')
}
</script>

<template>
  <div class="flex flex-col bg-canvas">
    <div class="min-h-0 flex-1 overflow-y-auto pb-4">
      <div class="pt-safe px-5 pt-10 pb-3">
        <span class="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
          <AppIcon name="shield-check" :size="28" />
        </span>
        <h1 class="mt-4 text-2xl font-bold">{{ t('boot.permissions.title') }}</h1>
        <p class="mt-1 text-[15px] text-muted">{{ t('boot.permissions.subtitle') }}</p>
        <p v-if="!isNative" class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-spam-soft px-3 py-1 text-xs font-medium text-spam">
          <AppIcon name="flask-conical" :size="14" /> {{ t('common.mockNotice') }}
        </p>
      </div>

      <div class="flex items-center">
        <div class="flex-1"><SectionHeader :title="t('boot.permissions.sectionPermissions')" /></div>
        <button
          type="button"
          class="tap mr-3 min-h-10 rounded-full px-3 text-sm font-semibold text-primary-dark disabled:opacity-45"
          :disabled="allOn"
          @click="allowAll"
        >
          {{ t('boot.permissions.allowAll') }}
        </button>
      </div>
      <div class="mx-4 divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
        <ListRow
          v-for="p in permItems"
          :key="p.key"
          :icon="p.icon"
          :icon-tone="p.tone"
          :title="t(`boot.permissions.items.${p.key}.title`)"
          :subtitle="t(`boot.permissions.items.${p.key}.why`)"
        >
          <template #right>
            <ToggleSwitch
              :model-value="granted(p.key)"
              :disabled="granted(p.key)"
              :label="t(`boot.permissions.items.${p.key}.title`)"
              @update:model-value="request(p.key)"
            />
          </template>
        </ListRow>
      </div>

      <SectionHeader :title="t('boot.permissions.sectionRoles')" />
      <div class="mx-4 overflow-hidden rounded-card bg-surface shadow-card">
        <ListRow
          icon="phone-call"
          icon-tone="blue"
          :title="t('boot.permissions.roles.dialer.title')"
          :subtitle="t('boot.permissions.roles.dialer.why')"
          chevron
          @click="requestRole"
        >
          <template #right>
            <span
              class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="status?.dialerRole ? 'bg-primary-soft text-primary-dark' : 'bg-unknown-soft text-unknown'"
            >
              {{ status?.dialerRole ? t('boot.permissions.roles.set') : t('boot.permissions.roles.notSet') }}
            </span>
          </template>
        </ListRow>
      </div>

      <div class="mx-4 mt-4 flex gap-3 rounded-card border border-line bg-primary-soft p-4">
        <AppIcon name="lock" :size="20" class="mt-0.5 shrink-0 text-primary-dark" />
        <div>
          <p class="text-sm font-semibold text-primary-dark">{{ t('boot.permissions.privacyTitle') }}</p>
          <p class="mt-0.5 text-[13px] leading-snug text-ink/80">{{ t('boot.permissions.privacyText') }}</p>
        </div>
      </div>
    </div>

    <div class="pb-safe shrink-0 border-t border-line bg-surface px-4 pt-3 pb-3">
      <BaseButton block size="lg" :disabled="!canContinue" @click="finish(!allOn)">{{ t('common.actions.next') }}</BaseButton>
      <p v-if="!canContinue" class="mt-2 text-center text-xs text-muted">{{ t('boot.permissions.needBasic') }}</p>
      <button type="button" class="tap mx-auto mt-1 block min-h-10 px-4 text-sm font-medium text-muted" @click="finish(true)">
        {{ t('boot.permissions.later') }}
      </button>
    </div>
  </div>
</template>
