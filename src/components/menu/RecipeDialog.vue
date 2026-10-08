<script setup>
// Figma menu/recipeReview：查看食譜彈窗，食材份量依這次用餐的人份換算
import { computed } from 'vue'
import { formatAmount } from '@/utils/amount'
import BaseDialog from '@/components/base/BaseDialog.vue'
import RecipeMeta from './RecipeMeta.vue'

const open = defineModel('open', { type: Boolean, default: false })

const props = defineProps({
  recipe: Object,
  servings: {
    type: Number,
    default: 0, // 0 = 用食譜原本的人份
  },
})

const people = computed(() => props.servings || props.recipe?.servings || 1)

// 依食材分組：主要食材、調味料…
const groups = computed(() => {
  if (!props.recipe) return []
  const ratio = people.value / props.recipe.servings
  const map = new Map()
  props.recipe.ingredients.forEach((item) => {
    if (!map.has(item.group)) map.set(item.group, [])
    map.get(item.group).push({ ...item, display: formatAmount(item, ratio) })
  })
  return [...map].map(([name, items]) => ({ name, items }))
})
</script>

<template>
  <BaseDialog v-model:open="open" :title="recipe?.name ?? ''" :width="840">
    <template v-if="recipe">
      <div class="recipe-top">
        <img v-if="recipe.imageUrl" :src="recipe.imageUrl" :alt="recipe.imageAlt" class="recipe-top__image" />
        <div class="recipe-top__info">
          <p class="recipe-top__servings">
            <i class="fa-solid fa-user-group" aria-hidden="true"></i>{{ people }} 人份
            <span v-if="people !== recipe.servings" class="recipe-top__hint">（原食譜 {{ recipe.servings }} 人份，已換算）</span>
          </p>
          <RecipeMeta :minutes="recipe.cookTime" :kcal="recipe.kcal" class="recipe-top__meta" />
          <p class="recipe-top__intro">{{ recipe.intro }}</p>
          <p v-if="recipe.tip" class="recipe-top__tip"><strong>小撇步</strong>{{ recipe.tip }}</p>
        </div>
      </div>

      <div class="recipe-columns">
        <section>
          <header class="recipe-section__head">
            <h3>食材清單</h3>
            <span>共 {{ recipe.ingredients.length }} 項</span>
          </header>
          <div v-for="group in groups" :key="group.name" class="ingredient-group">
            <p class="ingredient-group__name">{{ group.name }}</p>
            <ul class="ingredient-table">
              <li v-for="item in group.items" :key="item.no">
                <span>{{ item.name }}</span>
                <span class="ingredient-table__amount">{{ item.display }}</span>
              </li>
            </ul>
          </div>
        </section>

        <section>
          <header class="recipe-section__head">
            <h3>料理步驟說明</h3>
            <span>共 {{ recipe.steps.length }} 步驟</span>
          </header>
          <ol class="steps">
            <li v-for="step in recipe.steps" :key="step.no">
              <details class="step">
                <summary class="step__summary">
                  <span class="step__no">{{ step.no }}</span>
                  <span class="step__title">{{ step.title }}</span>
                  <span class="step__minutes">{{ step.minutes }} 分鐘</span>
                </summary>
                <p class="step__desc">{{ step.desc }}</p>
                <p v-if="step.keyTip" class="step__tip">{{ step.keyTip }}</p>
              </details>
            </li>
          </ol>
          <p class="steps__hint">點步驟可展開做法說明</p>
        </section>
      </div>
    </template>
  </BaseDialog>
</template>

<style scoped>
.recipe-top {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.recipe-top__image {
  width: 100%;
  aspect-ratio: 353 / 180;
  object-fit: cover;
  border-radius: 4px;
}

.recipe-top__info {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  line-height: normal;
}

.recipe-top__servings {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-body-1);
  color: var(--text-body);
}

.recipe-top__hint {
  font-size: var(--fs-caption-2);
  color: var(--text-secondary);
}

.recipe-top__meta {
  font-size: var(--fs-body-2);
}

.recipe-top__intro,
.recipe-top__tip {
  font-size: var(--fs-body-2);
  line-height: 1.6;
  color: var(--text-secondary);
}

.recipe-top__tip strong {
  margin-right: var(--space-8);
  font-weight: 400;
  color: var(--text-special);
}

.recipe-columns {
  display: grid;
  gap: var(--space-24);
  margin-top: var(--space-12);
}

.recipe-section__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: var(--space-8);
  margin-bottom: var(--space-16);
  border-bottom: 1px solid var(--text-body);
}

.recipe-section__head h3 {
  font-size: var(--fs-subtitle-2);
  font-weight: 400;
  color: var(--text-title);
}

.recipe-section__head span {
  font-size: var(--fs-caption-2);
  color: var(--text-secondary);
}

.ingredient-group + .ingredient-group {
  margin-top: var(--space-20);
}

.ingredient-group__name {
  margin-bottom: var(--space-8);
  font-size: var(--fs-body-2);
  color: var(--text-secondary);
}

.ingredient-table {
  padding: 0;
  list-style: none;
  border: 1px solid var(--brand-primary-border);
  border-radius: 8px;
  overflow: hidden;
}

.ingredient-table li {
  display: flex;
  justify-content: space-between;
  gap: var(--space-12);
  padding: 8px var(--space-12);
  font-size: var(--fs-body-2);
  line-height: normal;
  color: var(--text-body);
}

.ingredient-table li + li {
  border-top: 1px solid var(--brand-primary-border);
}

.ingredient-table__amount {
  text-align: right;
  color: var(--text-secondary);
}

.steps {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
  padding: 0;
  list-style: none;
}

.step {
  border: 1px solid var(--brand-primary-border);
  border-radius: 8px;
}

.step__summary {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  padding: var(--space-16);
  list-style: none;
  cursor: pointer;
  font-size: var(--fs-body-2);
  color: var(--text-body);
}

.step__summary::-webkit-details-marker {
  display: none;
}

.step__no {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--brand-primary);
  font-size: var(--fs-caption-2);
  color: var(--text-on-primary);
}

.step__title {
  flex: 1;
}

.step__minutes {
  flex-shrink: 0;
  color: var(--text-secondary);
}

.step__desc,
.step__tip {
  padding: 0 var(--space-16) var(--space-12) 44px;
  font-size: var(--fs-caption-2);
  line-height: 1.6;
  color: var(--text-secondary);
}

.step__tip {
  color: var(--text-special);
}

.steps__hint {
  margin-top: var(--space-8);
  font-size: var(--fs-caption-2);
  color: var(--text-placeholder);
}

@media (min-width: 768px) {
  .recipe-top {
    flex-direction: row;
    align-items: flex-start;
    gap: var(--space-28);
  }

  .recipe-top__image {
    width: 353px;
    flex-shrink: 0;
  }

  .recipe-columns {
    grid-template-columns: 1fr 1fr;
    gap: var(--space-28);
  }
}
</style>
