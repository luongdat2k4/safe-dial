<script setup lang="ts">
import AppBar from '@/components/AppBar.vue'
import ListRow from '@/components/ListRow.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import { useSettingsStore } from '@/stores/settings'
import { useBlockStore } from '@/stores/block'
import { t } from '@/composables/useT'

const settings = useSettingsStore()
const block = useBlockStore()
</script>

<template>
  <div class="flex flex-col bg-canvas">
    <AppBar :title="t('settings.notifications.title')" back />
    <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <div class="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
        <ListRow :title="t('settings.notifications.callAlert')" :subtitle="t('settings.notifications.callAlertSub')" icon="bell-ring">
          <template #right>
            <ToggleSwitch v-model="settings.state.callAlertNotification" :label="t('settings.notifications.callAlert')" />
          </template>
        </ListRow>
        <ListRow :title="t('settings.notifications.missed')" :subtitle="t('settings.notifications.missedSub')" icon="phone-missed" icon-tone="danger">
          <template #right>
            <ToggleSwitch v-model="settings.state.missedCallNotification" :label="t('settings.notifications.missed')" />
          </template>
        </ListRow>
        <ListRow :title="t('settings.notifications.remind')" :subtitle="t('settings.notifications.remindSub')" icon="alarm-clock" icon-tone="warn">
          <template #right>
            <ToggleSwitch v-model="settings.state.remindMissedCalls" :label="t('settings.notifications.remind')" />
          </template>
        </ListRow>
        <ListRow :title="t('settings.notifications.blocked')" :subtitle="t('settings.notifications.blockedSub')" icon="ban" icon-tone="violet">
          <template #right>
            <ToggleSwitch v-model="block.settings.notifyOnBlock" :label="t('settings.notifications.blocked')" />
          </template>
        </ListRow>
      </div>
    </div>
  </div>
</template>
