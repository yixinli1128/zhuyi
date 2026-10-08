<script setup>
// 會員頁共用版面（Figma Desktop - 會員登入 全系列）
//   桌機：左邊稻田插畫＋右邊 520px 卡片；手機／平板：只顯示卡片
//   <AuthLayout><AuthCard>...</AuthCard></AuthLayout>
import heroImg from '@/assets/zhuyi-img/晨曦稻田耕作者.png'
import heroTitleImg from '@/assets/zhuyi-img/A Brighter Day 土地溫度字樣.png'
</script>

<template>
  <section class="auth">
    <div class="auth__hero" aria-hidden="true">
      <img class="auth__hero-img" :src="heroImg" alt="" />
      <img class="auth__hero-title" :src="heroTitleImg" alt="" />
    </div>
    <div class="auth__card">
      <slot />
    </div>
  </section>
</template>

<style scoped>
/* ---------- 手機／平板：只顯示卡片 ---------- */
.auth {
  display: flex;
  justify-content: center;
  padding: var(--page-padding-y) var(--page-padding-x);
}

.auth__hero {
  display: none;
}

.auth__card {
  width: 100%;
  max-width: 520px;
}

/* ---------- 桌機（Figma 1920：左圖 1080 ＋ 間距 80 ＋ 右卡片 520，左右留白 120） ---------- */
@media (min-width: 1024px) {
  .auth {
    align-items: center;
    gap: clamp(var(--space-40), 4.17vw, 80px);
    min-height: max(640px, calc(100vh - 138px)); /* 扣掉 footer，第一屏放得下 */
    padding: var(--space-60) clamp(var(--space-40), 6.25vw, 120px);
  }

  .auth__hero {
    position: relative;
    display: block;
    flex: 1;
    align-self: stretch;
    min-width: 0;
    border-radius: 12px;
    overflow: hidden;
  }

  .auth__hero-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* 「A Brighter Day」字樣：Figma 寬 478／圖寬 1080 */
  .auth__hero-title {
    position: absolute;
    top: 0;
    left: 2.6%;
    width: 44%;
    height: auto;
  }

  .auth__card {
    flex-shrink: 0;
    width: 520px;
  }
}
</style>
