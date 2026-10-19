import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { load, save, saveForAccount, releaseAccountHousehold, deleteAccountData } from './storage'
import { useHouseholdStore } from './household'

// 會員（假登入）：帳號和登入狀態都只存在瀏覽器裡，沒有後端
// 示範帳號：oliver@example.com ／ zhuyi1234
const DEMO_ACCOUNTS = [
  {
    email: 'oliver@example.com',
    password: 'zhuyi1234',
    name: 'Oliver',
    linked: { google: true, line: false },
  },
  {
    email: 'an@example.com',
    password: 'zhuyi1234',
    name: '小安',
    linked: { google: false, line: false },
  },
  {
    email: 'qing@example.com',
    password: 'zhuyi1234',
    name: '小晴',
    linked: { google: false, line: false },
  },
  {
    email: 'yu@example.com',
    password: 'zhuyi1234',
    name: '小宇',
    linked: { google: false, line: false },
  },
  {
    email: 'test1@example.com',
    password: 'zhuyi1234',
    name: '測試一',
    linked: { google: false, line: false },
  },
  {
    email: 'test2@example.com',
    password: 'zhuyi1234',
    name: '測試二',
    linked: { google: false, line: false },
  },
]

// 這三組帳號是首次使用流程的測試帳號。版本升級後只重置一次，
// 讓每次測試都從「本人卡片已建立、其餘資料為空」開始。
const RESETTABLE_DEMO_EMAILS = ['an@example.com', 'qing@example.com', 'yu@example.com']
const DEMO_RESET_VERSION = 'first-use-tour-v4'
export const EMPTY_DEMO_EMAILS = ['test1@example.com', 'test2@example.com']
const EMPTY_DEMO_RESET_VERSION = 'empty-test-accounts-v2'

export function isEmptyDemoAccount(email) {
  return EMPTY_DEMO_EMAILS.includes(String(email ?? '').trim().toLowerCase())
}

function resetDemoAccountsOnce() {
  if (load('demo-account-reset-version', '') === DEMO_RESET_VERSION) return false

  RESETTABLE_DEMO_EMAILS.forEach((email) => {
    // 寫入空陣列而非移除 key，避免舊版未分帳號資料被再次遷移進測試帳號。
    saveForAccount('family-members', email, [])
    saveForAccount('fridge-ingredients', email, [])
    saveForAccount('mealPlans', email, [])
    releaseAccountHousehold(email)
  })

  const resetEmails = new Set(RESETTABLE_DEMO_EMAILS)
  const savedAccounts = load('accounts', [])
  const otherAccounts = Array.isArray(savedAccounts)
    ? savedAccounts.filter((account) => !resetEmails.has(account.email?.toLowerCase()))
    : []
  const resetAccounts = DEMO_ACCOUNTS.filter((account) => resetEmails.has(account.email))
  save('accounts', [...otherAccounts, ...resetAccounts])

  const guard = load('loginGuard', {})
  RESETTABLE_DEMO_EMAILS.forEach((email) => delete guard[email])
  save('loginGuard', guard)

  const resetTokens = load('resetTokens', {})
  Object.entries(resetTokens).forEach(([token, record]) => {
    if (resetEmails.has(record?.email?.toLowerCase())) delete resetTokens[token]
  })
  save('resetTokens', resetTokens)

  const tours = load('first-use-tour', {})
  RESETTABLE_DEMO_EMAILS.forEach((email) => delete tours[email])
  save('first-use-tour', tours)

  // 若目前正登入其中一組帳號，也同步還原顯示名稱，毋須重新登入。
  const savedUser = load('user', null)
  const fixture = RESETTABLE_DEMO_EMAILS.includes(savedUser?.email?.toLowerCase())
    ? DEMO_ACCOUNTS.find((account) => account.email === savedUser.email.toLowerCase())
    : null
  if (fixture) save('user', { ...savedUser, name: fixture.name, avatar: fixture.avatar ?? '' })

  save('demo-account-reset-version', DEMO_RESET_VERSION)
  return true
}

// 兩組純空白帳號供驗收使用；只初始化它們自己的資料，不影響既有示範帳號。
function resetEmptyDemoAccountsOnce() {
  if (load('empty-demo-account-reset-version', '') === EMPTY_DEMO_RESET_VERSION) return false

  EMPTY_DEMO_EMAILS.forEach((email) => {
    saveForAccount('family-members', email, [])
    saveForAccount('fridge-ingredients', email, [])
    saveForAccount('mealPlans', email, [])
    releaseAccountHousehold(email)
  })

  const emptyEmails = new Set(EMPTY_DEMO_EMAILS)
  const savedAccounts = load('accounts', [])
  const otherAccounts = Array.isArray(savedAccounts)
    ? savedAccounts.filter((account) => !emptyEmails.has(account.email?.toLowerCase()))
    : []
  const emptyAccounts = DEMO_ACCOUNTS.filter((account) => emptyEmails.has(account.email))
  save('accounts', [...otherAccounts, ...emptyAccounts])

  const guard = load('loginGuard', {})
  EMPTY_DEMO_EMAILS.forEach((email) => delete guard[email])
  save('loginGuard', guard)

  const resetTokens = load('resetTokens', {})
  Object.entries(resetTokens).forEach(([token, record]) => {
    if (EMPTY_DEMO_EMAILS.includes(record?.email?.toLowerCase())) delete resetTokens[token]
  })
  save('resetTokens', resetTokens)

  const tours = load('first-use-tour', {})
  EMPTY_DEMO_EMAILS.forEach((email) => delete tours[email])
  save('first-use-tour', tours)

  // 若更新時正登入空白測試帳號，同步清掉舊顯示資料；家庭 store 會只建立必要的本人卡片。
  const savedUser = load('user', null)
  const fixture = isEmptyDemoAccount(savedUser?.email)
    ? DEMO_ACCOUNTS.find((account) => account.email === savedUser.email.toLowerCase())
    : null
  if (fixture) save('user', { ...savedUser, name: fixture.name, avatar: fixture.avatar ?? '' })

  save('empty-demo-account-reset-version', EMPTY_DEMO_RESET_VERSION)
  return true
}

resetDemoAccountsOnce()
resetEmptyDemoAccountsOnce()

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

// 既有瀏覽器已存帳號資料時，補進新增加的示範帳號，但不覆寫使用者建立或修改過的帳號。
function withDemoAccounts(savedAccounts) {
  const saved = Array.isArray(savedAccounts) ? savedAccounts : []
  const savedEmails = new Set(saved.map((account) => account.email?.toLowerCase()).filter(Boolean))
  return [...DEMO_ACCOUNTS.filter((account) => !savedEmails.has(account.email.toLowerCase())), ...saved]
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
  const accounts = ref(withDemoAccounts(load('accounts', [])).map(normalizeAccount))
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

  // 刪除帳號：只清掉本人資料；共用家庭尚有其他帳號時，家庭成員、冰箱和日誌必須保留。
  function deleteAccount() {
    if (!account.value) return
    const email = account.value.email.toLowerCase()
    // 同步清理目前 Pinia 記憶體，避免之後其他帳號登入時 watcher 又把舊的安全資料寫回 localStorage。
    delete guard.value[email]
    Object.entries(resetTokens.value).forEach(([token, record]) => {
      if (record?.email?.toLowerCase() === email) delete resetTokens.value[token]
    })
    deleteAccountData(email)
    // storage 已先清除資料；同步更新常駐的 household store，避免同一個分頁切換帳號時仍看到已刪帳號。
    useHouseholdStore().removeDeletedAccount(email)
    accounts.value = accounts.value.filter((a) => a.email.toLowerCase() !== email)
    user.value = null
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
