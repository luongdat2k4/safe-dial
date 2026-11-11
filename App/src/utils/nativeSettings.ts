/**
 * Đồng bộ một nhóm cài đặt với SharedPreferences native (schema mục 3).
 * Nguồn gốc là native: khi khởi động đọc từ native trước; chỉ khi native chưa có key nào
 * mới đẩy giá trị hiện tại xuống. Sau đó chỉ ghi khi người dùng thay đổi.
 * (localStorage chỉ là bản nhớ tạm cho UI, có thể mất khi origin của WebView đổi.)
 */
import { watch } from 'vue'
import { SafeDial } from '@/services'
import { saveJSON } from './storage'

export type KeyMap<T> = {
  [K in keyof T]?: { key: string; toNative?: (v: unknown) => unknown; fromNative?: (v: unknown) => unknown }
}

export function syncWithNative<T extends object>(state: T, map: KeyMap<T>, localKey: string) {
  const toNative = (s: T) => {
    const out: Record<string, unknown> = {}
    for (const [field, m] of Object.entries(map) as Array<[string, { key: string; toNative?: (v: unknown) => unknown; fromNative?: (v: unknown) => unknown }]>) {
      const v = (s as Record<string, unknown>)[field]
      out[m.key] = m.toNative ? m.toNative(v) : v
    }
    return out
  }

  let pushing = false
  void (async () => {
    try {
      const { values } = await SafeDial.getSettings()
      const known = (Object.values(map) as Array<{ key: string }>).some((m) => m.key in values)
      if (known) {
        for (const [field, m] of Object.entries(map) as Array<[string, { key: string; toNative?: (v: unknown) => unknown; fromNative?: (v: unknown) => unknown }]>) {
          if (!(m.key in values)) continue
          const raw = values[m.key]
          ;(state as Record<string, unknown>)[field] = m.fromNative ? m.fromNative(raw) : raw
        }
        saveJSON(localKey, state)
      } else {
        await SafeDial.setSettings({ values: toNative(state) })
      }
    } catch {
      /* native chưa sẵn sàng: giữ giá trị hiện có */
    } finally {
      watch(
        state,
        (v) => {
          saveJSON(localKey, v)
          if (pushing) return
          pushing = true
          queueMicrotask(() => {
            pushing = false
            void SafeDial.setSettings({ values: toNative(v) }).catch(() => undefined)
          })
        },
        { deep: true },
      )
    }
  })()
}
