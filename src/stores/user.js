import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { load, save } from './storage'

// 會員（假登入）：資料只存在瀏覽器的 localStorage
export const useUserStore = defineStore('user', () => {
  const user = ref(load('user', null)) // { name, email, avatar }

  const isLoggedIn = computed(() => user.value !== null)

  function login(profile) {
    user.value = { name: '', email: '', avatar: '', ...profile }
  }

  function logout() {
    user.value = null
  }

  watch(user, (value) => save('user', value), { deep: true })

  return { user, isLoggedIn, login, logout }
})
