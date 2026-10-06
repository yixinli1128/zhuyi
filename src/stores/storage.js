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
