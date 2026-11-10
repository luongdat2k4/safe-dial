export interface Country {
  iso: string
  name: string
  dial: string
  flag: string
}

export const COUNTRIES: Country[] = [
  { iso: 'VN', name: 'Việt Nam', dial: '+84', flag: '🇻🇳' },
  { iso: 'US', name: 'Hoa Kỳ / Canada', dial: '+1', flag: '🇺🇸' },
  { iso: 'CN', name: 'Trung Quốc', dial: '+86', flag: '🇨🇳' },
  { iso: 'KR', name: 'Hàn Quốc', dial: '+82', flag: '🇰🇷' },
  { iso: 'JP', name: 'Nhật Bản', dial: '+81', flag: '🇯🇵' },
  { iso: 'TH', name: 'Thái Lan', dial: '+66', flag: '🇹🇭' },
  { iso: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { iso: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
  { iso: 'ID', name: 'Indonesia', dial: '+62', flag: '🇮🇩' },
  { iso: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭' },
  { iso: 'KH', name: 'Campuchia', dial: '+855', flag: '🇰🇭' },
  { iso: 'LA', name: 'Lào', dial: '+856', flag: '🇱🇦' },
  { iso: 'MM', name: 'Myanmar', dial: '+95', flag: '🇲🇲' },
  { iso: 'IN', name: 'Ấn Độ', dial: '+91', flag: '🇮🇳' },
  { iso: 'GB', name: 'Vương quốc Anh', dial: '+44', flag: '🇬🇧' },
  { iso: 'FR', name: 'Pháp', dial: '+33', flag: '🇫🇷' },
  { iso: 'DE', name: 'Đức', dial: '+49', flag: '🇩🇪' },
  { iso: 'RU', name: 'Nga', dial: '+7', flag: '🇷🇺' },
  { iso: 'AU', name: 'Úc', dial: '+61', flag: '🇦🇺' },
  { iso: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { iso: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭' },
  { iso: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰' },
  { iso: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩' },
  { iso: 'AE', name: 'UAE', dial: '+971', flag: '🇦🇪' },
  { iso: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷' },
  { iso: 'MX', name: 'Mexico', dial: '+52', flag: '🇲🇽' },
]

const byDialDesc = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)

/** Tìm quốc gia theo tiền tố quốc tế dài nhất khớp với số E.164. */
export function countryOf(e164: string): Country | undefined {
  if (!e164.startsWith('+')) return undefined
  return byDialDesc.find((c) => e164.startsWith(c.dial))
}
