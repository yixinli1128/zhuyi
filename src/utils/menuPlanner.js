// 來點煮意的配餐規則（假 AI）：先過濾不能吃的，再依今天的需求和冰箱庫存打分數挑菜
import dietTypes from '@/data/dietTypes.json'

// 本次用餐需求的選項（Figma：本次用餐需求-設定中）
export const WANT_OPTIONS = ['牛肉', '豬肉', '雞肉', '海鮮', '蔬菜']
export const FLAVOR_OPTIONS = ['清淡一點', '濃郁一點', '酸甜開胃', '鮮香順口']
export const TEXTURE_OPTIONS = ['不指定', '軟嫩好咬', '保留嚼勁', '酥脆有口感']
export const SPICY_LEVELS = ['不辣', '微辣', '小辣', '中辣', '大辣']

// 份量：乘在每人食量上
export const SIZE_OPTIONS = [
  { value: 'small', label: '少量', factor: 0.8 },
  { value: 'normal', label: '標準', factor: 1 },
  { value: 'large', label: '多量', factor: 1.2 },
]

export function emptyGuest() {
  return { allergens: [], avoid: [], dietTypes: [], spicy: null }
}

export function emptyNeeds() {
  return { wants: [], flavors: [], texture: '不指定', note: '' }
}

export function hasGuestSettings(guest) {
  return guest.allergens.length + guest.avoid.length + guest.dietTypes.length > 0 || guest.spicy != null
}

export function hasNeeds(needs) {
  return needs.wants.length + needs.flavors.length > 0 || needs.texture !== '不指定' || !!needs.note.trim()
}

// 人數沒選菜數時的建議：1–2 人 2 道、3–4 人 3 道、5 人以上 4 道
export function suggestDishCount(people) {
  if (people <= 2) return 2
  if (people <= 4) return 3
  return 4
}

// 忌口／過敏詞的對應：家人可能選類別（蛋類、海鮮），也可能直接寫食材（雞肉、蝦）
//   flag：對到 recipe.dietFlags；words：改用這些字比對食材名稱（「雞肉」要對到「雞腿」但不能對到「雞蛋」）
const WORD_RULES = {
  蛋類: { flag: 'egg' },
  蛋: { flag: 'egg' },
  雞蛋: { flag: 'egg' },
  海鮮: { flag: 'seafood' },
  牛奶製品: { flag: 'dairy' },
  乳製品: { flag: 'dairy' },
  奶: { flag: 'dairy' },
  肉類: { flag: 'meat' },
  雞肉: { words: ['雞腿', '雞胸', '雞肉', '雞丁'] },
  雞: { words: ['雞腿', '雞胸', '雞肉', '雞丁'] },
  豬肉: { words: ['豬', '排骨', '貢丸', '五花', '里肌', '梅花'] },
  豬: { words: ['豬', '排骨', '貢丸', '五花', '里肌', '梅花'] },
  牛肉: { words: ['牛肉'] },
  牛: { words: ['牛肉'] },
  甲殼類: { words: ['蝦', '蟹'] },
  魚類: { words: ['魚'] },
  魚: { words: ['魚'] },
}

// 這道菜有沒有用到某個忌口／過敏食材：先看過敏原標示，再看類別，最後比對菜名與食材名稱
function recipeContains(recipe, word) {
  if (recipe.allergens.includes(word)) return true
  const rule = WORD_RULES[word]
  if (rule?.flag && recipe.dietFlags.includes(rule.flag)) return true
  const names = [recipe.name, ...recipe.mainIngredients, ...recipe.ingredients.map((i) => i.name.replace(/（.*）/, ''))]
  return (rule?.words ?? [word]).some((w) => names.some((name) => name.includes(w)))
}

// 把成員和訪客的限制合在一起
function collectRules(members, guest) {
  // 家庭管理與早期餐單資料的欄位名稱不同；這裡兼容兩種格式，避免配餐遺漏既有偏好。
  // 家庭管理頁點選的過敏原（甲殼類、蛋類…）也會存在 avoids，所以過敏和忌口都用同一套比對
  const clean = (list) => (list ?? []).map((word) => word.trim()).filter(Boolean)
  const allergens = new Set([...members.flatMap((m) => clean(m.allergens ?? m.allergies)), ...clean(guest.allergens)])
  const avoid = new Set([...members.flatMap((m) => clean(m.avoidIngredients ?? m.avoids)), ...clean(guest.avoid)])
  const dietIds = [...members.map((m) => m.dietType ?? m.dietaryNote).filter(Boolean), ...guest.dietTypes]
  const blockedFlags = new Set(
    dietTypes.filter((type) => dietIds.includes(type.id) || dietIds.includes(type.name)).flatMap((t) => t.excludes),
  )
  const spiceIndex = { none: 0, light: 1, mild: 2, medium: 3, hot: 4 }
  const spicyLevels = [...members.map((m) => m.spicy ?? spiceIndex[m.spiceLevel]), guest.spicy].filter((v) => v != null)
  const maxSpicy = spicyLevels.length ? Math.min(...spicyLevels) : 4
  return { allergens, avoid, blockedFlags, maxSpicy }
}

export function isAllowed(recipe, rules) {
  if (recipe.dietFlags.some((f) => rules.blockedFlags.has(f))) return false
  if (recipe.spicy > rules.maxSpicy) return false
  return ![...rules.allergens, ...rules.avoid].some((word) => recipeContains(recipe, word))
}

// jitter：加一點隨機，每次建立的組合才會有變化
function scoreRecipe(recipe, needs, fridgeMatches, jitter = 1.5) {
  let score = Math.random() * jitter
  score += recipe.categories.filter((c) => needs.wants.includes(c)).length * 3
  score += recipe.flavors.filter((f) => needs.flavors.includes(f)).length * 2
  if (needs.texture !== '不指定' && recipe.texture === needs.texture) score += 2
  score += fridgeMatches.length * 1.5
  return score
}

// 依分數挑 count 道，盡量不要同一類重複（例：三道都是蛋料理），其次避開同一種主食材（例：兩道都是豬肉）
function pick(candidates, count) {
  const chosen = []
  const pool = [...candidates]
  while (chosen.length < count && pool.length) {
    pool.sort((a, b) => adjusted(b) - adjusted(a))
    chosen.push(pool.shift())
  }
  return chosen

  function adjusted(item) {
    const groupRepeats = chosen.filter((c) => c.recipe.group && c.recipe.group === item.recipe.group).length
    const mainRepeats = chosen.filter((c) => c.recipe.categories[0] === item.recipe.categories[0]).length
    return item.score - groupRepeats * 6 - mainRepeats * 2.5
  }
}

/**
 * 建立餐單
 * @returns {{ dishes: Array<{ recipeId, type }>, shortage: boolean, rules }}
 */
export function planMenu({ recipes, members, guest, needs, dishCount, soupCount, useFridge, findFridgeMatches, preferredRecipeIds = [] }) {
  const rules = collectRules(members, guest)
  const scored = recipes
    .filter((recipe) => isAllowed(recipe, rules))
    .map((recipe) => {
      const matches = useFridge ? findFridgeMatches(recipe.ingredients.map((i) => i.name)) : []
      const preferredScore = preferredRecipeIds.includes(recipe.id) ? 1000 : 0
      return { recipe, score: scoreRecipe(recipe, needs, matches) + preferredScore }
    })

  const dishes = pick(scored.filter((s) => s.recipe.type === 'dish'), dishCount)
  const soups = pick(scored.filter((s) => s.recipe.type === 'soup'), soupCount)

  return {
    dishes: [...dishes, ...soups].map((s) => ({ recipeId: s.recipe.id, type: s.recipe.type })),
    shortage: dishes.length < dishCount || soups.length < soupCount,
  }
}

// 更換菜色只換同一類（肉類換肉類、湯品換湯品）；舊資料沒有 group 就比 type
function sameGroup(a, b) {
  return a.group && b.group ? a.group === b.group : a.type === b.type
}

// 更換菜色的候選：同一類、符合限制、不在目前餐單裡，分數高的在前
export function swapCandidates({ recipes, current, menuIds, members, guest, needs, useFridge, findFridgeMatches }) {
  const rules = collectRules(members, guest)
  return recipes
    .filter((r) => sameGroup(r, current) && !menuIds.includes(r.id) && isAllowed(r, rules))
    .map((recipe) => {
      const matches = useFridge ? findFridgeMatches(recipe.ingredients.map((i) => i.name)) : []
      return { recipe, score: scoreRecipe(recipe, needs, matches, 0) }
    })
    .sort((a, b) => b.score - a.score)
    .map((s) => s.recipe)
}
