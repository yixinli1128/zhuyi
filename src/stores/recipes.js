import { computed } from 'vue'
import { defineStore } from 'pinia'
import recipeData from '@/data/recipes.json'

// 菜色照片：抓 zhuyi-img 底下所有「菜色」資料夾的圖，用檔名對應 recipes.json 的 image 欄位
// （圖片換資料夾也找得到，只要資料夾名稱還是「菜色」、檔名跟菜名一樣）
const imageFiles = import.meta.glob('../assets/zhuyi-img/**/菜色/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
})
const imageByName = Object.fromEntries(
  Object.entries(imageFiles).map(([path, url]) => [path.split('/').pop(), url]),
)

// 食譜：固定參考資料，直接讀 JSON，不會被使用者修改
export const useRecipeStore = defineStore('recipes', () => {
  const recipes = recipeData.map((recipe) => ({
    ...recipe,
    imageUrl: imageByName[recipe.image] ?? '',
  }))

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
