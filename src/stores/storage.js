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
