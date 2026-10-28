<script setup>
// Figma menu/RecipeCard/mc：菜色照片、名稱、時間熱量、主要食材，下方「更換菜色」「查看食譜」
import BaseButton from '@/components/base/BaseButton.vue'
import RecipeMeta from './RecipeMeta.vue'

defineProps({
  recipe: {
    type: Object,
    required: true,
  },
  fridgeItems: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['swap', 'view'])
</script>

<template>
  <article class="recipe-card">
    <div class="recipe-card__image">
      <img v-if="recipe.imageUrl" :src="recipe.imageUrl" :alt="recipe.imageAlt" loading="lazy" />
      <span v-if="recipe.type === 'soup'" class="recipe-card__badge">湯品</span>
    </div>

    <div class="recipe-card__body">
      <h3 class="recipe-card__name">{{ recipe.name }}</h3>
      <RecipeMeta :minutes="recipe.cookTime" :kcal="recipe.kcal" />

      <div class="recipe-card__ingredients">
        <p class="recipe-card__label">主要食材：</p>
        <p>{{ recipe.mainIngredients.join('、') }}</p>
        <p v-if="fridgeItems.length" class="recipe-card__fridge">
          <i class="fa-solid fa-snowflake" aria-hidden="true"></i>
          冰箱現有：{{ fridgeItems.map((item) => item.name).join('、') }}
        </p>
      </div>

      <div class="recipe-card__actions">
        <BaseButton variant="secondary" @click="$emit('swap')">更換菜色</BaseButton>
        <BaseButton @click="$emit('view')">查看食譜</BaseButton>
      </div>
    </div>
  </article>
</template>

<style scoped>
.recipe-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--brand-secondary);
  border-radius: 12px 0 12px 0;
  background: var(--bg-surface);
  overflow: hidden;
}

.recipe-card__image {
  position: relative;
  aspect-ratio: 440 / 245;
  background: var(--brand-secondary-light);
}

.recipe-card__image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.recipe-card__badge {
  position: absolute;
  top: var(--space-12);
  left: var(--space-12);
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  font-size: var(--fs-caption-2);
  color: var(--text-body);
}

.recipe-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
  padding: var(--space-20);
}

.recipe-card__name {
  font-size: var(--fs-subtitle-2);
  font-weight: 400;
  line-height: normal;
  color: var(--text-title);
}

.recipe-card__ingredients {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  font-size: var(--fs-body-2);
  line-height: normal;
  color: var(--text-secondary);
}

.recipe-card__label {
  color: var(--text-body);
}

.recipe-card__fridge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-caption-2);
  color: var(--text-success);
}

.recipe-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-8);
  margin-top: auto;
}

@media (min-width: 1025px) {
  .recipe-card__name {
    font-size: var(--fs-subtitle-1);
  }
}

/* 平板與窄桌機在欄數變少時，也同步收斂卡片內的視覺比例。 */
@media (min-width: 641px) and (max-width: 1024px) {
  .recipe-card__badge { top: 10px; left: 10px; padding: 2px 8px; font-size: 14px; }
  .recipe-card__body { gap: 10px; padding: 14px; }
  .recipe-card__name { font-size: 16px; }
  .recipe-card__ingredients { gap: 6px; font-size: 14px; }
  .recipe-card__actions { gap: 6px; }
  .recipe-card__actions :deep(.btn) { min-height: 34px; padding: 6px 8px; font-size: 14px; }
}

@media (min-width: 1025px) and (max-width: 1279px) {
  .recipe-card__badge { top: 10px; left: 10px; padding: 2px 8px; font-size: 14px; }
  .recipe-card__body { gap: 12px; padding: 16px; }
  .recipe-card__name { font-size: 17px; }
  .recipe-card__ingredients { gap: 6px; font-size: 14px; }
  .recipe-card__actions { gap: 6px; }
  .recipe-card__actions :deep(.btn) { min-height: 35px; padding: 6px 9px; font-size: 14px; }
}

@media (max-width: 640px) {
  /* 兩欄餐單卡改用較高的 3:2 圖片，菜色辨識更清楚。 */
  .recipe-card__image { aspect-ratio: 3 / 2; }
  .recipe-card__badge { top: 8px; left: 8px; padding: 2px 6px; font-size: 14px; }
  .recipe-card__body { gap: 8px; padding: 10px; }
  .recipe-card__name { font-size: 14px; line-height: 1.3; }
  .recipe-card__ingredients { gap: 4px; font-size: 14px; line-height: 1.35; }
  /* 手機版主要食材固定兩行，放不下的以「…」省略，每張卡的高度才會一致。 */
  .recipe-card__ingredients p:not(.recipe-card__label):not(.recipe-card__fridge) {
    display: -webkit-box;
    height: calc(2em * 1.35);
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }
  .recipe-card__fridge { gap: 4px; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
  /* 兩欄餐單卡的時間／熱量必須同列，字級與 icon 同步縮小。 */
  /* 手機版時間／熱量縮成 12px、省略「／份」，讓兩項留在同一列；
     真的太窄時熱量換到下一行，不會被切掉。 */
  .recipe-card :deep(.recipe-meta) { flex-wrap: wrap; gap: 2px 6px; font-size: 12px; letter-spacing: 0; white-space: nowrap; }
  .recipe-card :deep(.recipe-meta span) { gap: 2px; }
  .recipe-card :deep(.recipe-meta i) { font-size: 10px; }
  .recipe-card :deep(.recipe-meta__unit) { display: none; }
  /* 兩個操作同列，避免窄版餐單卡因直排按鈕變得又高又窄。 */
  .recipe-card__actions { flex-direction: row; gap: 5px; }
  .recipe-card__actions :deep(.btn) { width: auto; min-width: 0; flex: 1; min-height: 32px; padding: 5px 4px; font-size: 14px; white-space: nowrap; }
}
</style>
