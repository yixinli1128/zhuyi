<script setup>
// Figma 按鈕元件（元件頁 button 區 + Button 1313:12599）
//   variant  primary   咖啡底白字（Button/pri、Type=Primary、Button/add/big/mc）
//            secondary 淺咖啡底（Button/sec、Type=Secondary、Button/add/small/mc）
//            outline   白底細框（Button/outline，例：Google／LINE 登入）
//            danger    紅底白字（刪除帳號彈窗的「永久刪除」）
//   size     md 16px 字、padding 12（大按鈕）；sm 12px 字、padding 4/8（小膠囊 Button/add/small）
//   block    滿版寬度（例：登入按鈕）
//   icon / iconRight  Font Awesome class，例：'fa-solid fa-plus'、'fa-solid fa-chevron-right'
//   to       有值時渲染成 RouterLink
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'outline', 'danger'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['md', 'sm'].includes(v),
  },
  block: Boolean,
  disabled: Boolean,
  icon: String,
  iconRight: String,
  to: [String, Object],
  type: {
    type: String,
    default: 'button',
  },
})

const isLink = computed(() => props.to && !props.disabled)

const classes = computed(() => [
  'btn',
  `btn--${props.variant}`,
  `btn--${props.size}`,
  { 'btn--block': props.block, 'is-disabled': props.disabled },
])
</script>

<template>
  <RouterLink v-if="isLink" :to="to" :class="classes">
    <i v-if="icon" :class="['btn__icon', icon]" aria-hidden="true"></i>
    <span class="btn__label"><slot /></span>
    <i v-if="iconRight" :class="['btn__icon', iconRight]" aria-hidden="true"></i>
  </RouterLink>
  <button v-else :type="type" :class="classes" :disabled="disabled">
    <i v-if="icon" :class="['btn__icon', icon]" aria-hidden="true"></i>
    <span class="btn__label"><slot /></span>
    <i v-if="iconRight" :class="['btn__icon', iconRight]" aria-hidden="true"></i>
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 999px;
  font-family: var(--font-family);
  white-space: nowrap;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.05));
  cursor: pointer;
  transition:
    background-color 0.2s,
    color 0.2s,
    border-color 0.2s;
}

/* ---------- 尺寸 ---------- */
.btn--md {
  gap: var(--space-8);
  padding: 11px; /* 12px 減掉 1px 邊框，總高 45px 同 Figma */
  font-size: var(--fs-body-1);
  line-height: 21px;
}

.btn--md .btn__icon {
  font-size: 20px;
}

.btn--sm {
  gap: var(--space-4);
  padding: 3px 7px; /* 4px / 8px 減 1px 邊框，總高 24px */
  font-size: var(--fs-caption-2);
  line-height: 16px;
}

.btn--sm .btn__icon {
  font-size: 12px;
}

.btn--block {
  display: flex;
  width: 100%;
}

/* ---------- primary ---------- */
.btn--primary {
  background-color: var(--brand-primary);
  color: var(--text-on-primary);
}

.btn--primary:hover {
  background-color: var(--brand-primary-hover);
}

.btn--primary:active {
  background-color: var(--brand-primary-active);
}

/* ---------- secondary ---------- */
.btn--secondary {
  background-color: var(--brand-secondary);
  color: var(--text-on-secondary);
}

.btn--secondary:hover {
  background-color: var(--brand-secondary-hover);
}

.btn--secondary:active {
  background-color: var(--brand-secondary-active);
}

/* ---------- outline ---------- */
.btn--outline {
  background-color: var(--bg-surface);
  border-color: var(--brand-primary-border);
  color: var(--text-body);
}

.btn--outline.btn--md {
  gap: 10px;
  padding: 12px 24px; /* 總高 47px 同 Figma Button/outline */
}

/* Figma 沒畫 outline 的 hover／active，先用品牌淺色系 */
.btn--outline:hover {
  background-color: var(--brand-secondary-light);
}

.btn--outline:active {
  background-color: var(--brand-secondary);
}

/* ---------- danger ---------- */
.btn--danger {
  background-color: var(--status-error);
  color: var(--text-on-primary);
}

.btn--danger:hover {
  background-color: var(--status-error-hover);
}

.btn--danger:active {
  background-color: var(--status-error-active);
}

/* ---------- disabled（Figma State=Disabled） ---------- */
.btn:disabled,
.btn.is-disabled {
  color: var(--text-placeholder);
  cursor: not-allowed;
  pointer-events: none;
}

.btn--primary:disabled,
.btn--primary.is-disabled {
  background-color: var(--brand-primary-disabled);
}

.btn--secondary:disabled,
.btn--secondary.is-disabled {
  background-color: var(--brand-secondary-disabled);
}

.btn--danger:disabled,
.btn--danger.is-disabled {
  background-color: var(--brand-primary-disabled);
}

.btn--outline:disabled,
.btn--outline.is-disabled {
  background-color: var(--bg-surface);
  border-color: var(--brand-primary-disabled);
}

.btn:focus-visible {
  outline: 2px solid var(--brand-special);
  outline-offset: 2px;
}
</style>
