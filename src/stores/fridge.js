import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { load, save } from './storage'

const STORAGE_KEY = 'fridge-ingredients'
const ZONES = ['冷藏', '冷凍', '蔬果室', '常溫/調味']
const UNITS = ['份', '顆', '片', '包', '盒', '把', '個', 'g（公克）', 'kg（公斤）', 'ml（毫升）', 'L（公升）']
const createId = () => crypto.randomUUID()
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
const displayAmount = (amount) => Math.round((Number(amount) + Number.EPSILON) * 10) / 10

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
  const ingredients = ref(load(STORAGE_KEY, []))
  const activeIngredients = computed(() => ingredients.value.filter((item) => !item.deletedAt))

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
  function findMatches(ingredientNames) {
    return activeIngredients.value.filter((item) =>
      ingredientNames.some((name) => name.includes(item.name) || item.name.includes(name)),
    )
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

  watch(ingredients, (value) => save(STORAGE_KEY, value), { deep: true })

  return {
    ingredients,
    activeIngredients,
    addIngredient,
    updateIngredient,
    removeIngredient,
    restoreIngredient,
    findMatches,
    previewConsumption,
    consumeIngredients,
  }
})
