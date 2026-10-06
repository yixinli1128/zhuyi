<script setup>
import logoMark from '@/assets/zhuyi-img/logo/logo_footer.png'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="app-footer">
    <div class="footer-brand">
      <div class="footer-tagline">
        <img class="footer-logo" :src="logoMark" alt="煮意 ZHUYI" width="60" height="60" />
        <p class="footer-caption">日常備餐・靈感與心意 // COOK WITH CARE &amp; IDEA</p>
      </div>
      <p class="footer-slogan">每天一點煮意，一桌家的心意。</p>
    </div>
    <p class="footer-copyright">
      © {{ year }} 煮意 ZHUYI. All rights reserved. Designed for mindful home cooking.
    </p>
  </footer>
</template>

<style scoped>
/* 手機（Figma Mobile Footer 1573:23629）：文字直排、不顯示 logo */
.app-footer {
  display: flex;
  flex-direction: column;
  gap: var(--space-24);
  padding: var(--space-20);
  /* Figma 手機版底色，與桌機的 secondary 不同 */
  background-color: #f1ede6;
  color: var(--text-body);
}

.footer-brand {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
}

.footer-tagline {
  display: flex;
  align-items: center;
  gap: var(--space-24);
}

.footer-logo {
  display: none;
  flex-shrink: 0;
  width: 60px;
  height: 60px;
}

.footer-caption,
.footer-copyright {
  font-size: var(--fs-caption-2);
}

.footer-slogan {
  font-size: var(--fs-subtitle-2);
}

/* 平板 */
@media (min-width: 768px) {
  .app-footer {
    padding: var(--space-20) var(--page-padding-x);
  }
}

/* 桌機（Figma footer/mc 1150:15025）：左品牌、右版權，左右留白同 navbar 寬 */
@media (min-width: 1024px) {
  .app-footer {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-20) var(--navbar-width);
    background-color: var(--brand-secondary);
  }

  .footer-logo {
    display: block;
  }
}
</style>
