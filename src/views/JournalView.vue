<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageTitle from '@/components/layout/PageTitle.vue'
import { useMealPlanStore } from '@/stores/mealPlans'
import { useRecipeStore } from '@/stores/recipes'
import { useFridgeStore } from '@/stores/fridge'
import { useToastStore } from '@/stores/toast'
import { fromDateKey, toDateKey } from '@/utils/date'
import { englishUnits } from '@/utils/amount'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseDialog from '@/components/base/BaseDialog.vue'
import DatePickerDialog from '@/components/base/DatePickerDialog.vue'
import AppIcon from '@/components/base/AppIcon.vue'
import fridgeIconUrl from '@/assets/figma/fridge-empty.svg'

const fridgeIconStyle = { '--icon': `url("${fridgeIconUrl}")` }

const router = useRouter()
const route = useRoute()
const mealPlans = useMealPlanStore()
const recipes = useRecipeStore()
const fridge = useFridgeStore()
const toast = useToastStore()
const view = ref('calendar')
// 歷史紀錄預設聚焦目前月份；即使本月還沒有完成烹飪，也要保留該月份分頁與空狀態。
const currentHistoryMonth = toDateKey().slice(0, 7)
const historyFilter = ref(currentHistoryMonth)
const historyPage = ref(1)
const finishDialogOpen = ref(false)
const scheduleDialogOpen = ref(false)
const scheduleAnchor = ref(null)
const scheduleSourcePlan = ref(null)
const scheduleDate = ref('')
const groceryNeededExpanded = ref(true)
const groceryStockExpanded = ref(true)
const groceryContent = ref(null)
const today = toDateKey()
const requestedDate = typeof route.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.date)
  ? route.query.date
  : today
const month = ref(new Date(fromDateKey(requestedDate).getFullYear(), fromDateKey(requestedDate).getMonth(), 1))
const selectedDate = ref(requestedDate)
const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const monthLabel = computed(() => `${month.value.getFullYear()} 年 ${month.value.getMonth() + 1} 月`)
const selectedPlan = computed(() => mealPlans.getPlan(selectedDate.value))
const selectedRecipes = computed(() => (selectedPlan.value?.dishes ?? []).map(({ recipeId }) => recipes.getRecipe(recipeId)).filter(Boolean))
const plansByDate = computed(() => Object.fromEntries(mealPlans.plans.map((plan) => [plan.date, plan])))
function createCalendarDays(currentMonth) {
  const year = currentMonth.getFullYear()
  const monthIndex = currentMonth.getMonth()
  const start = new Date(year, monthIndex, 1).getDay()
  const count = new Date(year, monthIndex + 1, 0).getDate()
  const previousCount = new Date(year, monthIndex, 0).getDate()
  // 月曆固定完整六週，避免週日開頭、31 天的月份截掉最後一列。
  return Array.from({ length: 42 }, (_, index) => {
    const number = index - start + 1
    const date = number < 1 ? new Date(year, monthIndex - 1, previousCount + number)
      : number > count ? new Date(year, monthIndex + 1, number - count)
        : new Date(year, monthIndex, number)
    const key = toDateKey(date)
    return { key, number: date.getDate(), inMonth: date.getMonth() === monthIndex, plan: plansByDate.value[key] }
  })
}
const calendarDays = computed(() => createCalendarDays(month.value))
// 排餐月曆上標出已有餐單的日期
const plannedDates = computed(() => mealPlans.plans.map((plan) => plan.date))
const mealHeadline = computed(() => {
  const date = fromDateKey(selectedDate.value)
  return `${date.getMonth() + 1}月${date.getDate()}日 週${weekdays[date.getDay()]}晚餐`
})
const groceryDateLabel = computed(() => selectedDate.value.slice(5).replace('-', '-'))
const mealMeta = computed(() => {
  const minutes = selectedRecipes.value.reduce((total, recipe) => total + Number(recipe.cookTime || 0), 0)
  return { servings: selectedPlan.value?.servings ?? 3, minutes: minutes || 39 }
})
const planIngredientGroups = computed(() => {
  if (!selectedPlan.value) return []
  const grouped = new Map()
  selectedRecipes.value.forEach((recipe) => {
    recipes.scaleIngredients(recipe.id, selectedPlan.value.servings).forEach((item) => {
      const key = `${item.name}-${item.unit || ''}`
      const existing = grouped.get(key)
      if (existing) {
        existing.qty = existing.qty == null || item.qty == null ? null : existing.qty + item.qty
        existing.recipeNames.push(recipe.name)
      } else {
        grouped.set(key, { ...item, key, recipeNames: [recipe.name] })
      }
    })
  })
  return [...grouped.values()]
})
const ingredientCoverage = computed(() => {
  // 不論餐單是否勾選使用冰箱庫存，都比對冰箱並列出已有的食材；水、鹽、糖、油等基本品不列入採買。
  return fridge.matchRecipeRequirements(planIngredientGroups.value, { skipStaples: true }).requirementMatches
})
// 部分有庫存時，採買清單只列仍需補足的數量；庫存區則顯示這餐實際會使用的數量。
const groceryItems = computed(() => ingredientCoverage.value
  .filter((match) => !match.isFulfilled)
  .map((match) => ({ ...match.requirement, qty: match.missingQty == null ? match.requirement.qty : match.missingQty })))
const fridgeItems = computed(() => ingredientCoverage.value
  .filter((match) => match.isFulfilled || (match.matchedQty != null && match.matchedQty > 0))
  .map((match) => ({ ...match.requirement, qty: match.matchedQty == null ? match.requirement.qty : match.matchedQty })))
const groceryChecked = computed(() => new Set(selectedPlan.value?.groceryChecked ?? []))
const groceryCheckedCount = computed(() => groceryItems.value.filter((item) => groceryChecked.value.has(item.key) || groceryChecked.value.has(item.name)).length)
const groceryProgress = computed(() => groceryItems.value.length ? Math.round((groceryCheckedCount.value / groceryItems.value.length) * 100) : 0)
// 煮好晚餐時扣除的量，和採買清單「冰箱已有庫存」用同一份配置計算，兩邊一定一致
const fridgeDeductions = computed(() => selectedPlan.value ? fridge.previewConsumption(planIngredientGroups.value, { skipStaples: true }) : [])
const completionDateLabel = computed(() => {
  const date = fromDateKey(selectedDate.value)
  return `${date.getMonth() + 1}月${date.getDate()}日 晚餐`
})
const pageTitle = computed(() => view.value === 'calendar' ? '餐食日誌・餐單行事曆' : '餐食日誌・歷史紀錄')
const pageDescription = computed(() => view.value === 'calendar'
  ? '掌握全月份配餐與料理歷程，選取日期即時檢視專屬菜單與生鮮採買清單。'
  : '料理足跡已歸檔至飲食歷史紀錄，隨時可一鍵複製重煮。')
// 月份分頁依實際烹飪紀錄產生（新到舊），並永遠保留目前月份，讓本月可顯示空狀態。
const historyFilters = computed(() => ['all', ...new Set([currentHistoryMonth, ...mealPlans.plans
  .filter((plan) => plan.status === 'cooked')
  .map((plan) => plan.date.slice(0, 7))
  .sort((a, b) => b.localeCompare(a))])])
const historyFilterLabel = (filter) => filter === 'all' ? '全部紀錄' : filter.replace('-', '/')
const visibleHistoryPlans = computed(() => mealPlans.plans
  .filter((plan) => plan.status === 'cooked')
  .filter((plan) => historyFilter.value === 'all' || plan.date.startsWith(historyFilter.value))
  .sort((a, b) => b.date.localeCompare(a.date)))
// 計數標籤跟著分頁：全部紀錄顯示總數，選月份時顯示該月筆數
const historyCountLabel = computed(() => historyFilter.value === 'all'
  ? `共記錄 ${visibleHistoryPlans.value.length} 餐`
  : `${Number(historyFilter.value.slice(5))}月共記錄 ${visibleHistoryPlans.value.length} 餐`)
// 常煮排名：上方為前一個月、下方為前兩個月；該月沒有烹飪紀錄時顯示空狀態。
const topRecipeCards = computed(() => [1, 2].map((offset) => {
  const date = new Date()
  date.setDate(1)
  date.setMonth(date.getMonth() - offset)
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  const counts = new Map()
  mealPlans.plans
    .filter((plan) => plan.status === 'cooked' && plan.date.startsWith(key))
    .forEach((plan) => historyDishes(plan).forEach((name) => counts.set(name, (counts.get(name) ?? 0) + 1)))
  const ranked = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count }))
  return { key, title: `${date.getMonth() + 1}月常煮料理 TOP 3`, items: ranked }
}))
// Figma 的桌機首屏以七筆緊湊列式紀錄構成帳本，不讓清單只剩三筆而留白。
const historyPageSize = 7
const historyPageCount = computed(() => Math.max(1, Math.ceil(visibleHistoryPlans.value.length / historyPageSize)))
const pagedHistoryPlans = computed(() => visibleHistoryPlans.value.slice(
  (historyPage.value - 1) * historyPageSize,
  historyPage.value * historyPageSize,
))
const historyRangeLabel = computed(() => {
  const total = visibleHistoryPlans.value.length
  if (!total) return '顯示 00 - 00 / 共 00 筆'
  const from = String((historyPage.value - 1) * historyPageSize + 1).padStart(2, '0')
  const to = String(Math.min(historyPage.value * historyPageSize, total)).padStart(2, '0')
  return `顯示 ${from} - ${to} / 共 ${String(total).padStart(2, '0')} 筆`
})

function previousMonth() { month.value = new Date(month.value.getFullYear(), month.value.getMonth() - 1, 1) }
function nextMonth() { month.value = new Date(month.value.getFullYear(), month.value.getMonth() + 1, 1) }
function goToday() { const now = new Date(); month.value = new Date(now.getFullYear(), now.getMonth(), 1); selectedDate.value = today }
function selectDay(day) {
  selectedDate.value = day.key
  if (!day.inMonth) { const date = fromDateKey(day.key); month.value = new Date(date.getFullYear(), date.getMonth(), 1) }
}
function openCreate() {
  if (selectedPlan.value?.status === 'cooked') {
    toast.show('已完成餐單不可直接編輯；如要再煮，請使用歷史紀錄的「帶入今日晚餐」或「排餐至」。', { variant: 'error' })
    return
  }
  router.push({
    path: '/create',
    query: selectedPlan.value ? { date: selectedDate.value, planId: selectedPlan.value.id } : { date: selectedDate.value },
  })
}
function openRecipe(recipe) {
  router.push({ path: `/journal/recipe/${recipe.id}`, query: { date: selectedDate.value, ...(selectedPlan.value ? { planId: selectedPlan.value.id } : {}) } })
}
function toggleGroceryItem(item) {
  if (selectedPlan.value) mealPlans.toggleGroceryItem(selectedPlan.value.id, item.key)
}
function formatGroceryAmount(item) {
  if (item.qty == null) return englishUnits(item.amount)
  return englishUnits(`${item.qty}${item.unit || ''}`)
}
function requestCompleteMeal() {
  if (!selectedPlan.value) return
  finishDialogOpen.value = true
}
function confirmCompleteMeal() {
  if (!selectedPlan.value || selectedPlan.value.status === 'cooked') {
    finishDialogOpen.value = false
    return
  }
  const consumed = fridge.consumeIngredients(fridgeDeductions.value)
  const cooked = mealPlans.markCooked(selectedPlan.value.id, consumed)
  if (!cooked) {
    finishDialogOpen.value = false
    toast.show('這份餐單已更新，請重新確認後再操作。', { variant: 'error' })
    return
  }
  finishDialogOpen.value = false
  toast.show(
    consumed.length ? `已扣除冰箱庫存 ${consumed.length} 項，並存入歷史紀錄` : '已存入歷史烹飪紀錄。',
    { action: { label: '查看歷史紀錄', onClick: () => { view.value = 'history' } } },
  )
}
function openSchedulePicker(plan, event) {
  scheduleSourcePlan.value = plan
  scheduleAnchor.value = event?.currentTarget ?? null
  scheduleDate.value = today
  scheduleDialogOpen.value = true
}
function scheduleHistoryPlan(dateKey) {
  scheduleDate.value = dateKey
  const source = scheduleSourcePlan.value
  if (!source || !scheduleDate.value) return
  if (mealPlans.getPlan(scheduleDate.value)) {
    toast.show('這一天已有晚餐餐單，請選擇其他日期。')
    return
  }
  const { id, savedAt, cookedAt, inventoryConsumption, groceryChecked, ...copy } = source
  const saved = mealPlans.savePlan({ ...copy, date: scheduleDate.value, status: 'planned', groceryChecked: [] })
  if (!saved.ok) {
    toast.show(saved.reason === 'cooked' ? '已完成餐單不可覆寫，請選擇其他日期。' : '這一天已有晚餐餐單，請選擇其他日期。', { variant: 'error' })
    return
  }
  scheduleDialogOpen.value = false
  view.value = 'calendar'
  selectedDate.value = scheduleDate.value
  const date = fromDateKey(scheduleDate.value)
  month.value = new Date(date.getFullYear(), date.getMonth(), 1)
  toast.show(`已將餐單排至 ${date.getMonth() + 1}月${date.getDate()}日。`)
}
function formatHistoryDate(dateKey) {
  const date = fromDateKey(dateKey)
  return `${date.getMonth() + 1}月${date.getDate()}日 週${weekdays[date.getDay()]} 晚餐`
}
function historyDishes(plan) {
  return plan.dishes.map(({ recipeId }) => recipes.getRecipe(recipeId)?.name).filter(Boolean)
}
function bringHistoryToToday(plan) {
  if (plan.date === today) {
    toast.show('今日晚餐已完成；如要再煮，請使用「排餐至」選擇其他日期。', { variant: 'error' })
    return
  }
  router.push({ path: '/create', query: { date: today, planId: plan.id, source: 'history' } })
}
function setHistoryPage(page) {
  historyPage.value = Math.min(Math.max(page, 1), historyPageCount.value)
}

// 「來點煮意」儲存後以 /journal?date=YYYY-MM-DD 導入，月曆直接聚焦該日的已存餐單。
watch(() => route.query.date, (date) => {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return
  selectedDate.value = date
  const target = fromDateKey(date)
  month.value = new Date(target.getFullYear(), target.getMonth(), 1)
})
watch(historyFilter, () => { historyPage.value = 1 })
watch(selectedDate, async () => {
  await nextTick()
  groceryContent.value?.scrollTo({ top: 0 })
})
</script>

<template>
  <section class="page journal-page">
    <PageTitle :title="pageTitle" :description="pageDescription">
      <template #actions>
        <div class="view-switch" role="tablist" aria-label="餐食日誌檢視方式">
          <button :class="{ 'is-active': view === 'calendar' }" role="tab" aria-label="月曆檢視" :aria-selected="view === 'calendar'" @click="view = 'calendar'"><AppIcon name="calendar" /><span>月曆檢視</span></button>
          <button :class="{ 'is-active': view === 'history' }" role="tab" aria-label="歷史列表" :aria-selected="view === 'history'" @click="view = 'history'"><AppIcon name="history" /><span>歷史列表</span></button>
        </div>
      </template>
    </PageTitle>

    <main v-if="view === 'calendar'" class="journal-layout" :class="{ 'has-plan': selectedPlan && selectedRecipes.length }">
      <section class="selected-meal" aria-live="polite">
        <header class="meal-banner">
          <div class="meal-banner__copy">
            <h2>{{ mealHeadline }}</h2>
            <template v-if="selectedPlan && selectedRecipes.length">
              <span class="meal-banner__dot"></span><span>{{ mealMeta.servings }} 人份</span><span class="meal-banner__dot"></span><i class="fa-regular fa-clock"></i><span>預估 {{ mealMeta.minutes }} 分鐘</span>
            </template>
          </div>
          <div class="meal-banner__actions">
            <button v-if="selectedPlan?.status !== 'cooked'" class="edit-menu" @click="openCreate"><i class="fa-regular fa-pen-to-square"></i> 編輯餐單</button>
            <span v-else class="cooked-menu-state"><i class="fa-solid fa-check"></i> 已存入歷史紀錄</span>
          </div>
        </header>
        <div v-if="selectedPlan && selectedRecipes.length" class="planned-meal">
          <article v-for="recipe in selectedRecipes" :key="recipe.id" class="planned-dish">
            <div class="planned-dish__main">
              <img v-if="recipe.imageUrl" :src="recipe.imageUrl" :alt="recipe.imageAlt || recipe.name" />
              <div v-else class="dish-placeholder"><AppIcon name="tableware" /></div>
              <div class="planned-dish__copy">
                <div class="planned-dish__heading"><div><p>{{ recipe.type === 'soup' ? '今日湯品' : '今日菜色' }}</p><h3>{{ recipe.name }}</h3></div><span class="dish-time"><i class="fa-regular fa-clock"></i> {{ recipe.cookTime }} 分鐘</span></div>
                <p class="dish-intro">{{ recipe.intro }}</p>
                <div class="dish-ingredients"><span>待買：{{ recipe.mainIngredients?.slice(0, 2).join('、') || '依餐單彙整' }}</span><span>現有：依食材庫存</span></div>
              </div>
            </div>
            <footer class="dish-guide"><p><b>料理要點：</b>{{ recipe.tip }}</p><button @click="openRecipe(recipe)">食譜指引 <i class="fa-solid fa-chevron-right"></i></button></footer>
          </article>
        </div>
        <button v-if="selectedPlan && selectedRecipes.length && selectedPlan.status !== 'cooked'" class="complete-menu complete-menu--footer" @click="requestCompleteMeal"><i class="fa-solid fa-check"></i> 煮好晚餐！扣除庫存並存入歷史紀錄</button>
        <div v-if="!selectedPlan || !selectedRecipes.length" class="meal-empty">
          <AppIcon name="tableware" /><h3>今日尚未規劃餐單</h3>
          <p>系統已為您備妥家庭飲食偏好與冰箱食材庫存，隨時可一鍵啟動智能配餐，為今晚餐桌帶來旬味靈感。</p>
        </div>
      </section>

      <aside class="journal-side">
      <section class="side-card month-card" aria-label="月曆">
        <header class="month-card__header">
          <div class="month-title"><button aria-label="上個月" @click="previousMonth"><i class="fa-solid fa-chevron-left"></i></button><h2>{{ monthLabel }}</h2><button aria-label="下個月" @click="nextMonth"><i class="fa-solid fa-chevron-right"></i></button></div>
          <button class="today-button" @click="goToday">今天</button>
        </header>
        <div class="weekday-row" aria-hidden="true"><span v-for="day in weekdays" :key="day">{{ day }}</span></div>
        <div class="month-grid">
          <button v-for="day in calendarDays" :key="day.key" class="month-day" :class="{ 'is-muted': !day.inMonth, 'is-selected': day.key === selectedDate, 'has-plan': day.plan }" :aria-label="`${day.key}${day.plan ? ' 已安排晚餐' : ''}`" @click="selectDay(day)">{{ day.number }}</button>
        </div>
      </section>

      <section class="side-card grocery-card" aria-label="食材清單">
        <header class="grocery-header"><div class="grocery-icon"><i class="fa-solid fa-bag-shopping"></i></div><div><h2>{{ groceryDateLabel }} 食材清單</h2><p>依今日晚餐自動彙整生鮮</p></div><span>{{ groceryCheckedCount }} / {{ groceryItems.length }} 項已買</span></header>
        <div class="grocery-progress"><i><b :style="{ width: `${groceryProgress}%` }"></b></i><div><span>採買進度</span><strong>{{ groceryProgress }}%</strong></div></div>
        <template v-if="selectedPlan">
          <div ref="groceryContent" class="grocery-content">
            <section class="grocery-group"><button class="grocery-summary" type="button" :aria-expanded="groceryNeededExpanded" @click="groceryNeededExpanded = !groceryNeededExpanded"><span><i class="fa-solid fa-bag-shopping"></i>待採買清單</span><i :class="['fa-solid', groceryNeededExpanded ? 'fa-chevron-up' : 'fa-chevron-down']"></i></button><ul v-if="groceryNeededExpanded && groceryItems.length" class="grocery-list"><li v-for="item in groceryItems" :key="item.key"><button :class="{ 'is-checked': groceryChecked.has(item.key) || groceryChecked.has(item.name) }" @click="toggleGroceryItem(item)"><i class="fa-solid fa-check"></i><span class="grocery-item__name"><b>{{ item.name }}</b><em>{{ formatGroceryAmount(item) }}</em></span><small>{{ item.recipeNames.join('、') }}</small></button></li></ul><p v-else-if="groceryNeededExpanded" class="grocery-group__empty">這份餐單沒有需要另外採買的食材。</p></section>
            <section class="grocery-group grocery-group--stock"><button class="grocery-summary" type="button" :aria-expanded="groceryStockExpanded" @click="groceryStockExpanded = !groceryStockExpanded"><span><i class="stock-fridge-icon" :style="fridgeIconStyle" aria-hidden="true"></i>冰箱已有庫存</span><i :class="['fa-solid', groceryStockExpanded ? 'fa-chevron-up' : 'fa-chevron-down']"></i></button><ul v-if="groceryStockExpanded && fridgeItems.length" class="stock-list"><li v-for="item in fridgeItems" :key="item.key"><span class="grocery-item__name"><b>{{ item.name }}</b><em>{{ formatGroceryAmount(item) }}</em></span><small>{{ item.recipeNames.join('、') }}</small></li></ul><p v-else-if="groceryStockExpanded" class="grocery-group__empty">冰箱目前沒有這份餐單用得到的食材。</p></section>
          </div>
          <footer class="grocery-footer"><button @click="selectedPlan.groceryChecked = []"><i class="fa-solid fa-rotate-left"></i>重設勾選</button><button @click="groceryItems.forEach((item) => { if (!groceryChecked.has(item.key)) toggleGroceryItem(item) })"><i class="fa-solid fa-check"></i>全部標記為已採買</button></footer>
        </template>
        <div v-else class="grocery-empty"><i class="fa-solid fa-bag-shopping"></i><h3>尚未安排餐單</h3><p>排定今日餐單後，系統將自動比對家庭冰箱庫存，列出短缺食材。</p></div>
      </section>
      </aside>
    </main>

    <main v-else class="history-layout">
      <section class="history-records">
        <header class="history-filter"><div role="tablist" aria-label="歷史月份篩選"><button v-for="filter in historyFilters" :key="filter" :class="{ 'is-current': historyFilter === filter }" role="tab" :aria-selected="historyFilter === filter" @click="historyFilter = filter">{{ historyFilterLabel(filter) }}</button></div><span>{{ historyCountLabel }}</span></header>
        <div v-if="!visibleHistoryPlans.length" class="records-empty"><AppIcon name="tableware" /><h2>尚未有烹飪紀錄</h2><p>當你完成配餐後，紀錄會在這出現</p></div>
        <section v-else class="history-list" aria-label="烹飪紀錄">
          <header class="history-list__header"><span><i></i>近期烹飪紀錄</span><em>共 {{ visibleHistoryPlans.length }} 餐</em></header>
          <ol class="history-ledger">
            <li v-for="plan in pagedHistoryPlans" :key="plan.id">
              <div class="history-ledger__top"><h2>{{ formatHistoryDate(plan.date) }}</h2><div class="history-ledger__meta"><span v-if="plan.servings" class="history-servings">・{{ plan.servings }}人份</span><button class="history-action" @click="bringHistoryToToday(plan)"><i class="fa-solid fa-plus"></i>帶入今日晚餐</button></div></div>
              <div class="history-ledger__bottom"><div class="history-dishes"><template v-for="(dish, index) in historyDishes(plan)" :key="`${plan.id}-${dish}`"><span v-if="index" aria-hidden="true">/</span><b>{{ dish }}</b></template><b v-if="!historyDishes(plan).length">已完成餐單</b></div><button class="history-action history-action--schedule" @click="openSchedulePicker(plan, $event)"><i class="fa-regular fa-calendar"></i>排餐至<i class="fa-solid fa-chevron-down"></i></button></div>
            </li>
          </ol>
          <footer class="history-pagination"><span>{{ historyRangeLabel }}</span><div><button aria-label="上一頁" :disabled="historyPage === 1" @click="setHistoryPage(historyPage - 1)"><i class="fa-solid fa-chevron-left"></i></button><button v-for="page in historyPageCount" :key="page" :class="{ 'is-current': historyPage === page }" :aria-label="`第 ${page} 頁`" @click="setHistoryPage(page)">{{ page }}</button><button aria-label="下一頁" :disabled="historyPage === historyPageCount" @click="setHistoryPage(historyPage + 1)"><i class="fa-solid fa-chevron-right"></i></button></div></footer>
        </section>
      </section>
      <div class="top-recipes-stack">
        <aside v-for="(card, cardIndex) in topRecipeCards" :key="card.key" class="top-recipes"><header><h2><i class="fa-solid fa-circle"></i> {{ card.title }}</h2></header><ol v-if="card.items.length"><li v-for="(item, index) in card.items" :key="item.name"><b>{{ index + 1 }}</b><span>{{ item.name }}</span><em>{{ item.count }} 次</em></li></ol><p v-else class="top-recipes__empty">這個月還沒有烹飪紀錄</p><p v-if="cardIndex === 0 && card.items.length">料理提示：常煮菜品高頻複製，建議下次配餐可適度引進季節性蔬菜（如南瓜、蓮藕）豐富餐桌。</p></aside>
      </div>
    </main>

    <BaseDialog v-model:open="finishDialogOpen" :title="`確認 ${completionDateLabel} 已經煮好了嗎？`" description="確認後，系統會從冰箱庫存扣除用到的食材，並把這餐存入歷史紀錄。" :width="520">
      <div class="completion-dialog">
        <h3>將從冰箱庫存扣除</h3>
        <ul v-if="fridgeDeductions.length" class="deduction-list">
          <li v-for="(item, index) in fridgeDeductions" :key="`${item.id}-${index}`"><span>{{ item.name }}</span><strong>− {{ englishUnits(`${item.amount} ${item.unit}`) }}</strong></li>
        </ul>
        <p v-else class="no-deduction">這餐沒有用到冰箱庫存，確認後會直接存入歷史紀錄。</p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="finishDialogOpen = false">取消</BaseButton>
        <BaseButton @click="confirmCompleteMeal">確認並扣除</BaseButton>
      </template>
    </BaseDialog>
    <DatePickerDialog v-model:open="scheduleDialogOpen" :anchor="scheduleAnchor" :value="scheduleDate" :min="today" :marked="plannedDates" title="選擇排餐日期" confirm-label="確認排餐" :auto-close="false" @confirm="scheduleHistoryPlan" />
  </section>
</template>

<style scoped>
/* Figma Desktop: 1440px content area = 893px main column + 40px gap + 427px side column. */
.journal-page { width: 100%; }
/* 各尺寸皆交由共用 PageTitle 控制，和冰箱／家庭管理維持同一頁首高度。 */
.view-switch { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: #f4f0ec; }
.view-switch button { padding: 8px; border-radius: 12px; color: var(--text-body); font-size: 14px; line-height: 1; white-space: nowrap; }
.view-switch button.is-active { background: var(--brand-primary); color: var(--text-on-primary); }
.journal-layout { display: grid; grid-template-columns: minmax(0, 893.333fr) minmax(0, 426.667fr); grid-template-rows: minmax(342px, auto) minmax(339px, auto); align-items: start; gap: 40px; padding: 20px 40px 88px; }
.journal-layout.has-plan { grid-template-rows: minmax(371px, auto) minmax(581px, auto); }
.journal-layout.has-plan .selected-meal { grid-row: 1 / span 2; }
.selected-meal { display: flex; min-width: 0; flex-direction: column; }
.meal-banner { display: flex; align-items: center; justify-content: space-between; gap: 14px; min-height: 64px; padding: 0 16px; }
.meal-banner__copy { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; color: var(--text-secondary); font-size: 16px; }
.meal-banner__copy h2 { color: var(--text-title); font-size: 18px; font-weight: 500; }.meal-banner__copy i { color: var(--text-placeholder); }.meal-banner__dot { width: 3px; height: 3px; border-radius: 50%; background: var(--text-placeholder); }
.edit-menu, .today-button { padding: 5px 10px; border-radius: 999px; background: var(--brand-secondary-light); color: var(--text-body); font-size: 10px; white-space: nowrap; }.edit-menu:hover, .today-button:hover { background: var(--brand-secondary-hover); }
.meal-empty { display: flex; height: 201px; flex-direction: column; align-items: center; justify-content: center; margin-top: 16px; border: 1px solid var(--brand-secondary); border-radius: 12px 0 12px; text-align: center; }.meal-empty>.app-icon { margin-bottom: 12px; color: var(--brand-primary); font-size: 22px; }.meal-empty h3, .grocery-empty h3 { color: var(--text-body); font-size: 14px; font-weight: 500; }.meal-empty p, .grocery-empty p { max-width: 360px; margin-top: 8px; color: var(--text-placeholder); font-size: 10px; line-height: 1.7; }
.planned-meal { display: grid; gap: 16px; margin-top: 16px; }
.planned-dish { display: grid; gap: 12px; padding: 21px; border: 1px solid var(--brand-secondary); border-radius: 12px 0 12px; background: var(--bg-surface); box-shadow: 0 1px 2px rgb(0 0 0 / .02); }
.planned-dish__main { display: flex; min-width: 0; gap: 16px; }
.planned-dish__main>img, .dish-placeholder { width: 144px; height: 112px; flex: 0 0 144px; border: 1px solid var(--brand-secondary); border-radius: 12px; object-fit: cover; }
.dish-placeholder { display: grid; place-items: center; background: var(--brand-secondary-light); color: var(--brand-primary); font-size: 22px; }
.planned-dish__copy { display: flex; min-width: 0; min-height: 112px; flex: 1; flex-direction: column; }
.planned-dish__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.planned-dish__heading p { color: var(--text-placeholder); font-size: 12px; line-height: 1.2; }
.planned-dish h3 { margin: 4px 0 0; color: var(--text-body); font-size: 20px; font-weight: 500; line-height: 1.25; }
.dish-time { padding: 4px 8px; border-radius: 999px; background: var(--brand-secondary-light); color: var(--text-placeholder); font-size: 14px; line-height: 1; white-space: nowrap; }
.dish-intro { margin-top: 7px; overflow: hidden; color: var(--text-placeholder); font-size: 14px; line-height: 1.45; text-overflow: ellipsis; white-space: nowrap; }
.dish-ingredients { display: flex; flex-wrap: wrap; gap: 12px 8px; margin-top: auto; }
.dish-ingredients span { min-width: 140px; padding: 4px 8px; border-radius: 12px; background: var(--brand-secondary-light); color: var(--text-secondary); font-size: 14px; line-height: 1.2; }
.dish-guide { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px 10px; border-radius: 12px; background: var(--brand-secondary-light); }
.dish-guide p { min-width: 0; overflow: hidden; color: var(--text-secondary); font-size: 14px; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }.dish-guide b { color: var(--text-body); font-weight: 500; }
.dish-guide button { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 4px; padding: 4px; border-radius: 999px; background: var(--brand-special); color: #fff; font-size: 12px; line-height: 1; }.dish-guide button i { display: grid; width: 8px; height: 16px; place-items: center; font-size: 8px; }.dish-guide button:hover { filter: brightness(.97); }
.meal-banner__actions { display: flex; align-items: center; gap: 8px; }.cooked-menu-state { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; background: var(--brand-secondary-light); color: var(--text-secondary); font-size: 10px; white-space: nowrap; }.complete-menu { padding: 5px 10px; border-radius: 999px; background: var(--brand-primary); color: var(--text-on-primary); font-size: 10px; white-space: nowrap; }.complete-menu:hover { background: var(--brand-primary-hover); }.complete-menu--footer { display: inline-flex; align-items: center; gap: 6px; width: fit-content; min-height: 45px; align-self: flex-end; margin-top: 16px; border-radius: 999px; font-size: 12px; }
.grocery-list, .stock-list { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
.grocery-list li button { display: grid; width: 100%; grid-template-columns: 14px minmax(0, 1fr) minmax(84px, 38%); align-items: center; gap: 10px; padding: 9px 8px; border: 0; border-radius: 10px; background: transparent; color: var(--text-body); font-size: 11px; text-align: left; cursor: pointer; }
.grocery-list li button>i { display: grid; width: 14px; height: 14px; place-items: center; border: 1px solid var(--brand-primary-border); border-radius: 2px; color: transparent; font-size: 8px; }.grocery-list li button.is-checked { color: var(--text-placeholder); text-decoration: line-through; }.grocery-list li button.is-checked>i { border-color: var(--brand-primary); background: var(--brand-primary); color: var(--text-on-primary); }
.grocery-item__name { display: flex; min-width: 0; align-items: center; gap: 8px; overflow: hidden; }.grocery-list b, .stock-list b { overflow: hidden; color: var(--text-body); font-size: 11px; font-weight: 400; text-overflow: ellipsis; white-space: nowrap; }.grocery-list em, .stock-list em { flex: 0 0 auto; color: var(--text-body); font-size: 11px; font-style: normal; white-space: nowrap; }.grocery-list small, .stock-list small { min-width: 0; overflow: hidden; color: var(--text-placeholder); font-size: 10px; text-decoration: none; text-overflow: ellipsis; white-space: nowrap; }
.side-card { overflow: hidden; border: 1px solid var(--brand-secondary); border-radius: 12px 0 12px; background: var(--bg-surface); padding: 21px; }.month-card__header, .month-title, .grocery-header { display: flex; align-items: center; }.month-card__header { justify-content: space-between; }.month-title { gap: 8px; }.month-title h2 { color: var(--text-secondary); font-size: 14px; font-weight: 500; white-space: nowrap; }.month-title button { display: grid; width: 16px; height: 20px; place-items: center; color: var(--text-placeholder); font-size: 10px; }.today-button { padding: 0; background: transparent; color: var(--text-placeholder); font-size: 12px; }.today-button:hover { background: transparent; color: var(--brand-primary); }.weekday-row, .month-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }.weekday-row { margin-top: 17px; padding: 6px 0; border-bottom: 1px solid var(--brand-secondary); color: var(--text-placeholder); font-size: 10px; text-align: center; }.month-grid { gap: 0; margin-top: 12px; }.month-day { display: grid; height: 32px; aspect-ratio: 1 / 1; justify-self: center; place-items: center; border-radius: 50%; color: var(--text-secondary); font-size: 12px; }.month-day:not(.is-selected):hover { background: var(--brand-secondary-light); }.month-day.is-muted { color: var(--brand-secondary); }.month-day.has-plan::after { content: ''; width: 3px; height: 3px; margin-top: -3px; border-radius: 50%; background: var(--brand-primary); }.month-day.is-selected { background: var(--brand-special); color: #fff; }.month-day.is-selected::after { background: #fff; }
.month-card { box-sizing: border-box; min-height: 342px; opacity: .8; }.journal-layout.has-plan .month-card { opacity: 1; }
.grocery-card { grid-column: 2; grid-row: 2; display: flex; min-height: 339px; flex-direction: column; gap: 8px; }.journal-layout.has-plan .grocery-card { display: grid; height: 581px; min-height: 0; max-height: 581px; grid-template-rows: auto auto minmax(0, 1fr) auto; }
.grocery-header { gap: 10px; }.grocery-header>div:not(.grocery-icon) { min-width: 0; }.grocery-icon { display: grid; width: 42px; height: 42px; flex: 0 0 42px; place-items: center; border: 1px solid var(--brand-secondary); border-radius: 10px; background: var(--brand-secondary-light); color: var(--brand-primary); font-size: 16px; }.grocery-header h2 { overflow: hidden; color: var(--text-title); font-size: 16px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }.grocery-header p, .grocery-header>span { color: var(--text-placeholder); font-size: 10px; }.grocery-header p { margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.grocery-header>span { flex: 0 0 auto; margin-left: auto; padding: 4px 7px; border-radius: 999px; background: var(--brand-secondary-light); color: var(--text-body); font-size: 11px; white-space: nowrap; }
.grocery-progress { padding-bottom: 1px; border-bottom: 1px solid var(--brand-secondary); }.grocery-progress>i { display: block; height: 5px; overflow: hidden; border-radius: 999px; background: var(--brand-secondary-light); }.grocery-progress>i>b { display: block; height: 100%; border-radius: inherit; background: var(--brand-primary); transition: width .2s ease; }.grocery-progress>div { display: flex; justify-content: space-between; margin-top: 5px; color: var(--text-placeholder); font-size: 10px; }.grocery-progress strong { font-weight: 400; }
.grocery-content { display: flex; flex-direction: column; width: 100%; min-height: 0; gap: 8px; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; }.grocery-group { flex: 0 0 auto; width: 100%; }.grocery-summary { display: flex; flex: 0 0 auto; width: 100%; align-items: center; justify-content: space-between; padding: 7px 8px; border-radius: 8px; background: var(--brand-secondary-light); color: var(--text-body); font-size: 12px; text-align: left; }.grocery-summary:hover { background: var(--brand-secondary-hover); }.grocery-summary>span { display: inline-flex; align-items: center; gap: 7px; }.grocery-summary>span>i { color: var(--brand-primary); font-size: 13px; }.grocery-summary>i { display: grid; width: 20px; height: 12px; place-items: center; color: var(--text-placeholder); font-size: 8px; }.grocery-group__empty { padding: 10px; color: var(--text-placeholder); font-size: 10px; }.grocery-list { min-height: 0; }.grocery-group--stock { margin-top: 0; }
/* 冰箱已有庫存使用 Figma 冰箱圖示，以遮罩套用品牌色。 */
.grocery-summary>span>.stock-fridge-icon { display: inline-block; width: 14px; height: 14px; background: currentColor; -webkit-mask: var(--icon) center / contain no-repeat; mask: var(--icon) center / contain no-repeat; }.stock-list li { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 8px; border-radius: 10px; }.grocery-footer { display: flex; flex: 0 0 auto; justify-content: space-between; width: 100%; margin-top: 0; padding-top: 8px; border-top: 1px solid var(--brand-secondary); }.grocery-footer button { display: inline-flex; align-items: center; gap: 4px; padding: 4px 7px; border-radius: 999px; background: var(--brand-secondary-light); color: var(--text-body); font-size: 10px; }.grocery-footer button:last-child { background: var(--brand-secondary); color: var(--text-body); }.grocery-footer i { font-size: 9px; }.grocery-empty { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; padding: 20px 12px 0; text-align: center; }.grocery-empty>i { margin-bottom: 11px; color: var(--brand-primary); font-size: 24px; }.grocery-empty p { max-width: 240px; }
.completion-dialog { padding: 4px 0 2px; }.completion-dialog h3 { margin-bottom: 12px; color: var(--text-body); font-size: 15px; font-weight: 500; }.deduction-list { margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--brand-secondary); }.deduction-list li { display: flex; align-items: center; justify-content: space-between; min-height: 42px; border-bottom: 1px solid var(--brand-secondary); color: var(--text-body); font-size: 14px; }.deduction-list strong { color: var(--brand-primary); font-size: 13px; font-weight: 500; }.no-deduction { padding: 16px; border: 1px dashed var(--brand-secondary); border-radius: 8px; color: var(--text-placeholder); font-size: 13px; line-height: 1.6; }

.history-layout { display: grid; grid-template-columns: minmax(0, 893.333fr) minmax(0, 426.667fr); gap: 40px; padding: 20px 40px 88px; }
.history-records { display: flex; min-width: 0; flex-direction: column; gap: 16px; }
.history-filter { display: flex; min-height: 36px; align-items: flex-start; justify-content: space-between; }
.history-filter div { display: flex; align-items: flex-start; gap: 4px; }
.history-filter button { padding: 8px; border-bottom: 2px solid transparent; color: var(--text-placeholder); font-size: 14px; line-height: 18px; }
.history-filter button.is-current { padding-bottom: 10px; border-color: var(--brand-primary); color: var(--text-body); }
.history-filter span { margin-top: 4px; padding: 4px 8px; border-radius: 12px; background: #edf2f7; color: var(--text-special); font-size: 14px; line-height: 18px; white-space: nowrap; }
.records-empty { display: flex; height: 182px; flex-direction: column; align-items: center; justify-content: center; border: 1px solid var(--brand-secondary); border-radius: 12px 0 12px; text-align: center; }
.records-empty>.app-icon { margin-bottom: 12px; color: var(--brand-primary); font-size: 24px; }.records-empty h2 { color: var(--text-body); font-size: 16px; font-weight: 500; line-height: 24px; }.records-empty p { margin-top: 8px; color: var(--text-placeholder); font-size: 12px; line-height: 18px; }
.history-list { display: grid; gap: 0; list-style: none; }
.history-list__header { display: flex; align-items: center; justify-content: space-between; padding: 0 0 9px; border-bottom: 1px solid var(--brand-secondary); }.history-list__header>span { display: flex; align-items: center; gap: 8px; color: var(--text-body); font-size: 11px; letter-spacing: .66px; }.history-list__header>span i { width: 6px; height: 6px; border-radius: 50%; background: #000; }.history-list__header em { color: var(--text-secondary); font-size: 12px; font-style: normal; }
.history-ledger__meta { display: flex; flex: 0 0 auto; align-items: center; gap: 6px; }.history-servings { color: var(--text-placeholder); font-size: 12px; white-space: nowrap; }
.history-ledger { margin: 0; padding: 0; list-style: none; }.history-ledger>li { display: grid; gap: 8px; padding: 16px 0; border-bottom: 1px dashed var(--brand-primary-border); }.history-ledger__top, .history-ledger__bottom { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: 16px; }.history-ledger h2 { color: var(--text-body); font-size: 16px; font-weight: 400; white-space: nowrap; }.history-dishes { display: flex; min-width: 0; flex: 1; flex-wrap: wrap; align-items: center; gap: 8px; color: var(--text-body); font-size: 14px; line-height: 22px; }.history-dishes b { font-weight: 400; white-space: nowrap; }.history-dishes span { color: var(--text-secondary); }.history-action { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; gap: 4px; padding: 4px 8px; border-radius: 999px; background: var(--brand-secondary); box-shadow: 0 1px 1px rgb(0 0 0 / .05); color: var(--text-body); font-size: 12px; line-height: 16px; white-space: nowrap; }.history-action--schedule { padding: 4px; }.history-action:hover { background: var(--brand-secondary-hover); }.history-action i { font-size: 11px; }.history-action i:last-child { display: grid; width: 16px; height: 8px; margin-left: 0; place-items: center; font-size: 9px; }
.history-pagination { display: flex; align-items: center; justify-content: space-between; padding: 16px 2px; border-top: 1px solid var(--brand-secondary); }.history-pagination>span { color: var(--text-secondary); font-size: 10px; }.history-pagination>div { display: flex; align-items: center; gap: 8px; }.history-pagination button { display: grid; width: 36px; height: 36px; place-items: center; border: 1px solid var(--brand-primary-border); border-radius: 50%; background: var(--bg-surface); color: var(--text-secondary); font-size: 14px; }.history-pagination button:first-child, .history-pagination button:last-child { border-color: transparent; background: transparent; font-size: 12px; }.history-pagination button.is-current { border-color: var(--brand-primary); background: var(--brand-primary); color: var(--text-on-primary); }.history-pagination button:disabled { cursor: default; opacity: .45; }
.top-recipes { min-height: 296px; padding: 20px; border: 1px solid var(--brand-primary-border); border-radius: 12px 0 12px; }.top-recipes header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid var(--brand-secondary); }.top-recipes h2 { color: var(--text-body); font-size: 16px; font-weight: 500; }.top-recipes h2 i { margin-right: 7px; font-size: 8px; color: #000; }.top-recipes header span { color: var(--text-placeholder); font-size: 10px; letter-spacing: .8px; }.top-recipes ol { margin: 0; padding: 10px 0; list-style: none; }.top-recipes li { display: grid; grid-template-columns: 20px 1fr auto; align-items: center; min-height: 38px; border-bottom: 1px dashed var(--brand-secondary); color: var(--text-secondary); font-size: 14px; }.top-recipes li b { display: grid; width: 14px; height: 14px; place-items: center; border-radius: 50%; background: var(--brand-secondary-light); font-size: 9px; font-weight: 500; }.top-recipes li:first-child b { background: var(--brand-special); color: #fff; }.top-recipes li em { color: var(--text-placeholder); font-size: 12px; font-style: normal; }.top-recipes>p { padding: 8px; border-left: 2px solid var(--brand-primary); background: var(--brand-secondary); color: var(--text-secondary); font-size: 10px; line-height: 1.45; }
@media (max-width: 1439px) and (min-width: 1200px) {
  .journal-layout { grid-template-columns: minmax(0, 1fr) 320px; gap: 28px; padding: 24px 28px 64px; }
  .history-layout { grid-template-columns: minmax(0, 1fr) 320px; padding: 24px 28px 64px; }
  .grocery-icon { width: 43px; height: 43px; flex-basis: 43px; font-size: 17px; }
  .grocery-header h2 { font-size: 15px; }
  .grocery-header p, .grocery-header > span, .grocery-progress > div { font-size: 10px; }
}
@media(max-width:1199px){.journal-page{width:100%}.journal-layout{grid-template-columns:minmax(0,1fr) minmax(280px,.8fr);gap:24px;padding:24px 28px 64px}.selected-meal{grid-row:span 2}.meal-empty{height:auto;min-height:181px}.history-layout{grid-template-columns:minmax(0,1fr) 340px;padding:24px 28px 64px}}@media(max-width:640px){.journal-layout,.history-layout{display:flex;flex-direction:column;gap:20px;padding:16px 16px 36px}.selected-meal{min-height:0;width:100%}.meal-banner{align-items:flex-start;flex-wrap:wrap;min-height:0;padding:0 4px}.meal-banner__copy{gap:6px;font-size:13px}.meal-banner__copy h2{width:100%;font-size:17px}.meal-banner__actions{margin-left:auto}.edit-menu{padding:5px 8px;font-size:10px}.meal-empty{height:164px;min-height:164px;margin-top:10px;padding:0 16px}.meal-empty p{max-width:290px;font-size:10px;line-height:1.6}.grocery-card{grid-column:auto;grid-row:auto}.side-card{min-height:0;padding:16px}.month-card{min-height:0!important}.month-card__header{min-height:28px}.weekday-row{margin-top:10px}.month-grid{margin-top:8px}.month-day{height:29px;font-size:11px}.journal-layout.has-plan .grocery-card{height:auto;min-height:0;max-height:none;grid-template-rows:auto auto minmax(0,300px) auto}.grocery-card{min-height:218px}.grocery-empty{padding:10px 0}.grocery-content{max-height:300px}.view-switch{width:100%}.view-switch button{flex:1}.history-layout{gap:20px}.top-recipes{min-height:0}}
@media(max-width:640px){
  /* 日誌補上通用 .page 外層，頁首與家庭管理／冰箱使用相同的兩層留白。 */
  .journal-page{box-sizing:border-box;padding:var(--page-padding-y) var(--page-padding-x) 0}
  .journal-page :deep(.page-title){padding:var(--space-28) var(--space-20) 24px}
  /* 行動版先看日期，再看當日餐單，最後才是採買明細。 */
  .month-card{order:1}
  .selected-meal{order:2}
  .grocery-card{order:3}
  /* 月曆／採買卡在手機要撐滿單欄；桌機的 align-items:start 會讓有排餐時卡片只剩內容寬。 */
  .journal-layout,.history-layout{align-items:stretch;gap:16px;padding:20px 16px 28px}
  .month-card,.grocery-card{box-sizing:border-box;width:100%}
  .side-card{padding:12px}
  .month-card__header{min-height:24px}
  .month-title{gap:6px}
  .month-title h2{font-size:13px}
  .today-button{font-size:11px}
  .weekday-row{margin-top:7px;padding:4px 0;font-size:9px}
  .month-grid{margin-top:5px}
  .month-day{height:26px;font-size:10px}
  .journal-layout.has-plan .grocery-card{grid-template-rows:auto auto minmax(0,250px) auto}
  .grocery-card{min-height:190px;gap:6px}
  .grocery-icon{width:36px;height:36px;flex-basis:36px;font-size:14px}
  .grocery-header{gap:8px}
  .grocery-header h2{font-size:14px}
  .grocery-header p,.grocery-header>span,.grocery-progress>div{font-size:9px}
  .grocery-summary{padding:6px 7px;font-size:11px}
  .grocery-list li button,.stock-list li{gap:7px;padding:7px 6px;font-size:10px}
  .grocery-list b,.stock-list b,.grocery-list em,.stock-list em{font-size:10px}
  .grocery-list small,.stock-list small{font-size:9px}
  .grocery-content{max-height:250px;gap:6px}
  .grocery-footer{padding-top:6px}
  .grocery-footer button{padding:4px 6px;font-size:9px}
  .side-card{padding:12px}
  .history-ledger>li{gap:6px;padding:12px 0}
  .history-ledger h2{font-size:14px}
  .history-dishes{gap:5px;font-size:12px;line-height:1.45}
  .history-action{padding:3px 6px;font-size:10px}
  .history-pagination{padding:12px 0}
  .history-pagination button{width:30px;height:30px;font-size:12px}
  .top-recipes{padding:14px}
  .top-recipes h2{font-size:14px}
  .top-recipes li{min-height:33px;font-size:12px}

  /* 有排餐時，料理卡改為手機密度，避免沿用桌機 144px 圖框與 20px 標題。 */
  /* 檢視模式在手機改用 icon，與冰箱右側操作一致；文字仍保留供平板／桌機使用。 */
  .journal-page :deep(.page-title__text){flex:1 1 0;min-width:0}
  .journal-page :deep(.page-title__actions){width:auto;justify-content:flex-end}
  .view-switch{padding:3px;border-radius:10px}
  .planned-meal{gap:12px;margin-top:12px}
  .planned-dish{gap:10px;padding:14px}
  .planned-dish__main{gap:12px}
  .planned-dish__main>img,.dish-placeholder{width:92px;height:82px;flex-basis:92px;border-radius:10px}
  .dish-placeholder{font-size:18px}
  .planned-dish__copy{min-height:82px}
  .planned-dish__heading{gap:8px}
  .planned-dish__heading p{font-size:10px}
  .planned-dish h3{margin-top:2px;font-size:17px}
  .dish-time{padding:4px 6px;font-size:11px}
  .dish-intro{margin-top:4px;font-size:11px}
  .dish-ingredients{gap:5px;margin-top:5px}
  .dish-ingredients span{min-width:0;padding:4px 6px;font-size:10px}
  .dish-guide{gap:8px;padding:7px 9px}
  .dish-guide p{font-size:11px}
  .dish-guide button{padding:5px 6px;font-size:10px}
  .complete-menu--footer{width:fit-content;min-height:38px;margin-top:12px;font-size:10px}
}
@media(min-width:641px) and (max-width:1024px){
  /* 日誌沒有通用 .page 包裝，補上與家庭管理／冰箱相同的外層頁面留白。 */
  .journal-page{box-sizing:border-box;padding:var(--page-padding-y) var(--page-padding-x) 0}
  .journal-layout,.history-layout{gap:20px;padding:20px 28px 56px}
  .side-card{padding:16px}
  .meal-banner{min-height:56px;padding:0 12px}
  .meal-banner__copy{font-size:14px}
  .meal-banner__copy h2{font-size:17px}
  /* 當日餐點卡同步使用平板密度，避免沿用桌機 144px 圖框與 20px 標題。 */
  .planned-meal{gap:12px;margin-top:12px}
  .planned-dish{gap:10px;padding:14px}
  .planned-dish__main{gap:12px}
  .planned-dish__main>img,.dish-placeholder{width:104px;height:88px;flex-basis:104px;border-radius:10px}
  .dish-placeholder{font-size:18px}
  .planned-dish__copy{min-height:88px}
  .planned-dish__heading{gap:10px}
  .planned-dish__heading p{font-size:11px}
  .planned-dish h3{margin-top:3px;font-size:17px}
  .dish-time{padding:4px 6px;font-size:11px}
  .dish-intro{margin-top:5px;font-size:12px}
  .dish-ingredients{gap:6px;margin-top:auto}
  .dish-ingredients span{min-width:0;padding:4px 6px;font-size:11px}
  .dish-guide{gap:8px;padding:7px 9px}
  .dish-guide p{font-size:12px}
  .dish-guide button{padding:5px 6px;font-size:11px}
  .history-ledger>li{padding:13px 0}
  .history-ledger h2{font-size:15px}
  .history-dishes{font-size:13px}
  .top-recipes{min-height:0;padding:16px}
}

/* 空狀態說明保留卡片內的閱讀安全區，避免文字貼近外框。 */
.meal-empty{box-sizing:border-box;padding-right:32px;padding-left:32px}
.meal-empty p{width:100%;max-width:680px}
@media(max-width:640px){
  .meal-empty{padding-right:20px;padding-left:20px}
  .meal-empty p{max-width:100%}
}
/* 僅手機使用 icon；平板與桌機保留完整文字。 */
@media(max-width:640px){
  .view-switch button{display:grid;width:34px;height:34px;padding:0;place-items:center;border-radius:8px;font-size:19px}
  .view-switch button span{display:none}
}
@media(min-width:641px){
  .view-switch button>i,.view-switch button>.app-icon{display:none}
}
@media(min-width:1025px) and (max-width:1279px){
  .journal-page :deep(.page-title){padding:36px 28px 28px}
  .journal-layout,.history-layout{gap:24px;padding:20px 28px 64px}
  .journal-layout,.history-layout{grid-template-columns:minmax(0,1fr) 300px}
  .side-card,.top-recipes{padding:16px}
  /* 窄桌機仍為桌機雙欄，但餐點卡依實際欄寬縮小。 */
  .planned-meal{gap:14px;margin-top:14px}
  .planned-dish{gap:11px;padding:16px}
  .planned-dish__main{gap:14px}
  .planned-dish__main>img,.dish-placeholder{width:120px;height:98px;flex-basis:120px}
  .dish-placeholder{font-size:20px}
  .planned-dish__copy{min-height:98px}
  .planned-dish__heading{gap:12px}
  .planned-dish h3{font-size:18px}
  .dish-time{font-size:12px}
  .dish-intro,.dish-ingredients span,.dish-guide p{font-size:12px}
  .dish-ingredients{gap:8px}
  .dish-ingredients span{min-width:0}
  .dish-guide{padding:7px 10px}
  .dish-guide button{font-size:11px}
}

/* 桌機／平板右欄自行依內容堆疊，不受左側餐點清單高度推開。 */
@media(min-width:641px){
  .journal-layout,.journal-layout.has-plan{grid-template-rows:auto}
  .journal-layout.has-plan .selected-meal,.selected-meal{grid-row:auto}
  .journal-side{display:flex;align-self:start;flex-direction:column;gap:40px}
  .journal-side .grocery-card{grid-column:auto;grid-row:auto}
  .journal-side .month-card{display:flex;flex-direction:column;justify-content:center}
}

@media(min-width:641px) and (max-width:1024px){
  .journal-side{gap:20px}
}

@media(max-width:640px){
  .journal-side{display:contents}
}

/* 熱門料理卡依內容高度收合，維持一致的上下內距。 */
.top-recipes{align-self:start;min-height:0}

/* 當日餐點卡在窄桌機到平板之間隨欄寬漸進縮放，避免只在單一斷點突然變大。 */
@media (min-width: 641px) and (max-width: 1439px) {
  .planned-meal { gap: clamp(12px, 1.1vw, 14px); margin-top: clamp(12px, 1.1vw, 14px); }
  .planned-dish { gap: clamp(9px, .9vw, 11px); padding: clamp(12px, 1.35vw, 16px); }
  .planned-dish__main { gap: clamp(10px, 1.15vw, 14px); }
  .planned-dish__main > img,
  .dish-placeholder { width: clamp(92px, 10vw, 120px); height: clamp(78px, 8.2vw, 98px); flex-basis: clamp(92px, 10vw, 120px); border-radius: 10px; }
  .dish-placeholder { font-size: clamp(17px, 1.55vw, 20px); }
  .planned-dish__copy { min-height: clamp(78px, 8.2vw, 98px); }
  .planned-dish__heading { gap: clamp(8px, .9vw, 12px); }
  .planned-dish__heading p { font-size: clamp(10px, .9vw, 12px); }
  .planned-dish h3 { margin-top: 3px; font-size: clamp(16px, 1.7vw, 18px); }
  .dish-time { padding: 4px 6px; font-size: clamp(10px, 1.05vw, 12px); }
  .dish-intro { margin-top: 5px; font-size: clamp(11px, 1.05vw, 12px); }
  .dish-ingredients { gap: clamp(6px, .7vw, 8px); }
  .dish-ingredients span { min-width: 0; padding: 4px 6px; font-size: clamp(10px, .95vw, 12px); }
  .dish-guide { gap: 8px; padding: clamp(7px, .75vw, 8px) clamp(9px, .9vw, 10px); }
  .dish-guide p { font-size: clamp(11px, 1.05vw, 12px); }
  .dish-guide button { padding: 5px 6px; font-size: clamp(10px, .95vw, 11px); }
}

/* 歷史月份篩選改為可橫向滑動：放不下的月份藏在右側，滑動後出現。 */
.history-filter { gap: 12px; min-width: 0; }
.history-filter div { flex: 1 1 auto; min-width: 0; overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.history-filter div::-webkit-scrollbar { display: none; }
.history-filter button { flex: 0 0 auto; white-space: nowrap; }
.history-filter span { flex: 0 0 auto; }

/* 平板與小桌機：常煮排名依比例縮放，不再固定寬度擠壓左側紀錄。 */
@media (min-width: 641px) and (max-width: 1199px) {
  .history-layout { grid-template-columns: minmax(0, 1.85fr) minmax(0, 1fr); gap: clamp(16px, 2.6vw, 32px); }
  .top-recipes { min-width: 0; padding: clamp(12px, 1.6vw, 18px); }
  .top-recipes header { gap: 8px; flex-wrap: wrap; }
  .top-recipes h2 { font-size: clamp(13px, 1.5vw, 16px); white-space: nowrap; }
  .top-recipes li { font-size: clamp(12px, 1.35vw, 14px); }
  .top-recipes li span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .top-recipes li em { padding-left: 6px; }
}

/* 兩張常煮排名卡上下排列，共用右側欄位。 */
.top-recipes .top-recipes__empty { padding: 28px 0; border: 0; background: none; color: var(--text-placeholder); font-size: 13px; text-align: center; }
.top-recipes-stack { display: grid; min-width: 0; align-self: start; gap: 16px; }

/* iPhone 16 等 400px 以下螢幕：日誌料理卡與日曆沿用同一個緊湊尺度，
   避免大縮圖與 17px 菜名把單欄卡片撐得過高。 */
@media (max-width: 400px) {
  .journal-page :deep(.page-title) { padding: 24px 16px 20px; }
  .journal-page :deep(.page-title__heading) { font-size: 22px; line-height: 1.25; letter-spacing: .06em; }
  .journal-page :deep(.page-title__desc) { font-size: 11px; line-height: 1.55; }
  .journal-layout, .history-layout { gap: 14px; padding: 16px 12px 28px; }

  .planned-meal { gap: 9px; margin-top: 9px; }
  .planned-dish { gap: 8px; padding: 10px; }
  .planned-dish__main { gap: 8px; }
  .planned-dish__main > img, .dish-placeholder { width: 76px; height: 68px; flex-basis: 76px; border-radius: 8px; }
  .dish-placeholder { font-size: 15px; }
  .planned-dish__copy { min-height: 68px; }
  .planned-dish__heading { gap: 6px; }
  .planned-dish__heading p { font-size: 9px; }
  .planned-dish h3 { margin-top: 1px; font-size: 15px; line-height: 1.25; }
  .dish-time { padding: 3px 5px; font-size: 9px; white-space: nowrap; }
  .dish-intro { margin-top: 3px; font-size: 10px; line-height: 1.35; }
  .dish-ingredients { gap: 4px; margin-top: 4px; }
  .dish-ingredients span { padding: 3px 5px; font-size: 9px; }
  .dish-guide { gap: 6px; padding: 6px 7px; }
  .dish-guide p { font-size: 10px; line-height: 1.35; }
  .dish-guide button { padding: 4px 5px; font-size: 9px; }

  .side-card { padding: 10px; }
  .month-day { height: 24px; font-size: 9px; }
  .history-ledger > li { padding: 10px 0; }

  /* 393px 寬度仍讓餐期、份量與預估時間留在同一閱讀列。 */
  .meal-banner { gap: 4px; min-height: 0; padding: 0 8px; }
  .meal-banner__copy { flex-wrap: nowrap; gap: 4px; font-size: 11px; white-space: nowrap; }
  .meal-banner__copy h2 { font-size: 15px; letter-spacing: 0; }
  .meal-banner__copy i { font-size: 10px; }
  .meal-banner__actions { padding-top: 0; }
  .edit-menu { padding: 5px 7px; font-size: 9px; }
}

/* 行動版把「編輯餐單」固定在餐期標題同一行；人份與時間自然落到標題下方。 */
@media (max-width: 640px) {
  .meal-banner { flex-wrap: nowrap; align-items: flex-start; gap: 8px; }
  .meal-banner__copy { flex: 1 1 auto; min-width: 0; }
  .meal-banner__copy h2 { width: auto; flex: 0 0 auto; }
  .meal-banner__actions { flex: 0 0 auto; margin-left: 0; padding-top: 1px; }
}
</style>
