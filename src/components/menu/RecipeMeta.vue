<script setup>
// 烹調時間＋熱量（Figma 料理卡片、更換菜色、食譜彈窗共用）
defineProps({
  minutes: { type: Number, required: true },
  kcal: { type: Number, required: true },
  divider: Boolean, // 中間加直線（更換菜色清單）
})
</script>

<template>
  <p class="recipe-meta">
    <span><i class="fa-regular fa-clock" aria-hidden="true"></i>{{ minutes }} 分鐘</span>
    <span v-if="divider" class="recipe-meta__divider" aria-hidden="true">|</span>
    <span><i class="fa-solid fa-fire-flame-curved" aria-hidden="true"></i>{{ kcal }} 大卡／份</span>
  </p>
</template>

<style scoped>
.recipe-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-16);
  font-size: var(--fs-caption-2);
  line-height: normal;
  color: var(--text-secondary);
}

.recipe-meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.recipe-meta i {
  font-size: 13px;
  color: var(--text-body);
}

.recipe-meta__divider {
  color: var(--brand-primary-border);
}
</style>
