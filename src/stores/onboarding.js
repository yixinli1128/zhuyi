import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

// 首次使用引導只在目前頁面暫存餐單設定進度，不寫入 localStorage。
// 真正完成引導的狀態仍由 OnboardingTour 依帳號儲存。
export const useOnboardingStore = defineStore('onboarding', () => {
  const menuSetup = ref({ members: 0, people: 0, dishCount: 0 })
  const menuCreating = ref(false)
  const menuBuilt = ref(false)

  const menuReady = computed(() =>
    menuSetup.value.people >= 1 &&
    menuSetup.value.dishCount >= 1,
  )

  function setMenuSetup({ members = 0, people = 0, dishCount = 0 }) {
    menuSetup.value = {
      members: Number(members) || 0,
      people: Number(people) || 0,
      dishCount: Number(dishCount) || 0,
    }
  }

  function setMenuCreating(value) {
    menuCreating.value = Boolean(value)
  }

  function markMenuBuilt() {
    menuBuilt.value = true
    menuCreating.value = false
  }

  function resetMenuProgress() {
    menuSetup.value = { members: 0, people: 0, dishCount: 0 }
    menuCreating.value = false
    menuBuilt.value = false
  }

  return { menuSetup, menuCreating, menuBuilt, menuReady, setMenuSetup, setMenuCreating, markMenuBuilt, resetMenuProgress }
})
