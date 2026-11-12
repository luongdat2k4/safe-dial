import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { SafeDial, isNative } from '@/services'

/**
 * Popup cuộc gọi đến trên máy thật: cửa sổ app trong suốt để popup hiện đè lên màn hình thật của điện thoại
 * (màn hình chính, app đang mở hoặc màn hình khoá) thay cho màn hình chính giả.
 * `seeThrough` chỉ bật sau khi native xác nhận (APK cũ chưa có setSeeThrough, hoặc bản web → giữ màn hình chính giả).
 */
export const seeThrough = ref(false)

export function useSeeThrough(active: Ref<boolean>) {
  if (!isNative) return
  let token = 0
  const set = async (on: boolean) => {
    const mine = ++token
    if (!on) {
      seeThrough.value = false
      document.documentElement.classList.remove('see-through')
      await SafeDial.setSeeThrough({ on: false }).catch(() => undefined)
      return
    }
    try {
      await SafeDial.setSeeThrough({ on: true })
    } catch {
      return
    }
    if (mine !== token) return
    seeThrough.value = true
    document.documentElement.classList.add('see-through')
  }
  watch(active, (on) => void set(on), { immediate: true })
  onBeforeUnmount(() => void set(false))
}
