import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import type { BlockRule, BlockRuleKind, BlockSettings } from '@/types'
import { DEFAULT_BLOCK_SETTINGS } from '@/data/defaults'
import { normalizeNumber, toE164 } from '@/utils/numbers'
import { loadJSON } from '@/utils/storage'
import { syncWithNative, type KeyMap } from '@/utils/nativeSettings'
import { SafeDial, type NativeDecision, type NativeRule } from '@/services'
import { useSettingsStore } from './settings'
import { useLookupStore } from './lookup'

const KEY_SETTINGS = 'safedial.block.settings.v1'

function toRule(r: NativeRule): BlockRule {
  return {
    id: r.id,
    kind: r.kind,
    value: r.value,
    label: r.label ?? undefined,
    enabled: r.enabled,
    hitCount: r.hitCount,
    lastHitAt: r.lastHitAt,
    createdAt: r.createdAt,
  }
}

/** BlockSettings ↔ key SharedPreferences mà CallScreeningService đọc. */
const MAP: KeyMap<BlockSettings> = {
  blockPrivate: { key: 'block.private' },
  blockInternational: { key: 'block.international' },
  blockNonContacts: { key: 'block.nonContacts' },
  method: { key: 'block.method' },
  notifyOnBlock: { key: 'block.notify' },
  autoBlockReported: { key: 'block.autoBlockReported' },
}

export type AddRuleResult = { ok: true } | { ok: false; reason: 'invalid' | 'duplicate' | 'failed' }

/**
 * Chặn: số cụ thể nằm trong danh sách chặn của Android (BlockedNumberContract),
 * quy tắc mẫu nằm trong block_rules, công tắc nằm trong SharedPreferences.
 */
export const useBlockStore = defineStore('block', () => {
  const rules = ref<BlockRule[]>([])
  /** Số đang bị chặn (E.164). */
  const blocked = ref<string[]>([])
  const canBlock = ref(true)
  const loaded = ref(false)
  const settings = reactive<BlockSettings>(loadJSON<BlockSettings>(KEY_SETTINGS, { ...DEFAULT_BLOCK_SETTINGS }))
  const app = useSettingsStore()
  const lookup = useLookupStore()

  syncWithNative(settings, MAP, KEY_SETTINGS)

  async function load(force = false) {
    if (loaded.value && !force) return
    const [r, b] = await Promise.all([SafeDial.listRules(), SafeDial.listBlocked(), lookup.loadMarks()])
    rules.value = r.rules.map(toRule)
    blocked.value = b.numbers
    canBlock.value = b.canBlock
    loaded.value = true
  }

  function isBlocked(e164: string): boolean {
    return !!e164 && blocked.value.includes(e164)
  }

  /** Chặn một số cụ thể (kể cả số trong danh bạ). `label` lưu thành tên đặt cho số. */
  async function blockNumber(e164: string, label?: string): Promise<boolean> {
    if (!e164) return false
    try {
      await SafeDial.block({ number: e164 })
    } catch {
      return false
    }
    if (!blocked.value.includes(e164)) blocked.value = [e164, ...blocked.value]
    if (label?.trim() && !lookup.marks[e164]?.name) await lookup.rename(e164, label.trim())
    if (lookup.cache[e164]) lookup.cache[e164].blocked = true
    return true
  }

  async function unblockNumber(e164: string) {
    await SafeDial.unblock({ number: e164 })
    blocked.value = blocked.value.filter((n) => n !== e164)
    if (lookup.cache[e164]) lookup.cache[e164].blocked = false
  }

  /** Thêm quy tắc mẫu. `rawValue` là dãy số (với `country` là mã quay số, có thể có '+'). */
  async function addRule(kind: BlockRuleKind, rawValue: string, label?: string): Promise<AddRuleResult> {
    const value = normalizeNumber(rawValue).replace(/^\+/, '')
    if (!value) return { ok: false, reason: 'invalid' }
    if (rules.value.some((r) => r.kind === kind && r.value === value)) return { ok: false, reason: 'duplicate' }
    try {
      const { rule } = await SafeDial.addRule({ kind, value, label: label?.trim() || undefined })
      rules.value = [toRule(rule), ...rules.value]
      return { ok: true }
    } catch (e) {
      return { ok: false, reason: String(e).includes('duplicate') ? 'duplicate' : 'failed' }
    }
  }

  /** Chặn số người dùng nhập (form "Số cụ thể"). */
  async function addNumber(rawValue: string, label?: string): Promise<AddRuleResult> {
    const e164 = toE164(rawValue, app.state.homeCountryDial)
    if (!e164) return { ok: false, reason: 'invalid' }
    if (isBlocked(e164)) return { ok: false, reason: 'duplicate' }
    return (await blockNumber(e164, label)) ? { ok: true } : { ok: false, reason: 'failed' }
  }

  async function removeRule(id: string) {
    await SafeDial.deleteRule({ id })
    rules.value = rules.value.filter((r) => r.id !== id)
  }

  async function setRuleEnabled(id: string, enabled: boolean) {
    await SafeDial.setRuleEnabled({ id, enabled })
    const r = rules.value.find((x) => x.id === id)
    if (r) r.enabled = enabled
  }

  function patchSettings(p: Partial<BlockSettings>) {
    Object.assign(settings, p)
  }

  /** Chạy bộ quyết định (native trên máy thật) ở chế độ thử, không có cuộc gọi thật. */
  function evaluate(e164: string): Promise<NativeDecision> {
    return SafeDial.evaluate({ number: e164 })
  }

  return {
    rules, blocked, canBlock, settings, loaded, load, isBlocked, blockNumber, unblockNumber,
    addRule, addNumber, removeRule, setRuleEnabled, patchSettings, evaluate,
  }
})
