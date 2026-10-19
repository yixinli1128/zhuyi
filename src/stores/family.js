import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { load, save, loadForHousehold, saveForHousehold } from './storage'
import { useHouseholdStore } from './household'
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
  // 家庭成員綁在目前帳號所屬的家庭上；同家庭的帳號看到同一份名冊
  const householdStore = useHouseholdStore()
  const householdId = computed(() => householdStore.householdId)
  const members = ref(withAccountCards(loadForHousehold(STORAGE_KEY, householdId.value, [])))

  // 已離開這個家庭的帳號，他的本人卡片不再出現在名冊
  function withAccountCards(list) {
    const emails = householdStore.current?.memberEmails
    if (!emails) return list
    return list.filter((member) => !member.ownerEmail || emails.includes(member.ownerEmail))
  }

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
  // 同一個家庭的每個帳號各有一張本人卡片（ownerEmail 對應帳號）。
  function ownerName(name, ownerId = null) {
    const base = trimNicknameToUnits(name?.trim() || '本人')
    const taken = activeMembers.value.some((member) => member.id !== ownerId && member.name === base)
    if (!taken) return base
    const suffix = '（本人）'
    return `${trimNicknameToUnits(base, NICKNAME_MAX_UNITS - nicknameUnits(suffix))}${suffix}`
  }

  function ensureOliverDemoMembers(email) {
    // 只帶進 Oliver 自己的家庭，加入別人的家庭時不另外塞示範家人
    if (email !== OLIVER_EMAIL || householdStore.current?.ownerEmail !== OLIVER_EMAIL) return

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
      // 示範帳號已有完整範例資料，不需要再引導；一般新帳號仍提示補上偏好。
      const member = { ...normaliseMember({ name: ownerName(profile.name), portionFactor: 1, spiceLevel: 'none', avatar: profile.avatar || '' }), ownerEmail: email, ownerSetupPending: email !== OLIVER_EMAIL }
      // 帳號卡片排在名冊最前面，後加入家庭的帳號接在前一位帳號之後
      const lastAccountIndex = members.value.findLastIndex((item) => item.ownerEmail)
      members.value.splice(lastAccountIndex + 1, 0, member)
      ensureOliverDemoMembers(email)
      return member
    }
    const name = ownerName(profile.name, existing.id)
    // 帳號沒設頭像時，保留在家庭管理上傳的頭像
    const avatar = profile.avatar || existing.avatar
    // 升級前建立的 Oliver 卡片可能仍保留舊的待引導旗標，登入時一併清除。
    if (email === OLIVER_EMAIL && existing.ownerSetupPending) existing.ownerSetupPending = false
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

  // 換帳號或換家庭時重新讀取；同家庭帳號加入／離開時更新本人卡片
  watch(householdId, (id) => { members.value = withAccountCards(loadForHousehold(STORAGE_KEY, id, [])) }, { flush: 'sync' })
  watch(() => householdStore.current?.memberEmails.join(','), () => {
    const next = withAccountCards(members.value)
    if (next.length !== members.value.length) members.value = next
  }, { flush: 'sync' })
  // 同步寫入，避免換家庭的同一輪把舊家庭的名冊寫進新家庭
  watch(members, (value) => saveForHousehold(STORAGE_KEY, householdId.value, value), { deep: true, flush: 'sync' })

  return { members, activeMembers, totalPortionFactor, addMember, updateMember, removeMember, restoreMember, getMember, ensureOwner, dismissOwnerSetup }
})
