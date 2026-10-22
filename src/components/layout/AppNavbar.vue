<script setup>
// Figma：Navbar（桌機左側直欄 240px）＋ Mobile Header（手機／平板頂部 64px ＋ ☰ 選單）
import { ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import NavProfile from './NavProfile.vue'
import AppIcon from '@/components/base/AppIcon.vue'
import logoUrl from '@/assets/zhuyi-img/logo/logo_pc.png'
import logoMobileUrl from '@/assets/zhuyi-img/logo/logo_mobile.png'

const items = [
  { label: '來點煮意', to: '/create', icon: 'tableware' },
  { label: '餐食日誌', to: '/journal', icon: 'calendar' },
  { label: '冰箱庫存', to: '/fridge', icon: 'fridge' },
  { label: '家庭管理', to: '/family', icon: 'family' },
]

defineProps({
  // 桌機不顯示左側直欄（登入頁等滿版頁面）
  hideSidebar: Boolean,
})

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
  <aside v-if="!hideSidebar" class="navbar">
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
  <header v-if="!hideSidebar" class="mobile-header">
    <RouterLink to="/" class="mobile-header__brand" aria-label="煮意 ZHUYI 首頁">
      <img :src="logoMobileUrl" alt="煮意 ZHUYI" />
    </RouterLink>
    <nav class="tablet-nav" aria-label="主要導覽">
      <RouterLink v-for="item in items" :key="item.to" :to="item.to" class="tablet-nav__item" active-class="is-active">
        {{ item.label }}
      </RouterLink>
    </nav>
    <!-- 手機直接顯示登入者，避免先點人物 icon 才看到帳號。 -->
    <NavProfile class="mobile-header__profile" placement="down" />
    <button
      type="button"
      class="mobile-header__toggle"
      :aria-expanded="menuOpen"
      :aria-label="menuOpen ? '關閉帳號選單' : '開啟帳號選單'"
      @click="menuOpen = !menuOpen"
    >
      <i class="fa-regular fa-user" aria-hidden="true"></i>
    </button>
  </header>

  <div v-if="!hideSidebar && menuOpen" class="mobile-menu" @click.self="menuOpen = false">
    <nav class="mobile-menu__panel">
      <NavProfile placement="inline" />
    </nav>
  </div>

  <nav v-if="!hideSidebar" class="mobile-bottom-nav" aria-label="主要導覽">
    <RouterLink v-for="item in items" :key="item.to" :to="item.to" class="mobile-bottom-nav__item" active-class="is-active">
      <AppIcon :name="item.icon" />
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
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
  border-bottom: 1px solid var(--brand-secondary);
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
  display: none;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 50%;
  font-size: var(--fs-subtitle-1);
  line-height: 1;
  color: var(--text-body);
}

.mobile-header__profile {
  --nav-profile-avatar: 32px;
  --nav-profile-gap: 8px;
  --nav-profile-size: 13px;
}

.mobile-menu {
  position: fixed;
  inset: var(--mobile-header-height) 0 0;
  z-index: 19;
  background: rgba(52, 38, 28, 0.2);
}

.mobile-menu__panel {
  display: flex;
  justify-content: flex-end;
  padding: var(--space-16) var(--space-20);
  background: var(--bg-default);
}

.tablet-nav,
.mobile-bottom-nav {
  display: none;
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

.navbar__item.is-active {
  color: var(--brand-primary);
}

/* 目前頁面：底線由左向右展開 */
.navbar__item::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: calc(-1 * var(--space-8));
  width: calc(100% + 8px);
  height: 2px;
  border-radius: 999px;
  background: var(--brand-special);
  opacity: 0;
  transform: translateX(-50%) scaleX(0);
  transform-origin: left center;
  transition: transform 0.28s ease-out, opacity 0.12s ease-out;
}

.navbar__item.is-active::after {
  opacity: 1;
  transform: translateX(-50%) scaleX(1);
}

/* ---------- 桌機 ---------- */
@media (min-width: 1025px) {
  .mobile-bottom-nav {
    display: none;
  }
}

/* 平板：保留頂部四項文字導覽與帳號資訊；底部導覽僅供手機使用。 */
@media (min-width: 641px) and (max-width: 1024px) {
  .mobile-header {
    padding: 0 var(--space-20);
    gap: clamp(12px, 2vw, 24px);
  }

  .mobile-header__brand img {
    height: 36px;
  }

  .mobile-header__profile {
    display: flex;
  }

  .mobile-header__toggle {
    display: none;
  }

  .tablet-nav {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: center;
    gap: clamp(12px, 2.4vw, 26px);
    margin-left: auto;
  }

  .tablet-nav__item {
    position: relative;
    flex: 0 0 auto;
    padding: 6px 0;
    color: var(--text-body);
    font-size: clamp(14px, 1.7vw, 16px);
    line-height: 1.25;
    white-space: nowrap;
  }

  /* 跟桌機一樣：灰藍底線，目前頁面由左向右展開 */
  .tablet-nav__item::after {
    position: absolute;
    right: -4px;
    bottom: -7px;
    left: -4px;
    height: 2px;
    border-radius: 999px;
    background: var(--brand-special);
    content: '';
    opacity: 0;
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform 0.28s ease-out, opacity 0.12s ease-out;
  }

  .tablet-nav__item.is-active {
    color: var(--brand-primary);
  }

.tablet-nav__item.is-active::after {
    opacity: 1;
    transform: scaleX(1);
  }

  @media (hover: hover) {
    .tablet-nav__item:hover {
      color: var(--brand-primary);
    }

    .tablet-nav__item:hover::after {
      opacity: .65;
      transform: scaleX(1);
    }
  }

  .mobile-bottom-nav {
    display: none;
  }
}

/* 手機：內容全寬，四個核心頁面改為固定底部導覽。 */
@media (max-width: 640px) {
  .mobile-bottom-nav {
    position: fixed;
    z-index: 20;
    right: 0;
    bottom: 0;
    left: 0;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    height: calc(64px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    border-top: 1px solid var(--brand-secondary);
    background: rgba(250, 248, 246, .96);
    box-shadow: 0 -6px 18px rgba(52, 38, 28, .06);
    backdrop-filter: blur(12px);
  }

  .mobile-bottom-nav__item {
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 4px;
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.2;
  }

  .mobile-bottom-nav__item .app-icon {
    font-size: 20px;
  }

  .mobile-bottom-nav__item.is-active {
    color: var(--brand-primary);
  }
}

/* 桌機：維持 Figma 的固定左側欄。 */
@media (min-width: 1025px) {
  .mobile-header,
  .mobile-menu,
  .mobile-bottom-nav {
    display: none;
  }

  .navbar {
    /* Figma scroll behavior: Fixed (stay in place). */
    position: fixed;
    top: 0;
    left: 0;
    /* 帳號選單往右超出側欄時仍保持在頁面內容之上。 */
    z-index: 10;
    width: clamp(180px, 12.5vw, 240px);
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    /* Figma 的 240px 側欄以 1920px 畫布為基準等比縮放。 */
    gap: clamp(32px, 2.5vw, 48px);
    padding: clamp(36px, 2.5vw, 48px) 0 32px;
  }

  .navbar__logo img {
    display: block;
    width: clamp(60px, 4.2083vw, 81px);
    height: clamp(120px, 8.4167vw, 162px);
    object-fit: contain;
  }

  .navbar__list {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: clamp(22px, 1.6667vw, 32px);
  }

  .navbar__item {
    padding: 3px 2px;
    font-size: clamp(15px, 1vw, 19px);
    line-height: 1.35;
  }

  .navbar__profile {
    --nav-profile-avatar: clamp(40px, 2.5vw, 48px);
    --nav-profile-gap: 8px;
    --nav-profile-size: clamp(12px, .6667vw, 13px);
    margin-top: auto;
  }
}
</style>
