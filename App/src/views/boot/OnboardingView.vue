<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/BaseButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import OnboardingArt from '@/components/boot/OnboardingArt.vue'
import { useSettingsStore } from '@/stores/settings'
import { t } from '@/composables/useT'

const router = useRouter()
const settings = useSettingsStore()

const total = 3
const page = ref(0)
const scroller = ref<HTMLElement | null>(null)
const isLast = computed(() => page.value === total - 1)

function onScroll() {
  const el = scroller.value
  if (!el || !el.clientWidth) return
  page.value = Math.min(total - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth)))
}

function goTo(i: number) {
  const el = scroller.value
  if (!el) return
  page.value = i
  el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
}

function finish() {
  settings.patch({ onboardingDone: true })
  router.replace('/permissions')
}

function next() {
  if (isLast.value) finish()
  else goTo(page.value + 1)
}
</script>

<template>
  <div class="pt-safe flex flex-col bg-canvas">
    <div class="flex h-20 shrink-0 items-center justify-between px-6">
      <span class="flex items-center gap-2 text-xl font-semibold tracking-tight"><span class="accent-gradient grid size-9 place-items-center rounded-xl"><AppIcon name="shield-check" :size="21" /></span>Safe Dial</span>
      <button
        v-if="!isLast"
        type="button"
        class="tap min-h-10 rounded-full px-4 text-[15px] font-medium text-muted"
        @click="finish"
      >
        {{ t('common.actions.skip') }}
      </button>
    </div>

    <div
      ref="scroller"
      class="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto"
      role="group"
      @scroll.passive="onScroll"
    >
      <section
        v-for="(_, i) in total"
        :key="i"
        class="onboarding-page flex w-full shrink-0 snap-center flex-col overflow-y-auto px-7 pt-4"
        :aria-label="t('boot.onboarding.dots', { n: i + 1, total })"
      >
        <span class="mb-4 w-fit rounded-full bg-primary-soft px-3 py-1.5 text-[11px] font-medium text-primary">{{ t('common.tagline') }}</span>
        <h2 class="text-[34px] leading-[1.15] font-semibold tracking-[-1.2px]"><span class="accent-text">{{ t(`boot.onboarding.pages.${i}.title`) }}</span></h2>
        <p class="mt-4 text-[15px] leading-relaxed text-muted">{{ t(`boot.onboarding.pages.${i}.text`) }}</p>
        <div class="flex min-h-64 flex-1 items-center justify-center py-5"><OnboardingArt :kind="i as 0 | 1 | 2" /></div>
      </section>
    </div>

    <div class="pb-safe shrink-0 px-7 pt-3 pb-7">
      <div class="mb-5 flex items-center justify-center gap-2">
        <button
          v-for="(_, i) in total"
          :key="i"
          type="button"
          class="grid h-6 place-items-center px-0.5"
          :aria-label="t('boot.onboarding.dots', { n: i + 1, total })"
          :aria-current="page === i"
          @click="goTo(i)"
        >
          <span class="block h-2 rounded-full transition-all" :class="page === i ? 'w-6 bg-primary' : 'w-2 bg-line'" />
        </button>
      </div>
      <BaseButton block size="lg" @click="next">
        {{ isLast ? t('boot.onboarding.start') : t('common.actions.next') }}
        <AppIcon name="arrow-right" :size="20" />
      </BaseButton>
    </div>
  </div>
</template>
