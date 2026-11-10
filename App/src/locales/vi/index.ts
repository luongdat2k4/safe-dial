import { common } from './common'
import { boot } from './boot'
import { settings } from './settings'
import { home } from './home'
import { dial } from './dial'
import { number } from './number'
import { block } from './block'
import { stats } from './stats'
import { call } from './call'

/** Toàn bộ chuỗi giao diện tiếng Việt. Mỗi khu vực một file trong thư mục này. */
export const vi = { common, boot, settings, home, dial, number, block, stats, call }
