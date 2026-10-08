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
  border-radius: 4px;
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

@media (min-width: 1024px) {
  .recipe-card__name {
    font-size: var(--fs-subtitle-1);
  }
}
</style>
