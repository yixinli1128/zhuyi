<script setup>
// Figma Login Card：白底卡片，只有左上、右下圓角
//   表單：<AuthCard as="form" title="建立帳號" subtitle="..." @submit="onSubmit">欄位…</AuthCard>
//   結果：<AuthCard icon="✓" tone="success" title="註冊成功！">說明文字…<template #actions>按鈕</template></AuthCard>
//   #footer 放底部置中的連結列，例如「已經有帳號？立即登入」
defineProps({
  as: {
    type: String,
    default: 'div',
  },
  title: String,
  subtitle: String,
  // 結果卡片：上方 80px 圓形圖示，可以是文字（✓、!）或 Font Awesome class
  icon: String,
  tone: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'success', 'danger'].includes(v),
  },
})

const emit = defineEmits(['submit'])

function isIconClass(value) {
  return value.startsWith('fa-')
}
</script>

<template>
  <component
    :is="as"
    class="auth-card"
    :class="{ 'is-result': icon }"
    :novalidate="as === 'form' ? true : undefined"
    @submit.prevent="emit('submit')"
  >
    <span v-if="icon" class="auth-card__icon" :class="`is-${tone}`" aria-hidden="true">
      <i v-if="isIconClass(icon)" :class="icon"></i>
      <template v-else>{{ icon }}</template>
    </span>

    <div v-if="title" class="auth-card__heading">
      <h1 class="auth-card__title">{{ title }}</h1>
      <p v-if="subtitle" class="auth-card__subtitle">{{ subtitle }}</p>
    </div>

    <slot />

    <div v-if="$slots.actions" class="auth-card__actions">
      <slot name="actions" />
    </div>

    <p v-if="$slots.footer" class="auth-card__footer">
      <slot name="footer" />
    </p>
  </component>
</template>

<style scoped>
.auth-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 5vw, 24px);
  padding: clamp(20px, 6.5vw, 28px) clamp(16px, 5vw, 20px);
  background: var(--bg-surface);
  border: 1px solid var(--brand-secondary);
  border-radius: 12px 0;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
}

.auth-card__heading {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  line-height: normal;
}

.auth-card__title {
  font-size: clamp(24px, 7vw, 32px);
  font-weight: 700;
  color: var(--text-title);
}

.auth-card__subtitle {
  font-size: var(--fs-body-2);
  color: var(--text-secondary);
}

/* ---------- 結果卡片（註冊成功、已寄出重設信、連結失效…） ---------- */
.auth-card.is-result {
  align-items: center;
  text-align: center;
}

/* 說明文字；用 :where 降低權重，頁面自己的 class 可以覆蓋 */
:where(.auth-card.is-result) :slotted(p) {
  font-size: var(--fs-body-1);
  line-height: 1.6;
  color: var(--text-secondary);
}

.auth-card__icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 40px;
  font-weight: 700;
  line-height: 1;
  color: var(--text-on-primary);
}

.auth-card__icon.is-primary {
  background: var(--brand-primary);
}

.auth-card__icon.is-success {
  background: var(--status-success);
}

.auth-card__icon.is-danger {
  background: var(--status-error);
}

.auth-card__actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-24);
}

/* ---------- 底部連結列 ---------- */
.auth-card__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  font-size: var(--fs-body-2);
  line-height: normal;
  color: var(--text-secondary);
}

.auth-card__footer :slotted(a) {
  font-weight: 700;
  color: var(--text-body);
  text-decoration: underline;
}

/* 平板：卡片比桌機窄，留白和標題跟著縮；到桌機回到 Figma 的 40px、32px */
@media (min-width: 641px) {
  .auth-card {
    gap: clamp(16px, 2.6vw, 24px);
    padding: clamp(20px, 3.6vw, 40px);
  }

  .auth-card__title {
    font-size: clamp(24px, 3.2vw, 32px);
  }
}

@media (min-width: 1025px) {
  .auth-card {
    gap: var(--space-24);
    padding: clamp(28px, 2.1vw, 40px);
  }

  .auth-card__title {
    font-size: clamp(26px, 1.67vw, 32px);
  }
}
</style>
