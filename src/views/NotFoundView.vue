<template>
  <section class="page">
    <h1 class="page__title">找不到這個頁面</h1>
    <RouterLink to="/" class="page__link">回到首頁</RouterLink>
  </section>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-24);
  padding: var(--page-padding-y) var(--page-padding-x);
}

.page__title {
  font-size: var(--fs-h2);
  font-weight: 700;
  color: var(--text-title);
}

.page__link {
  color: var(--brand-primary);
  text-decoration: underline;
}
</style>
