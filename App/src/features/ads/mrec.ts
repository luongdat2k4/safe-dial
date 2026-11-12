import { ref } from 'vue'
import { registerPlugin } from '@capacitor/core'
import { ALFAppLovinMAX } from '@alf/app-sdk'
import { adsConfig } from '@/features/ads/adsConfig'

// One AppLovin MREC view serves every "native" slot in the app. It is created once and then only moved, shown
// and hidden, never destroyed: a new MREC has to request an ad again, which is the slow part. Slots take turns
// owning it (the latest to ask wins), and every native call is queued so create/show/hide never interleave.
// `scrollY` (the page's scroll offset when the rect was read) switches on native following: the ad is then moved
// inside each frame from the WebView's own scroll, so it stays glued to the page without a message per frame.
// `clipTop`/`clipBottom` (screen px) are the band it may draw in; the rest of it is cut off.
export interface MrecRect { x: number; y: number; width: number; height: number; scrollY?: number; clipTop?: number; clipBottom?: number }

interface AdFollowPlugin {
  place(options: MrecRect & { adUnitId: string }): Promise<void>
  release(options: { adUnitId: string }): Promise<void>
}
const AdFollow = registerPlugin<AdFollowPlugin>('SafeDialAdFollow')
// Places the ad (and, when the rect carries scrollY, makes it follow the page natively). Falls back to the MAX
// plugin's own rect update if the local plugin is missing.
function placeMrec(rect: MrecRect) {
  return AdFollow.place({ adUnitId, ...rect }).catch(() => ALFAppLovinMAX.updateMRecRect({ adUnitId, rect }))
}

// idle: not requested yet · loading: the first ad is being fetched · ready: an ad is loaded and can be shown ·
// failed: the request failed (it is retried in the background). Slots show a loading shape until it is ready.
// slow: it is taking too long, so slots stop showing their loading shape but keep their space, and the ad fills
// them if it does load ·
// retry: a background retry after a failure, with no loading shape.
export type MrecState = 'idle' | 'loading' | 'slow' | 'retry' | 'ready' | 'failed'
export const mrecState = ref<MrecState>('idle')
// MAX retries an unfilled request for about a minute before it reports failure; nobody should stare at a loading
// shape that long.
const LOADING_MS = 10_000
// Whether a slot should still show its loading shape (the slot itself is always there).
export const mrecLoading = () => mrecState.value === 'idle' || mrecState.value === 'loading'
const RETRY_MS = 30_000
const MAX_RETRIES = 3
let retries = 0

const adUnitId = adsConfig.keys?.applovin?.android?.mrec ?? ''
export const mrecEnabled = !!adUnitId

interface Slot { id: symbol; rect: () => MrecRect | null; wanted: () => boolean }
let owner: symbol | null = null
// The slot that asked most recently; it gets the ad as soon as one has loaded.
let slot: Slot | null = null
let queue: Promise<void> = Promise.resolve()
function run(job: () => Promise<unknown>) {
  queue = queue.then(job).then(() => {}, () => {})
}

// Where the view sits while nobody owns it: above the screen, so the ad can load without ever being seen.
const PARKED: MrecRect = { x: 0, y: -2000, width: 320, height: 250 }

// Creates the MREC ahead of time so its first ad is already loaded when a slot first asks for it.
// createMRec resolves once that first ad has loaded, so it is awaited outside the queue: the queue has to
// stay free for rect updates while the ad is still loading.
export function preloadMrec(silent = false) {
  if (!mrecEnabled || ['loading', 'slow', 'retry', 'ready'].includes(mrecState.value)) return
  mrecState.value = silent ? 'retry' : 'loading'
  if (!silent) setTimeout(() => { if (mrecState.value === 'loading') mrecState.value = 'slow' }, LOADING_MS)
  run(async () => {
    void ALFAppLovinMAX.createMRec({ adUnitId, position: 'CENTER', rect: PARKED }).then(onLoaded, onFailed)
  })
}

function onLoaded() {
  retries = 0
  mrecState.value = 'ready'
  // A slot that asked while the ad was loading gets it now; otherwise the view goes back into hiding.
  if (slot) showMrec(slot.id, slot.rect, slot.wanted)
  else run(async () => { if (owner === null) await ALFAppLovinMAX.hideMRec({ adUnitId }) })
}

function onFailed() {
  mrecState.value = 'failed'
  if (retries++ >= MAX_RETRIES) return
  setTimeout(() => { if (mrecState.value === 'failed') preloadMrec(true) }, RETRY_MS)
}

// Shows the loaded ad over a slot. While the ad is still loading nothing is drawn (the slot shows its loading
// shape); the slot is remembered and gets the ad the moment it is ready.
export function showMrec(id: symbol, rect: () => MrecRect | null, wanted: () => boolean) {
  if (!mrecEnabled) return
  owner = id
  slot = { id, rect, wanted }
  if (mrecState.value === 'idle') preloadMrec()
  if (mrecState.value !== 'ready') return
  run(async () => {
    const r = rect()
    if (owner !== id || !r || !wanted()) return
    await placeMrec(r)
    await ALFAppLovinMAX.showMRec({ adUnitId })
  })
}

export function hideMrec(id: symbol) {
  run(async () => {
    if (owner === id && mrecState.value === 'ready') await ALFAppLovinMAX.hideMRec({ adUnitId })
  })
}

export function moveMrec(id: symbol, rect: () => MrecRect | null, wanted: () => boolean) {
  run(async () => {
    const r = rect()
    if (owner === id && mrecState.value === 'ready' && r && wanted()) await placeMrec(r)
  })
}

// A slot that goes away hides the MREC (only if it still owns it) but keeps the loaded view for the next slot.
export function releaseMrec(id: symbol) {
  if (owner !== id) return
  owner = null
  slot = null
  run(async () => {
    if (mrecState.value === 'ready' && owner === null) {
      await ALFAppLovinMAX.hideMRec({ adUnitId })
      // Back to a plain parked view: no following, no clip.
      await AdFollow.release({ adUnitId }).catch(() => {})
    }
  })
}
