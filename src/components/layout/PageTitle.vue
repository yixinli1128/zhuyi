<script setup>
// Figma 元件「title」（1037:11303）：各頁頂部的大標題＋說明＋右側按鈕
//   <PageTitle title="..." description="...">
//     <template #actions><BaseButton>...</BaseButton></template>
//   </PageTitle>
defineProps({
  title: {
    type: String,
    required: true,
  },
  description: String,
})
</script>

<template>
  <header class="page-title">
    <div class="page-title__text">
      <h1 class="page-title__heading">{{ title }}</h1>
      <p v-if="description" class="page-title__desc">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="page-title__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
/* 空間不夠時按鈕自動換到下一行（Figma flex-wrap），手機版就會是標題在上、按鈕在下 */
.page-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  row-gap: var(--space-16);
  padding: var(--space-60) var(--space-40) 41px;
  border-bottom: 1px solid var(--brand-secondary);
}

.page-title__text {
  flex: 1 0 0;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
}

.page-title__heading {
  font-size: var(--fs-h2);
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.1em;
  color: var(--text-title);
}

.page-title__desc {
  font-size: var(--fs-body-1);
  line-height: normal;
  color: var(--text-secondary);
}

.page-title__actions {
  display: flex;
  flex-shrink: 0;
  gap: var(--space-12);
}
</style>
