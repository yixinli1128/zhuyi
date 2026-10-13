import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { load, save } from './storage'

const STORAGE_KEY = 'family-members'

const createId = () => crypto.randomUUID()
const now = () => new Date().toISOString()
const uniqueNames = (items) => [...new Set(items.map((item) => item.trim()).filter(Boolean))]

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
  const members = ref(load(STORAGE_KEY, []))

  const activeMembers = computed(() => members.value.filter((member) => !member.deletedAt))
  const totalPortionFactor = computed(() => activeMembers.value.reduce((total, member) => total + member.portionFactor, 0))
  const byId = computed(() => Object.fromEntries(activeMembers.value.map((member) => [member.id, member])))

  function validate(input, id = null) {
    const name = input.name?.trim() ?? ''
    if (!name || name.length > 20) return '姓名需介於 1 至 20 字之間。'
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
    const base = (name?.trim() || '本人').slice(0, 20)
    const taken = activeMembers.value.some((member) => member.id !== ownerId && member.name === base)
    return taken ? `${base.slice(0, 16)}（本人）` : base
  }

  function ensureOwner(profile) {
    if (!profile?.email) return null
    const email = profile.email.toLowerCase()
    const existing = members.value.find((member) => member.ownerEmail === email)
    if (!existing) {
      // ownerSetupPending：剛建立、還沒設定飲食偏好，App 會跳提示請使用者補上（儲存或按稍後就清掉）
      const member = { ...normaliseMember({ name: ownerName(profile.name), portionFactor: 1, spiceLevel: 'none', avatar: profile.avatar || '' }), ownerEmail: email, ownerSetupPending: true }
      members.value.unshift(member)
      return member
    }
    const name = ownerName(profile.name, existing.id)
    // 帳號沒設頭像時，保留在家庭管理上傳的頭像
    const avatar = profile.avatar || existing.avatar
    if (existing.deletedAt || existing.name !== name || existing.avatar !== avatar) {
      Object.assign(existing, { name, avatar, deletedAt: null, updatedAt: now() })
    }
    return existing
  }

  function dismissOwnerSetup(id) {
    const member = members.value.find((item) => item.id === id)
    if (member) member.ownerSetupPending = false
  }

  function getMember(id) {
    return byId.value[id] ?? null
  }

  watch(members, (value) => save(STORAGE_KEY, value), { deep: true })

  return { members, activeMembers, totalPortionFactor, addMember, updateMember, removeMember, restoreMember, getMember, ensureOwner, dismissOwnerSetup }
})
