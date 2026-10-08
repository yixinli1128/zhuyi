<script setup>
// Figma toggle/on、toggle/off（帳號設定的通知開關）：44×24 膠囊開關
//   <BaseSwitch v-model="enabled" label="即期食材提醒" />
//   label 給螢幕閱讀器用，畫面上的文字自己排
const model = defineModel({ type: Boolean, default: false })

defineProps({
  label: String,
})
</script>

<template>
  <button
    type="button"
    role="switch"
    class="switch"
    :class="{ 'is-on': model }"
    :aria-checked="model"
    :aria-label="label"
    @click="model = !model"
  >
    <span class="switch__knob" aria-hidden="true"></span>
  </button>
</template>

<style scoped>
.switch {
  position: relative;
  flex-shrink: 0;
  width: 44px;
  height: 24px;
  border-radius: 999px;
  background: var(--brand-secondary);
  transition: background-color 0.2s;
}

.switch.is-on {
  background: var(--brand-primary);
}

.switch__knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--bg-surface);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s;
}

.switch.is-on .switch__knob {
  transform: translateX(20px);
}

.switch:focus-visible {
  outline: 2px solid var(--brand-special);
  outline-offset: 2px;
}
</style>
