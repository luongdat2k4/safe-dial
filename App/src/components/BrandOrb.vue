<script setup lang="ts">
import AppIcon from './AppIcon.vue'

withDefaults(defineProps<{ icon?: string; compact?: boolean; active?: boolean }>(), {
  icon: 'shield-check',
})
</script>

<template>
  <div class="brand-orbit" :class="{ 'orb-compact': compact, 'orb-active': active }" aria-hidden="true">
    <span class="orb-ring orb-ring-one" />
    <span class="orb-ring orb-ring-two" />
    <span class="orb-core">
      <span v-if="active" class="orb-wave"><i /><i /><i /><i /><i /></span>
      <AppIcon v-else :name="icon" :size="compact ? 24 : 48" />
    </span>
  </div>
</template>

<style scoped>
.brand-orbit { position: relative; display: grid; place-items: center; width: 220px; height: 220px; flex-shrink: 0; }
.orb-core { position: relative; display: grid; place-items: center; width: 64%; height: 64%; border-radius: 50%; color: white; background: radial-gradient(circle at 72% 18%, #f4bbf5 0%, #b570f0 26%, #843be9 48%, #6634e9 67%, #9a9cfa 90%); box-shadow: inset 0 2px 5px #ffffffd9, inset -5px -8px 18px #b3b6ff9e, 0 12px 36px #a34aef38, 0 0 0 8px #f8edff80; }
.orb-core::after { content: ''; position: absolute; inset: 0; border-radius: inherit; border: 1px solid #ffffff7a; }
.orb-ring { position: absolute; border: 1px solid #e4d6f5; border-radius: 50%; }
.orb-ring-one { inset: 5%; transform: rotate(-25deg); }
.orb-ring-two { inset: 0; border-color: #eee5f8; transform: rotate(25deg); }
.orb-compact { width: 54px; height: 54px; }
.orb-compact .orb-core { width: 100%; height: 100%; box-shadow: inset 0 1px 4px #ffffff9c, 0 4px 12px #a34aef26; }
.orb-compact .orb-ring { display: none; }
.orb-wave { display: flex; gap: 5px; align-items: center; height: 40px; }
.orb-wave i { width: 5px; height: 16px; background: #fff; border-radius: 5px; animation: wave 1.3s ease-in-out infinite; }
.orb-wave i:nth-child(2), .orb-wave i:nth-child(4) { height: 28px; animation-delay: -.35s; }
.orb-wave i:nth-child(3) { height: 40px; animation-delay: -.65s; }
@keyframes wave { 50% { transform: scaleY(.5); opacity: .7; } }
@media (prefers-reduced-motion: reduce) { .orb-wave i { animation: none; } }
</style>
