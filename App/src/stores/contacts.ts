import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Contact } from '@/types'
import { SafeDial } from '@/services'

export const useContactsStore = defineStore('contacts', () => {
  const items = ref<Contact[]>([])
  const loaded = ref(false)

  const favorites = computed(() => items.value.filter((c) => c.favorite))
  const byNumber = computed(() => {
    const m = new Map<string, Contact>()
    items.value.forEach((c) => c.numbers.forEach((n) => m.set(n, c)))
    return m
  })

  /** Danh bạ đọc từ Android (ContactsContract); bản web dùng dữ liệu mẫu. */
  async function load(force = false) {
    if (loaded.value && !force) return
    const { contacts } = await SafeDial.getContacts()
    items.value = contacts.map((c) => ({
      id: c.id,
      name: c.name,
      numbers: c.numbers.map((n) => n.e164),
      favorite: c.starred,
      photoUri: c.photoUri,
    }))
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

  /** Yêu thích = Contacts.STARRED của Android. */
  async function toggleFavorite(id: string) {
    const c = items.value.find((x) => x.id === id)
    if (!c) return
    await SafeDial.setStarred({ contactId: Number(id) || (id as unknown as number), starred: !c.favorite })
    c.favorite = !c.favorite
  }

  return { items, loaded, favorites, byNumber, load, findByNumber, search, toggleFavorite }
})
