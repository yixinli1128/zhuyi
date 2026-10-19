// 表單驗證：會員相關頁面共用的規則與錯誤訊息（文案照 Figma）
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// 至少 8 碼，且同時包含英文與數字
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

// 回傳錯誤訊息，沒有錯誤時回傳空字串
export function checkEmail(value) {
  const email = value.trim()
  if (!email) return '請輸入電子信箱'
  if (!EMAIL_PATTERN.test(email)) return '電子信箱格式不正確，例如 name@example.com'
  return ''
}

export function checkNewPassword(value) {
  if (!value) return '請輸入密碼'
  if (!PASSWORD_PATTERN.test(value)) return '密碼至少 8 碼，且需包含英文與數字'
  return ''
}

export function checkConfirmPassword(value, password) {
  if (!value) return '請再輸入一次密碼'
  if (value !== password) return '兩次輸入的密碼不一致'
  return ''
}
