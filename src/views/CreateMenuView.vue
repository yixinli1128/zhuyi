<script setup>
// 來點煮意（Figma Desktop - 來點煮意：空畫面、本次訪客／本次用餐需求-設定中、錯誤-設定未完成、
// 建立中、錯誤-餐單生成失敗、結果畫面、修改畫面、更換一道、查看食譜、錯誤-當日已有餐單、
// 儲存到餐桌日誌成功／失敗）
// 直接進入「來點煮意」時，永遠從 Figma 的每日空狀態開始。
// 已儲存的餐單則由餐食日誌管理；未來從日誌編輯時會以明確的編輯參數帶入。
import { computed, nextTick, reactive, ref, toRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFamilyStore } from '@/stores/family'
import { useFridgeStore } from '@/stores/fridge'
import { useRecipeStore } from '@/stores/recipes'
import { useMealPlanStore } from '@/stores/mealPlans'
import { useToastStore } from '@/stores/toast'
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

const familyStore = useFamilyStore()
const fridgeStore = useFridgeStore()
const recipeStore = useRecipeStore()
const mealPlanStore = useMealPlanStore()
const toast = useToastStore()
const router = useRouter()
const route = useRoute()

const today = toDateKey()
const MEAL_TYPE = '晚餐'

// ---------- 用餐設定 ----------
function defaultSettings() {
  return {
    memberIds: [],
    date: '',
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

const requestedDate = typeof route.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.date)
  ? route.query.date
  : null
const requestedPlan = typeof route.query.planId === 'string'
  ? mealPlanStore.plans.find((plan) => plan.id === route.query.planId) ?? null
  : null
const requestedRecipeIds = typeof route.query.recipeId === 'string'
  ? route.query.recipeId.split(',').filter((id) => recipeStore.getRecipe(id))
  : []

function restoreSettings(plan) {
  if (!plan) return {}
  const dishes = plan.dishes ?? []
  // 舊版已儲存的餐單可能缺少部分訪客／需求欄位；回編時補齊結構，避免設定面板因 undefined 無法載入。
  const savedGuest = plan.guest ?? {}
  const savedNeeds = plan.needs ?? {}
  return {
    memberIds: [...(plan.memberIds ?? [])],
    date: plan.date,
    people: plan.people ?? plan.servings ?? 0,
    size: plan.size ?? 'normal',
    dishCount: plan.dishCount ?? dishes.filter((dish) => dish.type === 'dish').length,
    soupCount: plan.soupCount ?? dishes.filter((dish) => dish.type === 'soup').length ?? 0,
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

const guestOpen = ref(false)
const needsOpen = ref(false)

const selectedMembers = computed(() =>
  familyStore.activeMembers.filter((member) => settings.memberIds.includes(member.id)),
)

function isSelected(id) {
  return settings.memberIds.includes(id)
}

// 勾選家人時，人數跟著變（之前手動多加的訪客人數保留）；未選任何人時可回到 0。
function toggleMember(id, checked) {
  const before = settings.memberIds.length
  const extra = Math.max(0, Number(settings.people) - before)
  settings.memberIds = checked
    ? [...settings.memberIds, id]
    : settings.memberIds.filter((memberId) => memberId !== id)
  const after = settings.memberIds.length
  settings.people = Math.min(20, Math.max(0, after + extra))
}

function updatePeople(value) {
  const count = Number(value)
  settings.people = Number.isInteger(count) ? Math.min(20, Math.max(0, count)) : 0
}

function changePeople(change) {
  settings.people = Math.min(20, Math.max(0, (Number(settings.people) || 0) + change))
}

function updateSoupCount(value) {
  const count = Number(value)
  settings.soupCount = Number.isInteger(count) ? Math.min(20, Math.max(0, count)) : 0
}

function changeSoupCount(change) {
  settings.soupCount = Math.min(20, Math.max(0, (Number(settings.soupCount) || 0) + change))
}
function updateDishCount(value) {
  const count = Number(value)
  settings.dishCount = Number.isInteger(count) ? Math.min(20, Math.max(0, count)) : 0
}

function changeDishCount(change) {
  const current = Number(settings.dishCount) || 0
  settings.dishCount = Math.min(20, Math.max(0, current + change))
}

const guestSubtitle = computed(() =>
  hasGuestSettings(settings.guest) ? '已設定成功，將會套用本餐' : '尚未設定，點此新增飲食需求',
)
const needsSubtitle = computed(() =>
  hasNeeds(settings.needs) ? '已設定成功，將會套用本餐' : '尚未設定，點此選擇今天的喜好',
)

function clearGuest() {
  settings.guest = emptyGuest()
}

function clearNeeds() {
  settings.needs = emptyNeeds()
}

// ---------- 驗證（Figma 錯誤-設定未完成） ----------
const submitted = ref(false)

const errors = computed(() => ({
  members: settings.memberIds.length ? '' : '請至少選擇 1 位用餐的家庭成員',
  date: !settings.date ? '請選擇用餐日期' : settings.date < today ? '用餐日期不能早於今天' : '',
  people: settings.people < 1 ? '人數至少為 1 位' : '',
  dishCount: settings.dishCount < 1 ? '菜數至少為 1 道' : '',
}))

const shownErrors = computed(() => (submitted.value ? errors.value : {}))
const errorCount = computed(() => Object.values(errors.value).filter(Boolean).length)

function clearSettings() {
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
const status = ref('idle') // idle → loading → idle；失敗時 error
const resultSection = ref(null)

// 每道菜要煮幾人份：家人的食量係數加總 ＋ 多出來的訪客各算 1 份，再乘上份量
function calcServings() {
  const memberPortion = selectedMembers.value.reduce((sum, member) => sum + (member.portionFactor ?? member.portion ?? 1), 0)
  const guests = Math.max(0, settings.people - selectedMembers.value.length)
  const factor = SIZE_OPTIONS.find((option) => option.value === settings.size)?.factor ?? 1
  return Math.max(1, Math.round((memberPortion + guests) * factor))
}

async function buildMenu() {
  submitted.value = true
  if (errorCount.value || status.value === 'loading') return

  // 未選份量時補上正常份量；人數與菜數必須由使用者明確設定至少 1。
  if (settings.size === '') settings.size = 'normal'
  guestOpen.value = false
  needsOpen.value = false

  status.value = 'loading'
  await nextTick()
  resultSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  await new Promise((resolve) => setTimeout(resolve, 1800)) // 模擬配餐中

  // 展示用：離線時當作配餐失敗
  if (!navigator.onLine) {
    status.value = 'error'
    return
  }

  const result = planMenu({
    recipes: recipeStore.recipes,
    members: selectedMembers.value,
    guest: settings.guest,
    needs: settings.needs,
    dishCount: settings.dishCount,
    soupCount: settings.soupCount,
    useFridge: settings.useFridge,
    findFridgeMatches: fridgeStore.findMatches,
    preferredRecipeIds: requestedRecipeIds,
  })

  menu.value = {
    dishes: result.dishes,
    servings: calcServings(),
    people: settings.people,
    shortage: result.shortage,
    settingsKey: settingsKey.value,
  }
  status.value = 'idle'
}

function clearMenu() {
  menu.value = null
  status.value = 'idle'
}

// ---------- 餐單內容 ----------
const menuRecipes = computed(() =>
  (menu.value?.dishes ?? []).map((dish) => recipeStore.getRecipe(dish.recipeId)).filter(Boolean),
)

function fridgeItemsFor(recipe) {
  if (!settings.useFridge) return []
  return fridgeStore.findMatches(recipe.ingredients.map((item) => item.name))
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
    {
      label: '家庭飲食偏好',
      title: `已套用 ${memberCount} 位成員設定`,
      description: '已依本次用餐成員的忌口、過敏與個人偏好過濾不適合的料理。',
      tag: '家庭條件已套用',
    },
    needParts.length
      ? { label: '本次用餐需求', title: needTitle, description: `${needParts.join('；')}。`, tag: '臨時需求已套用' }
      : {
          label: '本次用餐需求',
          title: '沒有額外臨時需求',
          description: '沒有設定訪客或臨時飲食需求，因此以家庭成員原有偏好為主。',
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
    findFridgeMatches: fridgeStore.findMatches,
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
  if (saving.value) return
  if (isEditing.value) {
    toast.show('用餐設定已變更，請先重新建立餐單再儲存。', { variant: 'error' })
    return
  }
  conflictOpen.value = false

  if (!replace) {
    const existing = mealPlanStore.getPlan(settings.date, MEAL_TYPE)
    if (existing) {
      conflictPlan.value = existing
      conflictOpen.value = true
      return
    }
  }

  saving.value = true
  await new Promise((resolve) => setTimeout(resolve, 500))
  saving.value = false

  // 展示用：離線時當作儲存失敗
  if (!navigator.onLine) {
    toast.show('儲存失敗，網路連線不穩定。餐單已保留，請再試一次', {
      variant: 'error',
      action: { label: '重試', onClick: () => saveToJournal({ replace }) },
    })
    return
  }

  const date = settings.date
  mealPlanStore.savePlan(buildPlan(), { replace: true })
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
  dateField.value?.$el.querySelector('input')?.focus()
}
</script>

<template>
  <section class="page">
    <PageTitle title="今天，煮點什麼好呢？" description="把家人的喜好，配成一桌剛好的飯菜。" />

    <!-- ========== 用餐設定 ========== -->
    <section class="block" aria-labelledby="settings-title">
      <header class="block__head">
        <h2 id="settings-title" class="block__title">{{ isEditing ? '修改用餐設定' : '用餐設定' }}</h2>
        <RouterLink to="/family" class="block__edit" aria-label="編輯家庭成員" title="編輯家庭成員">
          <i class="fa-regular fa-pen-to-square" aria-hidden="true"></i>
        </RouterLink>
      </header>

      <p v-if="requestedRecipeIds.length" class="imported-recipe" role="status">
        已從冰箱帶入「{{ requestedRecipeIds.map((id) => recipeStore.getRecipe(id)?.name).filter(Boolean).join('、') }}」，建立餐單時會優先保留。
      </p>

      <div class="field-group">
        <p class="field-label">家庭成員</p>
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
          還沒有家庭成員，<RouterLink to="/family">先到家庭管理新增家人</RouterLink>。
        </p>
        <p v-if="shownErrors.members" class="field-error">{{ shownErrors.members }}</p>
      </div>

      <div class="fields">
        <BaseSelect
          ref="dateField"
          v-model="settings.date"
          type="date"
          label="日期"
          placeholder="請選擇或輸入"
          :min="today"
          :error="shownErrors.date"
          class="fields__date"
        />
        <label class="custom-dish-field">人數
          <span><button type="button" aria-label="減少人數" :disabled="settings.people <= 0" @click="changePeople(-1)"><i class="fa-solid fa-minus"></i></button><input :value="settings.people" type="number" min="0" max="20" inputmode="numeric" @input="updatePeople($event.target.value)" /><button type="button" aria-label="增加人數" :disabled="settings.people >= 20" @click="changePeople(1)"><i class="fa-solid fa-plus"></i></button></span>
          <small v-if="shownErrors.people" class="field-error">{{ shownErrors.people }}</small>
        </label>
        <label class="custom-dish-field">菜數
          <span><button type="button" aria-label="減少菜數" :disabled="settings.dishCount <= 0" @click="changeDishCount(-1)"><i class="fa-solid fa-minus"></i></button><input :value="settings.dishCount" type="number" min="0" max="20" inputmode="numeric" @input="updateDishCount($event.target.value)" /><button type="button" aria-label="增加菜數" :disabled="settings.dishCount >= 20" @click="changeDishCount(1)"><i class="fa-solid fa-plus"></i></button></span>
          <small v-if="shownErrors.dishCount" class="field-error">{{ shownErrors.dishCount }}</small>
        </label>
        <label class="custom-dish-field">湯數
          <span><button type="button" aria-label="減少湯數" :disabled="settings.soupCount <= 0" @click="changeSoupCount(-1)"><i class="fa-solid fa-minus"></i></button><input :value="settings.soupCount" type="number" min="0" max="20" inputmode="numeric" @input="updateSoupCount($event.target.value)" /><button type="button" aria-label="增加湯數" :disabled="settings.soupCount >= 20" @click="changeSoupCount(1)"><i class="fa-solid fa-plus"></i></button></span>
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
          <BaseButton variant="secondary" @click="clearSettings">清除設定</BaseButton>
          <BaseButton
            :disabled="submitted && errorCount > 0"
            :class="{ 'is-loading': status === 'loading' }"
            :aria-busy="status === 'loading'"
            @click="buildMenu"
          >
            {{ status === 'loading' ? '建立中…' : '建立餐單' }}
          </BaseButton>
        </div>
      </div>
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
        <i class="fa-solid fa-utensils placeholder__icon" aria-hidden="true"></i>
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
        <i class="fa-solid fa-utensils placeholder__icon" aria-hidden="true"></i>
        <p class="placeholder__title">找不到符合條件的料理</p>
        <p class="placeholder__desc">這次的忌口與飲食限制把所有菜色都排除了，請調整本次訪客或用餐成員後再試一次。</p>
      </div>

      <!-- 空畫面 -->
      <div v-else class="placeholder">
        <i class="fa-solid fa-utensils placeholder__icon" aria-hidden="true"></i>
        <p class="placeholder__title">尚未建立餐單</p>
        <p class="placeholder__desc">按下「建立餐單」後，料理卡片（菜名／烹調時間／食材／食譜）會顯示於此</p>
      </div>
    </section>

    <SwapDialog v-model:open="swapOpen" :current="swapTarget" :candidates="candidates" @confirm="confirmSwap" />
    <RecipeDialog v-model:open="recipeOpen" :recipe="viewing" :servings="menu?.servings ?? 0" />

    <!-- 當日已有餐單 -->
    <BaseDialog
      v-model:open="conflictOpen"
      :title="`${formatMonthDay(settings.date)} ${MEAL_TYPE}已經有餐單了`"
      description="儲存新的餐單前，請選擇要如何處理原本的餐單。"
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
      <p class="conflict__warning">選擇「取代原餐單」後，原本的餐單與採買清單將被新的餐單覆蓋，無法復原。</p>
      <template #footer>
        <BaseButton variant="secondary" @click="chooseOtherDate">改存其他日期</BaseButton>
        <BaseButton @click="saveToJournal({ replace: true })">取代原餐單</BaseButton>
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
  min-width: 150px;
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
