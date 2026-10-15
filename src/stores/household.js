import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { load, save, loadForAccount, saveForHousehold } from './storage'
import { useUserStore } from './user'

// 共用家庭（模擬版）：沒有後端，所有帳號、家庭與邀請都存在同一個瀏覽器的 localStorage。
// 帳號屬於一個家庭；家庭成員、冰箱與餐單綁在家庭上，同家庭的帳號切換登入後看到同一份資料。
//   households：[{ id, name, ownerEmail, memberEmails, inviteCode, createdAt }]
//   invites：[{ id, householdId, email, invitedBy, status: 'pending' | 'accepted' | 'declined', createdAt }]
// 角色：ownerEmail 是擁有者，可改家庭名稱、移除帳號、重新產生邀請碼；所有帳號都能邀請。
const HOUSEHOLDS_KEY = 'households'
const INVITES_KEY = 'household-invites'
// 綁在家庭上的資料；第一次建立家庭時，把帳號原本（依 email 隔離）的資料搬進來
export const HOUSEHOLD_DATA_KEYS = ['family-members', 'fridge-ingredients', 'mealPlans']

const createId = () => globalThis.crypto?.randomUUID?.() ?? `household-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
// 邀請碼避開容易看錯的 0/O、1/I/L
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const normaliseEmail = (email) => String(email ?? '').trim().toLowerCase()
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

export const useHouseholdStore = defineStore('household', () => {
  const userStore = useUserStore()
  const households = ref(load(HOUSEHOLDS_KEY, []))
  const invites = ref(load(INVITES_KEY, []))

  const accountEmail = computed(() => normaliseEmail(userStore.user?.email))
  const current = computed(() => (accountEmail.value ? findByEmail(accountEmail.value) : null))
  // 訪客沒有家庭 id，資料只留在目前頁面
  const householdId = computed(() => current.value?.id ?? '')
  const isOwner = computed(() => Boolean(current.value) && current.value.ownerEmail === accountEmail.value)

  // 共用這個家庭的帳號（顯示用）
  const accounts = computed(() => (current.value?.memberEmails ?? []).map((email) => {
    const account = userStore.findAccount(email)
    return { email, name: account?.name ?? email.split('@')[0], avatar: account?.avatar ?? '', isOwner: email === current.value.ownerEmail, isMe: email === accountEmail.value }
  }))
  // 這個家庭寄出、對方還沒回覆的邀請
  const sentInvites = computed(() => invites.value.filter((invite) => invite.householdId === householdId.value && invite.status === 'pending'))
  // 寄給目前帳號、還沒回覆的邀請（家庭已不存在或已經在該家庭的略過）
  const receivedInvites = computed(() => invites.value
    .filter((invite) => invite.email === accountEmail.value && invite.status === 'pending' && invite.householdId !== householdId.value)
    .map((invite) => ({ ...invite, household: findById(invite.householdId) }))
    .filter((invite) => invite.household))

  function findById(id) {
    return households.value.find((household) => household.id === id) ?? null
  }

  function findByEmail(email) {
    return households.value.find((household) => household.memberEmails.includes(email)) ?? null
  }

  function findByCode(code) {
    const key = String(code ?? '').trim().toUpperCase()
    return key ? households.value.find((household) => household.inviteCode === key) ?? null : null
  }

  function createCode() {
    let code
    do {
      code = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')
    } while (findByCode(code))
    return code
  }

  function accountName(email) {
    return userStore.findAccount(email)?.name ?? email.split('@')[0]
  }

  // 帳號登入後一定要有家庭：
  // 1. 以前離開過、自己建立且已沒有其他人的家庭 → 回到那個家
  // 2. 否則建立新家庭，並把帳號原本依 email 隔離的資料搬進來（只搬一次）
  function ensureHousehold(email) {
    if (!email || findByEmail(email)) return
    const ownEmpty = households.value.find((household) => household.ownerEmail === email && household.memberEmails.length === 0)
    if (ownEmpty) {
      ownEmpty.memberEmails.push(email)
      return
    }
    const household = {
      id: createId(),
      name: `${accountName(email)}的家`,
      ownerEmail: email,
      memberEmails: [email],
      inviteCode: createCode(),
      createdAt: new Date().toISOString(),
    }
    HOUSEHOLD_DATA_KEYS.forEach((key) => {
      const legacy = loadForAccount(key, email, null)
      if (legacy !== null) saveForHousehold(key, household.id, legacy)
    })
    households.value.push(household)
  }

  // 帳號從家庭移出；擁有者離開時，擁有權交給最早加入的帳號。
  // 他的本人卡片由 family store 依 memberEmails 自動移除
  function removeFromHousehold(household, email) {
    household.memberEmails = household.memberEmails.filter((item) => item !== email)
    if (household.ownerEmail === email && household.memberEmails.length) household.ownerEmail = household.memberEmails[0]
  }

  function joinHousehold(target) {
    const email = accountEmail.value
    if (!email) return { error: '請先登入。' }
    if (target.memberEmails.includes(email)) return { error: '你已經在這個家庭裡了。' }
    const previous = current.value
    if (previous) removeFromHousehold(previous, email)
    target.memberEmails.push(email)
    // 已加入的家庭，其他寄給自己的同家庭邀請一併視為接受
    invites.value.forEach((invite) => {
      if (invite.email === email && invite.householdId === target.id && invite.status === 'pending') invite.status = 'accepted'
    })
    return { household: target }
  }

  function inviteByEmail(rawEmail) {
    const email = normaliseEmail(rawEmail)
    if (!current.value) return { error: '請先登入。' }
    if (!isEmail(email)) return { error: '請輸入有效的電子信箱。' }
    if (email === accountEmail.value) return { error: '不能邀請自己。' }
    if (current.value.memberEmails.includes(email)) return { error: '這個帳號已經在家庭裡了。' }
    if (sentInvites.value.some((invite) => invite.email === email)) return { error: '已經邀請過這個信箱，等對方回覆即可。' }
    const invite = {
      id: createId(),
      householdId: current.value.id,
      email,
      invitedBy: accountEmail.value,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    invites.value.push(invite)
    return { invite, hasAccount: Boolean(userStore.findAccount(email)) }
  }

  function cancelInvite(id) {
    invites.value = invites.value.filter((invite) => invite.id !== id)
  }

  function acceptInvite(id) {
    const invite = invites.value.find((item) => item.id === id && item.email === accountEmail.value && item.status === 'pending')
    const target = invite && findById(invite.householdId)
    if (!target) return { error: '這個邀請已失效。' }
    return joinHousehold(target)
  }

  function declineInvite(id) {
    const invite = invites.value.find((item) => item.id === id && item.email === accountEmail.value)
    if (invite) invite.status = 'declined'
  }

  function joinByCode(code) {
    const target = findByCode(code)
    if (!target) return { error: '找不到這組邀請碼，請確認後再試一次。' }
    return joinHousehold(target)
  }

  function previewCode(code) {
    return findByCode(code)
  }

  // 自己離開家庭（只剩自己時不需要離開）；離開後會有一個新的空白家庭
  function leaveHousehold() {
    const email = accountEmail.value
    if (!current.value || current.value.memberEmails.length < 2) return { error: '目前只有你一個人，不需要離開。' }
    removeFromHousehold(current.value, email)
    ensureHousehold(email)
    return { ok: true }
  }

  // 擁有者移除其他帳號；被移除的帳號下次登入會回到自己的家或建立新家庭
  function removeAccount(email) {
    if (!isOwner.value || email === accountEmail.value) return { error: '只有擁有者可以移除其他帳號。' }
    removeFromHousehold(current.value, email)
    return { ok: true }
  }

  function renameHousehold(name) {
    const value = String(name ?? '').trim()
    if (!isOwner.value) return { error: '只有擁有者可以修改家庭名稱。' }
    if (!value || value.length > 20) return { error: '家庭名稱需介於 1 至 20 字。' }
    current.value.name = value
    return { ok: true }
  }

  function regenerateCode() {
    if (!isOwner.value) return null
    current.value.inviteCode = createCode()
    return current.value.inviteCode
  }

  watch(households, (value) => save(HOUSEHOLDS_KEY, value), { deep: true, flush: 'sync' })
  watch(invites, (value) => save(INVITES_KEY, value), { deep: true, flush: 'sync' })
  // 登入（或換帳號）時立刻確定所屬家庭，家庭成員、冰箱、餐單 store 才讀得到正確的資料（放在儲存 watcher 之後，新建立的家庭才會寫入）
  watch(accountEmail, (email) => ensureHousehold(email), { immediate: true, flush: 'sync' })

  return {
    households,
    current,
    householdId,
    isOwner,
    accounts,
    sentInvites,
    receivedInvites,
    inviteByEmail,
    cancelInvite,
    acceptInvite,
    declineInvite,
    joinByCode,
    previewCode,
    leaveHousehold,
    removeAccount,
    renameHousehold,
    regenerateCode,
  }
})
