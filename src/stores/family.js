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
  }
}

export const useFamilyStore = defineStore('family', () => {
  const members = ref(load(STORAGE_KEY, []))

  const activeMembers = computed(() => members.value.filter((member) => !member.deletedAt))
  const totalPortionFactor = computed(() => activeMembers.value.reduce((total, member) => total + member.portionFactor, 0))

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
    if (!member) return null
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

  watch(members, (value) => save(STORAGE_KEY, value), { deep: true })

  return { members, activeMembers, totalPortionFactor, addMember, updateMember, removeMember, restoreMember }
})
