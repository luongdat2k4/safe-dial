import { reactive, watch } from 'vue'
import { defineStore } from 'pinia'
import type { AppSettings } from '@/types'
import { DEFAULT_APP_SETTINGS } from '@/data/defaults'
import { loadJSON, saveJSON } from '@/utils/storage'

const KEY = 'safedial.settings.v1'

export const useSettingsStore = defineStore('settings', () => {
  const state = reactive<AppSettings>(loadJSON<AppSettings>(KEY, { ...DEFAULT_APP_SETTINGS }))

  watch(state, (v) => saveJSON(KEY, v), { deep: true })

  function patch(partial: Partial<AppSettings>) {
    Object.assign(state, partial)
  }

  function reset() {
    Object.assign(state, DEFAULT_APP_SETTINGS)
  }

  return { state, patch, reset }
})
