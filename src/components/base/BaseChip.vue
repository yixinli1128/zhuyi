<script setup>
// Figma 選項小膠囊（本次訪客的忌口、本次用餐需求的今天想吃…）：點一下選取／取消
//   <BaseChip :selected="list.includes('牛肉')" @click="toggle('牛肉')">牛肉</BaseChip>
//   removable：右側多一個 ✕（自己新增的忌口）
defineProps({
  selected: Boolean,
  removable: Boolean,
})

defineEmits(['click'])
</script>

<template>
  <button type="button" class="chip" :class="{ 'is-selected': selected }" :aria-pressed="selected" @click="$emit('click')">
    <slot />
    <i v-if="removable" class="fa-solid fa-xmark chip__remove" aria-hidden="true"></i>
  </button>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-4);
  padding: 4px 10px;
  border: 1px solid var(--brand-primary-border);
  border-radius: 999px;
  background: var(--bg-surface);
  font-size: var(--fs-caption-2);
  line-height: 18px;
  color: var(--text-body);
  transition:
    background-color 0.2s,
    border-color 0.2s;
}

.chip:hover {
  background: var(--brand-secondary-light);
}

.chip.is-selected {
  background: var(--brand-secondary);
  border-color: var(--brand-primary);
  color: var(--text-title);
}

.chip:focus-visible {
  outline: 2px solid var(--brand-special);
  outline-offset: 2px;
}

.chip__remove {
  font-size: 10px;
}
</style>
