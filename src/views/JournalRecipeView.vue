<script setup>
// 餐食日誌的料理明細：從已排定餐單進來時，以該餐份數換算食材。
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageTitle from '@/components/layout/PageTitle.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import { useMealPlanStore } from '@/stores/mealPlans'
import { useRecipeStore } from '@/stores/recipes'
import { formatAmount } from '@/utils/amount'

const route = useRoute()
const router = useRouter()
const recipes = useRecipeStore()
const mealPlans = useMealPlanStore()

const recipe = computed(() => recipes.getRecipe(route.params.recipeId))
const plan = computed(() => typeof route.query.planId === 'string'
  ? mealPlans.plans.find((item) => item.id === route.query.planId) ?? null
  : null)
const servings = computed(() => plan.value?.servings ?? recipe.value?.servings ?? 1)
const ingredients = computed(() => recipe.value ? recipes.scaleIngredients(recipe.value.id, servings.value) : [])

function backToJournal() {
  router.push({ path: '/journal', query: route.query.date ? { date: route.query.date } : {} })
}
</script>

<template>
  <section v-if="recipe" class="page recipe-page">
    <PageTitle :title="`食譜步驟・${recipe.name}`" description="從食材準備到料理完成的清楚步驟指引，享受從容舒心的下廚時光。">
      <template #actions><BaseButton icon="fa-solid fa-arrow-left" @click="backToJournal">返回餐食日誌</BaseButton></template>
    </PageTitle>

    <main class="recipe-layout">
      <section class="recipe-steps">
        <header class="recipe-banner">
          <h2>烹飪指引與步驟（共 {{ recipe.steps.length }} 步）</h2>
          <div><span><i class="fa-regular fa-user"></i>{{ servings }} 人份</span><span><i class="fa-regular fa-clock"></i>約 {{ recipe.cookTime }} 分鐘</span></div>
        </header>
        <article v-for="step in recipe.steps" :key="step.no" class="step-card">
          <span class="step-card__number">{{ step.no }}</span>
          <div><p class="step-card__tag">{{ step.tag }}</p><h2>{{ step.title }}</h2><p>{{ step.desc }}</p><small v-if="step.keyTip">小提醒：{{ step.keyTip }}</small></div>
        </article>
      </section>

      <aside class="recipe-side">
        <section class="recipe-overview">
          <img v-if="recipe.imageUrl" :src="recipe.imageUrl" :alt="recipe.imageAlt || recipe.name" />
          <div><p>本次晚餐</p><h2>{{ recipe.name }}</h2><span>{{ recipe.intro }}</span></div>
        </section>
        <section class="ingredient-card">
          <header><h2>食材準備</h2><span>{{ servings }} 人份用量</span></header>
          <ul><li v-for="item in ingredients" :key="`${item.no}-${item.name}`"><span>{{ item.name }}</span><b>{{ formatAmount(item, servings / recipe.servings) }}</b></li></ul>
        </section>
      </aside>
    </main>
  </section>
  <section v-else class="page recipe-not-found"><PageTitle title="找不到這道料理" description="這道料理可能已不在目前的資料庫中。" /><BaseButton @click="backToJournal">返回餐食日誌</BaseButton></section>
</template>

<style scoped>
.page { padding: var(--page-padding-y) var(--page-padding-x); }
.recipe-layout { display: grid; grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr); gap: 40px; padding: 20px 40px 88px; }
.recipe-steps { display: grid; align-content: start; gap: 12px; }.recipe-banner { display: flex; min-height: 64px; align-items: center; justify-content: space-between; padding: 16px 20px; border: 1px solid var(--brand-secondary); border-radius: 12px 0 12px; }.recipe-banner h2 { color: var(--text-title); font-size: 20px; font-weight: 500; }.recipe-banner div { display: flex; gap: 14px; color: var(--text-secondary); font-size: 13px; }.recipe-banner span { display: inline-flex; align-items: center; gap: 6px; }.recipe-banner i { color: var(--brand-primary); }
.step-card { display: grid; grid-template-columns: 44px 1fr; gap: 16px; min-height: 134px; padding: 18px 20px; border: 1px solid var(--brand-secondary); border-radius: 12px 0 12px; }.step-card__number { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 50%; background: var(--brand-secondary-light); color: var(--brand-primary); font-size: 16px; }.step-card__tag { color: var(--brand-primary); font-size: 11px; }.step-card h2 { margin: 2px 0 7px; color: var(--text-title); font-size: 18px; font-weight: 500; }.step-card div > p:not(.step-card__tag) { color: var(--text-secondary); font-size: 13px; line-height: 1.6; }.step-card small { display: block; margin-top: 8px; color: var(--text-placeholder); font-size: 11px; }
.recipe-side { display: grid; align-content: start; gap: 20px; }.recipe-overview, .ingredient-card { overflow: hidden; border: 1px solid var(--brand-secondary); border-radius: 12px 0 12px; background: var(--bg-surface); }.recipe-overview { min-height: 328px; }.recipe-overview img { display: block; width: 100%; height: 174px; object-fit: cover; }.recipe-overview div { padding: 15px 18px; }.recipe-overview p, .recipe-overview span { color: var(--text-placeholder); font-size: 11px; line-height: 1.55; }.recipe-overview h2 { margin: 3px 0 6px; color: var(--text-title); font-size: 20px; font-weight: 500; }.ingredient-card { min-height: 300px; padding: 18px; }.ingredient-card header { display: flex; align-items: baseline; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--brand-secondary); }.ingredient-card h2 { color: var(--text-title); font-size: 20px; font-weight: 500; }.ingredient-card header span { color: var(--text-placeholder); font-size: 11px; }.ingredient-card ul { margin: 0; padding: 0; list-style: none; }.ingredient-card li { display: flex; justify-content: space-between; gap: 16px; padding: 11px 0; border-bottom: 1px solid var(--brand-secondary); color: var(--text-body); font-size: 14px; }.ingredient-card b { color: var(--text-secondary); font-weight: 400; white-space: nowrap; }
.recipe-not-found { display: grid; gap: 24px; place-items: start; }
@media (max-width: 900px) { .recipe-layout { grid-template-columns: 1fr; padding: 24px 16px 60px; }.recipe-banner { align-items: flex-start; flex-direction: column; }.recipe-overview { min-height: 0; } }
</style>
