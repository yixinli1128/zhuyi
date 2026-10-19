import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { load, save, loadForHousehold, saveForHousehold } from './storage'
import { useUserStore } from './user'
import { useHouseholdStore } from './household'
import { addDays, toDateKey } from '@/utils/date'

const STORAGE_KEY = 'fridge-ingredients'
const OLIVER_EMAIL = 'oliver@example.com'
const OLIVER_DEMO_SEED_KEY = 'oliver-demo-fridge-seeded'
const OLIVER_DEMO_EXPANSION_KEY = 'oliver-demo-fridge-expansion-v1'
const OLIVER_DEMO_IMAGE_UPGRADE_KEY = 'oliver-demo-fridge-image-upgrade-v2'
const OLIVER_DEMO_SEASONING_EXPANSION_KEY = 'oliver-demo-fridge-seasoning-v3'
const OLIVER_DEMO_CHILI_UPGRADE_KEY = 'oliver-demo-fridge-chili-v5'
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
// 扣庫計算用較細的精度（0.001），避免 1 kg 庫存扣 30 g 時被四捨五入成 0 而永遠扣不到
const preciseAmount = (amount) => Math.round((Number(amount) + Number.EPSILON) * 1000) / 1000

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

// 額外示範食材會以版本化方式補入既有的 Oliver 資料：只加入尚未存在的名稱，
// 不覆寫使用者修改的數量、也不復活已刪除的食材。
const OLIVER_DEMO_EXPANSION_INGREDIENTS = [
  ['雞腿排', 4, '片', '冷凍', 27],
  ['鮭魚', 2, '片', '冷凍', 27],
  ['鮮蝦', 1, '盒', '冷藏', 2],
  ['豬肉片', 500, 'g（公克）', '冷凍', 27],
  ['青蔥', 1, '把', '蔬果室', 4],
  ['老薑', 150, 'g（公克）', '常溫/調味', 21],
  ['九層塔', 1, '把', '冷藏', 2],
  ['辣椒', 3, '根', '蔬果室', 4],
  ['玉米筍', 2, '包', '蔬果室', 4],
  ['洋蔥', 2, '顆', '常溫/調味', 21],
  ['紅蘿蔔', 2, '根', '蔬果室', 7],
  ['菠菜', 1, '把', '冷藏', 2],
  ['金針菇', 2, '包', '冷藏', 2],
  ['鮮香菇', 1, '包', '冷藏', 3],
  ['白味噌', 1, '盒', '冷藏', 27],
  ['芝麻油', 1, '瓶', '常溫/調味', 87],
]

const OLIVER_DEMO_SEASONING_INGREDIENTS = [
  ['鹽', 1, '包', '常溫/調味', 87],
  ['白胡椒', 1, '罐', '常溫/調味', 87],
  ['七味粉', 1, '罐', '常溫/調味', 87],
  ['味精', 1, '罐', '常溫/調味', 87],
  ['味醂', 1, '瓶', '常溫/調味', 87],
  ['沙茶醬', 1, '罐', '常溫/調味', 87],
  ['辣椒', 3, '根', '常溫/調味', 7],
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
  // 冰箱庫存綁在目前帳號所屬的家庭上；同家庭的帳號看到同一份冰箱
  const userStore = useUserStore()
  const householdStore = useHouseholdStore()
  const accountEmail = computed(() => userStore.user?.email?.toLowerCase() ?? '')
  const householdId = computed(() => householdStore.householdId)
  const ingredients = ref(loadForHousehold(STORAGE_KEY, householdId.value, []))
  const activeIngredients = computed(() => ingredients.value.filter((item) => !item.deletedAt))

  function ensureOliverDemoInventory(email) {
    // 只帶進 Oliver 自己的家庭，加入別人的家庭時不另外塞示範食材
    if (email !== OLIVER_EMAIL || householdStore.current?.ownerEmail !== OLIVER_EMAIL) return
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

  function ensureOliverDemoExpansion(email) {
    if (email !== OLIVER_EMAIL || householdStore.current?.ownerEmail !== OLIVER_EMAIL) return
    if (load(OLIVER_DEMO_EXPANSION_KEY, false)) return

    const today = toDateKey()
    const knownNames = new Set(ingredients.value.map((item) => item.name))
    const additions = OLIVER_DEMO_EXPANSION_INGREDIENTS
      .filter(([name]) => !knownNames.has(name))
      .map(([name, amount, unit, zone, offset]) => normaliseIngredient({
        name,
        amount,
        unit,
        zone,
        expiry: addDays(today, offset),
      }))

    if (additions.length) ingredients.value.push(...additions)
    save(OLIVER_DEMO_EXPANSION_KEY, true)
  }

  function upgradeOliverDemoImages(email) {
    if (email !== OLIVER_EMAIL || householdStore.current?.ownerEmail !== OLIVER_EMAIL) return
    if (load(OLIVER_DEMO_IMAGE_UPGRADE_KEY, false)) return

    // v1 中四個沒有對應圖檔的示範品項，替換成現有素材庫裡的同類食材。
    const replacements = new Map([
      ['去骨雞腿排', '雞腿排'],
      ['蛤蜊', '鮮蝦'],
      ['豬五花肉', '豬肉片'],
      ['小黃瓜', '玉米筍'],
    ])
    replacements.forEach((replacement, legacy) => {
      const legacyItem = ingredients.value.find((item) => item.name === legacy && !item.deletedAt)
      if (!legacyItem) return
      const hasReplacement = ingredients.value.some((item) => item.name === replacement && !item.deletedAt)
      if (hasReplacement) legacyItem.deletedAt = now()
      else Object.assign(legacyItem, { name: replacement, updatedAt: now() })
    })
    save(OLIVER_DEMO_IMAGE_UPGRADE_KEY, true)
  }

  function ensureOliverDemoSeasonings(email) {
    if (email !== OLIVER_EMAIL || householdStore.current?.ownerEmail !== OLIVER_EMAIL) return
    if (load(OLIVER_DEMO_SEASONING_EXPANSION_KEY, false)) return

    const today = toDateKey()
    const knownNames = new Set(ingredients.value.map((item) => item.name))
    ingredients.value.push(...OLIVER_DEMO_SEASONING_INGREDIENTS
      .filter(([name]) => !knownNames.has(name))
      .map(([name, amount, unit, zone, offset]) => normaliseIngredient({
        name,
        amount,
        unit,
        zone,
        expiry: addDays(today, offset),
      })))
    save(OLIVER_DEMO_SEASONING_EXPANSION_KEY, true)
  }

  function upgradeOliverDemoChili(email) {
    if (email !== OLIVER_EMAIL || householdStore.current?.ownerEmail !== OLIVER_EMAIL) return
    if (load(OLIVER_DEMO_CHILI_UPGRADE_KEY, false)) return

    // 蔬果室存放的是新鮮辣椒；剝皮辣椒不應出現在此分區。
    const pickledChili = ingredients.value.find((item) => item.name === '剝皮辣椒' && item.zone === '蔬果室' && !item.deletedAt)
    const freshChili = ingredients.value.find((item) => item.name === '辣椒' && item.zone === '蔬果室' && !item.deletedAt)
    if (pickledChili && freshChili) pickledChili.deletedAt = now()
    else if (pickledChili) Object.assign(pickledChili, {
      name: '辣椒',
      amount: 3,
      unit: '根',
      zone: '蔬果室',
      expiry: addDays(toDateKey(), 4),
      updatedAt: now(),
    })
    save(OLIVER_DEMO_CHILI_UPGRADE_KEY, true)
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

  // 供「來點煮意」的配餐分數、卡片「冰箱現有」與摘要使用：傳入一道菜的食材需求，
  // 回傳實際會用到的冰箱庫存。與餐食日誌、扣庫共用同一套配置規則（名稱、單位、數量），
  // 不會出現這裡說「冰箱有」、日誌卻列在待採買的情況。
  function findMatches(requirements = []) {
    const used = new Map()
    allocateRecipeRequirements(requirements, { skipStaples: true }).matchedIngredients
      .forEach((item) => used.set(item.id, item))
    return [...used.values()]
  }

  // 比對與實際扣庫必須共用同一筆配置結果：重量 (g/kg) 與容量 (ml/L) 可換算，
  // 其他單位只能完全相同。這樣不會出現「顯示庫存足夠、完成烹飪卻沒有扣到」的假匹配。
  function allocateRecipeRequirements(requirements = [], { skipStaples = false } = {}) {
    const available = activeIngredients.value
      .filter((item) => item.expiry >= toDateKey() && Number(item.amount) > 0)
      .map((item) => ({ ...item }))
    const remaining = new Map(available.map((item) => [item.id, Number(item.amount)]))
    const matchedIngredients = []
    const missingIngredients = []
    const requirementMatches = []
    const deductions = []
    let totalRequirements = 0
    let matchedRequirements = 0

    requirements.forEach((requirement) => {
      if (skipStaples && isPantryStaple(requirement.name)) return
      const needed = Number(requirement.qty ?? requirement.amount)
      const matchingItems = available.filter((item) => namesMatch(requirement.name, item.name))
      // 「少許／適量」沒有可運算的用量時，至少需要有一項有效同名庫存。
      // 因沒有可靠的扣除數量，這類食材不會產生扣庫；數量化食材則一定以 deductions 為準。
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
          if (remainingNeeded <= 1e-6) return
          const source = unitDescriptor(ingredient.unit)
          if (source.group !== target.group) return
          const availableAmount = (remaining.get(ingredient.id) ?? 0) * source.factor
          const used = Math.min(availableAmount, remainingNeeded)
          if (used <= 0) return
          const usedInIngredientUnit = preciseAmount(used / source.factor)
          remaining.set(ingredient.id, preciseAmount((remaining.get(ingredient.id) ?? 0) - usedInIngredientUnit))
          matchedIngredients.push({ ...ingredient, amountUsed: usedInIngredientUnit })
          deductions.push({
            id: ingredient.id,
            name: ingredient.name,
            amount: usedInIngredientUnit,
            unit: ingredient.unit,
            recipeName: requirement.name,
          })
          remainingNeeded -= used
        })

      const missingQty = displayAmount(remainingNeeded / target.factor)
      const matchedQty = displayAmount(needed - missingQty)
      const isFulfilled = remainingNeeded <= 1e-6
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
      deductions,
      isComplete: totalRequirements > 0 && missingIngredients.length === 0,
    }
  }

  // 用於「現有庫存可做料理」：必須同時符合食材名稱、單位與數量，且不能使用過期庫存。
  // 回傳的是每一個食譜需求的實際扣抵結果，不再只用「名稱有出現」判斷 100% 匹配。
  // skipStaples：冰箱推薦用，水、鹽、糖、油等基本品不列入缺少的食材。
  function matchRecipeRequirements(requirements = [], options = {}) {
    const { deductions, ...match } = allocateRecipeRequirements(requirements, options)
    return match
  }

  // 依食譜用量預覽可從冰箱扣除的食材；與上方的庫存匹配使用完全相同的配置規則。
  function previewConsumption(requirements = [], options = {}) {
    return allocateRecipeRequirements(requirements, options).deductions
  }

  // 扣除前再次以目前庫存核對，避免多視窗操作導致庫存出現負數。
  function consumeIngredients(deductions = []) {
    const consumed = []
    deductions.forEach((deduction) => {
      const ingredient = ingredients.value.find((item) => item.id === deduction.id && !item.deletedAt)
      if (!ingredient) return
      const amount = Math.min(Number(ingredient.amount), Number(deduction.amount))
      if (!Number.isFinite(amount) || amount <= 0) return
      ingredient.amount = preciseAmount(Number(ingredient.amount) - amount)
      ingredient.updatedAt = now()
      if (ingredient.amount <= 0) ingredient.deletedAt = ingredient.updatedAt
      consumed.push({ ...deduction, amount })
    })
    return consumed
  }

  watch(householdId, (id) => {
    ingredients.value = loadForHousehold(STORAGE_KEY, id, [])
    ensureOliverDemoInventory(accountEmail.value)
    ensureOliverDemoExpansion(accountEmail.value)
    upgradeOliverDemoImages(accountEmail.value)
    ensureOliverDemoSeasonings(accountEmail.value)
    upgradeOliverDemoChili(accountEmail.value)
  }, { flush: 'sync' })
  // 同步寫入，避免換家庭的同一輪把舊家庭的庫存寫進新家庭
  watch(ingredients, (value) => saveForHousehold(STORAGE_KEY, householdId.value, value), { deep: true, flush: 'sync' })
  ensureOliverDemoInventory(accountEmail.value)
  ensureOliverDemoExpansion(accountEmail.value)
  upgradeOliverDemoImages(accountEmail.value)
  ensureOliverDemoSeasonings(accountEmail.value)
  upgradeOliverDemoChili(accountEmail.value)

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
