import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { load, save } from './storage'
import { addDays, toDateKey } from '@/utils/date'
import seed from '@/data/fridge.json'

// 冰箱庫存：示範資料用「幾天前放入、幾天後到期」，第一次開啟時換算成實際日期，展示時才不會全部過期
// zone：fridge 冷藏、freezer 冷凍、produce 蔬果室、pantry 常溫／調味
function createSeed() {
  const today = toDateKey()
  return seed.map(({ addedDaysAgo, expiresInDays, ...item }) => ({
    ...item,
    addedAt: addDays(today, -addedDaysAgo),
    expiresAt: addDays(today, expiresInDays),
  }))
}

export const useFridgeStore = defineStore('fridge', () => {
  const items = ref(load('fridge', null) ?? createSeed())

  watch(items, (value) => save('fridge', value), { deep: true, immediate: true })

  // 食譜裡有用到的庫存（名稱互相包含就算，例：「高麗菜」對到「當季高麗菜」）
  function findMatches(ingredientNames) {
    return items.value.filter((item) =>
      ingredientNames.some((name) => name.includes(item.name) || item.name.includes(name)),
    )
  }

  return { items, findMatches }
})
