<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Capacitor } from '@capacitor/core'
import type { NativeAdTemplate } from '@alf/app-sdk'
import { adsAvailable, adsSuppressed, bannerReserved } from '@/features/ads/adRuntime'
import { hideMrec, mrecEnabled, mrecLoading, moveMrec, releaseMrec, showMrec, type MrecRect } from '@/features/ads/mrec'

// AppLovin MAX draws an MREC (300x250) in a native view above the WebView, so this element only reserves
// the space and reports its rect while it is on screen. The ALF SDK has no MAX native format, so every
// "native" slot is served as an MREC and is as tall as one; the template no longer changes the size.
const props = defineProps<{ template?: NativeAdTemplate; overlay?: boolean }>()

const MREC_HEIGHT = 250
const box = ref<HTMLElement | null>(null)
const native = Capacitor.isNativePlatform()
const id = Symbol('native-host')
let alive = false
let frame = 0
let observer: IntersectionObserver | undefined
let resizeObserver: ResizeObserver | undefined
const inView = ref(false)
const documentVisible = ref(!document.hidden)
const canShow = computed(() => adsAvailable.value && (props.overlay || !adsSuppressed.value) && inView.value && documentVisible.value)

// A slot on a page that scrolls with the window (no scroll region around it) is followed natively: the ad is moved
// inside each frame from the WebView's scroll offset, so nothing has to be sent while the page scrolls.
const followed = () => !props.overlay && !!box.value && !box.value.closest('[data-ad-scroll-region]')

function rect(): MrecRect | null {
  const r = box.value?.getBoundingClientRect()
  if (!r) return null
  const place = { x: r.x, y: r.y, width: r.width, height: r.height }
  if (!followed()) return place
  const { top, bottom } = band()
  return { ...place, scrollY: Math.round(window.scrollY), clipTop: Math.round(top), clipBottom: Math.round(bottom) }
}

// What the native side has been given; a page scroll alone does not change it (y + scrollY stays put).
let sentKey = ''
const keyOf = (r: MrecRect) => [r.x, r.scrollY === undefined ? r.y : Math.round(r.y + r.scrollY), r.width, r.height, r.clipTop, r.clipBottom].join()

const show = () => { sentKey = ''; showMrec(id, rect, () => canShow.value) }
const hide = () => { sentKey = ''; hideMrec(id) }
// The ad sits above the page and does not scroll with it. Followed slots are only re-sent when something other than
// the scroll position changed; the others are moved to their placeholder every time.
const reposition = () => {
  const r = rect()
  if (!r) return
  const key = keyOf(r)
  if (key === sentKey) return
  sentKey = key
  moveMrec(id, () => r, () => canShow.value)
}

function track() {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    refresh()
    if (canShow.value) reposition()
  })
}

// The part of the screen the ad may draw in.
function band() {
  const scrollRect = box.value?.closest('[data-ad-scroll-region]')?.getBoundingClientRect()
  // The native view is drawn above the WebView, so it must stay clear of whatever sits over the scrolling content:
  // a sticky bar (data-ad-top-edge, e.g. the Stats period tabs) and Safe Dial's floating bottom navigation
  // (data-ad-bottom-edge), which both float inside the scroll region. A full-screen overlay is only bounded by the screen.
  const top = props.overlay ? 0 : Math.max(scrollRect?.top ?? 0, edge('[data-ad-top-edge]')?.bottom ?? 0)
  const navTop = edge('[data-ad-bottom-edge]')?.top
  // The banner is drawn over the bottom strip of the screen, so an ad that reaches into it would be covered by it.
  const bannerTop = window.innerHeight - bannerReserved.value
  const bottom = props.overlay ? window.innerHeight : Math.min(bannerTop, scrollRect?.bottom ?? window.innerHeight, navTop ?? window.innerHeight)
  return { top: Math.max(0, top), bottom: Math.min(window.innerHeight, bottom) }
}

function refresh() {
  documentVisible.value = !document.hidden
  const boxRect = box.value?.getBoundingClientRect()
  const { top, bottom } = band()
  // A followed ad is cut off at the band's edges like any row, so it stays up while part of it is in view. The
  // others cannot be cut, so they only show while the whole placeholder is inside the band.
  inView.value = !!boxRect && (followed()
    ? boxRect.bottom > top + 1 && boxRect.top < bottom - 1
    : boxRect.top >= top && boxRect.bottom <= bottom)
}

// Rect of a shell edge element, or null while it is not laid out (e.g. hidden on desktop widths).
function edge(selector: string) {
  const r = document.querySelector(selector)?.getBoundingClientRect()
  return r && r.height > 0 ? r : null
}
// A banner that appears or goes away moves the line the ad must stay above.
watch(bannerReserved, track)
watch(canShow, visible => {
  if (!native || !alive) return
  if (visible) show()
  else hide()
})

onMounted(() => {
  if (!native || !mrecEnabled) return
  alive = true
  // The ad stays up while the page scrolls and is moved to follow its placeholder every frame; it only goes
  // away once the placeholder leaves the area it may draw in (under a bar, off screen).
  document.addEventListener('scroll', track, { capture: true, passive: true })
  window.addEventListener('resize', track)
  document.addEventListener('visibilitychange', track)
  observer = new IntersectionObserver(track, { threshold: [0, 1] })
  if (box.value) observer.observe(box.value)
  // IntersectionObserver alone does not report every layout shift when the
  // placeholder stays visible. Observe its containing viewport as well.
  resizeObserver = new ResizeObserver(track)
  if (box.value) {
    resizeObserver.observe(box.value)
    const scrollRegion = box.value.closest('[data-ad-scroll-region]')
    if (scrollRegion) resizeObserver.observe(scrollRegion)
  }
  refresh()
  if (canShow.value) show()
})

onBeforeUnmount(() => {
  if (!native || !alive) return
  alive = false
  document.removeEventListener('scroll', track, { capture: true })
  window.removeEventListener('resize', track)
  document.removeEventListener('visibilitychange', track)
  observer?.disconnect()
  resizeObserver?.disconnect()
  if (frame) cancelAnimationFrame(frame)
  releaseMrec(id)
})
</script>

<template>
  <div
    v-if="native && mrecEnabled"
    ref="box"
    class="w-full shrink-0 overflow-hidden rounded-[24px]"
    :class="mrecLoading() ? 'skeleton' : 'bg-primary-soft/60'"
    :style="{ height: `${MREC_HEIGHT}px` }"
    aria-hidden="true"
  />
</template>
