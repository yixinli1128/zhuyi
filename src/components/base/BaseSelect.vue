<script setup>
// Figma Form/Select、Form/Date：標題＋下拉選單（或日期）＋錯誤訊息
//   <BaseSelect v-model="people" label="人數" :options="[{ value: 1, label: '1 人' }]" :error="errors.people" />
//   <BaseSelect v-model="date" label="日期" type="date" />
import { useId } from 'vue'

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
      <i
        :class="['select-field__icon', type === 'date' ? 'fa-regular fa-calendar' : 'fa-solid fa-chevron-down']"
        aria-hidden="true"
      ></i>
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
  background: var(--bg-surface);
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

.select-field__control:hover {
  border-color: var(--brand-primary);
}

.select-field__control:focus-visible {
  border-color: var(--brand-primary);
  outline: 2px solid var(--brand-special);
  outline-offset: 1px;
}

/* 用自己的圖示取代瀏覽器的日曆按鈕，但整格點了都能開日曆 */
.select-field__control::-webkit-calendar-picker-indicator {
  position: absolute;
  inset: 0;
  width: auto;
  height: auto;
  opacity: 0;
  cursor: pointer;
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

.has-error .select-field__control {
  border-color: var(--status-error);
}

.select-field__error {
  font-size: var(--fs-caption-2);
  line-height: normal;
  color: var(--text-danger);
}
</style>
