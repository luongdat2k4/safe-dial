import { buildInitialCallLog } from '@/data/callLog'
import { CONTACTS, DEFAULT_RULES } from '@/data/seed'
import { DEFAULT_BLOCK_SETTINGS } from '@/data/defaults'
import { createMockDialerService } from './mockDialer'

/** Điểm duy nhất chọn implementation. Thay bằng bản native khi có plugin thật. */
export const dialer = createMockDialerService(
  buildInitialCallLog(CONTACTS, DEFAULT_RULES, DEFAULT_BLOCK_SETTINGS, '+84'),
)
