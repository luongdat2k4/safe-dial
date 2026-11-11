<script setup lang="ts">
import BrandOrb from '@/components/BrandOrb.vue'
import AppIcon from '@/components/AppIcon.vue'
import { t } from '@/composables/useT'
defineProps<{ kind: 0 | 1 | 2 }>()
</script>

<template>
  <div class="onboarding-art" aria-hidden="true">
    <div class="art-halo" />
    <div class="art-ribbon ribbon-one" />
    <div class="art-ribbon ribbon-two" />
    <BrandOrb :icon="kind === 0 ? 'phone' : kind === 1 ? 'shield-check' : 'shield-ban'" />
    <span class="art-chip chip-one"><span class="chip-icon"><AppIcon :name="kind === 0 ? 'user-round-search' : 'shield-check'" :size="21" /></span>{{ t(kind === 0 ? 'boot.onboarding.art.identify' : 'boot.onboarding.art.protect') }}</span>
    <span class="art-chip chip-two"><span class="chip-icon"><AppIcon :name="kind === 2 ? 'chart-no-axes-combined' : 'phone-incoming'" :size="21" /></span>{{ t(kind === 2 ? 'boot.onboarding.art.insights' : 'boot.onboarding.art.calls') }}</span>
    <span class="art-sparkle sparkle-one"><AppIcon name="sparkles" :size="24" /></span>
    <span class="art-sparkle sparkle-two"><AppIcon name="sparkle" :size="15" /></span>
  </div>
</template>

<style scoped>
.onboarding-art { position: relative; width: 100%; max-width: 330px; height: 290px; display: grid; place-items: center; flex-shrink: 0; }
.art-halo { position: absolute; inset: 5%; border-radius: 50%; background: radial-gradient(circle, #eddaff90, #f9effb20 70%); filter: blur(16px); }
.art-ribbon { position: absolute; width: 96%; height: 50%; border-radius: 50%; border: 16px solid #e7d6ff70; box-shadow: inset 2px 3px 5px #ffffffd9, 0 4px 12px #ac78e212; }
.ribbon-one { transform: rotate(-38deg); border-bottom-color: #cae8ff88; border-left-color: #ecc8ff99; }
.ribbon-two { transform: rotate(42deg); width: 100%; height: 44%; border-color: #f7d4ef80; border-right-color: #d5d4ff80; }
.art-chip { position: absolute; display: flex; align-items: center; gap: 9px; padding: 12px 15px 12px 10px; max-width: 175px; border: 1px solid white; border-radius: 24px; background: #ffffffed; box-shadow: 0 8px 24px #714d9a0c; font-size: 12px; line-height: 1.4; font-weight: 600; }
.chip-one { top: 25px; left: -4px; }
.chip-two { bottom: 18px; right: -4px; }
.chip-icon { display: grid; place-items: center; width: 34px; height: 34px; flex-shrink: 0; border-radius: 50%; background: #f2eaff; color: #8650dd; }
.art-sparkle { position: absolute; color: #ad6be9; }
.sparkle-one { top: 20px; right: 28px; }
.sparkle-two { bottom: 32px; left: 30px; }
@media (max-height: 740px) { .onboarding-art { height: 230px; transform: scale(.87); } }
</style>
