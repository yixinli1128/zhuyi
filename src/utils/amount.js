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

export function formatAmount(item, ratio = 1) {
  if (item.qty == null || ratio === 1) return item.amount

  const qty = item.qty * ratio
  let text
  if (['克', '公克', '毫升', 'g', 'ml'].includes(item.unit)) {
    text = String(qty >= 20 ? roundTo(qty, 5) : roundTo(qty, 1))
  } else if (['茶匙', '大匙'].includes(item.unit)) {
    text = toFraction(roundTo(qty, 0.25))
  } else {
    text = toFraction(roundTo(qty, 0.5))
  }
  return `${item.upTo ? '最多 ' : ''}${text} ${item.unit}`
}
