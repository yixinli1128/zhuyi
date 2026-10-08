<script setup>
// Figma Form/TextInput（149:1754）：標題＋輸入框＋錯誤訊息
//   <BaseInput v-model="email" label="電子信箱" placeholder="請輸入電子信箱" :error="errors.email" />
//   type="password" 時右側會出現顯示／隱藏密碼的眼睛按鈕
import { computed, ref, useId } from 'vue'

const model = defineModel({ type: String, default: '' })

const props = defineProps({
  label: String,
  type: {
    type: String,
    default: 'text',
  },
  placeholder: String,
  error: String,
  autocomplete: String,
  disabled: Boolean,
})

const id = useId()
const showPassword = ref(false)

const isPassword = computed(() => props.type === 'password')
const inputType = computed(() => (isPassword.value && showPassword.value ? 'text' : props.type))
</script>

<template>
  <div class="field" :class="{ 'has-error': error }">
    <label v-if="label" :for="id" class="field__label">{{ label }}</label>
    <div class="field__box">
      <input
        :id="id"
        v-model="model"
        class="field__input"
        :class="{ 'has-toggle': isPassword }"
        :type="inputType"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :disabled="disabled"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${id}-error` : undefined"
      />
      <button
        v-if="isPassword"
        type="button"
        class="field__toggle"
        :aria-label="showPassword ? '隱藏密碼' : '顯示密碼'"
        @click="showPassword = !showPassword"
      >
        <i :class="showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'" aria-hidden="true"></i>
      </button>
    </div>
    <p v-if="error" :id="`${id}-error`" class="field__error">{{ error }}</p>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: 100%;
}

.field__label {
  font-size: var(--fs-body-1);
  line-height: normal;
  color: var(--text-body);
}

.field__box {
  position: relative;
  display: flex;
  align-items: center;
}

.field__input {
  width: 100%;
  height: 44px;
  padding: 0 var(--space-12);
  border: 1px solid var(--brand-secondary);
  border-radius: 12px;
  background: var(--bg-surface);
  font: inherit;
  font-size: var(--fs-body-2);
  color: var(--text-body);
  outline: none;
  transition: border-color 0.2s;
}

.field__input::placeholder {
  color: var(--text-placeholder);
}

.field__input:hover {
  border-color: var(--brand-primary-border);
}

.field__input:focus {
  border-color: var(--brand-primary);
}

/* 密碼欄右側留位置給眼睛按鈕 */
.field__input.has-toggle {
  padding-right: 52px;
}

.field__toggle {
  position: absolute;
  right: var(--space-16);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--text-secondary);
}

.has-error .field__input {
  border-color: var(--status-error);
}

.field__error {
  font-size: var(--fs-caption-2);
  line-height: normal;
  color: var(--text-danger);
}
</style>
