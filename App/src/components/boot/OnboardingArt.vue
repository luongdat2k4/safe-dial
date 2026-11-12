<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import RiskBadge from '@/components/RiskBadge.vue'
import { t } from '@/composables/useT'

/** Minh hoạ cho từng trang onboarding, mỗi trang một kiểu: thẻ cuộc gọi đến · chồng cảnh báo · bảng thống kê. */
defineProps<{ kind: 0 | 1 | 2 }>()

const bars = [38, 62, 46, 80, 54, 92, 70]
</script>

<template>
  <!-- 0 · Nhận diện số lạ: thẻ cuộc gọi đến với vòng radar -->
  <div v-if="kind === 0" class="art art-call" aria-hidden="true">
    <div class="halo" />
    <div class="call-card">
      <div class="radar">
        <span class="ring r1" /><span class="ring r2" /><span class="ring r3" />
        <span class="avatar"><AppIcon name="user-round-search" :size="34" /></span>
      </div>
      <p class="call-number">+84 28 3822 ••••</p>
      <RiskBadge risk="unknown" size="md" />
      <div class="call-actions">
        <span class="act decline"><AppIcon name="phone-off" :size="20" /></span>
        <span class="act accept"><AppIcon name="phone" :size="20" /></span>
      </div>
    </div>
  </div>

  <!-- 1 · Cảnh báo lừa đảo: khiên lớn và chồng thông báo xếp lệch -->
  <div v-else-if="kind === 1" class="art art-alerts" aria-hidden="true">
    <div class="shield"><AppIcon name="shield-alert" :size="46" /></div>
    <div class="stack">
      <div class="note note-scam">
        <span class="note-icon"><AppIcon name="triangle-alert" :size="18" /></span>
        <span class="note-num">+44 20 •••• 1187</span>
        <RiskBadge risk="scam" />
      </div>
      <div class="note note-spam">
        <span class="note-icon"><AppIcon name="megaphone" :size="18" /></span>
        <span class="note-num">0909 ••• 512</span>
        <RiskBadge risk="spam" />
      </div>
      <div class="note note-safe">
        <span class="note-icon"><AppIcon name="badge-check" :size="18" /></span>
        <span class="note-num">0912 ••• 088</span>
        <RiskBadge risk="safe" />
      </div>
    </div>
  </div>

  <!-- 2 · Chặn spam & thống kê: bảng điều khiển nhỏ -->
  <div v-else class="art art-stats" aria-hidden="true">
    <div class="dash">
      <div class="dash-head">
        <span class="chip-icon"><AppIcon name="chart-no-axes-combined" :size="18" /></span>
        <span class="dash-title">{{ t('boot.onboarding.art.insights') }}</span>
      </div>
      <div class="chart">
        <span v-for="(h, i) in bars" :key="i" class="bar" :class="{ hi: i === 5 }" :style="{ height: `${h}%` }" />
      </div>
      <div class="tiles">
        <div class="tile tile-ban">
          <span class="tile-icon"><AppIcon name="shield-ban" :size="20" /></span>
          <span class="tile-value">128</span>
        </div>
        <div class="tile tile-donut">
          <span class="donut"><span class="donut-hole">72%</span></span>
        </div>
      </div>
    </div>
    <span class="sparkle"><AppIcon name="sparkles" :size="22" /></span>
  </div>
</template>

<style scoped>
.art { position: relative; width: 100%; max-width: 330px; height: 290px; display: grid; place-items: center; flex-shrink: 0; }
.halo { position: absolute; inset: 6%; border-radius: 50%; background: radial-gradient(circle, #eddaff, #f9effb00 70%); filter: blur(14px); }
.chip-icon { display: grid; place-items: center; width: 30px; height: 30px; flex-shrink: 0; border-radius: 50%; background: #f2eaff; color: #8650dd; }

/* 0 · Thẻ cuộc gọi */
.call-card { position: relative; display: flex; flex-direction: column; align-items: center; gap: 10px; width: 228px; padding: 26px 18px 18px; border: 1px solid #fff; border-radius: 32px; background: linear-gradient(165deg, #ffffff, #f7f1ff); box-shadow: 0 18px 44px #6b3fd022; }
.radar { position: relative; display: grid; place-items: center; width: 96px; height: 96px; }
.ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid #a77cf2; opacity: 0; animation: ping 2.4s ease-out infinite; }
.r2 { animation-delay: .8s; }
.r3 { animation-delay: 1.6s; }
.avatar { position: relative; display: grid; place-items: center; width: 72px; height: 72px; border-radius: 50%; color: #fff; background: radial-gradient(circle at 70% 15%, #dc8df8, #9a4df5 45%, #6930df 85%); box-shadow: 0 8px 22px #7540ed55; }
.call-number { margin-top: 2px; font-size: 17px; font-weight: 700; letter-spacing: .3px; color: var(--color-ink); }
.call-actions { display: flex; gap: 46px; margin-top: 6px; }
.act { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 50%; color: #fff; }
.decline { background: var(--color-scam); box-shadow: 0 6px 16px #dc315f40; transform: rotate(135deg); }
.decline :deep(svg) { transform: rotate(-135deg); }
.accept { background: var(--color-safe); box-shadow: 0 6px 16px #16856640; animation: nudge 1.6s ease-in-out infinite; }
@keyframes ping { 0% { transform: scale(.75); opacity: .7; } 100% { transform: scale(1.7); opacity: 0; } }
@keyframes nudge { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }

/* 1 · Chồng cảnh báo */
.art-alerts { place-items: start center; }
.shield { position: absolute; top: 0; left: 50%; display: grid; place-items: center; width: 92px; height: 92px; margin-left: -46px; border-radius: 30px; color: #fff; background: linear-gradient(140deg, #ff7aa0, #dc315f 55%, #9b2bd6); box-shadow: 0 16px 34px #dc315f40; transform: rotate(-8deg); }
.stack { position: absolute; top: 108px; left: 0; right: 0; display: grid; gap: 10px; }
.note { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid #fff; border-radius: 18px; background: #ffffffee; box-shadow: 0 8px 22px #714d9a14; }
.note-num { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 13px; font-weight: 600; }
.note-icon { display: grid; place-items: center; width: 32px; height: 32px; flex-shrink: 0; border-radius: 11px; }
.note-scam { transform: translateX(-6px) rotate(-1.5deg); border-color: #ffd6e1; }
.note-scam .note-icon { background: var(--color-scam-soft); color: var(--color-scam); }
.note-spam { transform: translateX(8px) rotate(1deg); opacity: .96; }
.note-spam .note-icon { background: var(--color-spam-soft); color: var(--color-spam); }
.note-safe { transform: translateX(-4px) scale(.96); opacity: .9; }
.note-safe .note-icon { background: #e6f5ef; color: var(--color-safe); }

/* 2 · Bảng thống kê */
.dash { width: 258px; padding: 16px; border: 1px solid #fff; border-radius: 28px; background: linear-gradient(160deg, #ffffff, #f8f3ff); box-shadow: 0 18px 44px #6b3fd01f; transform: rotate(-2deg); }
.dash-head { display: flex; align-items: center; gap: 8px; }
.dash-title { font-size: 13px; font-weight: 700; }
.chart { display: flex; align-items: flex-end; gap: 8px; height: 96px; margin: 14px 2px 12px; padding-bottom: 2px; border-bottom: 1px dashed #e4dbf5; }
.bar { flex: 1; border-radius: 8px 8px 4px 4px; background: #e6dafd; }
.bar.hi { background: linear-gradient(180deg, #e66bb7, #934cf4 55%, #5926e9); box-shadow: 0 6px 14px #7540ed40; }
.tiles { display: grid; grid-template-columns: 1fr auto; gap: 10px; }
.tile { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 18px; }
.tile-ban { background: #f4eeff; }
.tile-icon { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 12px; color: #fff; background: var(--color-blocked); }
.tile-value { font-size: 22px; font-weight: 700; letter-spacing: -.5px; color: var(--color-ink); }
.tile-donut { padding: 6px; background: #fff; border: 1px solid #f0eaf9; }
.donut { display: grid; place-items: center; width: 50px; height: 50px; border-radius: 50%; background: conic-gradient(#7540ed 0 72%, #f0c2e2 72% 88%, #e9e4f5 88%); }
.donut-hole { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: #fff; font-size: 10px; font-weight: 700; color: var(--color-primary-dark); }
.sparkle { position: absolute; top: 14px; right: 18px; color: #ad6be9; }

@media (prefers-reduced-motion: reduce) { .ring, .accept { animation: none; } .ring { opacity: .25; } }
@media (max-height: 740px) { .art { height: 240px; transform: scale(.86); } }
</style>
