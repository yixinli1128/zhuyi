// 日期小工具：餐單、冰箱都用 'YYYY-MM-DD' 字串存日期（本地時間，不用 UTC 以免差一天）
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export function toDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key, days) {
  const date = fromDateKey(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

// 9/22
export function formatShort(key) {
  const date = fromDateKey(key)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// 9月22日
export function formatMonthDay(key) {
  const date = fromDateKey(key)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

// 週二
export function formatWeekday(key) {
  return `週${WEEKDAYS[fromDateKey(key).getDay()]}`
}
