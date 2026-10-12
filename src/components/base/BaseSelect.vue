<script setup>
// Figma Form/Select、Form/Date：標題＋下拉選單（或日期）＋錯誤訊息
//   <BaseSelect v-model="people" label="人數" :options="[{ value: 1, label: '1 人' }]" :error="errors.people" />
//   <BaseSelect v-model="date" label="日期" type="date" />
import { computed, useId } from 'vue'

const model = defineModel({ type: [String, Number], default: '' })

defineProps({
  label: String,
  type: {
    type: String,
    default: 'select',
    validator: (v) => ['select', 'date'].includes(v),
  },
  options: {
    type: Array,
    default: () => [],
  },
  placeholder: {
    type: String,
    default: '請選擇',
  },
  min: String,
  error: String,
})

const id = useId()

const dateText = computed(() => {
  if (!model.value) return ''
  const [year, month, day] = String(model.value).split('-')
  return year && month && day ? `${year} / ${month} / ${day}` : String(model.value)
})
</script>

<template>
  <div class="select-field" :class="{ 'has-error': error }">
    <label v-if="label" :for="id" class="select-field__label">{{ label }}</label>
    <div class="select-field__box">
      <input
        v-if="type === 'date'"
        :id="id"
        v-model="model"
        type="date"
        class="select-field__control"
        :class="{ 'is-empty': !model }"
        :min="min"
        :aria-invalid="!!error"
      />
      <span v-if="type === 'date'" class="select-field__date-value" :class="{ 'is-placeholder': !model }">
        {{ dateText || placeholder }}
      </span>
      <i v-if="type === 'date'" class="select-field__date-icon fa-regular fa-calendar" aria-hidden="true"></i>
      <select
        v-else
        :id="id"
        v-model="model"
        class="select-field__control"
        :class="{ 'is-empty': model === '' }"
        :aria-invalid="!!error"
      >
        <option value="" disabled>{{ placeholder }}</option>
        <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
      <i v-if="type !== 'date'" class="select-field__icon fa-solid fa-chevron-down" aria-hidden="true"></i>
    </div>
    <p v-if="error" class="select-field__error">{{ error }}</p>
  </div>
</template>

<style scoped>
.select-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.select-field__label {
  font-size: var(--fs-body-2);
  line-height: normal;
  color: var(--text-body);
}

.select-field__box {
  position: relative;
}

.select-field__control {
  width: 100%;
  height: 44px;
  padding: 0 40px 0 var(--space-12);
  border: 1px solid var(--brand-primary-border);
  border-radius: 12px;
  /* 來點煮意空狀態的欄位沿用頁面底色，不使用白色填滿。 */
  background: transparent;
  font: inherit;
  font-size: var(--fs-body-2);
  color: var(--text-body);
  appearance: none;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
}

.select-field__control.is-empty {
  color: var(--text-placeholder);
}

/* 日期欄位保留瀏覽器原生日期選擇器。先前把日曆按鈕撐滿整個輸入框，
   Chrome 在部分桌機版會多開一個空白的選擇器外框。 */
.select-field__control[type='date'] {
  appearance: auto;
  -webkit-appearance: auto;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

/* 日期由同一個顯示層統一呈現，避免 Chrome 的 yyyy/mm/dd 與提示文字重疊。 */
.select-field__control[type='date']::-webkit-calendar-picker-indicator {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.select-field__control:hover {
  border-color: var(--brand-primary);
}

.select-field__control:focus-visible {
  border-color: var(--brand-primary);
  outline: 2px solid var(--brand-special);
  outline-offset: 1px;
}

.select-field__icon {
  position: absolute;
  top: 50%;
  right: var(--space-12);
  transform: translateY(-50%);
  font-size: 14px;
  color: var(--text-secondary);
  pointer-events: none;
}

.select-field__date-value {
  position: absolute;
  top: 50%;
  left: var(--space-12);
  right: 40px;
  transform: translateY(-50%);
  font-size: var(--fs-body-2);
  color: var(--text-body);
  white-space: nowrap;
  pointer-events: none;
}

.select-field__date-value.is-placeholder {
  color: var(--text-placeholder);
}

.select-field__date-icon {
  position: absolute;
  top: 50%;
  right: var(--space-12);
  transform: translateY(-50%);
  color: var(--text-secondary);
  font-size: 17px;
  pointer-events: none;
}

.has-error .select-field__control {
  border-color: var(--status-error);
}

.select-field__error {
  font-size: var(--fs-caption-2);
  line-height: normal;
  color: var(--text-danger);
}
</style>
