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

  /** Có quyền ghi danh bạ (WRITE_CONTACTS) để thêm / bỏ yêu thích. null = chưa kiểm tra. */
  const canEdit = ref<boolean | null>(null)

  async function checkEdit(): Promise<boolean> {
    const s = await SafeDial.getStatus().catch(() => null)
    canEdit.value = s?.contactsWrite === 'granted'
    return canEdit.value
  }

  /**
   * Xin quyền chỉnh sửa danh bạ. Android không hiện hộp thoại nữa nếu quyền đã bị từ chối hẳn
   * → mở trang ứng dụng trong Cài đặt hệ thống để người dùng tự bật.
   */
  async function grantEdit(): Promise<boolean> {
    const p = await SafeDial.requestPermissions({ permissions: ['contactsWrite'] }).catch(() => null)
    canEdit.value = p?.contactsWrite === 'granted'
    if (!canEdit.value) {
      useUiStore().showToast(t('home.contacts.favFailed'), 'warning', 3200)
      await SafeDial.openAppSettings().catch(() => undefined)
    }
    return canEdit.value
  }

  /**
   * Yêu thích = Contacts.STARRED của Android, cần quyền chỉnh sửa danh bạ.
   * Chưa có quyền → xin quyền trước; ghi lỗi → báo cho người dùng. Trả về true nếu đã đổi được.
   */
  async function toggleFavorite(id: string): Promise<boolean> {
    const c = items.value.find((x) => x.id === id)
    if (!c) return false
    if (canEdit.value !== true && !(await checkEdit()) && !(await grantEdit())) return false
    const opts = { contactId: Number(id) || (id as unknown as number), starred: !c.favorite }
    try {
      await SafeDial.setStarred(opts)
    } catch {
      useUiStore().showToast(t('home.contacts.favFailed'), 'warning', 3200)
      return false
    }
    c.favorite = opts.starred
    return true
  }

  return { items, loaded, favorites, byNumber, canEdit, load, findByNumber, search, checkEdit, grantEdit, toggleFavorite }
})
