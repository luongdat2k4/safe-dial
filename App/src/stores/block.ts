import { reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { BlockRule, BlockRuleKind, BlockSettings } from '@/types'
import { DEFAULT_RULES } from '@/data/seed'
import { DEFAULT_BLOCK_SETTINGS } from '@/data/defaults'
import { decideCall, type Decision } from '@/utils/blockEngine'
import { normalizeNumber, toE164 } from '@/utils/numbers'
import { loadJSON, loadList, saveJSON } from '@/utils/storage'
import { useSettingsStore } from './settings'
import { useLookupStore } from './lookup'

const KEY_RULES = 'safedial.block.rules.v1'
const KEY_SETTINGS = 'safedial.block.settings.v1'

export const useBlockStore = defineStore('block', () => {
  const rules = ref<BlockRule[]>(loadList<BlockRule>(KEY_RULES, DEFAULT_RULES.map((r) => ({ ...r }))))
  const settings = reactive<BlockSettings>(loadJSON<BlockSettings>(KEY_SETTINGS, { ...DEFAULT_BLOCK_SETTINGS }))
  const app = useSettingsStore()
  const lookup = useLookupStore()

  watch(rules, (v) => saveJSON(KEY_RULES, v), { deep: true })
  watch(settings, (v) => saveJSON(KEY_SETTINGS, v), { deep: true })

  /** Thêm quy tắc. Với kind `number` giá trị được chuẩn hoá về E.164. */
  function addRule(kind: BlockRuleKind, rawValue: string, label?: string): BlockRule | null {
    let value = normalizeNumber(rawValue)
    if (!value) return null
    if (kind === 'number') value = toE164(value, app.state.homeCountryDial)
    if (rules.value.some((r) => r.kind === kind && r.value === value)) return null
    const rule: BlockRule = {
      id: `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      kind,
      value,
      label: label?.trim() || undefined,
      createdAt: new Date().toISOString(),
    }
    rules.value = [rule, ...rules.value]
    return rule
  }

  function removeRule(id: string) {
    rules.value = rules.value.filter((r) => r.id !== id)
  }

  function isBlockedNumber(e164: string): BlockRule | undefined {
    return rules.value.find((r) => r.kind === 'number' && r.value === e164)
  }

  function patchSettings(p: Partial<BlockSettings>) {
    Object.assign(settings, p)
  }

  /** Chạy bộ máy chặn cho một số (hoặc số ẩn). */
  async function evaluate(e164: string): Promise<{ decision: Decision; info: Awaited<ReturnType<typeof lookup.identify>> }> {
    const info = await lookup.identify(e164)
    const decision = decideCall(
      { number: e164, isContact: info.isContact, profile: info.profile },
      { rules: rules.value, settings, homeDial: app.state.homeCountryDial },
    )
    return { decision, info }
  }

  return { rules, settings, addRule, removeRule, isBlockedNumber, patchSettings, evaluate }
})
