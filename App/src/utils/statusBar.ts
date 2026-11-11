import { Capacitor, SystemBars, SystemBarsStyle, SystemBarType } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

/**
 * Cấu hình thanh trạng thái cho một màn hình.
 * - `light`: nền sáng → icon/chữ tối.
 * - `dark`: nền tối → icon/chữ sáng.
 * `color` là màu nền thanh trạng thái (chỉ có tác dụng trên Android < 15; từ Android 15
 * hệ thống bắt buộc edge-to-edge nên thanh trạng thái trong suốt, lộ phần đầu của view).
 */
export interface StatusBarConfig {
  style: 'light' | 'dark'
  color?: string
}

/** Mặc định: khớp với nền tím nhạt phía trên của `.app-shell`. */
export const DEFAULT_STATUS_BAR: StatusBarConfig = { style: 'light', color: '#f7f3ff' }

let last = ''

export async function applyStatusBar(cfg: StatusBarConfig = DEFAULT_STATUS_BAR): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  const color = cfg.color ?? (cfg.style === 'dark' ? '#19152d' : DEFAULT_STATUS_BAR.color!)
  const key = `${cfg.style}|${color}`
  if (key === last) return
  last = key
  await Promise.allSettled([
    StatusBar.setStyle({ style: cfg.style === 'dark' ? Style.Dark : Style.Light }),
    StatusBar.setBackgroundColor({ color }),
  ])
}

/**
 * Thanh điều hướng của hệ thống: app không vẽ đè lên nó (xem `#app` trong main.css), phía sau
 * thanh là nền sáng của app → dùng biểu tượng màu tối cho dễ nhìn.
 */
export async function initNavigationBar(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await SystemBars.setStyle({ style: SystemBarsStyle.Light, bar: SystemBarType.NavigationBar }).catch(() => undefined)
}
