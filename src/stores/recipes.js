import { computed } from 'vue'
import { defineStore } from 'pinia'
import recipeData from '@/data/recipes.json'

// 食譜：固定參考資料，直接讀 JSON，不會被使用者修改
export const useRecipeStore = defineStore('recipes', () => {
  const recipes = recipeData

  const byId = computed(() => Object.fromEntries(recipes.map((r) => [r.id, r])))

  function getRecipe(id) {
    return byId.value[id] ?? null
  }

  // 依用餐人數換算食材份量（qty 為 null 的項目保持原文字）
  function scaleIngredients(id, servings) {
    const recipe = getRecipe(id)
    if (!recipe) return []
    const ratio = servings / recipe.servings
    return recipe.ingredients.map((item) => ({
      ...item,
      qty: item.qty == null ? null : Math.round(item.qty * ratio * 10) / 10,
    }))
  }

  return { recipes, getRecipe, scaleIngredients }
})
