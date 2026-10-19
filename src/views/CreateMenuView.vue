<script setup>
// 來點煮意（Figma Desktop - 來點煮意：空畫面、本次訪客／本次用餐需求-設定中、錯誤-設定未完成、
// 建立中、錯誤-餐單生成失敗、結果畫面、修改畫面、更換一道、查看食譜、錯誤-當日已有餐單、
// 儲存到餐桌日誌成功／失敗）
// 直接進入「來點煮意」時，永遠從 Figma 的每日空狀態開始。
// 已儲存的餐單則由餐食日誌管理；未來從日誌編輯時會以明確的編輯參數帶入。
import { computed, nextTick, reactive, ref, toRaw, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFamilyStore } from '@/stores/family'
import { useFridgeStore } from '@/stores/fridge'
import { useRecipeStore } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlans'
import { useToastStore } from '@/stores/toast'
import { useOnboardingStore } from '@/stores/onboarding'
import { formatMonthDay, formatShort, formatWeekday, toDateKey } from '@/utils/date'
import {
  FLAVOR_OPTIONS,
  SIZE_OPTIONS,
  SPICY_LEVELS,
  emptyGuest,
  emptyNeeds,
  hasGuestSettings,
  hasNeeds,
  planMenu,
  recentRecipeDays,
  swapCandidates,
} from '@/utils/menuPlanner'
import dietTypes from '@/data/dietTypes.json'
import PageTitle from '@/components/layout/PageTitle.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseCheckbox from '@/components/base/BaseCheckbox.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseDialog from '@/components/base/BaseDialog.vue'
import MemberCheckCard from '@/components/menu/MemberCheckCard.vue'
import SettingPanel from '@/components/menu/SettingPanel.vue'
import GuestSettings from '@/components/menu/GuestSettings.vue'
import NeedsSettings from '@/components/menu/NeedsSettings.vue'
import MealSummary from '@/components/menu/MealSummary.vue'
import RecipeCard from '@/components/menu/RecipeCard.vue'
import MenuReasons from '@/components/menu/MenuReasons.vue'
import SwapDialog from '@/components/menu/SwapDialog.vue'
import RecipeDialog from '@/components/menu/RecipeDialog.vue'
import AppIcon from '@/components/base/AppIcon.vue'

const familyStore = useFamilyStore()
const fridgeStore = useFridgeStore()
const recipeStore = useRecipeStore()
const mealPlanStore = useMealPlanStore()
const onboardingStore = useOnboardingStore()
const toast = useToastStore()
const router = useRouter()
const route = useRoute()

const today = toDateKey()
const MEAL_TYPE = '晚餐'
const MAX_PEOPLE = 20

// ---------- 用餐設定 ----------
function defaultSettings() {
  return {
    // 登入帳號不等於用餐成員；家人設定只在使用者主動勾選時才套用。
    memberIds: [],
    // IA：用餐日期預設今天，可改選未來日期
    date: today,
    people: 0,
    // 份量仍供配餐計算使用，但不列在 Figma 空狀態的四個欄位中。
    size: 'normal',
    dishCount: 0,
    soupCount: 0,
    guest: emptyGuest(),
    needs: emptyNeeds(),
    useFridge: false,
  }
}

// 已有餐單的日期，日期月曆上加小點（同餐食日誌）
const plannedDates = computed(() => mealPlanStore.plans.map((plan) => plan.date))

const requestedDate = typeof route.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.date)
  ? route.query.date
  : null
const rawRequestedPlan = typeof route.query.planId === 'string'
  ? mealPlanStore.plans.find((plan) => plan.id === route.query.planId) ?? null
  : null
// 已完成餐單是不可變的歷史紀錄。只有明確指定「另一個日期」時，才把它當作複製來源；
// 直接帶入原日期（或未帶日期）的網址一律回餐食日誌，避免覆寫 cooked 與既有扣庫紀錄。
const isCookedPlanCopy = rawRequestedPlan?.status === 'cooked' && Boolean(requestedDate && requestedDate !== rawRequestedPlan.date)
const blockedCookedPlanEdit = rawRequestedPlan?.status === 'cooked' && !isCookedPlanCopy
const requestedPlan = blockedCookedPlanEdit ? null : rawRequestedPlan
const requestedRecipeIds = typeof route.query.recipeId === 'string'
  ? route.query.recipeId.split(',').filter((id) => recipeStore.getRecipe(id))
  : []

if (blockedCookedPlanEdit) {
  nextTick(() => {
    toast.show('已完成餐單不可直接編輯；如要再煮，請從歷史紀錄帶入另一個日期。', { variant: 'error' })
    router.replace({ path: '/journal', query: { date: rawRequestedPlan.date } })
  })
}

function restoreSettings(plan) {
  if (!plan) return {}
  const dishes = plan.dishes ?? []
  // 舊版已儲存的餐單可能缺少部分訪客／需求欄位；回編時補齊結構，避免設定面板因 undefined 無法載入。
  const savedGuest = plan.guest ?? {}
  const savedNeeds = plan.needs ?? {}
  // 舊餐單的菜色只存 recipeId，類型要回食譜資料查；人數、菜數、湯數一律限制在 0–20。
  const dishType = (dish) => dish.type ?? recipeStore.getRecipe(dish.recipeId)?.type
  const clampCount = (value) => Math.min(20, Math.max(0, Math.round(Number(value) || 0)))
  return {
    memberIds: [...(plan.memberIds ?? [])],
    date: plan.date,
    people: clampCount(plan.people ?? (plan.memberIds?.length || plan.servings)),
    size: plan.size ?? 'normal',
    dishCount: clampCount(plan.dishCount ?? dishes.filter((dish) => dishType(dish) === 'dish').length),
    soupCount: clampCount(plan.soupCount ?? dishes.filter((dish) => dishType(dish) === 'soup').length),
    guest: {
      allergens: [...(savedGuest.allergens ?? [])],
      avoid: [...(savedGuest.avoid ?? [])],
      dietTypes: [...(savedGuest.dietTypes ?? [])],
      spicy: savedGuest.spicy ?? null,
    },
    needs: {
      wants: [...(savedNeeds.wants ?? [])],
      flavors: [...(savedNeeds.flavors ?? [])],
      texture: savedNeeds.texture ?? '不指定',
      note: savedNeeds.note ?? '',
    },
    useFridge: Boolean(plan.useFridge),
  }
}

// 從歷史「帶入今日晚餐」時，網址日期必須優先於原始餐單日期；一般編輯餐單傳入的是同一天，結果不變。
const settings = reactive({ ...defaultSettings(), ...restoreSettings(requestedPlan), ...(requestedDate ? { date: requestedDate } : {}) })
const menu = ref(null) // { dishes, servings, shortage, settingsKey }
const status = ref('idle') // idle → loading → idle；失敗時 error
const isGenerating = computed(() => status.value === 'loading')
const resultSection = ref(null)

// 讓首次引導依使用者實際完成的欄位往下走；不靠按「建立餐單」來觸發驗證錯誤。
watch(
  () => [settings.memberIds.length, settings.people, settings.dishCount],
  ([members, people, dishCount]) => onboardingStore.setMenuSetup({ members, people, dishCount }),
  { immediate: true },
)

const guestOpen = ref(false)
const needsOpen = ref(false)

const selectedMembers = computed(() =>
  familyStore.activeMembers.filter((member) => settings.memberIds.includes(member.id)),
)
// 人數包含已勾選的家人與額外手動人數；因此已勾選的人數是不可再往下減的下限。
const minimumPeople = computed(() => selectedMembers.value.length)

function isSelected(id) {
  return settings.memberIds.includes(id)
}

// 勾選家人時，人數跟著變（之前手動多加的訪客人數保留）；未選任何人時可回到 0。
function toggleMember(id, checked) {
  if (isGenerating.value) return

  const before = selectedMembers.value.length
  if (checked && before >= MAX_PEOPLE) {
    toast.show(`每餐最多可選擇 ${MAX_PEOPLE} 位家庭成員。`, { variant: 'error' })
    return
  }

  const extra = Math.max(0, Number(settings.people) - before)
  const memberIds = checked
    ? [...settings.memberIds, id]
    : settings.memberIds.filter((memberId) => memberId !== id)
  const after = familyStore.activeMembers.filter((member) => memberIds.includes(member.id)).length
  settings.memberIds = memberIds
  settings.people = clampPeople(after + extra, after)
}

function updatePeople(value) {
  if (isGenerating.value) return
  const count = Number(value)
  settings.people = Number.isInteger(count) ? clampPeople(count) : minimumPeople.value
}

function changePeople(change) {
  if (isGenerating.value) return
  settings.people = clampPeople((Number(settings.people) || 0) + change)
}

function updateSoupCount(value) {
  if (isGenerating.value) return
  const count = Number(value)
  settings.soupCount = Number.isInteger(count) ? Math.min(MAX_PEOPLE, Math.max(0, count)) : 0
}

function changeSoupCount(change) {
  if (isGenerating.value) return
  settings.soupCount = Math.min(MAX_PEOPLE, Math.max(0, (Number(settings.soupCount) || 0) + change))
}
function updateDishCount(value) {
  if (isGenerating.value) return
  const count = Number(value)
  settings.dishCount = Number.isInteger(count) ? Math.min(MAX_PEOPLE, Math.max(0, count)) : 0
}

function changeDishCount(change) {
  if (isGenerating.value) return
  const current = Number(settings.dishCount) || 0
  settings.dishCount = Math.min(MAX_PEOPLE, Math.max(0, current + change))
}

function clampPeople(value, minimum = minimumPeople.value) {
  return Math.min(MAX_PEOPLE, Math.max(minimum, Math.round(Number(value) || 0)))
}

// 舊餐單或其他頁面更新家庭名冊時，也不可讓已選成員數超過用餐人數。
watch(
  minimumPeople,
  (minimum) => {
    if (!isGenerating.value && settings.people < minimum) settings.people = minimum
  },
  { immediate: true },
)

const guestSubtitle = computed(() =>
  hasGuestSettings(settings.guest) ? '已設定成功，將會套用本餐' : '尚未設定，點此新增飲食需求',
)
const needsSubtitle = computed(() =>
  hasNeeds(settings.needs) ? '已設定成功，將會套用本餐' : '尚未設定，點此選擇今天的喜好',
)

function clearGuest() {
  if (isGenerating.value) return
  settings.guest = emptyGuest()
}

function clearNeeds() {
  if (isGenerating.value) return
  settings.needs = emptyNeeds()
}

// ---------- 驗證（Figma 錯誤-設定未完成） ----------
const submitted = ref(false)

function getErrors(value, selectedCount = minimumPeople.value) {
  const minimum = Math.max(1, selectedCount)
  const people = Number(value.people) || 0
  const dishes = Number(value.dishCount) || 0
  return {
    date: !value.date ? '請選擇用餐日期' : value.date < today ? '用餐日期不能早於今天' : '',
    people: people < minimum
      ? selectedCount
        ? `已選擇 ${selectedCount} 位家庭成員，人數不可少於 ${selectedCount} 位`
        : '人數至少為 1 位'
      : '',
    dishCount: dishes < 1 ? '菜數至少為 1 道' : '',
  }
}

const errors = computed(() => getErrors(settings))

const shownErrors = computed(() => (submitted.value ? errors.value : {}))
const errorCount = computed(() => Object.values(errors.value).filter(Boolean).length)

function clearSettings() {
  if (isGenerating.value) return
  Object.assign(settings, defaultSettings())
  clearMenu()
  submitted.value = false
  guestOpen.value = false
  needsOpen.value = false
}

// 設定改過但還沒重新建立 → 標題變「修改用餐設定」
const settingsKey = computed(() => JSON.stringify(settings))
const isEditing = computed(() => !!menu.value && menu.value.settingsKey !== settingsKey.value)

if (requestedPlan) {
  menu.value = {
    dishes: requestedPlan.dishes.map((dish) => ({ ...dish })),
    servings: requestedPlan.servings,
    shortage: false,
    settingsKey: settingsKey.value,
  }
}

// ---------- 建立餐單 ----------

// 每道菜要煮幾人份：家人的食量係數加總 ＋ 多出來的訪客各算 1 份，再乘上份量。
// 生成時傳入快照，避免等待期間讀到被改動一半的設定。
function calcServings(config = settings, members = selectedMembers.value) {
  const memberPortion = members.reduce((sum, member) => sum + (member.portionFactor ?? member.portion ?? 1), 0)
  const guests = Math.max(0, config.people - members.length)
  const factor = SIZE_OPTIONS.find((option) => option.value === config.size)?.factor ?? 1
  return Math.max(1, Math.round((memberPortion + guests) * factor))
}

async function buildMenu() {
  submitted.value = true
  if (errorCount.value || isGenerating.value) return

  // 同一天已經有餐單：先確認要取代或改其他日期，再開始配餐。
  const existing = findConflictPlan()
  if (existing) {
    if (existing.status === 'cooked') {
      toast.show('這一天的餐單已完成並存入歷史紀錄，不能直接取代；請選擇其他日期重新排餐。', { variant: 'error' })
      return
    }
    conflictPlan.value = existing
    conflictSource.value = 'build'
    conflictOpen.value = true
    return
  }

  // 未選份量時補上正常份量；人數與菜數必須由使用者明確設定至少 1。
  if (settings.size === '') settings.size = 'normal'
  guestOpen.value = false
  needsOpen.value = false

  // 模擬生成會等待一段時間。先複製完整設定與成員，並在結束後再次核對，
  // 即使日後有其他控制項繞過畫面鎖定，也不會把無效或過期的設定存成餐單。
  const settingsSnapshot = structuredClone(toRaw(settings))
  const membersSnapshot = selectedMembers.value.map((member) => structuredClone(toRaw(member)))
  const snapshotKey = JSON.stringify(settingsSnapshot)
  if (Object.values(getErrors(settingsSnapshot, membersSnapshot.length)).some(Boolean)) return

  status.value = 'loading'
  onboardingStore.setMenuCreating(true)
  await nextTick()
  resultSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  await new Promise((resolve) => setTimeout(resolve, 1800)) // 模擬配餐中

  // 展示用：離線時當作配餐失敗
  if (!navigator.onLine) {
    status.value = 'error'
    onboardingStore.setMenuCreating(false)
    return
  }

  const currentErrors = getErrors(settings, minimumPeople.value)
  if (settingsKey.value !== snapshotKey || Object.values(currentErrors).some(Boolean)) {
    status.value = 'idle'
    onboardingStore.setMenuCreating(false)
    toast.show('用餐設定已變更或不完整，請確認後重新建立餐單。', { variant: 'error' })
    return
  }

  // 從已有餐單進來（編輯、排餐至、帶入今日晚餐）時，原本的菜保留，只補上新增的道數
  const lockedRecipeIds = requestedPlan
    ? (menu.value?.dishes ?? []).map((dish) => dish.recipeId).filter((id) => requestedPlan.dishes.some((dish) => dish.recipeId === id))
    : []
  const result = planMenu({
    recipes: recipeStore.recipes,
    members: membersSnapshot,
    guest: settingsSnapshot.guest,
    needs: settingsSnapshot.needs,
    dishCount: settingsSnapshot.dishCount,
    soupCount: settingsSnapshot.soupCount,
    useFridge: settingsSnapshot.useFridge,
    findFridgeMatches: fridgeMatcher(calcServings(settingsSnapshot, membersSnapshot)),
    preferredRecipeIds: requestedRecipeIds,
    lockedRecipeIds,
    // 7 天內盡量不重複；正在編輯的這筆、同一天同餐別會被覆蓋的那筆不算
    recentDays: recentRecipeDays(mealPlanStore.plans, settingsSnapshot.date, {
      excludeIds: [requestedPlan?.id, mealPlanStore.getPlan(settingsSnapshot.date, MEAL_TYPE)?.id].filter(Boolean),
    }),
  })

  menu.value = {
    dishes: result.dishes,
    servings: calcServings(settingsSnapshot, membersSnapshot),
    people: settingsSnapshot.people,
    shortage: result.shortage,
    settingsKey: snapshotKey,
  }
  status.value = 'idle'
  onboardingStore.markMenuBuilt()
}

function clearMenu() {
  if (isGenerating.value) return
  menu.value = null
  status.value = 'idle'
}

// ---------- 餐單內容 ----------
const menuRecipes = computed(() =>
  (menu.value?.dishes ?? []).map((dish) => recipeStore.getRecipe(dish.recipeId)).filter(Boolean),
)

// 依這次煮的份數換算食材需求，再用與餐食日誌、扣庫相同的規則比對冰箱（名稱、單位、數量都要對得上）
function fridgeMatcher(servings) {
  return (recipe) => fridgeStore.findMatches(recipeStore.scaleIngredients(recipe.id, servings || recipe.servings))
}

function fridgeItemsFor(recipe) {
  if (!settings.useFridge) return []
  return fridgeMatcher(menu.value?.servings)(recipe)
}

const summary = computed(() => {
  const recipes = menuRecipes.value
  const fridgeIds = new Set(recipes.flatMap((recipe) => fridgeItemsFor(recipe).map((item) => item.id)))
  // 每人熱量 = 整桌熱量（每道每份熱量 × 這次煮的份數）÷ 用餐人數
  const servings = menu.value?.servings ?? 0
  const people = menu.value?.people ?? settings.people
  const tableKcal = recipes.reduce((sum, recipe) => sum + recipe.kcal * servings, 0)
  return {
    dishCount: recipes.filter((recipe) => recipe.type === 'dish').length,
    soupCount: recipes.filter((recipe) => recipe.type === 'soup').length,
    kcal: people ? Math.round(tableKcal / people / 10) * 10 : 0,
    minutes: Math.round(recipes.reduce((sum, recipe) => sum + recipe.cookTime, 0) / 5) * 5,
    fridgeCount: fridgeIds.size,
  }
})

const usedFridgeItems = computed(() => {
  const map = new Map()
  menuRecipes.value.forEach((recipe) => fridgeItemsFor(recipe).forEach((item) => map.set(item.id, item)))
  return [...map.values()]
})

// 為什麼推薦這桌？
const reasons = computed(() => {
  const memberCount = selectedMembers.value.length
  const { guest, needs } = settings

  const needParts = []
  if (guest.allergens.length || guest.avoid.length) {
    needParts.push(`訪客忌口：${[...guest.allergens, ...guest.avoid].join('、')}`)
  }
  if (guest.dietTypes.length) {
    const names = dietTypes.filter((type) => guest.dietTypes.includes(type.id)).map((type) => type.name)
    needParts.push(`訪客飲食：${names.join('、')}`)
  }
  if (guest.spicy != null) needParts.push(`訪客辣度：${SPICY_LEVELS[guest.spicy]}`)
  if (needs.wants.length) needParts.push(`今天想吃：${needs.wants.join('、')}`)
  if (needs.flavors.length) {
    needParts.push(`調味：${FLAVOR_OPTIONS.filter((f) => needs.flavors.includes(f)).join('、')}`)
  }
  if (needs.texture !== '不指定') needParts.push(`口感：${needs.texture}`)
  if (needs.note.trim()) needParts.push(`其他：${needs.note.trim()}`)

  const hasGuest = hasGuestSettings(guest)
  const hasNeed = hasNeeds(needs)
  const needTitle =
    hasGuest && hasNeed ? '已加入訪客與今天的喜好' : hasGuest ? '已加入訪客飲食需求' : '已加入今天的喜好'

  const fridgeNames = usedFridgeItems.value.map((item) => item.name)
  let fridge
  if (!settings.useFridge) {
    fridge = {
      title: '這次不使用冰箱庫存',
      description: '沒有勾選「使用冰箱庫存食材」，配餐時不考慮現有庫存。',
      tag: '依需求配餐',
    }
  } else if (fridgeNames.length) {
    fridge = {
      title: '優先使用現有食材',
      description: `已將冰箱現有庫存納入配餐條件，這桌會用到：${fridgeNames.join('、')}。`,
      tag: '減少額外採買',
    }
  } else {
    fridge = {
      title: '這次沒有用到庫存',
      description: '冰箱現有食材和這桌菜沒有重疊，所需食材都要另外採買。',
      tag: '需全部採買',
    }
  }

  return [
    memberCount
      ? {
          label: '家庭飲食偏好',
          title: `已套用 ${memberCount} 位成員設定`,
          description: '已依本次用餐成員的忌口、過敏與個人偏好過濾不適合的料理。',
          tag: '家庭條件已套用',
        }
      : {
          label: '家庭飲食偏好',
          title: '未套用家庭成員設定',
          description: '這次沒有選擇家庭成員，會依手動人數、訪客與本次需求配餐。',
          tag: '以本次設定配餐',
        },
    needParts.length
      ? { label: '本次用餐需求', title: needTitle, description: `${needParts.join('；')}。`, tag: '臨時需求已套用' }
      : {
          label: '本次用餐需求',
          title: '沒有額外臨時需求',
          description: memberCount
            ? '沒有設定訪客或臨時飲食需求，因此以家庭成員原有偏好為主。'
            : '沒有設定訪客或臨時飲食需求，會依手動人數建立餐單。',
          tag: '無額外需求',
        },
    { label: '冰箱庫存', ...fridge },
  ]
})

// ---------- 更換菜色 ----------
const swapOpen = ref(false)
const swapTarget = ref(null)

const candidates = computed(() => {
  if (!swapTarget.value || !menu.value) return []
  return swapCandidates({
    recipes: recipeStore.recipes,
    current: swapTarget.value,
    menuIds: menu.value.dishes.map((dish) => dish.recipeId),
    members: selectedMembers.value,
    guest: settings.guest,
    needs: settings.needs,
    useFridge: settings.useFridge,
    findFridgeMatches: fridgeMatcher(menu.value.servings),
  })
})

function openSwap(recipe) {
  swapTarget.value = recipe
  swapOpen.value = true
}

function confirmSwap(newId) {
  const oldRecipe = swapTarget.value
  menu.value.dishes = menu.value.dishes.map((dish) =>
    dish.recipeId === oldRecipe.id ? { ...dish, recipeId: newId } : dish,
  )
  swapOpen.value = false
  toast.show(`已將「${oldRecipe.name}」換成「${recipeStore.getRecipe(newId).name}」`)
}

// ---------- 查看食譜 ----------
const recipeOpen = ref(false)
const viewing = ref(null)

function openRecipe(recipe) {
  viewing.value = recipe
  recipeOpen.value = true
}

// ---------- 儲存到餐食日誌 ----------
const conflictOpen = ref(false)
const conflictPlan = ref(null)
// 從餐食日誌「編輯餐單」進來時，同一天的原餐單就是正在修改的這份，不算重複。
const editingPlanId = requestedPlan && !isCookedPlanCopy ? requestedPlan.id : null
// 使用者在建立餐單前已確認取代的日期，儲存時不再重複詢問。
const replaceApprovedDate = ref('')
// 衝突視窗是從「建立餐單」還是「儲存到餐食日誌」打開的；取代時要接回原本的動作
const conflictSource = ref('build')
// 從餐食日誌編輯的餐單：改了日期再儲存時，要把原日期那筆移走，而不是多複製一份
const editingTargetId = ref(editingPlanId)
// 這次已經存過的那筆；換菜後再存同一天，不算跟別的餐單衝突
const lastSavedPlanId = ref(null)

function findConflictPlan() {
  const existing = mealPlanStore.getPlan(settings.date, MEAL_TYPE)
  if (!existing) return null
  // 完成餐單即使正好是原本開啟的那一筆，也不能當作可取代的編輯目標。
  if (existing.status === 'cooked') return existing
  if ([editingTargetId.value, lastSavedPlanId.value].includes(existing.id) || replaceApprovedDate.value === settings.date) return null
  return existing
}

function confirmReplace() {
  if (conflictPlan.value?.status === 'cooked') {
    conflictOpen.value = false
    toast.show('已完成餐單不可取代，請選擇其他日期重新排餐。', { variant: 'error' })
    return
  }
  replaceApprovedDate.value = settings.date
  conflictOpen.value = false
  if (conflictSource.value === 'save') saveToJournal({ replace: true })
  else buildMenu()
}
const saving = ref(false)

const conflictDishes = computed(() =>
  (conflictPlan.value?.dishes ?? [])
    .map((dish) => recipeStore.getRecipe(dish.recipeId)?.name)
    .filter(Boolean)
    .join('、'),
)

function buildPlan() {
  return {
    date: settings.date,
    mealType: MEAL_TYPE,
    servings: menu.value.servings,
    people: settings.people,
    size: settings.size,
    dishCount: settings.dishCount,
    soupCount: settings.soupCount,
    memberIds: [...settings.memberIds],
    guest: structuredClone(toRaw(settings.guest)),
    needs: structuredClone(toRaw(settings.needs)),
    useFridge: settings.useFridge,
    dishes: menu.value.dishes.map((dish) => ({ ...dish })),
    status: 'planned',
  }
}

async function saveToJournal({ replace = false } = {}) {
  if (saving.value || isGenerating.value || !menu.value) return
  submitted.value = true
  if (errorCount.value) {
    toast.show('用餐設定尚未完成，請確認後再儲存。', { variant: 'error' })
    return
  }
  if (isEditing.value) {
    toast.show('用餐設定已變更，請先重新建立餐單再儲存。', { variant: 'error' })
    return
  }
  conflictOpen.value = false

  if (!replace) {
    const existing = findConflictPlan()
    if (existing) {
      if (existing.status === 'cooked') {
        toast.show('這一天的餐單已完成並存入歷史紀錄，不能直接取代；請選擇其他日期重新排餐。', { variant: 'error' })
        return
      }
      conflictPlan.value = existing
      conflictSource.value = 'save'
      conflictOpen.value = true
      return
    }
  }

  saving.value = true
  const saveSettingsKey = settingsKey.value
  await new Promise((resolve) => setTimeout(resolve, 500))
  saving.value = false

  if (settingsKey.value !== saveSettingsKey || menu.value?.settingsKey !== saveSettingsKey) {
    toast.show('用餐設定已變更，請先重新建立餐單再儲存。', { variant: 'error' })
    return
  }

  // 展示用：離線時當作儲存失敗
  if (!navigator.onLine) {
    toast.show('儲存失敗，網路連線不穩定。餐單已保留，請再試一次', {
      variant: 'error',
      action: { label: '重試', onClick: () => saveToJournal({ replace }) },
    })
    return
  }

  const date = settings.date
  const saved = mealPlanStore.savePlan(buildPlan(), { replace: true })
  if (!saved.ok) {
    toast.show(saved.reason === 'cooked'
      ? '這一天的餐單已完成並存入歷史紀錄，不能直接取代；請選擇其他日期重新排餐。'
      : '儲存失敗，請重新確認餐單後再試一次。', { variant: 'error' })
    return
  }
  // 編輯餐單時改了日期：新日期已存好，把原本日期那筆（尚未完成的）移除，避免變成兩筆
  const previousId = editingTargetId.value
  if (previousId && previousId !== saved.plan.id) {
    const previous = mealPlanStore.plans.find((plan) => plan.id === previousId)
    if (previous && previous.status !== 'cooked') mealPlanStore.removePlan(previousId)
  }
  if (editingTargetId.value) editingTargetId.value = saved.plan.id
  lastSavedPlanId.value = saved.plan.id
  toast.show(`已儲存到 ${formatShort(date)} ${MEAL_TYPE}的餐食日誌`, {
    action: { label: '前往查看', onClick: () => router.push({ path: '/journal', query: { date } }) },
    duration: 5000,
  })
}

// 改存其他日期：關掉彈窗，跳到日期欄位
const dateField = ref(null)

function chooseOtherDate() {
  conflictOpen.value = false
  dateField.value?.$el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  dateField.value?.$el.querySelector('button')?.focus()
}
</script>

<template>
  <section class="page">
    <PageTitle title="今天，煮點什麼好呢？" description="把家人的喜好，配成一桌剛好的飯菜。" />

    <!-- ========== 用餐設定 ========== -->
    <section class="block" aria-labelledby="settings-title">
      <header class="block__head">
        <h2 id="settings-title" class="block__title">{{ isEditing || editingPlanId ? '修改用餐設定' : '用餐設定' }}</h2>
      </header>

      <p v-if="requestedRecipeIds.length" class="imported-recipe" role="status">
        已從冰箱帶入「{{ requestedRecipeIds.map((id) => recipeStore.getRecipe(id)?.name).filter(Boolean).join('、') }}」，建立餐單時會優先保留。
      </p>

      <fieldset class="settings-form" :disabled="isGenerating" :aria-busy="isGenerating">
      <div class="field-group">
        <p class="field-label">家庭成員（選填）</p>
        <div v-if="familyStore.activeMembers.length" class="members">
          <MemberCheckCard
            v-for="member in familyStore.activeMembers"
            :key="member.id"
            :member="member"
            :model-value="isSelected(member.id)"
            @update:model-value="toggleMember(member.id, $event)"
          />
        </div>
        <p v-else class="members-empty">
          不選家庭成員也能建立餐單；如要套用家人的偏好，可先到<RouterLink to="/family">家庭管理新增家人</RouterLink>。
        </p>
      </div>

      <div class="fields">
        <BaseSelect
          ref="dateField"
          v-model="settings.date"
          type="date"
          label="日期"
          placeholder="請選擇或輸入"
          :min="today"
          :marked="plannedDates"
          :error="shownErrors.date"
          class="fields__date"
        />
        <label class="custom-dish-field" data-onboarding-target="menu-people">人數
          <span><button type="button" aria-label="減少人數" :disabled="isGenerating || settings.people <= minimumPeople" @click="changePeople(-1)"><i class="fa-solid fa-minus"></i></button><input :value="settings.people" type="number" :min="minimumPeople" :max="MAX_PEOPLE" inputmode="numeric" @input="updatePeople($event.target.value)" /><button type="button" aria-label="增加人數" :disabled="isGenerating || settings.people >= MAX_PEOPLE" @click="changePeople(1)"><i class="fa-solid fa-plus"></i></button></span>
          <small v-if="shownErrors.people" class="field-error">{{ shownErrors.people }}</small>
        </label>
        <label class="custom-dish-field" data-onboarding-target="menu-dishes">菜數
          <span><button type="button" aria-label="減少菜數" :disabled="isGenerating || settings.dishCount <= 0" @click="changeDishCount(-1)"><i class="fa-solid fa-minus"></i></button><input :value="settings.dishCount" type="number" min="0" :max="MAX_PEOPLE" inputmode="numeric" @input="updateDishCount($event.target.value)" /><button type="button" aria-label="增加菜數" :disabled="isGenerating || settings.dishCount >= MAX_PEOPLE" @click="changeDishCount(1)"><i class="fa-solid fa-plus"></i></button></span>
          <small v-if="shownErrors.dishCount" class="field-error">{{ shownErrors.dishCount }}</small>
        </label>
        <label class="custom-dish-field">湯數
          <span><button type="button" aria-label="減少湯數" :disabled="isGenerating || settings.soupCount <= 0" @click="changeSoupCount(-1)"><i class="fa-solid fa-minus"></i></button><input :value="settings.soupCount" type="number" min="0" :max="MAX_PEOPLE" inputmode="numeric" @input="updateSoupCount($event.target.value)" /><button type="button" aria-label="增加湯數" :disabled="isGenerating || settings.soupCount >= MAX_PEOPLE" @click="changeSoupCount(1)"><i class="fa-solid fa-plus"></i></button></span>
        </label>
      </div>

      <div class="panels">
        <SettingPanel
          v-model:open="guestOpen"
          title="本次訪客"
          :subtitle="guestSubtitle"
          :done="hasGuestSettings(settings.guest)"
        >
          <GuestSettings v-model="settings.guest" />
          <template #footer>
            <BaseButton variant="secondary" @click="clearGuest">清除</BaseButton>
            <BaseButton @click="guestOpen = false">確認</BaseButton>
          </template>
        </SettingPanel>

        <SettingPanel
          v-model:open="needsOpen"
          title="本次用餐需求"
          :subtitle="needsSubtitle"
          :done="hasNeeds(settings.needs)"
        >
          <NeedsSettings v-model="settings.needs" />
          <template #footer>
            <BaseButton variant="secondary" @click="clearNeeds">清除</BaseButton>
            <BaseButton @click="needsOpen = false">確認</BaseButton>
          </template>
        </SettingPanel>
      </div>

      <BaseCheckbox v-model="settings.useFridge">使用冰箱庫存食材</BaseCheckbox>

      <div class="actions">
        <p v-if="submitted && errorCount" class="actions__error" role="alert">
          還有 {{ errorCount }} 項必填設定未完成，請補齊後再建立餐單
        </p>
        <div class="actions__buttons">
          <BaseButton variant="secondary" :disabled="isGenerating" @click="clearSettings">清除設定</BaseButton>
          <BaseButton
            data-onboarding-target="menu-build"
            :disabled="isGenerating || (submitted && errorCount > 0)"
            :class="{ 'is-loading': status === 'loading' }"
            :aria-busy="status === 'loading'"
            @click="buildMenu"
          >
            {{ status === 'loading' ? '建立中…' : '建立餐單' }}
          </BaseButton>
        </div>
      </div>
      </fieldset>
    </section>

    <!-- ========== 本次餐單 ========== -->
    <section ref="resultSection" class="block block--result" aria-labelledby="menu-title">
      <h2 id="menu-title" class="block__title">本次餐單</h2>

      <MealSummary v-bind="status === 'idle' && menu ? summary : {}" />

      <!-- 建立中 -->
      <div v-if="status === 'loading'" class="placeholder" aria-live="polite">
        <p class="placeholder__title">配餐中…</p>
        <p class="placeholder__desc">
          正在比對 {{ selectedMembers.length }} 位成員的過敏忌口、今天的用餐需求與冰箱庫存，請稍候。
        </p>
        <div class="progress"><span class="progress__bar"></span></div>
        <div class="skeletons" aria-hidden="true">
          <div v-for="n in 3" :key="n" class="skeleton">
            <span class="skeleton__image"></span>
            <span class="skeleton__line is-short"></span>
            <span class="skeleton__line"></span>
            <span class="skeleton__line is-tiny"></span>
          </div>
        </div>
      </div>

      <!-- 餐單生成失敗 -->
      <div v-else-if="status === 'error'" class="placeholder is-error" role="alert">
        <AppIcon name="tableware" class="placeholder__icon" />
        <p class="placeholder__title">餐單生成失敗</p>
        <p class="placeholder__desc">
          系統暫時無法產生餐單，可能是網路不穩或伺服器忙碌。<br />你的用餐設定都已保留，請稍後再試一次。
        </p>
        <BaseButton @click="buildMenu">重新建立餐單</BaseButton>
      </div>

      <!-- 結果 -->
      <template v-else-if="menu && menuRecipes.length">
        <BaseAlert
          v-if="menu.shortage"
          variant="info"
          title="符合條件的料理不夠多"
          :message="`已先配出 ${summary.dishCount} 菜 ${summary.soupCount} 湯。可以調整本次訪客或用餐需求，或減少菜數後再建立一次。`"
        />

        <div class="recipes">
          <RecipeCard
            v-for="recipe in menuRecipes"
            :key="recipe.id"
            :recipe="recipe"
            :fridge-items="fridgeItemsFor(recipe)"
            @swap="openSwap(recipe)"
            @view="openRecipe(recipe)"
          />
        </div>

        <div class="actions__buttons">
          <BaseButton variant="secondary" @click="clearMenu">清空本次餐單</BaseButton>
          <BaseButton :disabled="isEditing" :class="{ 'is-loading': saving }" @click="saveToJournal()">
            {{ saving ? '儲存中…' : isEditing ? '請先重新建立餐單' : '儲存到餐食日誌' }}
          </BaseButton>
        </div>

        <MenuReasons :reasons="reasons" />
      </template>

      <!-- 條件太嚴，一道都配不出來 -->
      <div v-else-if="menu" class="placeholder is-error" role="alert">
        <AppIcon name="tableware" class="placeholder__icon" />
        <p class="placeholder__title">找不到符合條件的料理</p>
        <p class="placeholder__desc">這次的忌口與飲食限制把所有菜色都排除了，請調整本次訪客或用餐成員後再試一次。</p>
      </div>

      <!-- 空畫面 -->
      <div v-else class="placeholder">
        <AppIcon name="tableware" class="placeholder__icon" />
        <p class="placeholder__title">尚未建立餐單</p>
        <p class="placeholder__desc">按下「建立餐單」後，料理卡片（菜名／烹調時間／食材／食譜）會顯示於此</p>
      </div>
    </section>

    <SwapDialog v-model:open="swapOpen" :current="swapTarget" :candidates="candidates" @confirm="confirmSwap" />
    <RecipeDialog v-model:open="recipeOpen" :recipe="viewing" :servings="menu?.servings ?? 0" />

    <!-- 當日已有餐單 -->
    <BaseDialog
      v-model:open="conflictOpen"
      :title="conflictPlan?.status === 'cooked' ? `${formatMonthDay(settings.date)} ${MEAL_TYPE}已完成` : `${formatMonthDay(settings.date)} ${MEAL_TYPE}已經有餐單了`"
      :description="conflictPlan?.status === 'cooked' ? '已完成餐單與扣庫紀錄會保留，請選擇其他日期重新排餐。' : '建立新的餐單前，請選擇要如何處理原本的餐單。'"
      :width="560"
    >
      <p class="conflict__label">目前已儲存的餐單</p>
      <div v-if="conflictPlan" class="conflict__plan">
        <p class="conflict__meta">
          {{ formatMonthDay(conflictPlan.date) }} {{ formatWeekday(conflictPlan.date) }} {{ conflictPlan.mealType }} ・
          {{ conflictPlan.servings }}人份
        </p>
        <p class="conflict__dishes">{{ conflictDishes }}</p>
      </div>
      <p v-if="conflictPlan?.status !== 'cooked'" class="conflict__warning">選擇「取代原餐單」後，原本的餐單與採買清單將被新的餐單覆蓋，無法復原。</p>
      <template #footer>
        <BaseButton variant="secondary" @click="chooseOtherDate">改存其他日期</BaseButton>
        <BaseButton v-if="conflictPlan?.status !== 'cooked'" @click="confirmReplace">取代原餐單</BaseButton>
        <BaseButton v-else @click="conflictOpen = false">知道了</BaseButton>
      </template>
    </BaseDialog>
  </section>
</template>

<style scoped>
.page {
  padding: var(--page-padding-y) var(--page-padding-x);
}

@media (min-width: 1025px) {
  .page {
    padding-top: 0;
  }
}

/* ---------- 區塊 ---------- */
.block {
  display: flex;
  flex-direction: column;
  gap: var(--space-24);
  padding: var(--space-28) 0;
}

.block__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.block__title {
  font-size: var(--fs-subtitle-1);
  font-weight: 400;
  line-height: normal;
  color: var(--text-title);
}

.block__edit {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 18px;
  color: var(--text-body);
}

.block__edit:hover {
  background: var(--brand-secondary-light);
}

.imported-recipe {
  margin: calc(var(--space-8) * -1) 0 0;
  padding: 9px 12px;
  border-left: 3px solid var(--brand-primary);
  border-radius: 0 8px 8px 0;
  background: var(--brand-secondary-light);
  color: var(--text-body);
  font-size: var(--fs-caption-1);
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

/* 生成期間要凍結整組設定，但 fieldset 本身不能改變既有版面。 */
.settings-form {
  display: contents;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.settings-form:disabled {
  opacity: .72;
}

.field-label {
  font-size: var(--fs-body-2);
  line-height: normal;
  color: var(--text-body);
}

.field-error {
  font-size: var(--fs-caption-2);
  color: var(--text-danger);
}

.custom-dish-field {
  /* 與 BaseSelect 的「label + 44px control」使用同一個兩列尺寸，
     避免自訂菜數步進器因 label 行高而往下偏移。 */
  display: grid;
  grid-template-rows: normal 44px;
  row-gap: var(--space-4);
  align-content: start;
  min-width: 0;
  color: var(--text-body);
  font-size: var(--fs-body-2);
  line-height: normal;
}

.custom-dish-field > span {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 40px;
  height: 44px;
}

.custom-dish-field input {
  box-sizing: border-box;
  width: 100%;
  height: 44px;
  padding: 0 var(--space-8);
  border: 1px solid var(--brand-primary-border);
  border-right: 0;
  border-left: 0;
  border-radius: 0;
  background: transparent;
  color: var(--text-body);
  font: inherit;
  text-align: center;
  outline: none;
}

.custom-dish-field input:focus {
  border-color: var(--brand-primary);
}

.custom-dish-field button {
  display: grid;
  height: 44px;
  place-items: center;
  border: 1px solid var(--brand-primary-border);
  background: var(--brand-secondary-light);
  color: var(--text-secondary);
  font-size: 12px;
}

.custom-dish-field button:disabled {
  cursor: not-allowed;
  opacity: .38;
}

.custom-dish-field button:first-child {
  border-radius: 12px 0 0 12px;
}

.custom-dish-field button:last-child {
  border-radius: 0 12px 12px 0;
}

.members {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-12);
}

.members-empty {
  font-size: var(--fs-body-2);
  color: var(--text-secondary);
}

.members-empty a {
  color: var(--text-special);
  text-decoration: underline;
}

.fields {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-16);
  align-items: start;
}

.fields__date {
  grid-column: 1 / -1;
}

.panels {
  display: grid;
  gap: var(--space-16);
  align-items: start;
}

.actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-8);
}

.actions__error {
  font-size: var(--fs-caption-2);
  color: var(--text-danger);
  text-align: right;
}

.actions__buttons {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--space-8);
}

.actions__buttons :deep(.btn) {
  /* 用餐設定的雙操作鈕依文字內容決定寬度，不拉成滿版膠囊。 */
  min-width: 0;
}

.is-loading {
  pointer-events: none;
}

/* ---------- 本次餐單 ---------- */
.block--result {
  padding-bottom: var(--space-60);
}

.recipes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  /* 不讓同列較長的卡片把其他卡片拉高，避免出現不規則的留白。 */
  align-items: start;
  gap: var(--space-20);
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-12);
  min-height: 354px;
  padding: var(--space-40) var(--space-20);
  border: 1px dashed var(--brand-primary-border);
  border-radius: 12px 0 12px 0;
  text-align: center;
}

.placeholder.is-error {
  border-color: var(--status-error);
}

.placeholder__icon {
  font-size: 22px;
  color: var(--text-body);
}

.placeholder__title {
  font-size: var(--fs-subtitle-2);
  line-height: normal;
  color: var(--text-title);
}

.is-error .placeholder__title,
.is-error .placeholder__desc {
  color: var(--text-danger);
}

.placeholder__desc {
  max-width: 520px;
  font-size: var(--fs-body-2);
  line-height: 1.6;
  color: var(--text-secondary);
}

.progress {
  width: min(320px, 100%);
  height: 6px;
  border-radius: 999px;
  background: var(--brand-secondary);
  overflow: hidden;
}

.progress__bar {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--brand-primary);
  animation: progress 1.8s ease-out forwards;
}

@keyframes progress {
  from {
    width: 8%;
  }
  to {
    width: 92%;
  }
}

.skeletons {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 210px));
  gap: var(--space-12);
  width: 100%;
  justify-content: center;
  margin-top: var(--space-12);
}

.skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  padding: var(--space-12);
  border: 1px solid var(--brand-secondary);
  border-radius: 4px;
  background: var(--bg-surface);
}

.skeleton__image,
.skeleton__line {
  display: block;
  border-radius: 4px;
  background: var(--brand-secondary-light);
  animation: pulse 1.2s ease-in-out infinite alternate;
}

.skeleton__image {
  height: 68px;
}

.skeleton__line {
  height: 10px;
}

.skeleton__line.is-short {
  width: 65%;
}

.skeleton__line.is-tiny {
  width: 45%;
}

@keyframes pulse {
  to {
    background: var(--brand-secondary);
  }
}

/* ---------- 當日已有餐單 ---------- */
.conflict__label {
  font-size: var(--fs-body-1);
  color: var(--text-body);
}

.conflict__plan {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-12) var(--space-16);
  border: 1px solid var(--brand-secondary);
  border-radius: 12px;
  background: var(--brand-secondary-light);
}

.conflict__meta {
  font-size: var(--fs-body-2);
  color: var(--text-secondary);
}

.conflict__dishes {
  font-size: var(--fs-body-1);
  color: var(--text-body);
}

.conflict__warning {
  font-size: var(--fs-caption-2);
  color: var(--text-danger);
}

/* ---------- 平板 ---------- */
@media (min-width: 641px) {
  .block {
    padding: var(--space-40) 0;
  }

  .fields {
    /* 設定欄位一律成對排列；避免平板出現前三欄一排、第四欄孤立的 3+1。 */
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .fields__date {
    grid-column: auto;
  }

  .panels {
    grid-template-columns: 1fr 1fr;
  }

  .recipes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 641px) and (max-width: 1024px) {
  /* 與家庭管理／冰箱一致：外層先保留平板頁面起始距離，再放共用 PageTitle。 */
  .page { padding: var(--page-padding-y) 28px 48px; }
  .block { gap: 18px; padding: 24px 0; }
  .block__title { font-size: 20px; }
  .fields { gap: 14px; }
  .panels { gap: 14px; }
}

/* ---------- 桌機（Figma 1440 內容區左右 40） ---------- */
@media (min-width: 1025px) {
  .block {
    gap: var(--space-20);
    padding: 28px 40px;
  }

  /* Figma Desktop - 來點煮意：主標題維持共用 29px，內容層級比其他頁面更精緻。 */
  .block__title {
    font-size: 20px;
  }

  :deep(.member-card__name) {
    font-size: 16px;
  }

  :deep(.select-field__label),
  .field-label {
    font-size: 13px;
  }

  :deep(.select-field__control),
  :deep(.select-field__date-placeholder) {
    font-size: 13px;
  }

  :deep(.panel__title) {
    font-size: 16px;
  }

  :deep(.panel__subtitle) {
    font-size: 11px;
  }

  :deep(.panel__toggle) {
    font-size: 18px;
  }

  /* 本次餐單摘要依 Figma 保留較明確的資訊層級。 */
  :deep(.summary dt) {
    font-size: 16px;
  }

  :deep(.summary dd) {
    font-size: 20px;
  }

  .members {
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }

  .fields {
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
  }

  .panels {
    gap: 20px;
  }

  .recipes {
    grid-template-columns: repeat(3, 1fr);
  }

  .block--result {
    padding-top: 24px;
  }
}

/* 左側 navbar 已出現、但主內容仍不足以容納完整四欄的緊湊桌機。 */
@media (min-width: 1025px) and (max-width: 1279px) {
  .page :deep(.page-title) { padding: 36px 28px 28px; }
  .page :deep(.page-title__text) { gap: var(--space-8); }
  .page :deep(.page-title__desc) { font-size: 14px; }
  .block { gap: 18px; padding: 24px 28px; }
  .members { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .fields { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .panels { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .recipes { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
  .block--result { padding-top: 20px; }
}

@media (max-width: 640px) {
  .members { gap: 8px; }
  .block {
    gap: var(--space-16);
    /* 與家庭管理／冰箱相同：外層 16px + 區塊內 16px，內容從 32px 起。 */
    padding: var(--space-20) var(--page-padding-x);
  }

  .block__edit {
    width: 28px;
    height: 28px;
    font-size: 16px;
  }

  .fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .fields__date {
    grid-column: auto;
  }
  .skeletons {
    grid-template-columns: repeat(2, 1fr);
  }

  .skeleton:nth-child(3) {
    display: none;
  }
}
</style>
