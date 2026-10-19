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

// 新增的食譜若沒填 group，依湯品／肉類／蛋類／蔬菜類推斷，更換菜色才能只列同類型。
// 湯一律歸「湯品類」：試算表裡有幾道寫成「湯品」，不統一的話換湯時會被分成兩組。
function inferGroup(recipe) {
  if (recipe.type === 'soup') return '湯品類'
  if (recipe.group) return recipe.group
  if ((recipe.categories ?? []).some((category) => ['雞肉', '豬肉', '牛肉', '海鮮'].includes(category))) return '肉類'
  if (recipe.name.includes('蛋')) return '蛋類'
  return '蔬菜類'
}

// 食譜：固定參考資料，直接讀 JSON，不會被使用者修改
export const useRecipeStore = defineStore('recipes', () => {
  const recipes = recipeData.map((recipe) => ({
    ...recipe,
    group: inferGroup(recipe),
    // image 欄位空白時（例如後來新增的食譜），改用「菜名.副檔名」找同名照片。
    imageUrl: imageByName[recipe.image]
      ?? ['png', 'jpg', 'jpeg', 'webp'].map((ext) => imageByName[`${recipe.name}.${ext}`]).find(Boolean)
      ?? '',
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
