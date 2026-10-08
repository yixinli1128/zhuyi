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

/* 桌機：左側直欄 navbar ＋ 右側內容，footer 在下方滿版 */
@media (min-width: 1024px) {
  .app-body {
    flex-direction: row;
  }

  /* 右側留白與 navbar 同寬 */
  .app-main {
    padding-right: var(--navbar-width);
  }

  .app-main.is-full {
    padding-right: 0;
  }
}
</style>
