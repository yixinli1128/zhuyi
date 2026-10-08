<script setup>
// Figma checkbox/click（297:1106）：18px 方框，勾選時出現勾勾
//   <BaseCheckbox v-model="remember">記住我</BaseCheckbox>
const model = defineModel({ type: Boolean, default: false })
</script>

<template>
  <label class="checkbox">
    <input v-model="model" type="checkbox" class="checkbox__input" />
    <span class="checkbox__box" aria-hidden="true">
      <i class="fa-solid fa-check"></i>
    </span>
    <span class="checkbox__label"><slot /></span>
  </label>
</template>

<style scoped>
.checkbox {
  display: inline-flex;
  align-items: center;
  gap: var(--space-8);
  cursor: pointer;
}

.checkbox__input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.checkbox__box {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--brand-primary-border);
  border-radius: 2px;
  background: var(--bg-surface);
  font-size: 11px;
  color: transparent;
  transition:
    background-color 0.2s,
    border-color 0.2s;
}

.checkbox__input:checked + .checkbox__box {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: var(--text-on-primary);
}

.checkbox__input:focus-visible + .checkbox__box {
  outline: 2px solid var(--brand-special);
  outline-offset: 2px;
}

.checkbox__label {
  font-size: var(--fs-body-2);
  line-height: normal;
  color: var(--text-body);
}
</style>
