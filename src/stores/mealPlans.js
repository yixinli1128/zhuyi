import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { loadForHousehold, saveForHousehold } from './storage'
import { useHouseholdStore } from './household'
import { isEmptyDemoAccount } from './user'
import { toDateKey } from '@/utils/date'

// 示範用烹飪紀錄：前一個月與前兩個月沒有已完成的餐單時自動帶入，
// 讓歷史紀錄、月份分頁與常煮 TOP 3 一開始就有資料（[月份偏移, 日, 菜色 id]）
const DEMO_HISTORY = [
  [1, 3, ['ZY007', 'ZY006', 'ZY009']],
  [1, 6, ['ZY001', 'ZY013', 'ZY030']],
  [1, 9, ['ZY007', 'ZY003', 'ZY029']],
  [1, 12, ['ZY006', 'ZY024', 'ZY009']],
  [1, 15, ['ZY007', 'ZY006', 'ZY027']],
  [1, 18, ['ZY012', 'ZY015', 'ZY009']],
  [1, 21, ['ZY023', 'ZY013', 'ZY028']],
  [1, 24, ['ZY007', 'ZY017', 'ZY039']],
  [1, 27, ['ZY006', 'ZY002', 'ZY040']],
  [2, 4, ['ZY002', 'ZY013', 'ZY005']],
  [2, 8, ['ZY024', 'ZY011', 'ZY029']],
  [2, 13, ['ZY002', 'ZY016', 'ZY039']],
  [2, 19, ['ZY013', 'ZY018', 'ZY029']],
  [2, 23, ['ZY002', 'ZY024', 'ZY009']],
  [2, 28, ['ZY013', 'ZY020', 'ZY028']],
]

function demoPlan(date, recipeIds) {
  const cookedAt = new Date(`${date}T19:30:00`).toISOString()
  return {
    id: `demo-${date}`,
    date,
    mealType: '晚餐',
    servings: 3,
    people: 3,
    size: 'normal',
    dishCount: recipeIds.length - 1,
    soupCount: 1,
    memberIds: [],
    guest: {},
    needs: {},
    useFridge: false,
    dishes: recipeIds.map((recipeId, index) => ({ recipeId, type: index === recipeIds.length - 1 ? 'soup' : 'dish' })),
    groceryChecked: [],
    status: 'cooked',
    savedAt: cookedAt,
    cookedAt,
    demo: true,
  }
}

function withDemoHistory(list) {
  const now = new Date()
  const added = []
  ;[1, 2].forEach((offset) => {
    const first = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const monthKey = toDateKey(first).slice(0, 7)
    if (list.some((plan) => plan.status === 'cooked' && plan.date?.startsWith(monthKey))) return
    DEMO_HISTORY.filter(([monthOffset]) => monthOffset === offset).forEach(([, day, recipeIds]) => {
      const date = toDateKey(new Date(first.getFullYear(), first.getMonth(), day))
      if (list.some((plan) => plan.date === date && plan.mealType === '晚餐')) return
      added.push(demoPlan(date, recipeIds))
    })
  })
  return added.length ? [...list, ...added] : list
}

// 餐食日誌：每天一筆晚餐餐單（來點煮意按「儲存到餐桌日誌」時寫入）
// { id, date, mealType, servings, memberIds, guest, needs, useFridge, dishes, groceryChecked, status, savedAt }
export const useMealPlanStore = defineStore('mealPlans', () => {
  // 餐單綁在目前帳號所屬的家庭上；同家庭的帳號看到同一份日誌
  const householdStore = useHouseholdStore()
  const householdId = computed(() => householdStore.householdId)
  // 兩組驗收帳號必須維持無示範資料；若它們在某個家庭內，該家庭也不應被自動塞入歷史餐單。
  const shouldSeedDemoHistory = (id) => {
    const household = householdStore.current
    return Boolean(id && household?.id === id && !(household.memberEmails ?? []).some(isEmptyDemoAccount))
  }
  const plansForHousehold = (id) => {
    const stored = loadForHousehold('mealPlans', id, [])
    return shouldSeedDemoHistory(id) ? withDemoHistory(stored) : stored
  }
  const plans = ref(plansForHousehold(householdId.value))

  watch(householdId, (id) => { plans.value = plansForHousehold(id) }, { flush: 'sync' })
  // 同步寫入，避免換家庭的同一輪把舊家庭的餐單寫進新家庭
  watch(plans, (value) => saveForHousehold('mealPlans', householdId.value, value), { deep: true, flush: 'sync' })

  function getPlan(date, mealType = '晚餐') {
    return plans.value.find((plan) => plan.date === date && plan.mealType === mealType) ?? null
  }

  // 同一天同一餐只會有一筆：已有餐單時要傳 replace: true 才會覆蓋
  function savePlan(plan, { replace = false } = {}) {
    const existing = getPlan(plan.date, plan.mealType)
    if (existing && !replace) return { ok: false, reason: 'exists', existing }
    // 已完成餐單是歷史與庫存扣除的交易紀錄，不能被一般「儲存餐單」覆寫回 planned。
    // 若要再煮，必須建立另一個日期的新餐單；修正歷史則需要獨立的更正流程。
    if (existing?.status === 'cooked') return { ok: false, reason: 'cooked', existing }

    const saved = { ...plan, id: existing?.id ?? `p${Date.now()}`, savedAt: new Date().toISOString() }
    plans.value = existing
      ? plans.value.map((item) => (item.id === existing.id ? saved : item))
      : [...plans.value, saved]
    return { ok: true, plan: saved }
  }

  function removePlan(id) {
    const plan = plans.value.find((item) => item.id === id)
    if (!plan) return null
    plans.value = plans.value.filter((item) => item.id !== id)
    return plan
  }

  // 餐單先是「已排定」，真正完成烹飪後才出現在歷史紀錄。
  function markCooked(id, inventoryConsumption = []) {
    const plan = plans.value.find((item) => item.id === id)
    if (!plan || plan.status === 'cooked') return null
    plan.status = 'cooked'
    plan.cookedAt = new Date().toISOString()
    plan.inventoryConsumption = inventoryConsumption
    return plan
  }

  function toggleGroceryItem(id, itemKey) {
    const plan = plans.value.find((item) => item.id === id)
    if (!plan) return null
    const checked = new Set(plan.groceryChecked ?? [])
    if (checked.has(itemKey)) checked.delete(itemKey)
    else checked.add(itemKey)
    plan.groceryChecked = [...checked]
    return plan.groceryChecked
  }

  return { plans, getPlan, savePlan, removePlan, markCooked, toggleGroceryItem }
})
