import { reactive } from 'vue'
import { defineStore } from 'pinia'
import type { CallerInfo, NumberProfile, SpamCategory } from '@/types'
import { dialer } from '@/services'
import { useContactsStore } from './contacts'

/** Nhận diện số: danh bạ → cơ sở dữ liệu cộng đồng → "số lạ". */
export const useLookupStore = defineStore('lookup', () => {
  const cache = reactive<Record<string, NumberProfile | null>>({})
  const contacts = useContactsStore()

  async function profileOf(e164: string): Promise<NumberProfile | undefined> {
    if (!e164) return undefined
    if (e164 in cache) return cache[e164] ?? undefined
    const p = await dialer.lookupNumber(e164)
    cache[e164] = p ?? null
    return p
  }

  async function identify(e164: string): Promise<CallerInfo> {
    await contacts.load()
    const contact = contacts.findByNumber(e164)
    const profile = await profileOf(e164)
    return {
      number: e164,
      name: contact?.name ?? profile?.name,
      isContact: !!contact,
      profile,
      risk: contact ? 'safe' : (profile?.risk ?? 'unknown'),
    }
  }

  async function report(e164: string, category: SpamCategory, note?: string) {
    const next = await dialer.reportNumber({ number: e164, category, note })
    cache[e164] = next
    return next
  }

  async function suggestName(e164: string, name: string) {
    await dialer.suggestName(e164, name)
    const p = await dialer.lookupNumber(e164)
    cache[e164] = p ?? null
  }

  return { cache, profileOf, identify, report, suggestName }
})
