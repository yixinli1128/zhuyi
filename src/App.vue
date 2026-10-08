<script setup>
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppNavbar from './components/layout/AppNavbar.vue'
import AppFooter from './components/layout/AppFooter.vue'
import AppToast from './components/layout/AppToast.vue'

const route = useRoute()
// 登入、註冊等頁面：桌機不顯示左側 navbar，內容滿版
const isAuthLayout = computed(() => route.meta.layout === 'auth')
</script>

<template>
  <div class="app-layout">
    <div class="app-body">
      <AppNavbar :hide-sidebar="isAuthLayout" />
      <main class="app-main" :class="{ 'is-full': isAuthLayout }">
        <RouterView />
      </main>
    </div>
    <AppFooter />
    <AppToast />
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
@media (min-width: 1024px) {
  .app-body {
    display: grid;
    grid-template-columns: 12.5vw 75vw 12.5vw;
  }

  .app-main {
    grid-column: 2;
    width: 75vw;
  }
}

/* 1920px 設計稿以像素鎖定三欄；超出畫布的空間平均保留在兩側。 */
@media (min-width: 1920px) {
  .app-body {
    grid-template-columns: minmax(240px, 1fr) 1440px minmax(240px, 1fr);
  }

  .app-main {
    width: 1440px;
  }

  .app-main.is-full {
    padding-right: 0;
  }
}
</style>
