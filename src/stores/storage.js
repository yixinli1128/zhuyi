// localStorage 小工具：讀寫 JSON，壞掉或無法存取時回傳預設值
const PREFIX = 'zhuyi:'
// 家庭共用的資料只會在最後一位帳號離開家庭時刪除；其餘情況必須保留給還在家庭內的帳號。
const HOUSEHOLD_DATA_KEYS = ['family-members', 'fridge-ingredients', 'mealPlans']

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // 無痕模式或空間不足時略過
  }
}

function accountStorageKey(key, email) {
  return `${key}:account:${String(email).trim().toLowerCase()}`
}

function normaliseEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // 無法存取時略過
  }
}

// 假登入版也依帳號隔離家庭、庫存與餐單資料。首次升級時，將既有未分帳號的資料交給當下登入者一次。
export function loadForAccount(key, email, fallback) {
  const account = String(email ?? '').trim().toLowerCase()
  if (!account) return fallback

  const scopedKey = accountStorageKey(key, account)
  const scoped = load(scopedKey, null)
  if (scoped !== null) return scoped

  const migratedOwnerKey = `${key}:legacy-owner`
  const migratedOwner = load(migratedOwnerKey, '')
  const legacy = load(key, fallback)
  const hasLegacyData = Array.isArray(legacy) ? legacy.length > 0 : Boolean(legacy && Object.keys(legacy).length)
  if (!migratedOwner && hasLegacyData) {
    save(migratedOwnerKey, account)
    save(scopedKey, legacy)
    return legacy
  }
  return fallback
}

export function saveForAccount(key, email, value) {
  const account = String(email ?? '').trim().toLowerCase()
  if (account) save(accountStorageKey(key, account), value)
}

// 共用家庭版：家庭成員、冰箱與餐單綁在「家庭」上，同一家庭的帳號讀寫同一份資料。
// householdId 為空（訪客）時不寫入，維持訪客資料只在目前頁面使用。
function householdStorageKey(key, householdId) {
  return `${key}:household:${householdId}`
}

export function loadForHousehold(key, householdId, fallback) {
  if (!householdId) return fallback
  return load(householdStorageKey(key, householdId), fallback)
}

export function saveForHousehold(key, householdId, value) {
  if (householdId) save(householdStorageKey(key, householdId), value)
}

// 從家庭與邀請紀錄中移除一個帳號。這是純資料轉換，讓 Pinia store 與 localStorage
// 可以共用同一套規則，避免刪帳號後畫面仍保留過期的家庭成員。
export function removeAccountFromHouseholdRecords(email, rawHouseholds = [], rawInvites = []) {
  const account = normaliseEmail(email)
  const removedHouseholdIds = []
  if (!account) {
    return {
      households: Array.isArray(rawHouseholds) ? rawHouseholds : [],
      invites: Array.isArray(rawInvites) ? rawInvites : [],
      removedHouseholdIds,
    }
  }

  const households = (Array.isArray(rawHouseholds) ? rawHouseholds : [])
    .map((household) => {
      const memberEmails = Array.isArray(household?.memberEmails) ? household.memberEmails : []
      const isMember = memberEmails.some((item) => normaliseEmail(item) === account)
      const isOwner = normaliseEmail(household?.ownerEmail) === account
      if (!isMember && !isOwner) return household

      const nextMembers = memberEmails.filter((item) => normaliseEmail(item) !== account)
      // 最後一位帳號離開時，這個家庭的共用資料才真正沒有任何使用者可存取。
      if (nextMembers.length === 0) {
        if (household?.id) removedHouseholdIds.push(household.id)
        return null
      }

      return {
        ...household,
        memberEmails: nextMembers,
        ownerEmail: isOwner ? nextMembers[0] : household.ownerEmail,
      }
    })
    .filter(Boolean)

  const removedIds = new Set(removedHouseholdIds)
  const invites = (Array.isArray(rawInvites) ? rawInvites : []).filter((invite) => {
    if (removedIds.has(invite?.householdId)) return false
    return normaliseEmail(invite?.email) !== account && normaliseEmail(invite?.invitedBy) !== account
  })

  return { households, invites, removedHouseholdIds }
}

function removeHouseholdData(householdIds = []) {
  householdIds.forEach((householdId) => {
    HOUSEHOLD_DATA_KEYS.forEach((key) => remove(householdStorageKey(key, householdId)))
  })
}

function removeEmailEntry(key, email) {
  const value = load(key, null)
  if (!value || Array.isArray(value) || typeof value !== 'object' || !Object.hasOwn(value, email)) return
  const next = { ...value }
  delete next[email]
  save(key, next)
}

function removeResetTokensForEmail(email) {
  const tokens = load('resetTokens', {})
  if (!tokens || Array.isArray(tokens) || typeof tokens !== 'object') return
  const next = Object.fromEntries(
    Object.entries(tokens).filter(([, record]) => normaliseEmail(record?.email) !== email),
  )
  if (Object.keys(next).length !== Object.keys(tokens).length) save('resetTokens', next)
}

// 測試帳號重置時使用：讓帳號離開所在的家庭；它自己建立且沒有其他人的家庭與資料會一併刪掉，
// 下次登入會重新建立一個乾淨的家庭。仍有其他帳號的共用資料則完整保留。
export function releaseAccountHousehold(email) {
  const account = normaliseEmail(email)
  if (!account) return { households: [], invites: [], removedHouseholdIds: [] }
  const households = load('households', [])
  const invites = load('household-invites', [])
  const result = removeAccountFromHouseholdRecords(account, households, invites)
  save('households', result.households)
  save('household-invites', result.invites)
  removeHouseholdData(result.removedHouseholdIds)
  return result
}

// 刪除帳號時只清除該帳號的私有資料；若共用家庭還有其他帳號，家庭資料絕不能被清掉。
export function deleteAccountData(email) {
  const account = normaliseEmail(email)
  if (!account) return { households: [], invites: [], removedHouseholdIds: [] }

  const result = releaseAccountHousehold(account)

  // 舊版尚未搬進家庭的帳號資料，以及只屬於該帳號的遷移紀錄。
  HOUSEHOLD_DATA_KEYS.forEach((key) => {
    remove(accountStorageKey(key, account))
    const legacyOwnerKey = `${key}:legacy-owner`
    if (normaliseEmail(load(legacyOwnerKey, '')) === account) {
      remove(key)
      remove(legacyOwnerKey)
    }
  })

  // 帳號的驗證、引導和示範 seed 狀態同樣不得留給下一位使用者。
  removeEmailEntry('loginGuard', account)
  removeEmailEntry('first-use-tour', account)
  removeEmailEntry('oliver-demo-family-seeded', account)
  removeEmailEntry('oliver-demo-fridge-seeded', account)
  removeResetTokensForEmail(account)

  return result
}
