import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { load, save } from './storage'

// 餐食日誌：每天一筆晚餐餐單（來點煮意按「儲存到餐桌日誌」時寫入）
// { id, date, mealType, servings, memberIds, guest, needs, useFridge, dishes: [{ recipeId, type }], savedAt }
export const useMealPlanStore = defineStore('mealPlans', () => {
  const plans = ref(load('mealPlans', []))

  watch(plans, (value) => save('mealPlans', value), { deep: true })

  function getPlan(date, mealType = '晚餐') {
    return plans.value.find((plan) => plan.date === date && plan.mealType === mealType) ?? null
  }

  // 同一天同一餐只會有一筆：已有餐單時要傳 replace: true 才會覆蓋
  function savePlan(plan, { replace = false } = {}) {
    const existing = getPlan(plan.date, plan.mealType)
    if (existing && !replace) return { ok: false, reason: 'exists', existing }

    const saved = { ...plan, id: existing?.id ?? `p${Date.now()}`, savedAt: new Date().toISOString() }
    plans.value = existing
      ? plans.value.map((item) => (item.id === existing.id ? saved : item))
      : [...plans.value, saved]
    return { ok: true, plan: saved }
  }

  return { plans, getPlan, savePlan }
})
