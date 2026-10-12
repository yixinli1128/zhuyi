<script setup>
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppNavbar from './components/layout/AppNavbar.vue'
import AppFooter from './components/layout/AppFooter.vue'
import AppToast from './components/layout/AppToast.vue'
import FloatingBackdrop from './components/layout/FloatingBackdrop.vue'
import IntroSplash from './components/layout/IntroSplash.vue'

const route = useRoute()
// 登入、註冊等頁面：桌機不顯示左側 navbar，內容滿版
const isAuthLayout = computed(() => route.meta.layout === 'auth')
</script>

<template>
  <div class="app-layout">
    <FloatingBackdrop />
    <div class="app-body">
      <AppNavbar :hide-sidebar="isAuthLayout" />
      <main class="app-main" :class="{ 'is-full': isAuthLayout }">
        <RouterView />
      </main>
    </div>
    <AppFooter />
    <AppToast />
    <IntroSplash />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1;
  min-width: 0;
}

/* 桌機 Figma grid：1920px = 240px 導覽 / 1440px 主要內容 / 240px 留白。 */
@media (min-width: 1025px) {
  .app-body {
    display: grid;
    /* 保留 Figma 的三欄構圖，同時避免 1025–1439px 時側欄被壓得太窄。 */
    grid-template-columns: clamp(180px, 12.5vw, 240px) minmax(0, 1fr) clamp(40px, 12.5vw, 180px);
  }

  .app-main {
    grid-column: 2;
    width: auto;
  }
}

/* 只有手機有固定底部導覽，需要為它保留內容安全距離。 */
@media (max-width: 640px) {
  .app-main {
    padding-bottom: calc(64px + env(safe-area-inset-bottom));
  }

  /* 會員頁沒有左側導覽，內容橫跨三欄滿版 */
  .app-main.is-full {
    grid-column: 1 / -1;
    width: auto;
  }
}

/* 1920px 設計稿以像素鎖定三欄；超出畫布的空間平均保留在兩側。 */
@media (min-width: 1920px) {
  .app-body {
    grid-template-columns: minmax(240px, 1fr) 1440px minmax(240px, 1fr);
  }

  .app-main:not(.is-full) {
    width: 1440px;
  }
  .app-main.is-full {
    grid-column: 1 / -1;
    width: auto;
    padding-right: 0;
  }
}
</style>
