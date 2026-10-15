import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { load, save, loadForAccount, saveForAccount } from './storage'
import { useUserStore } from './user'
import { NICKNAME_LIMIT_MESSAGE, NICKNAME_MAX_UNITS, isNicknameWithinLimit, nicknameUnits, trimNicknameToUnits } from '@/utils/nickname'

const STORAGE_KEY = 'family-members'
const OLIVER_EMAIL = 'oliver@example.com'
const OLIVER_DEMO_SEED_KEY = 'oliver-demo-family-seeded'

// iPhone 透過區網 HTTP 測試時不一定提供 crypto.randomUUID；保留 UUID 優先，
// 缺少時用帶時間戳的隨機 ID，避免首次建立本人卡片失敗。
const createId = () => globalThis.crypto?.randomUUID?.() ?? `member-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
const now = () => new Date().toISOString()
const uniqueNames = (items) => [...new Set(items.map((item) => item.trim()).filter(Boolean))]

// Oliver 是手機版面測試用帳號。只在新裝置首次建立家庭資料時帶入，
// 讓成員卡與列車都有可檢視內容；既有成員或曾刪除的成員都不會被覆寫。
const OLIVER_DEMO_MEMBERS = [
  { name: '媽媽', portionFactor: 0.8, spiceLevel: 'none', allergies: ['芝麻'], avoids: [] },
  { name: '爸爸', portionFactor: 1.2, spiceLevel: 'mild', allergies: [], avoids: ['茄子'] },
  { name: '妹妹', portionFactor: 0.5, spiceLevel: 'light', allergies: ['甲殼類'], avoids: [] },
]

function normaliseMember(input, existing = {}) {
  const allergies = uniqueNames(input.allergies ?? [])
  const avoids = uniqueNames(input.avoids ?? []).filter((name) => !allergies.includes(name))

  return {
    id: existing.id ?? createId(),
    name: input.name.trim(),
    portionFactor: Number(input.portionFactor),
    spiceLevel: input.spiceLevel,
    dietaryNote: input.dietaryNote?.trim() ?? '',
    allergies,
    avoids,
    avatar: input.avatar ?? existing.avatar ?? '',
    createdAt: existing.createdAt ?? now(),
    updatedAt: now(),
    deletedAt: null,
    // 帳號本人的成員會記下帳號 email（見 ensureOwner）
    ...(existing.ownerEmail ? { ownerEmail: existing.ownerEmail } : {}),
  }
}

export const useFamilyStore = defineStore('family', () => {
  const userStore = useUserStore()
  const accountEmail = computed(() => userStore.user?.email?.toLowerCase() ?? '')
  const members = ref(loadForAccount(STORAGE_KEY, accountEmail.value, []))

  const activeMembers = computed(() => members.value.filter((member) => !member.deletedAt))
  const totalPortionFactor = computed(() => activeMembers.value.reduce((total, member) => total + member.portionFactor, 0))
  const byId = computed(() => Object.fromEntries(activeMembers.value.map((member) => [member.id, member])))

  function validate(input, id = null) {
    const name = input.name?.trim() ?? ''
    if (!name || !isNicknameWithinLimit(name)) return NICKNAME_LIMIT_MESSAGE
    if (!Number.isFinite(Number(input.portionFactor)) || Number(input.portionFactor) < 0.5 || Number(input.portionFactor) > 3) {
      return '份量係數需介於 0.5 至 3.0。'
    }
    if (!['none', 'light', 'mild', 'medium', 'hot'].includes(input.spiceLevel)) return '請選擇辣度偏好。'
    if (activeMembers.value.some((member) => member.id !== id && member.name === name)) return '同一個家庭內不可有重複姓名。'
    return ''
  }

  function addMember(input) {
    const error = validate(input)
    if (error) return { error }
    const member = normaliseMember(input)
    members.value.push(member)
    return { member }
  }

  function updateMember(id, input) {
    const error = validate(input, id)
    if (error) return { error }
    const index = members.value.findIndex((member) => member.id === id && !member.deletedAt)
    if (index < 0) return { error: '找不到此家庭成員。' }
    const member = normaliseMember(input, members.value[index])
    members.value.splice(index, 1, member)
    return { member }
  }

  function removeMember(id) {
    const member = members.value.find((item) => item.id === id && !item.deletedAt)
    if (!member || member.ownerEmail) return null
    member.deletedAt = now()
    member.updatedAt = member.deletedAt
    return member
  }

  function restoreMember(id) {
    const member = members.value.find((item) => item.id === id && item.deletedAt)
    if (!member) return null
    member.deletedAt = null
    member.updatedAt = now()
    return member
  }

  // 帳號本人：登入後自動成為第一位成員（用 email 對應），名字和頭像跟帳號同步，不能刪除。
  // 訪客時期建立的家人保留不動；換帳號登入時，每個帳號各有自己的本人。
  function ownerName(name, ownerId = null) {
    const base = trimNicknameToUnits(name?.trim() || '本人')
    const taken = activeMembers.value.some((member) => member.id !== ownerId && member.name === base)
    if (!taken) return base
    const suffix = '（本人）'
    return `${trimNicknameToUnits(base, NICKNAME_MAX_UNITS - nicknameUnits(suffix))}${suffix}`
  }

  function ensureOliverDemoMembers(email) {
    if (email !== OLIVER_EMAIL) return

    // 不將 seed 標記當成唯一條件：舊版可能在建立中斷時留下標記，
    // 或只留下已刪除卡片，畫面仍會是空的。只要已有一張有效家人卡就不覆寫。
    if (members.value.some((member) => !member.ownerEmail && !member.deletedAt)) {
      const seeded = load(OLIVER_DEMO_SEED_KEY, {})
      if (!seeded[email]) save(OLIVER_DEMO_SEED_KEY, { ...seeded, [email]: true })
      return
    }

    members.value.push(...OLIVER_DEMO_MEMBERS.map((member) => normaliseMember(member)))
    const seeded = load(OLIVER_DEMO_SEED_KEY, {})
    save(OLIVER_DEMO_SEED_KEY, { ...seeded, [email]: true })
  }

  function ensureOwner(profile) {
    if (!profile?.email) return null
    const email = profile.email.toLowerCase()
    const existing = members.value.find((member) => member.ownerEmail === email)
    if (!existing) {
      // ownerSetupPending：剛建立、還沒設定飲食偏好，App 會跳提示請使用者補上（儲存或按稍後就清掉）
      const member = { ...normaliseMember({ name: ownerName(profile.name), portionFactor: 1, spiceLevel: 'none', avatar: profile.avatar || '' }), ownerEmail: email, ownerSetupPending: true }
      members.value.unshift(member)
      ensureOliverDemoMembers(email)
      return member
    }
    const name = ownerName(profile.name, existing.id)
    // 帳號沒設頭像時，保留在家庭管理上傳的頭像
    const avatar = profile.avatar || existing.avatar
    if (existing.deletedAt || existing.name !== name || existing.avatar !== avatar) {
      Object.assign(existing, { name, avatar, deletedAt: null, updatedAt: now() })
    }
    ensureOliverDemoMembers(email)
    return existing
  }

  function dismissOwnerSetup(id) {
    const member = members.value.find((item) => item.id === id)
    if (member) member.ownerSetupPending = false
  }

  function getMember(id) {
    return byId.value[id] ?? null
  }

  watch(accountEmail, (email) => { members.value = loadForAccount(STORAGE_KEY, email, []) })
  watch(members, (value) => saveForAccount(STORAGE_KEY, accountEmail.value, value), { deep: true })

  return { members, activeMembers, totalPortionFactor, addMember, updateMember, removeMember, restoreMember, getMember, ensureOwner, dismissOwnerSetup }
})
