import { getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/max'
import { i18n } from '@/i18n'

export interface Country {
  iso: string
  /** Tên nước theo ngôn ngữ đang dùng của app. */
  readonly name: string
  dial: string
  flag: string
}

/** Cờ emoji từ mã ISO (VN → 🇻🇳). */
function flagOf(iso: string): string {
  return [...iso.toUpperCase()].map((ch) => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65)).join('')
}

let namesLocale = ''
let names: Intl.DisplayNames | null = null
/** Tên nước theo ngôn ngữ của app (Intl.DisplayNames); không hỗ trợ thì trả mã ISO. */
export function countryName(iso: string): string {
  const locale = String(i18n.global.locale.value)
  if (locale !== namesLocale) {
    namesLocale = locale
    try {
      names = new Intl.DisplayNames([locale, 'en'], { type: 'region' })
    } catch {
      names = null
    }
  }
  return names?.of(iso) ?? iso
}

/** Thông tin một nước theo mã ISO (mã quốc gia lấy từ libphonenumber). */
export function country(iso: string): Country {
  return {
    iso,
    get name() {
      return countryName(iso)
    },
    dial: '+' + getCountryCallingCode(iso as CountryCode),
    flag: flagOf(iso),
  }
}

/** Các nước hay gặp, dùng cho bộ chọn chặn theo mã quốc gia. */
export const COUNTRIES: Country[] = [
  country('VN'),
  country('US'),
  country('CN'),
  country('KR'),
  country('JP'),
  country('TH'),
  country('SG'),
  country('MY'),
  country('ID'),
  country('PH'),
  country('KH'),
  country('LA'),
  country('MM'),
  country('IN'),
  country('GB'),
  country('FR'),
  country('DE'),
  country('RU'),
  country('AU'),
  country('NG'),
  country('GH'),
  country('PK'),
  country('BD'),
  country('AE'),
  country('BR'),
  country('MX'),
]

/** Nước của một số E.164 (mọi nước, theo libphonenumber); số không hợp lệ thì đoán theo mã quốc gia. */
export function countryOf(e164: string): Country | undefined {
  if (!e164.startsWith('+')) return undefined
  const p = parsePhoneNumberFromString(e164)
  if (p?.country) return country(p.country)
  return [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((c) => e164.startsWith(c.dial))
}
