<script setup>
// Figma Alert/error、Alert/info（登入錯誤 E3～E5）
//   <BaseAlert variant="error" title="電子信箱或密碼錯誤" message="請確認後再試一次。" />
//   預設 slot 可放連結，例如「立即註冊 →」
defineProps({
  variant: {
    type: String,
    default: 'error',
    validator: (v) => ['error', 'info'].includes(v),
  },
  title: String,
  message: String,
})
</script>

<template>
  <div class="alert" :class="`alert--${variant}`" role="alert">
    <span class="alert__icon" aria-hidden="true">{{ variant === 'error' ? '!' : 'i' }}</span>
    <div class="alert__text">
      <p v-if="title" class="alert__title">{{ title }}</p>
      <p v-if="message" class="alert__message">{{ message }}</p>
      <div v-if="$slots.default" class="alert__action"><slot /></div>
    </div>
  </div>
</template>

<style scoped>
.alert {
  display: flex;
  align-items: flex-start;
  gap: var(--space-12);
  width: 100%;
  padding: var(--space-16);
  border: 1px solid;
  border-radius: 12px;
}

.alert--error {
  background: var(--status-error-subtle);
  border-color: var(--status-error);
  color: var(--text-danger);
}

.alert--info {
  background: var(--brand-secondary-light);
  border-color: var(--brand-primary-border);
  color: var(--text-on-secondary);
}

.alert__icon {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: var(--fs-body-2);
  font-weight: 700;
  line-height: 1;
  color: var(--text-on-primary);
}

.alert--error .alert__icon {
  background: var(--text-danger);
}

.alert--info .alert__icon {
  background: var(--brand-primary);
}

.alert__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  line-height: normal;
}

.alert__title {
  font-size: var(--fs-body-1);
  font-weight: 700;
}

.alert__message {
  font-size: var(--fs-body-2);
}

.alert__action {
  font-size: var(--fs-body-2);
  font-weight: 700;
}

.alert__action :deep(a) {
  text-decoration: underline;
}
</style>
