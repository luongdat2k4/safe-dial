import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Contact } from '@/types'
import { dialer } from '@/services'

export const useContactsStore = defineStore('contacts', () => {
  const items = ref<Contact[]>([])
  const loaded = ref(false)

  const favorites = computed(() => items.value.filter((c) => c.favorite))
  const byNumber = computed(() => {
    const m = new Map<string, Contact>()
    items.value.forEach((c) => c.numbers.forEach((n) => m.set(n, c)))
    return m
  })

  async function load(force = false) {
    if (loaded.value && !force) return
    items.value = await dialer.getContacts()
    loaded.value = true
  }

  function findByNumber(e164: string): Contact | undefined {
    return e164 ? byNumber.value.get(e164) : undefined
  }

  function search(q: string): Contact[] {
    const s = q.trim().toLowerCase()
    if (!s) return items.value
    const digits = s.replace(/[^0-9+]/g, '')
    return items.value.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        (digits.length > 0 && c.numbers.some((n) => n.includes(digits.replace(/^0/, '')))),
    )
  }

  async function toggleFavorite(id: string) {
    const c = items.value.find((x) => x.id === id)
    if (!c) return
    await dialer.setFavorite(id, !c.favorite)
    c.favorite = !c.favorite
  }

  return { items, loaded, favorites, byNumber, load, findByNumber, search, toggleFavorite }
})
