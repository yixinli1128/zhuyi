<script setup>
// Figma「為什麼推薦這桌？」：說明這次配餐依據（家庭、臨時需求、冰箱）
defineProps({
  reasons: {
    type: Array, // [{ label, title, description, tag }]
    required: true,
  },
})
</script>

<template>
  <section class="reasons" aria-labelledby="reasons-title">
    <header class="reasons__header">
      <div>
        <h3 id="reasons-title" class="reasons__title">為什麼推薦這桌？</h3>
        <p class="reasons__desc">煮意已依這次的家庭設定與冰箱條件完成配餐。</p>
      </div>
      <span class="reasons__tag">本次配餐依據</span>
    </header>

    <ul class="reasons__list">
      <li v-for="reason in reasons" :key="reason.label" class="reason">
        <p class="reason__label"><i class="fa-solid fa-check" aria-hidden="true"></i>{{ reason.label }}</p>
        <p class="reason__title">{{ reason.title }}</p>
        <p class="reason__desc">{{ reason.description }}</p>
        <span class="reason__tag">{{ reason.tag }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.reasons {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
  padding: var(--space-20);
  border: 1px solid var(--brand-primary-border);
  border-radius: 4px;
  background: var(--brand-secondary-light);
}

.reasons__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-12);
}

.reasons__title {
  font-size: var(--fs-subtitle-2);
  font-weight: 400;
  line-height: normal;
  color: var(--text-title);
}

.reasons__desc {
  font-size: var(--fs-caption-2);
  color: var(--text-secondary);
}

.reasons__tag,
.reason__tag {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--brand-secondary);
  font-size: var(--fs-caption-2);
  line-height: normal;
  color: var(--text-body);
}

.reasons__list {
  display: grid;
  gap: var(--space-16);
  padding: 0;
  list-style: none;
}

.reason {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-8);
  padding: var(--space-20);
  border: 1px solid var(--brand-secondary);
  border-radius: 4px;
  background: var(--bg-surface);
  line-height: normal;
}

.reason__label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-caption-2);
  color: var(--text-success);
}

.reason__title {
  font-size: var(--fs-subtitle-2);
  color: var(--text-title);
}

.reason__desc {
  font-size: var(--fs-caption-2);
  line-height: 1.5;
  color: var(--text-secondary);
}

@media (min-width: 1024px) {
  .reasons__list {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
