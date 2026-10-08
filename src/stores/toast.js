import { ref } from 'vue'
import { defineStore } from 'pinia'

// 畫面上方的短暫提示（Figma 登入 E6 的「連線逾時」提示條）
//   const toast = useToastStore()
//   toast.show('已儲存變更')
//   toast.show('連線逾時，請檢查網路後再試一次', { variant: 'error', action: { label: '重試', onClick } })
export const useToastStore = defineStore('toast', () => {
  const current = ref(null) // { id, message, variant, action }
  let timer = null

  function show(message, options = {}) {
    clearTimeout(timer)
    current.value = {
      id: Date.now(),
      message,
      variant: options.variant ?? 'success',
      action: options.action ?? null,
    }
    timer = setTimeout(hide, options.duration ?? 3000)
  }

  function hide() {
    clearTimeout(timer)
    current.value = null
  }

  return { current, show, hide }
})
