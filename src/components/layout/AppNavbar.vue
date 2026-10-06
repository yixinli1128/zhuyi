<script setup>
// Figma：Navbar（桌機左側直欄 240px）＋ Mobile Header（手機／平板頂部 64px ＋ ☰ 選單）
import { ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import NavProfile from './NavProfile.vue'
import logoUrl from '@/assets/zhuyi-img/logo/logo_pc.png'
import logoMobileUrl from '@/assets/zhuyi-img/logo/logo_mobile.png'

const items = [
  { label: '來點煮意', to: '/create' },
  { label: '餐食日誌', to: '/journal' },
  { label: '冰箱庫存', to: '/fridge' },
  { label: '家庭管理', to: '/family' },
]

const route = useRoute()
const menuOpen = ref(false)

// 換頁後自動收起手機選單
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)
</script>

<template>
  <!-- 桌機：左側直欄 -->
  <aside class="navbar">
    <RouterLink to="/" class="navbar__logo" aria-label="煮意 ZHUYI 首頁">
      <img :src="logoUrl" alt="煮意 ZHUYI" />
    </RouterLink>

    <nav class="navbar__list">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="navbar__item"
        active-class="is-active"
      >
        {{ item.label }}
      </RouterLink>
    </nav>

    <NavProfile class="navbar__profile" />
  </aside>

  <!-- 手機／平板：頂部列 -->
  <header class="mobile-header">
    <RouterLink to="/" class="mobile-header__brand" aria-label="煮意 ZHUYI 首頁">
      <img :src="logoMobileUrl" alt="煮意 ZHUYI" />
    </RouterLink>
    <button
      type="button"
      class="mobile-header__toggle"
      :aria-expanded="menuOpen"
      :aria-label="menuOpen ? '關閉選單' : '開啟選單'"
      @click="menuOpen = !menuOpen"
    >
      ☰
    </button>
  </header>

  <div v-if="menuOpen" class="mobile-menu" @click.self="menuOpen = false">
    <nav class="mobile-menu__panel">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="navbar__item"
        active-class="is-active"
      >
        {{ item.label }}
      </RouterLink>
      <NavProfile />
    </nav>
  </div>
</template>

<style scoped>
/* ---------- 手機／平板（預設） ---------- */
.navbar {
  display: none;
}

.mobile-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--mobile-header-height);
  padding: 0 var(--space-20);
  background: var(--bg-default);
}

.mobile-header__brand {
  display: flex;
  align-items: center;
}

.mobile-header__brand img {
  display: block;
  height: 36px;
  width: auto;
}

.mobile-header__toggle {
  font-size: var(--fs-subtitle-1);
  line-height: 1;
  color: var(--text-body);
}

.mobile-menu {
  position: fixed;
  inset: var(--mobile-header-height) 0 0;
  z-index: 19;
  background: rgba(52, 38, 28, 0.2);
}

.mobile-menu__panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-40);
  padding: var(--space-40) var(--space-20) var(--space-60);
  background: var(--bg-default);
}

/* ---------- 選單項目 ---------- */
.navbar__item {
  position: relative;
  font-size: var(--fs-subtitle-1);
  line-height: 1;
  color: var(--text-title);
  white-space: nowrap;
  transition: color 0.2s;
}

.navbar__item:hover {
  color: var(--brand-primary);
}

/* 目前頁面：文字下方 120px 細線（Figma 1037:11279） */
.navbar__item.is-active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: calc(-1 * var(--space-8));
  width: 120px;
  height: 1px;
  background: var(--brand-special);
  transform: translateX(-50%);
}

/* ---------- 桌機 ---------- */
@media (min-width: 1024px) {
  .mobile-header,
  .mobile-menu {
    display: none;
  }

  .navbar {
    position: sticky;
    top: 0;
    flex-shrink: 0;
    width: var(--navbar-width);
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-60);
    padding: var(--space-60) 0;
  }

  .navbar__logo img {
    display: block;
    width: 101px;
    height: 202px;
    object-fit: contain;
  }

  .navbar__list {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-40);
  }

  .navbar__profile {
    margin-top: auto;
  }
}
</style>
