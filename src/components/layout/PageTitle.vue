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
      <h1 class="page-title__heading"><slot name="title">{{ title }}</slot></h1>
      <p v-if="description" class="page-title__desc">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="page-title__actions">
      <slot name="actions" />
    </div>
    <!-- 無操作鈕時仍保留同一個右側槽位，避免標題列因頁面不同而改變比例。 -->
    <div v-else class="page-title__actions page-title__actions--empty" aria-hidden="true"></div>
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

/* 非桌機（手機＋平板）共用同一個頁首結構，避免 navbar 已改成行動版、
   標題卻仍維持不同的桌機式排列。 */
@media (max-width: 1024px) {
  .page-title {
    align-items: flex-start;
    row-gap: var(--space-12);
    padding: var(--space-28) var(--space-20) 24px;
  }

  .page-title__text {
    /* 讓標題、操作、說明成為同一個手機頁首的三個區塊。 */
    display: contents;
  }

  .page-title__heading {
    flex: 1 1 0;
    min-width: 0;
    order: 1;
  }

  .page-title__desc {
    flex: 0 0 100%;
    order: 3;
  }

  /* 行動版不讓頁面操作鈕與長標題硬擠在同一列。 */
  .page-title__actions {
    width: auto;
    flex: 0 0 auto;
    order: 2;
  }

  /* 所有主要頁面的行動版標題基準。各頁不再各自放大或縮小。 */
  .page-title__heading {
    font-size: 26px;
    line-height: 1.2;
    letter-spacing: .08em;
  }

  .page-title__desc {
    font-size: 14px;
    line-height: 1.45;
  }
}

/* 平板採中等密度，不沿用桌機 60px 頁首留白。 */
@media (min-width: 641px) and (max-width: 1024px) {
  .page-title {
    row-gap: var(--space-16);
    padding: 36px 28px 28px;
  }

  .page-title__text {
    gap: var(--space-8);
  }

  .page-title__desc {
    font-size: 14px;
  }

  .page-title__actions--empty {
    /* 與常見的雙項檢視切換器同寬；只保留版面槽位，不顯示控制項。 */
    min-width: 88px;
    min-height: 36px;
  }
}

@media (max-width: 640px) {
  /* 標題字級跟著螢幕寬度變化（約 21–26px），402px 這類寬度不會因為突然跳到 26px
     而被右側按鈕擠到換行。 */
  .page-title__heading {
    font-size: clamp(20px, 5.8vw, 26px);
    letter-spacing: .04em;
  }

  .page-title__actions--empty {
    /* 行動版保留與右側 icon 操作同寬的空白槽位。 */
    min-width: 36px;
    min-height: 36px;
  }
}

/* 393px 等小螢幕（如 iPhone 16 的 CSS 可視寬度）再收緊上下留白與說明行距。 */
@media (max-width: 400px) {
  .page-title {
    row-gap: 10px;
    padding: 24px 16px 20px;
  }

  .page-title__heading {
    line-height: 1.25;
  }

  .page-title__desc {
    font-size: 14px;
    line-height: 1.55;
  }

  .page-title__actions--empty {
    min-width: 32px;
    min-height: 32px;
  }
}

/* 所有桌面頁面統一採家庭管理頁的主標題比例。 */
@media (min-width: 1025px) {
  .page-title {
    padding: 48px 32px 33px;
  }

  .page-title__heading {
    font-size: 29px;
  }

  .page-title__text {
    gap: 10px;
  }

  .page-title__desc {
    font-size: 14px;
  }
}
</style>
