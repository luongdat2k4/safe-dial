import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Contact } from '@/types'
import { SafeDial } from '@/services'
import { t } from '@/composables/useT'
import { useUiStore } from './ui'

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

  /**
   * Yêu thích = Contacts.STARRED của Android (cần quyền ghi danh bạ).
   * Lần đầu thất bại (thường do mới có quyền đọc) → xin quyền danh bạ rồi thử lại một lần;
   * vẫn lỗi thì báo cho người dùng. Trả về true nếu đã đổi được.
   */
  async function toggleFavorite(id: string): Promise<boolean> {
    const c = items.value.find((x) => x.id === id)
    if (!c) return false
    const opts = { contactId: Number(id) || (id as unknown as number), starred: !c.favorite }
    try {
      await SafeDial.setStarred(opts)
    } catch {
      try {
        const p = await SafeDial.requestPermissions({ permissions: ['contacts'] })
        if (p.contacts !== 'granted') throw new Error('denied')
        await SafeDial.setStarred(opts)
      } catch {
        useUiStore().showToast(t('home.contacts.favFailed'), 'warning', 3200)
        return false
      }
    }
    c.favorite = opts.starred
    return true
  }

  return { items, loaded, favorites, byNumber, load, findByNumber, search, toggleFavorite }
})
