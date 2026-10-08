<script setup>
// 設定卡片裡的一組選項：左邊標題、右邊「可複選／單選」提示，下方放膠囊
defineProps({
  title: {
    type: String,
    required: true,
  },
  hint: String,
})
</script>

<template>
  <fieldset class="option-group">
    <legend class="option-group__head">
      <span class="option-group__title">{{ title }}</span>
      <span v-if="hint" class="option-group__hint">{{ hint }}</span>
    </legend>
    <div class="option-group__body">
      <slot />
    </div>
  </fieldset>
</template>

<style scoped>
.option-group {
  min-width: 0;
  padding: 0;
  border: 0;
}

.option-group__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  width: 100%;
  padding: 0;
  margin-bottom: var(--space-8);
  line-height: normal;
}

.option-group__title {
  font-size: var(--fs-body-2);
  color: var(--text-body);
}

.option-group__hint {
  font-size: 10px;
  color: var(--text-secondary);
}

.option-group__body {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8);
}
</style>
