<script setup>
// 全站提示條：深咖啡膠囊，置中在畫面上方（Figma 登入 E6）
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()

function onAction() {
  const action = toast.current?.action
  toast.hide()
  action?.onClick()
}
</script>

<template>
  <Transition name="toast">
    <div v-if="toast.current" :key="toast.current.id" class="toast" role="status" aria-live="polite">
      <span class="toast__icon" aria-hidden="true">
        <i :class="toast.current.variant === 'error' ? 'fa-solid fa-exclamation' : 'fa-solid fa-check'"></i>
      </span>
      <span class="toast__message">{{ toast.current.message }}</span>
      <button v-if="toast.current.action" type="button" class="toast__action" @click="onAction">
        {{ toast.current.action.label }}
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  top: calc(var(--mobile-header-height) + var(--space-16));
  left: 50%;
  z-index: 60;
  display: flex;
  align-items: center;
  gap: var(--space-12);
  max-width: calc(100vw - 2 * var(--space-16));
  padding: var(--space-12) var(--space-24);
  border-radius: 999px;
  background: var(--text-body);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  font-size: var(--fs-body-2);
  line-height: normal;
  color: var(--text-on-primary);
  transform: translateX(-50%);
}

.toast__icon {
  flex-shrink: 0;
  font-size: 12px;
}

.toast__action {
  flex-shrink: 0;
  font-weight: 700;
  text-decoration: underline;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}

@media (min-width: 1024px) {
  .toast {
    top: var(--space-40);
  }
}
</style>
