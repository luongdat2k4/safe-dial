import { reactive, watch } from 'vue'
import { defineStore } from 'pinia'
import type { AppSettings } from '@/types'
import { DEFAULT_APP_SETTINGS } from '@/data/defaults'
import { loadJSON } from '@/utils/storage'
import { syncWithNative, type KeyMap } from '@/utils/nativeSettings'
import { setLocale } from '@/i18n'
import { SafeDial, isNative } from '@/services'

const KEY = 'safedial.settings.v1'

/** Trường AppSettings ↔ key SharedPreferences (schema mục 3). */
const MAP: KeyMap<AppSettings> = {
  homeCountryDial: { key: 'home_country_dial', toNative: (v) => String(v).replace('+', ''), fromNative: (v) => '+' + String(v).replace('+', '') },
  onboardingDone: { key: 'boot.onboardingDone' },
  permissionsDone: { key: 'boot.permissionsDone' },
  language: { key: 'ui.language' },
  defaultSim: { key: 'ui.defaultSim' },
  dialSound: { key: 'ui.dialSound' },
  ringtone: { key: 'ui.ringtone' },
  callerIdEnabled: { key: 'callerId.enabled' },
  showForContacts: { key: 'callerId.showForContacts' },
  showAfterCall: { key: 'callerId.showAfterCall' },
  scamWarning: { key: 'callerId.scamWarning' },
  popupSize: { key: 'popup.size' },
  popupPosition: { key: 'popup.position' },
  callAlertNotification: { key: 'notify.suspiciousCall' },
  missedCallNotification: { key: 'notify.missedCall' },
  remindMissedCalls: { key: 'notify.remindMissed' },
}

export const useSettingsStore = defineStore('settings', () => {
  const state = reactive<AppSettings>(loadJSON<AppSettings>(KEY, { ...DEFAULT_APP_SETTINGS }))
  syncWithNative(state, MAP, KEY)
  // Nước nhà theo SIM của máy (không mặc định Việt Nam): mọi định dạng / chuẩn hoá số dựa vào mã này.
  if (isNative)
    void SafeDial.getHomeCountry()
      .then(({ dial }) => {
        if (dial && state.homeCountryDial !== '+' + dial) state.homeCountryDial = '+' + dial
      })
      .catch(() => undefined)
  // Ngôn ngữ giao diện theo cài đặt (kể cả khi giá trị được nạp từ native).
  watch(() => state.language, (code) => void setLocale(code), { immediate: true })

  function patch(partial: Partial<AppSettings>) {
    Object.assign(state, partial)
  }

  function reset() {
    Object.assign(state, DEFAULT_APP_SETTINGS)
  }

  return { state, patch, reset }
})
