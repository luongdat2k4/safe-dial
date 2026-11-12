import { computed, ref, type CSSProperties } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { seeThrough } from './useSeeThrough'

/**
 * Giao diện của khung hiển thị cuộc gọi đến (thẻ popup và màn toàn màn hình), không phải nền điện thoại.
 * Dải màu rủi ro ở đầu popup và nhãn rủi ro giữ nguyên ở mọi giao diện.
 * Ảnh người dùng được thu nhỏ rồi lưu riêng trong localStorage (quá lớn để đồng bộ với native).
 */
interface ThemeDef {
  id: 'classic' | 'dark' | 'glass' | 'gradient'
  /** Nền thẻ popup. */
  card: string
  /** Nền màn toàn màn hình; null = nền nhạt theo mức rủi ro (mặc định). */
  full: string | null
  /** Chữ sáng trên nền tối. */
  light: boolean
  /** Màu thanh trạng thái ở kiểu toàn màn hình. */
  bar: string
}

export const CALL_THEMES: readonly ThemeDef[] = [
  { id: 'classic', card: '#ffffff', full: null, light: false, bar: '#f4edff' },
  { id: 'dark', card: '#211b38', full: 'linear-gradient(180deg, #2c2452 0%, #16112e 60%, #0d0a1d 100%)', light: true, bar: '#2c2452' },
  { id: 'glass', card: 'rgba(255, 255, 255, 0.2)', full: 'rgba(40, 26, 80, 0.35)', light: true, bar: '#bbb1eb' },
  { id: 'gradient', card: 'linear-gradient(135deg, #5926e9 0%, #934cf4 56%, #e66bb7 100%)', full: 'linear-gradient(160deg, #5926e9 0%, #934cf4 56%, #e66bb7 100%)', light: true, bar: '#5926e9' },
]

/** Kính trên màn hình thật của điện thoại: WebView không làm mờ được nội dung ngoài app → kính tối hơn để chữ vẫn rõ. */
const GLASS_OVER_REAL: ThemeDef = { id: 'glass', card: 'rgba(28, 20, 58, 0.62)', full: 'rgba(20, 14, 42, 0.72)', light: true, bar: '#00000000' }

export type CallThemeId = ThemeDef['id'] | 'photo'

const PHOTO_KEY = 'safedial.callTheme.photo.v1'
const MAX_SIDE = 1440
/** Lớp phủ tối trên ảnh để chữ trắng luôn đọc được. */
const SHADE = 'linear-gradient(rgba(15, 10, 30, 0.55), rgba(15, 10, 30, 0.55))'

function readPhoto(): string | null {
  try {
    return localStorage.getItem(PHOTO_KEY)
  } catch {
    return null
  }
}
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

const photoBg = (url: string): CSSProperties => ({ backgroundImage: `${SHADE}, url("${url}")`, backgroundSize: 'cover', backgroundPosition: 'center' })

export function useCallTheme() {
  const settings = useSettingsStore()

  const current = computed<CallThemeId>(() => {
    const id = settings.state.callTheme
    if (id === 'photo') return photo.value ? 'photo' : 'classic'
    return CALL_THEMES.find((x) => x.id === id)?.id ?? 'classic'
  })
  const def = computed(() =>
    current.value === 'glass' && seeThrough.value ? GLASS_OVER_REAL : CALL_THEMES.find((x) => x.id === current.value),
  )

  /** Chữ sáng (nền tối / ảnh / kính mờ trên nền tím). */
  const light = computed(() => current.value === 'photo' || !!def.value?.light)
  const glass = computed(() => current.value === 'glass')

  /** Nền thẻ popup. */
  const cardStyle = computed<CSSProperties>(() =>
    current.value === 'photo' && photo.value ? photoBg(photo.value) : { background: def.value!.card },
  )
  /** Nền màn toàn màn hình; undefined = dùng nền nhạt theo mức rủi ro. */
  const fullStyle = computed<CSSProperties | undefined>(() => {
    if (current.value === 'photo' && photo.value) return photoBg(photo.value)
    return def.value?.full ? { background: def.value.full } : undefined
  })
  const fullBar = computed(() => (current.value === 'photo' ? '#000000' : def.value!.bar))

  const select = (id: CallThemeId) => settings.patch({ callTheme: id })

  /** Lưu ảnh người dùng chọn rồi dùng làm giao diện. Trả về false nếu không đọc / lưu được. */
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
    if (settings.state.callTheme === 'photo') select('classic')
  }

  return { current, light, glass, cardStyle, fullStyle, fullBar, photo, select, setPhoto, removePhoto, photoBg }
}
