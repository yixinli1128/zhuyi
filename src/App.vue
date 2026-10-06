<script setup>
import { RouterView } from 'vue-router'
import AppNavbar from './components/layout/AppNavbar.vue'
import AppFooter from './components/layout/AppFooter.vue'
</script>

<template>
  <div class="app-layout">
    <div class="app-body">
      <AppNavbar />
      <main class="app-main">
        <RouterView />
      </main>
    </div>
    <AppFooter />
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
}
</style>
