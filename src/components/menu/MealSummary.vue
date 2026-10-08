<script setup>
// Figma menu/meal-summary：本次餐單的四格摘要
defineProps({
  dishCount: { type: Number, default: 0 },
  soupCount: { type: Number, default: 0 },
  kcal: { type: Number, default: 0 },
  minutes: { type: Number, default: 0 },
  fridgeCount: { type: Number, default: 0 },
})
</script>

<template>
  <dl class="summary">
    <div class="summary__item">
      <dt>餐點組合</dt>
      <dd>{{ dishCount }} 菜 {{ soupCount }} 湯</dd>
    </div>
    <div class="summary__item">
      <dt>每人熱量</dt>
      <dd>約 {{ kcal }} kcal / 人</dd>
    </div>
    <div class="summary__item">
      <dt>預估備餐時間</dt>
      <dd>約 {{ minutes }} 分鐘</dd>
    </div>
    <div class="summary__item">
      <dt>庫存食材使用</dt>
      <dd>{{ fridgeCount }} 項</dd>
    </div>
  </dl>
</template>

<style scoped>
.summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  border-top: 1px solid var(--brand-primary-border);
  border-bottom: 1px solid var(--brand-primary-border);
}

.summary__item {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-16);
  line-height: normal;
}

/* 手機 2×2：中間的直線與橫線 */
.summary__item:nth-child(odd) {
  border-right: 1px solid var(--brand-secondary);
}

.summary__item:nth-child(-n + 2) {
  border-bottom: 1px solid var(--brand-secondary);
}

.summary dt {
  font-size: var(--fs-body-2);
  color: var(--text-secondary);
}

.summary dd {
  margin: 0;
  font-size: var(--fs-subtitle-2);
  color: var(--text-title);
  white-space: nowrap;
}

@media (min-width: 768px) {
  .summary {
    grid-template-columns: repeat(4, 1fr);
  }

  .summary__item {
    padding: var(--space-16) var(--space-20);
  }

  .summary__item:nth-child(-n + 2) {
    border-bottom: 0;
  }

  .summary__item:not(:last-child) {
    border-right: 1px solid var(--brand-secondary);
  }

  .summary dd {
    font-size: var(--fs-subtitle-1);
  }
}
</style>
