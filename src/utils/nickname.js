// 列車車窗與家庭名冊共用的暱稱寬度規則：一個中文字約等於 1.5 個英數字。
const ASCII_CHARACTER = /^[\x00-\x7F]$/

export const NICKNAME_MAX_UNITS = 12
export const NICKNAME_MAX_INPUT_LENGTH = 12
export const NICKNAME_LIMIT_MESSAGE = '暱稱限中文 8 字或英數 12 字以內。'

export function nicknameUnits(value = '') {
  return [...value.trim()].reduce((total, character) => total + (ASCII_CHARACTER.test(character) ? 1 : 1.5), 0)
}

export function isNicknameWithinLimit(value = '') {
  return nicknameUnits(value) <= NICKNAME_MAX_UNITS
}

export function trimNicknameToUnits(value = '', maxUnits = NICKNAME_MAX_UNITS) {
  let units = 0
  let result = ''
  for (const character of value.trim()) {
    const characterUnits = ASCII_CHARACTER.test(character) ? 1 : 1.5
    if (units + characterUnits > maxUnits) break
    units += characterUnits
    result += character
  }
  return result
}
