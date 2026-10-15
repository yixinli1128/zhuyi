import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { load, save, loadForAccount, saveForAccount } from './storage'
import { useUserStore } from './user'
import { addDays, toDateKey } from '@/utils/date'

const STORAGE_KEY = 'fridge-ingredients'
const OLIVER_EMAIL = 'oliver@example.com'
const OLIVER_DEMO_SEED_KEY = 'oliver-demo-fridge-seeded'
const ZONES = ['冷藏', '冷凍', '蔬果室', '常溫/調味']
const UNITS = ['份', '顆', '個', '根', '把', '束', '片', '塊', '條', '包', '袋', '盒', '罐', '瓶', 'g（公克）', 'kg（公斤）', 'ml（毫升）', 'L（公升）', '大匙', '茶匙', '杯']
// iPhone 透過區網 HTTP 測試時不一定提供 crypto.randomUUID；缺少時仍可安全建立示範食材。
const createId = () => globalThis.crypto?.randomUUID?.() ?? `ingredient-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
const now = () => new Date().toISOString()

const normaliseUnit = (unit = '') => String(unit).trim().toLowerCase()
const unitDescriptor = (unit) => {
  const value = normaliseUnit(unit)
  if (['g', '克', '公克', 'g（公克）'].includes(value)) return { group: 'weight', factor: 1 }
  if (['kg', '公斤', 'kg（公斤）'].includes(value)) return { group: 'weight', factor: 1000 }
  if (['ml', '毫升', 'ml（毫升）'].includes(value)) return { group: 'volume', factor: 1 }
  if (['l', '公升', 'l（公升）'].includes(value)) return { group: 'volume', factor: 1000 }
  return { group: `count:${value}`, factor: 1 }
}
// 家中常備、不需要放冰箱管理的基本品（水、鹽、糖、油、胡椒、太白粉），推薦料理時視為已有
const PANTRY_STAPLES = ['鹽', '砂糖', '糖', '冰糖', '植物油', '食用油', '白胡椒', '黑胡椒', '太白粉']
const isPantryStaple = (name = '') => /^(飲用)?水(（.*）)?$/.test(name) || PANTRY_STAPLES.includes(name)
// 名稱比對：一個字的名稱（例：油、蛋）只接受完全相同，避免「油」被當成「醬油」
const namesMatch = (a = '', b = '') => a === b || (Math.min(a.length, b.length) > 1 && (a.includes(b) || b.includes(a)))
const displayAmount = (amount) => Math.round((Number(amount) + Number.EPSILON) * 10) / 10

// Oliver 是手機版面測試用的示範帳號。只在一個全新的瀏覽器儲存空間建立一次；
// 已有資料（包含使用者自行清空後的狀態）絕不覆寫，也不影響首次使用引導帳號。
const OLIVER_DEMO_INGREDIENTS = [
  ['雞蛋', 4, '顆', '常溫/調味', 87],
  ['牛番茄', 2, '顆', '蔬果室', 2],
  ['豬梅花肉片', 4, '盒', '冷凍', 27],
  ['醬油', 2, '瓶', '常溫/調味', 87],
  ['蒜頭', 2, '顆', '常溫/調味', 87],
  ['嫩豆腐', 1, '盒', '冷藏', 0],
  ['白糖', 200, 'g（公克）', '常溫/調味', 87],
  ['高麗菜', 2, '顆', '蔬果室', 2],
  ['米酒', 1, '瓶', '常溫/調味', 87],
]

function normaliseIngredient(input, existing = {}) {
  return {
    id: existing.id ?? createId(),
    name: input.name.trim(),
    amount: Number(input.amount),
    unit: input.unit,
    zone: input.zone,
    expiry: input.expiry,
    createdAt: existing.createdAt ?? now(),
    updatedAt: now(),
    deletedAt: null,
  }
}

export const useFridgeStore = defineStore('fridge', () => {
  const userStore = useUserStore()
  const accountEmail = computed(() => userStore.user?.email?.toLowerCase() ?? '')
  const ingredients = ref(loadForAccount(STORAGE_KEY, accountEmail.value, []))
  const activeIngredients = computed(() => ingredients.value.filter((item) => !item.deletedAt))

  function ensureOliverDemoInventory(email) {
    if (email !== OLIVER_EMAIL) return
    const seeded = load(OLIVER_DEMO_SEED_KEY, {})
    // 不將 seed 標記當成唯一條件：舊版若在 ID 建立失敗時中斷，
    // 仍可能留下空白庫存。只要已有任一筆（包含軟刪除）就不覆寫。
    if (ingredients.value.length) {
      if (!seeded[email]) save(OLIVER_DEMO_SEED_KEY, { ...seeded, [email]: true })
      return
    }
    const today = toDateKey()
    ingredients.value = OLIVER_DEMO_INGREDIENTS.map(([name, amount, unit, zone, offset]) => normaliseIngredient({
      name,
      amount,
      unit,
      zone,
      expiry: addDays(today, offset),
    }))
    save(OLIVER_DEMO_SEED_KEY, { ...seeded, [email]: true })
  }

  function validate(input) {
    const name = input.name?.trim() ?? ''
    if (!name || name.length > 50) return '食材名稱需介於 1 至 50 字之間。'
    if (!Number.isFinite(Number(input.amount)) || Number(input.amount) < 0.5 || Number(input.amount) > 500) return '數量需介於 0.5 至 500 之間。'
    if (!UNITS.includes(input.unit)) return '請選擇有效單位。'
    if (!ZONES.includes(input.zone)) return '請選擇食材存放分區。'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expiry ?? '') || Number.isNaN(Date.parse(`${input.expiry}T00:00:00`))) return '請填寫有效日期。'
    return ''
  }

  function addIngredient(input) {
    const error = validate(input)
    if (error) return { error }
    const ingredient = normaliseIngredient(input)
    ingredients.value.push(ingredient)
    return { ingredient }
  }

  function updateIngredient(id, input) {
    const error = validate(input)
    if (error) return { error }
    const index = ingredients.value.findIndex((item) => item.id === id && !item.deletedAt)
    if (index < 0) return { error: '找不到此食材。' }
    const ingredient = normaliseIngredient(input, ingredients.value[index])
    ingredients.value.splice(index, 1, ingredient)
    return { ingredient }
  }

  function removeIngredient(id) {
    const ingredient = ingredients.value.find((item) => item.id === id && !item.deletedAt)
    if (!ingredient) return null
    ingredient.deletedAt = now()
    ingredient.updatedAt = ingredient.deletedAt
    return ingredient
  }

  function restoreIngredient(id) {
    const ingredient = ingredients.value.find((item) => item.id === id && item.deletedAt)
    if (!ingredient) return null
    ingredient.deletedAt = null
    ingredient.updatedAt = now()
    return ingredient
  }

  // 供「來點煮意」計算庫存符合度使用；名稱互相包含即視為對應。
  // 食材名稱先去掉括號說明；單字食材（水、鹽）不反向比對，免得「水」對到「水餃」。
  function findMatches(ingredientNames) {
    const names = ingredientNames.map((name) => name.replace(/（.*）/, ''))
    return activeIngredients.value.filter((item) =>
      item.expiry >= toDateKey() && Number(item.amount) > 0 &&
      names.some((name) => name.includes(item.name) || (name.length > 1 && item.name.includes(name))),
    )
  }

  // 用於「現有庫存可做料理」：必須同時符合食材名稱、單位與數量，且不能使用過期庫存。
  // 回傳的是每一個食譜需求的實際扣抵結果，不再只用「名稱有出現」判斷 100% 匹配。
  // skipStaples：冰箱推薦用，水、鹽、糖、油等基本品不列入缺少的食材。
  function matchRecipeRequirements(requirements = [], { skipStaples = false } = {}) {
    const available = activeIngredients.value
      .filter((item) => item.expiry >= toDateKey() && Number(item.amount) > 0)
      .map((item) => ({ ...item }))
    const remaining = new Map(available.map((item) => [item.id, Number(item.amount)]))
    const matchedIngredients = []
    const missingIngredients = []
    const requirementMatches = []
    let totalRequirements = 0
    let matchedRequirements = 0

    requirements.forEach((requirement) => {
      if (skipStaples && isPantryStaple(requirement.name)) return
      const needed = Number(requirement.qty ?? requirement.amount)
      const matchingItems = available.filter((item) => namesMatch(requirement.name, item.name))
      // 「少許／適量」沒有可運算的單位時，至少需要有一項有效同名庫存。
      if (!Number.isFinite(needed) || needed <= 0 || !requirement.unit) {
        const isFulfilled = matchingItems.length > 0
        totalRequirements += 1
        if (isFulfilled) {
          matchedRequirements += 1
          matchedIngredients.push(...matchingItems)
        } else {
          missingIngredients.push({ ...requirement, missingQty: null })
        }
        requirementMatches.push({ requirement, matchedQty: null, missingQty: null, isFulfilled })
        return
      }
      totalRequirements += 1
      const target = unitDescriptor(requirement.unit)
      let remainingNeeded = needed * target.factor

      matchingItems
        .forEach((ingredient) => {
          if (remainingNeeded <= 0) return
          const source = unitDescriptor(ingredient.unit)
          if (source.group !== target.group) return
          const availableAmount = (remaining.get(ingredient.id) ?? 0) * source.factor
          const used = Math.min(availableAmount, remainingNeeded)
          if (used <= 0) return
          const usedInIngredientUnit = displayAmount(used / source.factor)
          remaining.set(ingredient.id, displayAmount((remaining.get(ingredient.id) ?? 0) - usedInIngredientUnit))
          matchedIngredients.push({ ...ingredient, amountUsed: usedInIngredientUnit })
          remainingNeeded -= used
        })

      // 單位無法換算時（例：冰箱記「牛番茄 3 顆」、食譜要「番茄 300 g」），有同名有效庫存就視為已有
      if (remainingNeeded > 0) {
        const countBased = matchingItems.find((ingredient) => unitDescriptor(ingredient.unit).group !== target.group && (remaining.get(ingredient.id) ?? 0) > 0)
        if (countBased) {
          matchedIngredients.push(countBased)
          remainingNeeded = 0
        }
      }
      const missingQty = displayAmount(remainingNeeded / target.factor)
      const matchedQty = displayAmount(needed - missingQty)
      const isFulfilled = remainingNeeded <= 0
      if (isFulfilled) matchedRequirements += 1
      else missingIngredients.push({ ...requirement, missingQty })
      requirementMatches.push({ requirement, matchedQty, missingQty, isFulfilled })
    })

    return {
      matchedIngredients,
      missingIngredients,
      totalRequirements,
      matchedRequirements,
      requirementMatches,
      isComplete: totalRequirements > 0 && missingIngredients.length === 0,
    }
  }

  // 依食譜用量預覽可從冰箱扣除的食材。重量、容量會自動換算；其他單位需相同才會扣除。
  function previewConsumption(requirements = []) {
    const remaining = new Map(activeIngredients.value.map((item) => [item.id, Number(item.amount)]))
    const deductions = []

    requirements.forEach((requirement) => {
      const needed = Number(requirement.qty ?? requirement.amount)
      if (!Number.isFinite(needed) || needed <= 0) return
      const target = unitDescriptor(requirement.unit)
      let remainingNeeded = needed * target.factor

      findMatches([requirement.name]).forEach((ingredient) => {
        if (remainingNeeded <= 0) return
        const source = unitDescriptor(ingredient.unit)
        if (source.group !== target.group) return
        const available = (remaining.get(ingredient.id) ?? 0) * source.factor
        const used = Math.min(available, remainingNeeded)
        if (used <= 0) return
        const usedInIngredientUnit = displayAmount(used / source.factor)
        remaining.set(ingredient.id, displayAmount((remaining.get(ingredient.id) ?? 0) - usedInIngredientUnit))
        deductions.push({
          id: ingredient.id,
          name: ingredient.name,
          amount: usedInIngredientUnit,
          unit: ingredient.unit,
          recipeName: requirement.name,
        })
        remainingNeeded -= used
      })
    })
    return deductions
  }

  // 扣除前再次以目前庫存核對，避免多視窗操作導致庫存出現負數。
  function consumeIngredients(deductions = []) {
    const consumed = []
    deductions.forEach((deduction) => {
      const ingredient = ingredients.value.find((item) => item.id === deduction.id && !item.deletedAt)
      if (!ingredient) return
      const amount = Math.min(Number(ingredient.amount), Number(deduction.amount))
      if (!Number.isFinite(amount) || amount <= 0) return
      ingredient.amount = displayAmount(Number(ingredient.amount) - amount)
      ingredient.updatedAt = now()
      if (ingredient.amount <= 0) ingredient.deletedAt = ingredient.updatedAt
      consumed.push({ ...deduction, amount })
    })
    return consumed
  }

  ensureOliverDemoInventory(accountEmail.value)
  watch(accountEmail, (email) => {
    ingredients.value = loadForAccount(STORAGE_KEY, email, [])
    ensureOliverDemoInventory(email)
  })
  watch(ingredients, (value) => saveForAccount(STORAGE_KEY, accountEmail.value, value), { deep: true })

  return {
    ingredients,
    activeIngredients,
    addIngredient,
    updateIngredient,
    removeIngredient,
    restoreIngredient,
    findMatches,
    matchRecipeRequirements,
    previewConsumption,
    consumeIngredients,
  }
})
