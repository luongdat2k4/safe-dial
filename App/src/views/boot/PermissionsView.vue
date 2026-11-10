<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import BaseButton from '@/components/BaseButton.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import ListRow from '@/components/ListRow.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { t } from '@/composables/useT'

type PermKey = 'calls' | 'contacts' | 'overlay' | 'notifications'
type RoleKey = 'dialer' | 'screening'

const router = useRouter()
const settings = useSettingsStore()
const ui = useUiStore()

const perms = reactive<Record<PermKey, boolean>>({ calls: false, contacts: false, overlay: false, notifications: false })
const roles = reactive<Record<RoleKey, boolean>>({ dialer: false, screening: false })

const permItems: { key: PermKey; icon: string; tone: 'brand' | 'blue' | 'violet' | 'warn' }[] = [
  { key: 'calls', icon: 'phone', tone: 'brand' },
  { key: 'contacts', icon: 'contact-round', tone: 'blue' },
  { key: 'overlay', icon: 'layers', tone: 'violet' },
  { key: 'notifications', icon: 'bell', tone: 'warn' },
]
const roleItems: { key: RoleKey; icon: string }[] = [
  { key: 'dialer', icon: 'phone-call' },
  { key: 'screening', icon: 'shield-check' },
]

const canContinue = computed(() => perms.calls && perms.contacts)
const allOn = computed(() => Object.values(perms).every(Boolean))

const roleSheet = ref(false)
const roleKey = ref<RoleKey>('dialer')

function openRole(k: RoleKey) {
  roleKey.value = k
  roleSheet.value = true
}

function confirmRole() {
  roles[roleKey.value] = true
  roleSheet.value = false
  ui.showToast(t('boot.permissions.roles.done'), 'success')
}

function allowAll() {
  for (const k of Object.keys(perms) as PermKey[]) perms[k] = true
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
        <p class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-spam-soft px-3 py-1 text-xs font-medium text-spam">
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
            <ToggleSwitch v-model="perms[p.key]" :label="t(`boot.permissions.items.${p.key}.title`)" />
          </template>
        </ListRow>
      </div>

      <SectionHeader :title="t('boot.permissions.sectionRoles')" />
      <div class="mx-4 divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
        <ListRow
          v-for="r in roleItems"
          :key="r.key"
          :icon="r.icon"
          icon-tone="blue"
          :title="t(`boot.permissions.roles.${r.key}.title`)"
          :subtitle="t(`boot.permissions.roles.${r.key}.why`)"
          chevron
          @click="openRole(r.key)"
        >
          <template #right>
            <span
              class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="roles[r.key] ? 'bg-primary-soft text-primary-dark' : 'bg-unknown-soft text-unknown'"
            >
              {{ roles[r.key] ? t('boot.permissions.roles.set') : t('boot.permissions.roles.notSet') }}
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
      <BaseButton block size="lg" :disabled="!canContinue" @click="finish()">{{ t('common.actions.next') }}</BaseButton>
      <p v-if="!canContinue" class="mt-2 text-center text-xs text-muted">{{ t('boot.permissions.needBasic') }}</p>
      <button type="button" class="tap mx-auto mt-1 block min-h-10 px-4 text-sm font-medium text-muted" @click="finish(true)">
        {{ t('boot.permissions.later') }}
      </button>
    </div>

    <BottomSheet
      v-model="roleSheet"
      :title="t(roleKey === 'dialer' ? 'boot.permissions.roles.sheetTitleDialer' : 'boot.permissions.roles.sheetTitleScreening')"
    >
      <div class="flex items-center gap-3 rounded-2xl bg-canvas p-3">
        <span class="grid size-12 place-items-center rounded-xl bg-primary-dark text-white"><AppIcon name="shield-check" :size="26" /></span>
        <div>
          <p class="font-semibold">{{ t('common.appName') }}</p>
          <p class="text-[13px] text-muted">{{ t('boot.permissions.roles.sheetText') }}</p>
        </div>
      </div>
      <div class="mt-4 flex flex-col gap-2">
        <BaseButton block @click="confirmRole">{{ t('boot.permissions.roles.setDefault') }}</BaseButton>
        <BaseButton block variant="ghost" @click="roleSheet = false">{{ t('boot.permissions.roles.cancel') }}</BaseButton>
      </div>
    </BottomSheet>
  </div>
</template>
