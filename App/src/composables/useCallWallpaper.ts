import { computed, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'

/**
 * Hình nền phía sau popup cuộc gọi đến (màn hình chính giả lập, khung xem trước, màn mô phỏng bị chặn).
 * Chọn một hình có sẵn hoặc ảnh trong máy. Ảnh được thu nhỏ rồi lưu riêng trong localStorage
 * (không nằm trong cài đặt đồng bộ với native vì quá lớn).
 */
export const WALLPAPERS = [
  { id: 'lavender', bg: 'linear-gradient(180deg, #bbb1eb 0%, #a78bd6 50%, #64539b 100%)', bar: '#bbb1eb' },
  { id: 'midnight', bg: 'linear-gradient(180deg, #3b3170 0%, #241c4d 55%, #0f0b24 100%)', bar: '#3b3170' },
  { id: 'ocean', bg: 'linear-gradient(180deg, #5fc3e4 0%, #2a8cb3 55%, #134e6f 100%)', bar: '#5fc3e4' },
  { id: 'sunset', bg: 'linear-gradient(180deg, #f7a98b 0%, #e0708f 50%, #5f3b8c 100%)', bar: '#f7a98b' },
  { id: 'forest', bg: 'linear-gradient(180deg, #8fd3b6 0%, #3f8f7c 55%, #1b4440 100%)', bar: '#8fd3b6' },
  { id: 'graphite', bg: 'linear-gradient(180deg, #8d8c99 0%, #4b4a57 55%, #1d1c24 100%)', bar: '#8d8c99' },
] as const

export type WallpaperId = (typeof WALLPAPERS)[number]['id'] | 'photo'

const PHOTO_KEY = 'safedial.callWallpaper.photo.v1'
const MAX_SIDE = 1440

function readPhoto(): string | null {
  try {
    return localStorage.getItem(PHOTO_KEY)
  } catch {
    return null
  }
}
/** Dùng chung cho mọi nơi hiển thị (một bản trong bộ nhớ). */
const photo = ref<string | null>(readPhoto())

/** Thu nhỏ ảnh (cạnh dài ≤ 1440px) và nén JPEG để vừa localStorage. */
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.82)
}

export function useCallWallpaper() {
  const settings = useSettingsStore()

  /** Hình đang dùng; chọn ảnh nhưng ảnh đã mất thì quay về mặc định. */
  const current = computed<WallpaperId>(() => {
    const id = settings.state.callWallpaper
    if (id === 'photo') return photo.value ? 'photo' : 'lavender'
    return WALLPAPERS.find((w) => w.id === id)?.id ?? 'lavender'
  })

  /** Style CSS cho nền. */
  const style = computed(() => {
    if (current.value === 'photo' && photo.value)
      return { backgroundImage: `url("${photo.value}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
    return { background: WALLPAPERS.find((w) => w.id === current.value)!.bg }
  })

  /** Màu thanh trạng thái hợp với phần trên của hình nền (ảnh: tối để chữ trắng dễ đọc). */
  const barColor = computed(() => (current.value === 'photo' ? '#000000' : WALLPAPERS.find((w) => w.id === current.value)!.bar))

  function select(id: WallpaperId) {
    settings.patch({ callWallpaper: id })
  }

  /** Lưu ảnh người dùng chọn rồi dùng làm hình nền. Trả về false nếu không đọc / lưu được. */
  async function setPhoto(file: File): Promise<boolean> {
    try {
      const url = await shrink(file)
      localStorage.setItem(PHOTO_KEY, url)
      photo.value = url
      select('photo')
      return true
    } catch {
      return false
    }
  }

  function removePhoto() {
    try {
      localStorage.removeItem(PHOTO_KEY)
    } catch {
      /* bỏ qua */
    }
    photo.value = null
    if (settings.state.callWallpaper === 'photo') select('lavender')
  }

  return { current, style, barColor, photo, select, setPhoto, removePhoto }
}
