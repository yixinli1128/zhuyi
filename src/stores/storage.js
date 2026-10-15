// localStorage 小工具：讀寫 JSON，壞掉或無法存取時回傳預設值
const PREFIX = 'zhuyi:'

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

// 清除煮意存在這個瀏覽器的資料（刪除帳號時用），keep 內的 key 保留
export function clearAppData(keep = []) {
  try {
    const keepKeys = keep.map((key) => PREFIX + key)
    Object.keys(localStorage)
      .filter((key) => key.startsWith(PREFIX) && !keepKeys.includes(key))
      .forEach((key) => localStorage.removeItem(key))
  } catch {
    // 無法存取時略過
  }
}
