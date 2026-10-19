<script setup>
// 會員頁共用版面（Figma Desktop - 會員登入 全系列）
//   桌機：左邊稻田插畫＋右邊卡片，跟著視窗等比縮放
//   平板：插畫鋪滿當背景，卡片疊在插畫右側；手機：插畫在上、卡片疊在插畫下緣
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
/* ---------- 手機 ≤ 640px：插畫在上，卡片往上疊進插畫下緣（跟首頁主視覺同一種排法） ---------- */
.auth {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--page-padding-y) var(--page-padding-x);
}

.auth__hero {
  position: relative;
  width: 100%;
  max-width: 560px;
  aspect-ratio: 3 / 2;
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

/* 「A Brighter Day」字樣：Figma 左 28、寬 478.66／圖寬 1080 */
.auth__hero-title {
  position: absolute;
  top: 0;
  left: 2.59%;
  width: 44.32%;
  height: auto;
}

/* zoom：卡片裡的字、輸入框、按鈕、留白整組等比縮成 80%，手機上才不會顯得太大 */
.auth__card {
  position: relative;
  width: calc(100% - 8vw);
  max-width: 500px;
  margin-top: -12vw;
  zoom: 0.8;
}

/* ---------- 平板 641–1024px：插畫鋪滿當背景，卡片疊在插畫右側 ---------- */
@media (min-width: 641px) {
  /* 插畫和卡片放進同一格，就會疊在一起；卡片比插畫高時，插畫上下置中 */
  .auth {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-items: center;
    padding-block: clamp(32px, 6vw, 64px);
  }

  /* 圖片固定 Figma 的 1080 × 800 比例 */
  .auth__hero {
    grid-area: 1 / 1;
    max-width: none;
    aspect-ratio: 1080 / 800;
  }

  /* 卡片蓋住右半邊，所以插畫靠右裁切，讓插秧的人留在左半邊露出來 */
  .auth__hero-img {
    object-position: right center;
  }

  /* 靠右裁切後字樣底下變成樹和山，墊一層往四周淡出的米白，字才清楚 */
  .auth__hero-title {
    background: radial-gradient(
      ellipse 46% 45% at 34% 55%,
      rgba(250, 248, 246, 0.94) 60%,
      rgba(250, 248, 246, 0)
    );
  }

  .auth__card {
    grid-area: 1 / 1;
    justify-self: end;
    width: clamp(320px, 46vw, 440px);
    max-width: none;
    margin: 0 clamp(16px, 4vw, 40px) 0 0;
    zoom: 1;
  }
}

/* ---------- 桌機 ≥ 1025px（Figma 1920：左圖 1080 ＋ 間距 80 ＋ 右卡片 520，左右留白 120） ---------- */
@media (min-width: 1025px) {
  .auth {
    display: flex;
    flex-direction: row;
    justify-content: center;
    gap: clamp(var(--space-40), 4.17vw, 80px);
    min-height: max(640px, calc(100vh - 138px)); /* 扣掉 footer，第一屏放得下 */
    padding: var(--space-60) clamp(var(--space-40), 6.25vw, 120px);
  }

  .auth__hero {
    flex: 1;
    min-width: 0;
    max-width: 1080px;
  }

  .auth__hero-img {
    object-position: center;
  }

  .auth__hero-title {
    background: none;
  }

  /* 卡片寬度也跟著縮（520 / 1920），小桌機才不會把圖片擠得太小 */
  .auth__card {
    flex: 0 0 clamp(400px, 27.1vw, 520px);
    width: auto;
    margin: 0;
  }
}
</style>
