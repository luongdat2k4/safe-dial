/**
 * Bản giả lập của plugin SafeDial cho trình duyệt (dev / test UI). Hành vi bám theo bản
 * native: cùng bảng dữ liệu (call_meta, call_stats_daily, number_marks, block_rules,
 * call_notes) nhưng lưu trong localStorage. Có thêm `resetDemo` để tạo lại dữ liệu mẫu.
 */
import { WebPlugin } from '@capacitor/core'
import type { Contact } from '@/types'
import { CONTACTS, SEED_BLOCKED, SEED_MARKS, SEED_RULES } from '@/data/seed'
import { RAW_CALLS } from '@/data/callLog'
import { decide, type DecideSettings } from '@/utils/blockEngine'
import type {
  CallNote,
  CallSnapshot,
  EndedCall,
  LaunchInfo,
  NativeCall,
  NativeCallType,
  NativeContact,
  NativeDecision,
  NativeMark,
  NativeRule,
  NumberInfo,
  PermAlias,
  PermState,
  SafeDialPlugin,
  Sim,
  StatsRow,
  Status,
} from './definitions'

const KEY = 'safedial.web.v1'
const DAY = 86_400_000

interface State {
  contacts: Contact[]
  calls: NativeCall[]
  marks: Record<string, NativeMark>
  blocked: string[]
  rules: NativeRule[]
  stats: Record<string, StatsRow>
  notes: CallNote[]
  settings: Record<string, unknown>
  seq: number
}

export function dayOf(ms: number): number {
  const offset = -new Date(ms).getTimezoneOffset() * 60_000
  return Math.floor((ms + offset) / DAY)
}

function emptyRow(day: number, number: string): StatsRow {
  return {
    day, number, incoming: 0, missed: 0, rejected: 0, blocked: 0, outgoing: 0, answeredOut: 0,
    talkInSec: 0, talkOutSec: 0, riskUnknown: 0, riskSpam: 0, riskScam: 0, warned: 0,
  }
}

type Impl = Omit<SafeDialPlugin, 'addListener'>

export class SafeDialWeb extends WebPlugin implements Impl {
  private s: State
  private current: CallSnapshot | null = null
  private lastEnded: EndedCall | null = null
  private dialTimer?: ReturnType<typeof setTimeout>

  constructor() {
    super()
    this.s = this.load() ?? this.seed()  }

  // ------------------------------------------------------------ lưu trữ

  private load(): State | null {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as State) : null
    } catch {
      return null
    }
  }

  private save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.s))
    } catch {
      /* bỏ qua */
    }
  }

  private id(): string {
    this.s.seq += 1
    return String(this.s.seq)
  }

  private seed(): State {
    const now = Date.now()
    this.s = {
      contacts: CONTACTS.map((c) => ({ ...c, numbers: [...c.numbers] })),
      calls: [],
      marks: {},
      blocked: [...SEED_BLOCKED],
      rules: [],
      stats: {},
      notes: [],
      settings: {},
      seq: 100,
    }
    for (const m of SEED_MARKS) {
      this.s.marks[m.number] = { number: m.number, trusted: !!m.trusted, category: m.category ?? null, name: m.name ?? null, note: m.note ?? null, updatedAt: now }
    }
    for (const r of SEED_RULES) {
      this.s.rules.push({ id: this.id(), kind: r.kind, value: r.value, label: r.label ?? null, enabled: true, hitCount: 0, createdAt: now })
    }
    // Chạy nhật ký mẫu qua bộ quyết định, từ cũ đến mới.
    for (const r of [...RAW_CALLS].sort((a, b) => b.ago - a.ago)) {
      const at = now - r.ago * 60_000
      if (r.type === 'outgoing') {
        this.record({ number: r.number, type: 'outgoing', startedAt: at, durationSec: r.dur ?? 0, simSlot: r.sim })
        continue
      }
      const d = this.decide(r.number, at)
      if (d.action === 'blocked' || d.action === 'silenced') {
        this.record({ number: r.number, type: 'blocked', startedAt: at, durationSec: 0, decision: d })
      } else {
        this.record({ number: r.number, type: r.type, startedAt: at, durationSec: r.type === 'incoming' ? (r.dur ?? 0) : 0, simSlot: r.sim, decision: d })
      }
    }
    this.save()
    return this.s
  }

  // ------------------------------------------------------------ bộ quyết định

  private setting<T>(key: string, def: T): T {
    const v = this.s.settings[key]
    return v === undefined || v === null ? def : (v as T)
  }

  private homeDial(): string {
    return '+' + String(this.setting('home_country_dial', '84')).replace('+', '')
  }

  private decideSettings(): DecideSettings {
    return {
      blockPrivate: this.setting('block.private', true),
      blockInternational: this.setting('block.international', false),
      blockNonContacts: this.setting('block.nonContacts', false),
      method: this.setting('block.method', 'hangup'),
      warnInternational: this.setting('detect.warnInternational', true),
      warnPrivate: this.setting('detect.warnPrivate', true),
      burstCount: this.setting('detect.burstCount', 3),
      burstWindowMin: this.setting('detect.burstWindowMin', 10),
    }
  }

  private contactOf(e164: string): Contact | undefined {
    return e164 ? this.s.contacts.find((c) => c.numbers.includes(e164)) : undefined
  }

  private decide(e164: string, now = Date.now()): NativeDecision {
    return decide(e164, {
      homeDial: this.homeDial(),
      settings: this.decideSettings(),
      rules: this.s.rules,
      isBlocked: (n) => !!n && this.s.blocked.includes(n),
      mark: (n) => this.s.marks[n],
      contactName: (n) => this.contactOf(n)?.name,
      callsFrom: (n, since) => this.s.calls.filter((c) => c.number === n && c.type !== 'outgoing' && c.startedAt >= since && c.startedAt <= now).length,
      rejectedBefore: (n) => this.s.calls.some((c) => c.number === n && c.meta && (c.meta.action === 'blocked' || c.meta.action === 'silenced')),
    })
  }

  /** Ghi một cuộc gọi: nhật ký + call_meta + call_stats_daily (như Recorder.java). */
  private record(c: { number: string; type: NativeCallType; startedAt: number; durationSec: number; simSlot?: number; decision?: NativeDecision }) {
    const d = c.decision
    const interesting = !!d && (d.action !== 'allowed' || d.risk !== 'safe')
    const call: NativeCall = {
      id: this.id(),
      number: c.number,
      name: this.contactOf(c.number)?.name,
      type: c.type,
      startedAt: c.startedAt,
      durationSec: c.durationSec,
      simSlot: c.simSlot,
      meta: interesting && d ? { risk: d.risk, reasons: d.reasons, action: d.action, ruleId: d.ruleId } : undefined,
    }
    this.s.calls.unshift(call)
    if (d?.ruleId && (d.action === 'blocked' || d.action === 'silenced')) {
      const r = this.s.rules.find((x) => x.id === d.ruleId)
      if (r) {
        r.hitCount += 1
        r.lastHitAt = c.startedAt
      }
    }

    const day = dayOf(c.startedAt)
    const k = `${day}|${c.number}`
    const row = (this.s.stats[k] ??= emptyRow(day, c.number))
    switch (c.type) {
      case 'incoming': row.incoming++; row.talkInSec += c.durationSec; break
      case 'missed': row.missed++; break
      case 'rejected': row.rejected++; break
      case 'blocked': row.blocked++; break
      case 'outgoing':
        row.outgoing++
        if (c.durationSec > 0) { row.answeredOut++; row.talkOutSec += c.durationSec }
        break
    }
    if (d && c.type !== 'outgoing') {
      if (d.risk === 'unknown') row.riskUnknown++
      else if (d.risk === 'spam') row.riskSpam++
      else if (d.risk === 'scam') row.riskScam++
      if (d.action === 'warned') row.warned++
    }
  }

  // ------------------------------------------------------------ khởi động & quyền

  async getLaunchState() {
    return { call: this.current ?? undefined }
  }

  async getStatus(): Promise<Status> {
    return { contacts: 'granted', contactsWrite: 'granted', callLog: 'granted', phone: 'granted', notifications: 'granted', dialerRole: true, canBlock: true }
  }

  async requestPermissions(opts: { permissions: PermAlias[] }) {
    const out = {} as Record<PermAlias, PermState>
    for (const p of opts.permissions) out[p] = 'granted'
    return out
  }

  async requestDialerRole() {
    return { granted: true }
  }

  // ------------------------------------------------------------ cài đặt

  async getSettings() {
    return { values: { ...this.s.settings } }
  }

  async setSettings(opts: { values: Record<string, unknown> }) {
    for (const [k, v] of Object.entries(opts.values)) {
      if (v === null || v === undefined) delete this.s.settings[k]
      else this.s.settings[k] = v
    }
    this.save()
  }

  // ------------------------------------------------------------ danh bạ

  async getContacts(opts?: { query?: string }): Promise<{ contacts: NativeContact[] }> {
    const q = opts?.query?.trim().toLowerCase()
    const list = [...this.s.contacts]
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.numbers.some((n) => n.includes(q)))
    return {
      contacts: list.map((c) => ({
        id: c.id,
        lookupKey: c.id,
        name: c.name,
        starred: c.favorite,
        numbers: c.numbers.map((n) => ({ raw: n, e164: n })),
      })),
    }
  }

  async setStarred(opts: { contactId: number | string; starred: boolean }) {
    const c = this.s.contacts.find((x) => x.id === String(opts.contactId))
    if (c) c.favorite = opts.starred
    this.save()
  }

  async lookupNumber(opts: { number: string }): Promise<NumberInfo> {
    const c = this.contactOf(opts.number)
    const mark = this.s.marks[opts.number]
    return {
      number: opts.number,
      isContact: !!c,
      name: c?.name ?? mark?.name ?? undefined,
      contactId: c ? (c.id as unknown as number) : undefined,
      starred: c?.favorite,
      blocked: !!opts.number && this.s.blocked.includes(opts.number),
      mark,
    }
  }

  // ------------------------------------------------------------ nhật ký

  async getCallLog(opts?: { limit?: number; offset?: number; number?: string; since?: number }) {
    const limit = opts?.limit ?? 300
    const offset = opts?.offset ?? 0
    let list = this.s.calls
    if (opts?.number !== undefined && opts.number !== '') list = list.filter((c) => c.number === opts.number)
    if (opts?.since) list = list.filter((c) => c.startedAt >= opts.since!)
    return { calls: list.slice(offset, offset + limit).map((c) => ({ ...c, name: this.contactOf(c.number)?.name })), granted: true }
  }

  async deleteCalls(opts: { ids: string[] }) {
    this.s.calls = this.s.calls.filter((c) => !opts.ids.includes(c.id))
    this.save()
  }

  async deleteCallsOf(opts: { number: string }) {
    this.s.calls = this.s.calls.filter((c) => c.number !== opts.number)
    this.save()
  }

  async clearCallLog() {
    this.s.calls = []
    this.save()
  }

  // ------------------------------------------------------------ chặn

  async listBlocked() {
    return { numbers: [...this.s.blocked], canBlock: true }
  }

  async block(opts: { number: string }) {
    if (opts.number && !this.s.blocked.includes(opts.number)) this.s.blocked.unshift(opts.number)
    this.save()
  }

  async unblock(opts: { number: string }) {
    this.s.blocked = this.s.blocked.filter((n) => n !== opts.number)
    this.save()
  }

  // ------------------------------------------------------------ number_marks

  async listMarks() {
    return { marks: Object.values(this.s.marks).sort((a, b) => b.updatedAt - a.updatedAt) }
  }

  async setMark(opts: { number: string } & Partial<Omit<NativeMark, 'number' | 'updatedAt'>>) {
    if (!opts.number) throw new Error('Không thể đánh dấu số ẩn')
    const prev = this.s.marks[opts.number] ?? { number: opts.number, trusted: false, updatedAt: 0 }
    const next: NativeMark = { ...prev, updatedAt: Date.now() }
    if ('trusted' in opts) next.trusted = !!opts.trusted
    if ('category' in opts) next.category = opts.category ?? null
    if ('name' in opts) next.name = opts.name?.trim() || null
    if ('note' in opts) next.note = opts.note?.trim() || null
    if (!next.trusted && !next.category && !next.name && !next.note) delete this.s.marks[opts.number]
    else this.s.marks[opts.number] = next
    this.save()
    return { mark: this.s.marks[opts.number] }
  }

  // ------------------------------------------------------------ block_rules

  async listRules() {
    return { rules: [...this.s.rules].sort((a, b) => b.createdAt - a.createdAt) }
  }

  async addRule(opts: { kind: NativeRule['kind']; value: string; label?: string }) {
    const value = opts.value.replace(/\D/g, '')
    if (this.s.rules.some((r) => r.kind === opts.kind && r.value === value)) throw new Error('duplicate')
    const rule: NativeRule = { id: this.id(), kind: opts.kind, value, label: opts.label?.trim() || null, enabled: true, hitCount: 0, createdAt: Date.now() }
    this.s.rules.unshift(rule)
    this.save()
    return { rule }
  }

  async setRuleEnabled(opts: { id: string; enabled: boolean }) {
    const r = this.s.rules.find((x) => x.id === opts.id)
    if (r) r.enabled = opts.enabled
    this.save()
  }

  async deleteRule(opts: { id: string }) {
    this.s.rules = this.s.rules.filter((r) => r.id !== opts.id)
    this.save()
  }

  // ------------------------------------------------------------ thống kê

  async getStats(opts: { fromDay: number; number?: string }) {
    const rows = Object.values(this.s.stats)
      .filter((r) => r.day >= opts.fromDay && (opts.number === undefined || r.number === opts.number))
      .sort((a, b) => a.day - b.day)
    return { rows, today: dayOf(Date.now()) }
  }

  async clearStats() {
    this.s.stats = {}
    this.save()
  }

  // ------------------------------------------------------------ ghi chú

  async listNotes(opts?: { number?: string }) {
    const list = opts?.number === undefined ? this.s.notes : this.s.notes.filter((n) => n.number === opts.number)
    return { notes: [...list].sort((a, b) => b.at - a.at) }
  }

  async addNote(opts: { number: string; at: number; note: string }) {
    const note: CallNote = { id: this.id(), number: opts.number, at: opts.at, note: opts.note.trim() }
    this.s.notes.push(note)
    this.save()
    return { id: note.id }
  }

  async deleteNote(opts: { id: string }) {
    this.s.notes = this.s.notes.filter((n) => n.id !== opts.id)
    this.save()
  }

  // ------------------------------------------------------------ kiểm tra / gọi

  async evaluate(opts: { number: string }) {
    return this.decide(opts.number)
  }

  async openAppSettings() {
    /* bản web: không có Cài đặt hệ thống */
  }

  async openSms() {
    /* bản web: UI tự hiện thông báo giả lập */
  }

  async addContact() {
    /* bản web: UI tự hiện thông báo giả lập */
  }

  async getSims(): Promise<{ sims: Sim[] }> {
    return { sims: [{ id: 'sim1', label: 'SIM 1', slot: 1 }, { id: 'sim2', label: 'SIM 2', slot: 2 }] }
  }

  private emit() {
    if (this.current) this.notifyListeners('callState', { ...this.current })
  }

  async placeCall(opts: { number: string; simId?: string }) {
    clearTimeout(this.dialTimer)
    const c = this.contactOf(opts.number)
    this.current = {
      state: 'dialing', incoming: false, number: opts.number, name: c?.name ?? this.s.marks[opts.number]?.name ?? null,
      muted: false, speaker: false, holding: false, startAt: Date.now(),
    }
    this.emit()
    this.dialTimer = setTimeout(() => {
      if (this.current?.state === 'dialing') {
        this.current.state = 'active'
        this.current.activeAt = Date.now()
        this.emit()
      }
    }, 1500)
  }

  async getCallState() {
    return { call: this.current ?? undefined, lastEnded: this.lastEnded ?? undefined }
  }

  private end(kind: 'hangup' | 'reject') {
    const s = this.current
    if (!s) throw new Error('Không có cuộc gọi')
    clearTimeout(this.dialTimer)
    const answered = !!s.activeAt
    const dur = answered ? Math.round((Date.now() - s.activeAt!) / 1000) : 0
    let type: NativeCallType
    if (!s.incoming) type = 'outgoing'
    else if (answered) type = 'incoming'
    else type = kind === 'reject' ? 'rejected' : 'missed'
    const decision = s.decision
    if (decision && kind === 'reject' && decision.action === 'warned') decision.action = 'silenced'
    this.record({ number: s.number, type, startedAt: s.startAt, durationSec: dur, simSlot: 1, decision })
    this.save()
    this.current = null
    this.lastEnded = { number: s.number, name: s.name, type, startedAt: s.startAt, durationSec: dur, decision }
    this.notifyListeners('callState', { ...s, state: 'disconnected' })
    this.notifyListeners('callEnded', this.lastEnded)
  }

  async answer() {
    if (!this.current) throw new Error('Không có cuộc gọi')
    this.current.state = 'active'
    this.current.activeAt = Date.now()
    this.emit()
  }

  async reject() {
    this.end('reject')
  }

  async hangup() {
    if (this.current?.state === 'ringing') this.end('reject')
    else this.end('hangup')
  }

  async setMuted(opts: { muted: boolean }) {
    if (this.current) this.current.muted = opts.muted
    this.emit()
  }

  async setSpeaker(opts: { on: boolean }) {
    if (this.current) this.current.speaker = opts.on
    this.emit()
  }

  async setHold(opts: { hold: boolean }) {
    if (this.current) {
      this.current.holding = opts.hold
      this.current.state = opts.hold ? 'holding' : 'active'
    }
    this.emit()
  }

  async dtmf() {
    /* không có âm thanh trên web */
  }

  /** Chỉ bản web: xoá dữ liệu giả lập và tạo lại từ đầu. */
  async resetDemo() {
    localStorage.removeItem(KEY)
    this.s = this.seed()
  }

  /** Để đúng kiểu với bản native (không dùng trên web). */
  launch(_l: LaunchInfo) {}
}
