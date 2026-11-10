import type { BlockRule, BlockSettings, CallLogEntry, CallType, Contact } from '@/types'
import { SPAM_DB } from './seed'
import { decideCall } from '@/utils/blockEngine'

interface Raw {
  /** phút trước thời điểm hiện tại */
  ago: number
  number: string
  type: Exclude<CallType, 'blocked'>
  dur?: number
  sim?: 1 | 2
}

const RAW: Raw[] = [
  { ago: 12, number: '+84901000001', type: 'incoming', dur: 312, sim: 1 },
  { ago: 55, number: '+84900000111', type: 'incoming' },
  { ago: 130, number: '+84977123456', type: 'missed' },
  { ago: 200, number: '+84902000003', type: 'outgoing', dur: 95, sim: 1 },
  { ago: 330, number: '+84899999000', type: 'incoming' },
  { ago: 600, number: '+84901000002', type: 'outgoing', dur: 740, sim: 2 },
  { ago: 760, number: '', type: 'incoming' },
  { ago: 1500, number: '+84906000007', type: 'incoming', dur: 1260, sim: 1 },
  { ago: 1560, number: '+84904000005', type: 'missed' },
  { ago: 1700, number: '+12025550142', type: 'incoming' },
  { ago: 1900, number: '+84903000004', type: 'incoming', dur: 180, sim: 1 },
  { ago: 2200, number: '+84908777666', type: 'incoming' },
  { ago: 2900, number: '+84900000222', type: 'missed' },
  { ago: 3000, number: '+84901000001', type: 'outgoing', dur: 420, sim: 1 },
  { ago: 4300, number: '+84907000008', type: 'incoming', dur: 48, sim: 1 },
  { ago: 4400, number: '+84912000013', type: 'outgoing', dur: 610, sim: 2 },
  { ago: 5700, number: '+85512345678', type: 'incoming' },
  { ago: 5800, number: '+84988765432', type: 'missed' },
  { ago: 7200, number: '+84901000002', type: 'incoming', dur: 233, sim: 1 },
  { ago: 8600, number: '+841900123456', type: 'incoming' },
  { ago: 8700, number: '+84908000009', type: 'outgoing', dur: 150, sim: 1 },
  { ago: 10100, number: '+84906000007', type: 'outgoing', dur: 890, sim: 1 },
  { ago: 11500, number: '+84905000006', type: 'incoming', dur: 66, sim: 1 },
  { ago: 12900, number: '+2348012345678', type: 'incoming' },
  { ago: 13000, number: '+84913000014', type: 'incoming', dur: 301, sim: 1 },
  { ago: 14400, number: '+84901000001', type: 'incoming', dur: 1105, sim: 1 },
  { ago: 15800, number: '+84283000999', type: 'incoming' },
  { ago: 17200, number: '+84904000005', type: 'outgoing', dur: 210, sim: 1 },
  { ago: 18600, number: '+84909000012', type: 'incoming', dur: 40, sim: 2 },
  { ago: 20000, number: '+84902000003', type: 'incoming', dur: 520, sim: 1 },
  { ago: 21600, number: '+84901000002', type: 'missed' },
  { ago: 23000, number: '+84903000004', type: 'outgoing', dur: 75, sim: 1 },
  { ago: 24500, number: '+841900545415', type: 'incoming', dur: 400, sim: 1 },
  { ago: 26000, number: '+84909555777', type: 'incoming', dur: 35, sim: 1 },
  { ago: 28800, number: '+84901000001', type: 'incoming', dur: 600, sim: 1 },
  { ago: 31000, number: '+84906000007', type: 'missed' },
  { ago: 33000, number: '+84901000001', type: 'outgoing', dur: 330, sim: 1 },
  { ago: 36000, number: '+84977123456', type: 'missed' },
  { ago: 39000, number: '+84902000003', type: 'outgoing', dur: 130, sim: 1 },
  { ago: 41000, number: '+84906000007', type: 'incoming', dur: 905, sim: 1 },
]

export function buildInitialCallLog(
  contacts: Contact[],
  rules: BlockRule[],
  settings: BlockSettings,
  homeDial: string,
  now = new Date(),
): CallLogEntry[] {
  const byNumber = new Map<string, Contact>()
  contacts.forEach((c) => c.numbers.forEach((n) => byNumber.set(n, c)))

  return RAW.map((r, i): CallLogEntry => {
    const contact = byNumber.get(r.number)
    const profile = r.number ? SPAM_DB[r.number] : undefined
    let type: CallType = r.type
    let blockedReason: CallLogEntry['blockedReason']
    let risk = contact ? 'safe' : (profile?.risk ?? 'unknown')

    // Cuộc gọi đến từ người lạ được chạy qua bộ máy chặn: nếu bị chặn thì ghi là "blocked".
    if (r.type !== 'outgoing') {
      const d = decideCall({ number: r.number, isContact: !!contact, profile }, { rules, settings, homeDial })
      risk = d.risk
      if (d.action !== 'allow') {
        type = 'blocked'
        blockedReason = d.reason ?? undefined
      }
    }

    return {
      id: `log-${i + 1}`,
      number: r.number,
      name: contact?.name ?? profile?.name,
      contactId: contact?.id,
      type,
      startedAt: new Date(now.getTime() - r.ago * 60_000).toISOString(),
      durationSec: type === 'blocked' || type === 'missed' ? 0 : (r.dur ?? 0),
      risk: risk as CallLogEntry['risk'],
      category: profile?.category,
      reportCount: profile?.reportCount ?? 0,
      blockedReason,
      simSlot: r.sim,
    }
  })
}
