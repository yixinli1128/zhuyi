<script setup>
// Figma：profile/login
// 未登入時顯示「立即登入」並連到登入頁，登入後顯示暱稱與頭貼
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const label = computed(() => userStore.user?.name || '立即登入')
const avatar = computed(() => userStore.user?.avatar || '')
</script>

<template>
  <RouterLink class="nav-profile" to="/login">
    <span class="nav-profile__avatar">
      <img v-if="avatar" :src="avatar" alt="" />
    </span>
    <span class="nav-profile__name">{{ label }}</span>
  </RouterLink>
</template>

<style scoped>
.nav-profile {
  display: inline-flex;
  align-items: center;
  gap: var(--space-12);
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
</style>
