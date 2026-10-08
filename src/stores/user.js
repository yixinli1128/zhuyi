import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { load, save, clearAppData } from './storage'

// 會員（假登入）：帳號和登入狀態都只存在瀏覽器裡，沒有後端
// 示範帳號：oliver@example.com ／ zhuyi1234
const DEMO_ACCOUNTS = [
  {
    email: 'oliver@example.com',
    password: 'zhuyi1234',
    name: 'Oliver',
    linked: { google: true, line: false },
  },
]

const MAX_ATTEMPTS = 5 // 連續輸錯幾次後鎖定
const LOCK_MINUTES = 15 // 鎖定幾分鐘
const RESET_MINUTES = 30 // 重設密碼連結有效時間

// 帳號設定頁「通知設定」的預設值（Figma 帳號設定）
const DEFAULT_NOTIFICATIONS = { expiry: true, dinner: true, shopping: false, newsletter: false }

// 補齊舊資料缺少的欄位
function normalizeAccount(account) {
  return {
    name: account.email.split('@')[0],
    avatar: '',
    verified: true,
    ...account,
    linked: { google: false, line: false, ...account.linked },
    notifications: { ...DEFAULT_NOTIFICATIONS, ...account.notifications },
  }
}

// 登入狀態只放顯示用的資料，不放密碼
function toProfile(account) {
  return { email: account.email, name: account.name, avatar: account.avatar }
}

// 沒勾「記住我」時，登入狀態只存在這個分頁（關掉就登出）
function loadSession() {
  try {
    const raw = sessionStorage.getItem('zhuyi:user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSession(value) {
  try {
    if (value) sessionStorage.setItem('zhuyi:user', JSON.stringify(value))
    else sessionStorage.removeItem('zhuyi:user')
  } catch {
    // 無法存取時略過
  }
}

function createToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export const useUserStore = defineStore('user', () => {
  const remember = ref(load('remember', true))
  const user = ref(load('user', null) ?? loadSession()) // { email, name, avatar }
  const accounts = ref(load('accounts', DEMO_ACCOUNTS).map(normalizeAccount))
  // 每個信箱的失敗次數與鎖定時間：{ [email]: { failed, lockedUntil } }
  const guard = ref(load('loginGuard', {}))
  // 重設密碼連結：{ [token]: { email, expiresAt } }
  const resetTokens = ref(load('resetTokens', {}))

  const isLoggedIn = computed(() => user.value !== null)
  // 目前登入的完整帳號資料（含第三方連結、通知設定）
  const account = computed(() => (user.value ? findAccount(user.value.email) : undefined))

  function findAccount(email) {
    const key = email.trim().toLowerCase()
    return accounts.value.find((a) => a.email.toLowerCase() === key)
  }

  // ---------- 登入 ----------

  // 檢查帳密，回傳 { ok: true, account } 或 { ok: false, reason, remaining?, lockedUntil? }
  //   reason：'not-found' 查無帳號、'wrong-password' 密碼錯誤、'locked' 暫時鎖定
  function authenticate(email, password) {
    const found = findAccount(email)
    if (!found) return { ok: false, reason: 'not-found' }

    const key = found.email.toLowerCase()
    const record = guard.value[key] ?? { failed: 0, lockedUntil: 0 }

    if (record.lockedUntil > Date.now()) {
      return { ok: false, reason: 'locked', lockedUntil: record.lockedUntil }
    }

    if (found.password !== password) {
      const failed = record.lockedUntil ? 1 : record.failed + 1
      if (failed >= MAX_ATTEMPTS) {
        const lockedUntil = Date.now() + LOCK_MINUTES * 60 * 1000
        guard.value[key] = { failed: 0, lockedUntil }
        return { ok: false, reason: 'locked', lockedUntil }
      }
      guard.value[key] = { failed, lockedUntil: 0 }
      return { ok: false, reason: 'wrong-password', remaining: MAX_ATTEMPTS - failed }
    }

    delete guard.value[key]
    return { ok: true, account: found }
  }

  function login(target, options = {}) {
    remember.value = options.remember ?? true
    user.value = toProfile(target)
  }

  function logout() {
    user.value = null
  }

  // ---------- 註冊 ----------

  // 回傳 { ok: true, account } 或 { ok: false, reason: 'exists' }
  function register({ email, password }) {
    if (findAccount(email)) return { ok: false, reason: 'exists' }
    const created = normalizeAccount({ email: email.trim(), password })
    accounts.value.push(created)
    return { ok: true, account: created }
  }

  // ---------- 忘記密碼／重設密碼 ----------

  // 申請重設連結。沒有後端寄信，所以直接回傳 token 讓畫面模擬「點開信中的連結」
  // 信箱沒註冊時回傳 null（畫面上仍顯示「已寄出」，不透露帳號是否存在）
  function requestPasswordReset(email) {
    const found = findAccount(email)
    if (!found) return null
    const token = createToken()
    resetTokens.value[token] = {
      email: found.email,
      expiresAt: Date.now() + RESET_MINUTES * 60 * 1000,
    }
    return token
  }

  // 連結有效時回傳對應的信箱，失效（過期、用過、不存在）時回傳 null
  function checkResetToken(token) {
    const record = resetTokens.value[token]
    if (!record || record.expiresAt < Date.now() || !findAccount(record.email)) return null
    return record.email
  }

  function resetPassword(token, password) {
    const email = checkResetToken(token)
    if (!email) return { ok: false, reason: 'expired' }
    findAccount(email).password = password
    delete resetTokens.value[token] // 連結只能用一次
    delete guard.value[email.toLowerCase()] // 重設後解除鎖定
    return { ok: true }
  }

  // ---------- 帳號設定 ----------

  // 更新目前帳號的資料（暱稱、頭貼、第三方連結、通知設定）
  function updateAccount(patch) {
    if (!account.value) return
    Object.assign(account.value, patch)
    user.value = toProfile(account.value)
  }

  // 回傳 { ok: true } 或 { ok: false, reason: 'wrong-password' }
  function changePassword(current, next) {
    if (!account.value) return { ok: false, reason: 'not-found' }
    if (account.value.password !== current) return { ok: false, reason: 'wrong-password' }
    account.value.password = next
    return { ok: true }
  }

  // 刪除帳號：移除帳號本身，並清掉這個瀏覽器裡的家庭、冰箱、日誌等資料
  function deleteAccount() {
    if (!account.value) return
    const email = account.value.email.toLowerCase()
    accounts.value = accounts.value.filter((a) => a.email.toLowerCase() !== email)
    user.value = null
    clearAppData(['accounts', 'remember', 'loginGuard', 'resetTokens'])
  }

  watch(
    [user, remember],
    ([value, keep]) => {
      save('remember', keep)
      save('user', keep ? value : null)
      saveSession(keep ? null : value)
    },
    { deep: true },
  )
  watch(accounts, (value) => save('accounts', value), { deep: true })
  watch(guard, (value) => save('loginGuard', value), { deep: true })
  watch(resetTokens, (value) => save('resetTokens', value), { deep: true })

  return {
    user,
    account,
    isLoggedIn,
    accounts,
    findAccount,
    authenticate,
    login,
    logout,
    register,
    requestPasswordReset,
    checkResetToken,
    resetPassword,
    updateAccount,
    changePassword,
    deleteAccount,
    LOCK_MINUTES,
    RESET_MINUTES,
  }
})
