// 食材份量換算後的顯示文字
//   formatAmount({ amount: '300 公克', qty: 300, unit: '公克' }, 4 / 3) → '400 公克'
const FRACTIONS = { 0.25: '1/4', 0.5: '1/2', 0.75: '3/4' }

function roundTo(value, step) {
  return Math.max(step, Math.round(value / step) * step)
}

function toFraction(value) {
  const whole = Math.floor(value)
  const rest = Math.round((value - whole) * 100) / 100
  if (!rest) return String(whole)
  const frac = FRACTIONS[rest] ?? String(rest)
  return whole ? `${whole} ${frac}` : frac
}

// 重量、容量單位統一顯示英文：公克/克 → g、公斤 → kg、毫升 → ml、公升 → L
const ENGLISH_UNITS = { 公斤: 'kg', 公克: 'g', 克: 'g', 毫升: 'ml', 公升: 'L' }
export function englishUnits(text = '') {
  return String(text)
    .replace(/（(?:公克|公斤|毫升|公升)）/g, '')
    .replace(/(\d)\s*(公斤|公克|克|毫升|公升)/g, (_, num, unit) => `${num} ${ENGLISH_UNITS[unit]}`)
}

// 份量文字不含括號備註（備註由 formatNote 另外顯示，避免重複）
function stripNote(item) {
  return englishUnits(item.note ? item.amount.replace(`（${item.note}）`, '').trim() : item.amount)
}

// 份量內含備註（例：3 顆（去殼約 150 公克））時才需要在份量後補備註
export function noteInAmount(item) {
  return !!item.note && item.amount.includes(`（${item.note}）`)
}

// 備註裡的總重量跟著份量換算；「每顆約 50 公克」這類單位重量不換算
export function formatNote(item, ratio = 1) {
  if (!item.note) return ''
  if (ratio === 1 || item.note.startsWith('每')) return englishUnits(item.note)
  return englishUnits(item.note).replace(/(\d+(?:\.\d+)?)\s*(g|ml)/g, (_, num, unit) => `${roundTo(Number(num) * ratio, 5)} ${unit}`)
}

export function formatAmount(item, ratio = 1) {
  if (item.qty == null || ratio === 1) return stripNote(item)

  const qty = item.qty * ratio
  let text
  if (['克', '公克', '毫升', 'g', 'ml'].includes(item.unit)) {
    text = String(qty >= 20 ? roundTo(qty, 5) : roundTo(qty, 1))
  } else if (['茶匙', '大匙'].includes(item.unit)) {
    text = toFraction(roundTo(qty, 0.25))
  } else {
    text = toFraction(roundTo(qty, 0.5))
  }
  return englishUnits(`${item.upTo ? '最多 ' : ''}${text} ${item.unit}`)
}
