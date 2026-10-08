<script setup>
// Figma：profile/login ＋ Menu/帳號（帳號選單-含帳號設定）＋ Dialog/確定要登出嗎？
// 未登入：顯示「立即登入」連到登入頁
// 已登入：點頭貼打開帳號選單（帳號設定、通知設定、登出）
//   placement="top"（桌機側欄，選單往上開）／"inline"（手機選單裡直接展開在下方）
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseDialog from '@/components/base/BaseDialog.vue'

const props = defineProps({
  placement: {
    type: String,
    default: 'top',
    validator: (v) => ['top', 'inline'].includes(v),
  },
})

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()

const root = ref(null)
const menuOpen = ref(false)
const logoutOpen = ref(false)

const label = computed(() => userStore.user?.name || '立即登入')
const avatar = computed(() => userStore.user?.avatar || '')

function closeMenu() {
  menuOpen.value = false
}

// 點選單外面就收起
function onDocumentClick(event) {
  if (root.value && !root.value.contains(event.target)) closeMenu()
}

watch(menuOpen, (open) => {
  if (props.placement !== 'top') return
  if (open) document.addEventListener('click', onDocumentClick)
  else document.removeEventListener('click', onDocumentClick)
})

watch(() => route.fullPath, closeMenu)

function askLogout() {
  closeMenu()
  logoutOpen.value = true
}

function confirmLogout() {
  logoutOpen.value = false
  userStore.logout()
  router.push('/login')
}

onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div ref="root" class="nav-profile" :class="`is-${placement}`">
    <RouterLink v-if="!userStore.isLoggedIn" class="nav-profile__trigger" to="/login">
      <span class="nav-profile__avatar"></span>
      <span class="nav-profile__name">{{ label }}</span>
    </RouterLink>

    <button
      v-else
      type="button"
      class="nav-profile__trigger"
      :aria-expanded="menuOpen"
      aria-haspopup="menu"
      @click="menuOpen = !menuOpen"
    >
      <span class="nav-profile__avatar">
        <img v-if="avatar" :src="avatar" alt="" />
      </span>
      <span class="nav-profile__name">{{ label }}</span>
    </button>

    <div v-if="menuOpen && userStore.user" class="account-menu" role="menu">
      <div class="account-menu__account">
        <p class="account-menu__name">{{ userStore.user.name }}</p>
        <p class="account-menu__email">{{ userStore.user.email }}</p>
      </div>
      <hr class="account-menu__divider" />
      <RouterLink to="/account" class="account-menu__item" role="menuitem">帳號設定</RouterLink>
      <RouterLink :to="{ path: '/account', hash: '#notifications' }" class="account-menu__item" role="menuitem">
        通知設定
      </RouterLink>
      <hr class="account-menu__divider" />
      <button type="button" class="account-menu__item is-danger" role="menuitem" @click="askLogout">登出</button>
    </div>

    <BaseDialog
      v-model:open="logoutOpen"
      title="確定要登出嗎？"
      description="登出後需要重新登入，才能查看家人設定、冰箱庫存與餐食日誌。"
    >
      <template #footer>
        <BaseButton variant="secondary" @click="logoutOpen = false">取消</BaseButton>
        <BaseButton @click="confirmLogout">登出</BaseButton>
      </template>
    </BaseDialog>
  </div>
</template>

<style scoped>
.nav-profile {
  position: relative;
}

.nav-profile.is-inline {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-16);
  width: 100%;
}

.nav-profile__trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-12);
  text-align: left;
}

.nav-profile__avatar {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--brand-secondary);
  border: 1px solid var(--brand-primary-border);
}

.nav-profile__avatar img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nav-profile__name {
  font-size: var(--fs-body-1);
  line-height: 1;
  color: var(--text-body);
  white-space: nowrap;
}

/* ---------- 帳號選單（Figma Menu/帳號 240px） ---------- */
.account-menu {
  width: 240px;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-8) 0;
  background: var(--bg-surface);
  border: 1px solid var(--brand-secondary);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  text-align: left;
}

/* 桌機側欄：選單往上開，左側對齊頭貼 */
.is-top .account-menu {
  position: absolute;
  bottom: calc(100% + var(--space-20));
  left: 0;
  z-index: 30;
}

.account-menu__account {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: 10px var(--space-16);
  line-height: normal;
}

.account-menu__name {
  font-size: var(--fs-body-1);
  font-weight: 700;
  color: var(--text-body);
}

.account-menu__email {
  font-size: var(--fs-caption-2);
  color: var(--text-secondary);
  word-break: break-all;
}

.account-menu__divider {
  height: 1px;
  border: 0;
  background: var(--brand-secondary);
}

.account-menu__item {
  display: block;
  width: 100%;
  padding: var(--space-12) var(--space-16);
  font-size: var(--fs-body-1);
  line-height: normal;
  text-align: left;
  color: var(--text-on-secondary);
  transition: background-color 0.2s;
}

.account-menu__item:hover {
  background: var(--brand-secondary-light);
}

.account-menu__item.is-danger {
  color: var(--text-danger);
}
</style>
