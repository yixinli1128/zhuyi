import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { load, save } from './storage'
import seed from '@/data/family.json'

// 家庭成員：第一次開啟時帶入 Figma 的示範家人（媽媽、爸爸、姊姊、妹妹），之後存在瀏覽器
// 欄位：name、avatar、portion 食量係數、allergens 過敏原、avoidIngredients 忌口、dietType 素食類型、spicy 辣度 0–4
export const useFamilyStore = defineStore('family', () => {
  const members = ref(load('family', seed))

  watch(members, (value) => save('family', value), { deep: true })

  const byId = computed(() => Object.fromEntries(members.value.map((m) => [m.id, m])))

  function getMember(id) {
    return byId.value[id] ?? null
  }

  return { members, getMember }
})
