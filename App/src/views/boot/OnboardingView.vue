<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/BaseButton.vue'
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
    <div class="flex h-14 shrink-0 items-center justify-end px-3">
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
        class="flex w-full shrink-0 snap-center flex-col items-center justify-center px-8"
        :aria-label="t('boot.onboarding.dots', { n: i + 1, total })"
      >
        <OnboardingArt :kind="i as 0 | 1 | 2" />
        <h2 class="mt-8 text-center text-2xl leading-tight font-bold">{{ t(`boot.onboarding.pages.${i}.title`) }}</h2>
        <p class="mt-3 text-center text-[15px] leading-relaxed text-muted">{{ t(`boot.onboarding.pages.${i}.text`) }}</p>
      </section>
    </div>

    <div class="pb-safe shrink-0 px-5 pt-3 pb-5">
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
      </BaseButton>
    </div>
  </div>
</template>
