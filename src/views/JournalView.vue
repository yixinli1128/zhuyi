<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageTitle from '@/components/layout/PageTitle.vue'
import { useMealPlanStore } from '@/stores/mealPlans'
import { useRecipeStore } from '@/stores/recipes'
import { useFridgeStore } from '@/stores/fridge'
import { useToastStore } from '@/stores/toast'
import { fromDateKey, toDateKey } from '@/utils/date'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseDialog from '@/components/base/BaseDialog.vue'

const router = useRouter()
const route = useRoute()
const mealPlans = useMealPlanStore()
const recipes = useRecipeStore()
const fridge = useFridgeStore()
const toast = useToastStore()
const view = ref('calendar')
const historyFilter = ref('all')
const finishDialogOpen = ref(false)
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
const calendarDays = computed(() => {
  const year = month.value.getFullYear()
  const monthIndex = month.value.getMonth()
  const start = new Date(year, monthIndex, 1).getDay()
  const count = new Date(year, monthIndex + 1, 0).getDate()
  const previousCount = new Date(year, monthIndex, 0).getDate()
  return Array.from({ length: 35 }, (_, index) => {
    const number = index - start + 1
    const date = number < 1 ? new Date(year, monthIndex - 1, previousCount + number)
      : number > count ? new Date(year, monthIndex + 1, number - count)
        : new Date(year, monthIndex, number)
    const key = toDateKey(date)
    return { key, number: date.getDate(), inMonth: date.getMonth() === monthIndex, plan: plansByDate.value[key] }
  })
})
const mealHeadline = computed(() => {
  const date = fromDateKey(selectedDate.value)
  return `${date.getMonth() + 1}月${date.getDate()}日 週${weekdays[date.getDay()]}晚餐`
})
const groceryDateLabel = computed(() => selectedDate.value.slice(5).replace('-', '-'))
const mealMeta = computed(() => {
  const minutes = selectedRecipes.value.reduce((total, recipe) => total + Number(recipe.cookTime || 0), 0)
  return { servings: selectedPlan.value?.servings ?? 3, minutes: minutes || 39 }
})
const groceryItems = computed(() => {
  if (!selectedPlan.value) return []
  const missing = new Map()
  selectedRecipes.value.forEach((recipe) => {
    recipes.scaleIngredients(recipe.id, selectedPlan.value.servings).forEach((item) => {
      if (!fridge.findMatches([item.name]).length && !missing.has(item.name)) missing.set(item.name, item)
    })
  })
  return [...missing.values()]
})
const groceryChecked = computed(() => new Set(selectedPlan.value?.groceryChecked ?? []))
const groceryCheckedCount = computed(() => groceryItems.value.filter((item) => groceryChecked.value.has(item.name)).length)
const groceryProgress = computed(() => groceryItems.value.length ? Math.round((groceryCheckedCount.value / groceryItems.value.length) * 100) : 0)
const planIngredients = computed(() => selectedPlan.value
  ? selectedRecipes.value.flatMap((recipe) => recipes.scaleIngredients(recipe.id, selectedPlan.value.servings))
  : [])
const fridgeDeductions = computed(() => selectedPlan.value?.useFridge ? fridge.previewConsumption(planIngredients.value) : [])
const completionDateLabel = computed(() => {
  const date = fromDateKey(selectedDate.value)
  return `${date.getMonth() + 1}月${date.getDate()}日 晚餐`
})
const pageTitle = computed(() => view.value === 'calendar' ? '餐食日誌・餐單行事曆' : '餐食日誌・歷史烹飪紀錄')
const pageDescription = computed(() => view.value === 'calendar'
  ? '掌握全月份配餐與料理歷程，選取日期即時檢視專屬菜單與生鮮採買清單。'
  : '料理足跡已歸檔至飲食歷史紀錄，隨時可一鍵複製重煮。')
const historyFilters = ['all', '2026-10', '2026-09', '2026-08']
const historyFilterLabel = (filter) => filter === 'all' ? '全部紀錄' : filter.replace('-', '/')
const visibleHistoryPlans = computed(() => mealPlans.plans
  .filter((plan) => plan.status === 'cooked')
  .filter((plan) => historyFilter.value === 'all' || plan.date.startsWith(historyFilter.value))
  .sort((a, b) => b.date.localeCompare(a.date)))

function previousMonth() { month.value = new Date(month.value.getFullYear(), month.value.getMonth() - 1, 1) }
function nextMonth() { month.value = new Date(month.value.getFullYear(), month.value.getMonth() + 1, 1) }
function goToday() { const now = new Date(); month.value = new Date(now.getFullYear(), now.getMonth(), 1); selectedDate.value = today }
function selectDay(day) {
  selectedDate.value = day.key
  if (!day.inMonth) { const date = fromDateKey(day.key); month.value = new Date(date.getFullYear(), date.getMonth(), 1) }
}
function openCreate() {
  router.push({
    path: '/create',
    query: selectedPlan.value ? { date: selectedDate.value, planId: selectedPlan.value.id } : { date: selectedDate.value },
  })
}
function openRecipe(recipe) {
  router.push({ path: `/journal/recipe/${recipe.id}`, query: { date: selectedDate.value, ...(selectedPlan.value ? { planId: selectedPlan.value.id } : {}) } })
}
function toggleGroceryItem(item) {
  if (selectedPlan.value) mealPlans.toggleGroceryItem(selectedPlan.value.id, item.name)
}
function formatGroceryAmount(item) {
  if (item.qty == null) return item.amount
  return `${item.qty} ${item.unit}`
}
function requestCompleteMeal() {
  if (!selectedPlan.value) return
  finishDialogOpen.value = true
}
function confirmCompleteMeal() {
  if (!selectedPlan.value) return
  const consumed = fridge.consumeIngredients(fridgeDeductions.value)
  mealPlans.markCooked(selectedPlan.value.id, consumed)
  finishDialogOpen.value = false
  toast.show(
    consumed.length ? `已扣除冰箱庫存 ${consumed.length} 項，並存入歷史紀錄` : '已存入歷史烹飪紀錄。',
    { action: { label: '查看歷史紀錄', onClick: () => { view.value = 'history' } } },
  )
}
function openHistoryPlan(plan) {
  view.value = 'calendar'
  selectedDate.value = plan.date
  const date = fromDateKey(plan.date)
  month.value = new Date(date.getFullYear(), date.getMonth(), 1)
}

// 「來點煮意」儲存後以 /journal?date=YYYY-MM-DD 導入，月曆直接聚焦該日的已存餐單。
watch(() => route.query.date, (date) => {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return
  selectedDate.value = date
  const target = fromDateKey(date)
  month.value = new Date(target.getFullYear(), target.getMonth(), 1)
})
</script>

<template>
  <section class="page journal-page">
    <PageTitle :title="pageTitle" :description="pageDescription">
      <template #actions>
        <div class="view-switch" role="tablist" aria-label="餐食日誌檢視方式">
          <button :class="{ 'is-active': view === 'calendar' }" role="tab" :aria-selected="view === 'calendar'" @click="view = 'calendar'">月曆檢視</button>
          <button :class="{ 'is-active': view === 'history' }" role="tab" :aria-selected="view === 'history'" @click="view = 'history'">歷史列表</button>
        </div>
      </template>
    </PageTitle>

    <main v-if="view === 'calendar'" class="journal-layout">
      <section class="selected-meal" aria-live="polite">
        <header class="meal-banner">
          <div class="meal-banner__copy">
            <h2>{{ mealHeadline }}</h2><span class="meal-banner__dot"></span><span>{{ mealMeta.servings }} 人份</span><span class="meal-banner__dot"></span><i class="fa-regular fa-clock"></i><span>預估 {{ mealMeta.minutes }} 分鐘</span>
          </div>
          <div class="meal-banner__actions">
            <button v-if="selectedPlan && selectedPlan.status !== 'cooked'" class="complete-menu" @click="requestCompleteMeal"><i class="fa-solid fa-check"></i> 完成烹飪</button>
            <button class="edit-menu" @click="openCreate"><i class="fa-regular fa-pen-to-square"></i> 編輯餐單</button>
          </div>
        </header>
        <div v-if="selectedPlan && selectedRecipes.length" class="planned-meal">
          <button v-for="recipe in selectedRecipes" :key="recipe.id" class="planned-dish" @click="openRecipe(recipe)">
            <img v-if="recipe.imageUrl" :src="recipe.imageUrl" :alt="recipe.imageAlt || recipe.name" />
            <div v-else class="dish-placeholder"><i class="fa-solid fa-utensils"></i></div>
            <div><p>{{ recipe.type === 'soup' ? '湯品' : '今日菜色' }}</p><h3>{{ recipe.name }}</h3><span>約 {{ recipe.cookTime }} 分鐘</span></div>
          </button>
        </div>
        <div v-else class="meal-empty">
          <i class="fa-solid fa-utensils"></i><h3>今日尚未規劃餐單</h3>
          <p>系統已為您備妥家庭飲食偏好與冰箱食材庫存，隨時可一鍵啟動智能配餐，為今晚餐桌帶來旬味靈感。</p>
        </div>
      </section>

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
        <header class="grocery-header"><div class="grocery-icon"><i class="fa-solid fa-people-group"></i></div><div><h2>{{ groceryDateLabel }} 食材清單</h2><p>依選取餐單即時彙整</p></div><span>{{ groceryCheckedCount }} / {{ groceryItems.length }} 項已買</span></header>
        <div class="grocery-progress"><div><span>採買進度</span><strong>{{ groceryProgress }}%</strong></div><i><b :style="{ width: `${groceryProgress}%` }"></b></i></div>
        <ul v-if="groceryItems.length" class="grocery-list"><li v-for="item in groceryItems" :key="item.name"><button :class="{ 'is-checked': groceryChecked.has(item.name) }" @click="toggleGroceryItem(item)"><i class="fa-solid fa-check"></i><span>{{ item.name }}</span><small>{{ formatGroceryAmount(item) }}</small></button></li></ul>
        <div v-else class="grocery-empty"><i class="fa-solid fa-bag-shopping"></i><h3>{{ selectedPlan ? '當日無待買食材' : '尚未安排餐單' }}</h3><p>{{ selectedPlan ? '這份餐單所需食材已在冰箱中找到，或無需額外採買。' : '排定今日餐單後，系統將自動比對家庭冰箱庫存，列出短缺食材。' }}</p></div>
      </section>
    </main>

    <main v-else class="history-layout">
      <section class="history-records">
        <header class="history-filter"><div role="tablist" aria-label="歷史月份篩選"><button v-for="filter in historyFilters" :key="filter" :class="{ 'is-current': historyFilter === filter }" role="tab" :aria-selected="historyFilter === filter" @click="historyFilter = filter">{{ historyFilterLabel(filter) }}</button></div><span>本月共記錄 {{ visibleHistoryPlans.length }} 餐</span></header>
        <div v-if="!visibleHistoryPlans.length" class="records-empty"><i class="fa-solid fa-utensils"></i><h2>尚未有烹飪紀錄</h2><p>當你完成晚餐後，紀錄會在這出現</p></div>
        <ol v-else class="history-list"><li v-for="plan in visibleHistoryPlans" :key="plan.id"><button @click="openHistoryPlan(plan)"><strong>{{ plan.date }}</strong><span>{{ plan.servings }} 人份・{{ plan.dishes.length }} 道料理</span></button></li></ol>
      </section>
      <aside class="top-recipes"><header><h2><i class="fa-solid fa-circle"></i> 上月常煮料理 TOP 3</h2><span>8月份統計</span></header><ol><li><b>1</b><span>清蒸嫩豆腐</span><em>5 次</em></li><li><b>2</b><span>家常蒜泥白肉</span><em>4 次</em></li><li><b>3</b><span>鮮菇番茄蛋花湯</span><em>4 次</em></li></ol><p>料理提示：常煮菜品高頻複現，建議下次配餐可適度引進季節性蔬菜（如南瓜、蓮藕）豐富餐桌。</p></aside>
    </main>

    <BaseDialog v-model:open="finishDialogOpen" :title="`確認 ${completionDateLabel} 已經煮好了嗎？`" description="確認後，系統會從冰箱庫存扣除用到的食材，並把這餐存入歷史紀錄。" :width="520">
      <div class="completion-dialog">
        <h3>將從冰箱庫存扣除</h3>
        <ul v-if="fridgeDeductions.length" class="deduction-list">
          <li v-for="item in fridgeDeductions" :key="`${item.id}-${item.recipeName}`"><span>{{ item.name }}</span><strong>− {{ item.amount }} {{ item.unit }}</strong></li>
        </ul>
        <p v-else class="no-deduction">此餐未使用冰箱庫存，確認後會直接存入歷史紀錄。</p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="finishDialogOpen = false">取消</BaseButton>
        <BaseButton @click="confirmCompleteMeal">確認並扣除</BaseButton>
      </template>
    </BaseDialog>
  </section>
</template>

<style scoped>
.journal-page { width: min(1240px, 100%); }
.view-switch { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: #f4f0ec; }
.view-switch button { padding: 8px; border-radius: 12px; color: var(--text-body); font-size: 14px; line-height: 1; white-space: nowrap; }
.view-switch button.is-active { background: var(--brand-primary); color: var(--text-on-primary); }
.journal-layout { display: grid; grid-template-columns: minmax(0, 800px) minmax(0, 378px); grid-template-rows: 308px 306px; gap: 36px 38px; padding: 34px 12px 88px; }
.selected-meal { display: flex; min-width: 0; flex-direction: column; }
.meal-banner { display: flex; align-items: center; justify-content: space-between; gap: 14px; min-height: 39px; padding: 0 15px; }
.meal-banner__copy { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; color: var(--text-secondary); font-size: 12px; }
.meal-banner__copy h2 { color: var(--text-title); font-size: 18px; font-weight: 500; }.meal-banner__copy i { color: var(--text-placeholder); }.meal-banner__dot { width: 3px; height: 3px; border-radius: 50%; background: var(--text-placeholder); }
.edit-menu, .today-button { padding: 5px 10px; border-radius: 999px; background: var(--brand-secondary-light); color: var(--text-body); font-size: 10px; white-space: nowrap; }.edit-menu:hover, .today-button:hover { background: var(--brand-secondary-hover); }
.meal-empty { display: flex; height: 181px; flex-direction: column; align-items: center; justify-content: center; margin-top: 16px; border: 1px solid var(--brand-secondary); border-radius: 12px 0 12px; text-align: center; }.meal-empty>i { margin-bottom: 12px; color: var(--brand-primary); font-size: 22px; }.meal-empty h3, .grocery-empty h3 { color: var(--text-body); font-size: 14px; font-weight: 500; }.meal-empty p, .grocery-empty p { max-width: 360px; margin-top: 8px; color: var(--text-placeholder); font-size: 10px; line-height: 1.7; }
.planned-meal { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-top: 16px; padding: 20px; border: 1px solid var(--brand-secondary); border-radius: 12px 0 12px; }.planned-dish { display: flex; align-items: center; gap: 12px; }.planned-dish img, .dish-placeholder { width: 56px; height: 56px; flex: 0 0 56px; border-radius: 8px; object-fit: cover; }.dish-placeholder { display: grid; place-items: center; background: var(--brand-secondary-light); color: var(--brand-primary); }.planned-dish p, .planned-dish span { color: var(--text-placeholder); font-size: 11px; }.planned-dish h3 { margin: 3px 0; color: var(--text-body); font-size: 15px; font-weight: 500; }
.meal-banner__actions { display: flex; align-items: center; gap: 8px; }.complete-menu { padding: 5px 10px; border-radius: 999px; background: var(--brand-primary); color: var(--text-on-primary); font-size: 10px; white-space: nowrap; }.complete-menu:hover { background: var(--brand-primary-hover); }.planned-dish { width: 100%; padding: 0; border: 0; background: transparent; text-align: left; cursor: pointer; }.planned-dish:hover h3 { color: var(--brand-primary); }.grocery-list { display: grid; gap: 0; margin: 14px 0 0; padding: 0; list-style: none; overflow: auto; }.grocery-list li { border-top: 1px solid var(--brand-secondary); }.grocery-list li button { display: grid; width: 100%; grid-template-columns: 16px minmax(0, 1fr) auto; align-items: center; gap: 9px; padding: 9px 0; border: 0; background: transparent; color: var(--text-body); font-size: 12px; text-align: left; cursor: pointer; }.grocery-list li button>i { display: grid; width: 14px; height: 14px; place-items: center; border: 1px solid var(--brand-secondary); border-radius: 3px; color: transparent; font-size: 8px; }.grocery-list li button.is-checked { color: var(--text-placeholder); text-decoration: line-through; }.grocery-list li button.is-checked>i { border-color: var(--brand-primary); background: var(--brand-primary); color: var(--text-on-primary); }.grocery-list small { color: var(--text-placeholder); font-size: 11px; text-decoration: none; }.history-list li { padding: 0; }.history-list li button { display: flex; width: 100%; min-height: 52px; align-items: center; justify-content: space-between; padding: 12px 16px; border: 0; background: transparent; text-align: left; cursor: pointer; }.history-list li button:hover { background: var(--brand-secondary-light); }
.side-card { overflow: hidden; border: 1px solid var(--brand-secondary); border-radius: 12px 0 12px; background: var(--bg-surface); padding: 18px; }.month-card__header, .month-title, .grocery-header { display: flex; align-items: center; }.month-card__header { justify-content: space-between; }.month-title { gap: 8px; }.month-title h2 { color: var(--text-secondary); font-size: 13px; font-weight: 500; white-space: nowrap; }.month-title button { display: grid; width: 16px; height: 20px; place-items: center; color: var(--text-placeholder); font-size: 9px; }.today-button { padding: 0; background: transparent; color: var(--text-placeholder); }.today-button:hover { background: transparent; color: var(--brand-primary); }.weekday-row, .month-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }.weekday-row { margin-top: 17px; padding: 6px 0; border-bottom: 1px solid var(--brand-secondary); color: var(--text-placeholder); font-size: 9px; text-align: center; }.month-grid { gap: 0; margin-top: 12px; }.month-day { display: grid; height: 40px; place-items: center; border-radius: 999px; color: var(--text-secondary); font-size: 10px; }.month-day:hover { background: var(--brand-secondary-light); }.month-day.is-muted { color: var(--brand-secondary); }.month-day.has-plan::after { content: ''; width: 3px; height: 3px; margin-top: -3px; border-radius: 50%; background: var(--brand-primary); }.month-day.is-selected { background: var(--brand-special); color: #fff; }.month-day.is-selected::after { background: #fff; }
.grocery-card { grid-column: 2; grid-row: 2; display: flex; flex-direction: column; }.grocery-header { gap: 9px; }.grocery-icon { display: grid; width: 43px; height: 43px; flex: 0 0 43px; place-items: center; border-radius: 9px 0 9px; background: var(--brand-secondary-light); color: var(--brand-primary); font-size: 17px; }.grocery-header h2 { color: var(--text-body); font-size: 14px; font-weight: 500; }.grocery-header p, .grocery-header>span { color: var(--text-placeholder); font-size: 9px; }.grocery-header>span { margin-left: auto; padding: 4px 8px; border-radius: 999px; background: var(--brand-secondary-light); white-space: nowrap; }.grocery-progress { margin-top: 13px; }.grocery-progress>div { display: flex; justify-content: space-between; color: var(--text-placeholder); font-size: 9px; }.grocery-progress strong { font-weight: 400; }.grocery-progress>i { display: block; height: 5px; margin-top: 5px; overflow: hidden; border-radius: 999px; background: var(--brand-secondary-light); }.grocery-progress>i>b { display: block; height: 100%; border-radius: inherit; background: var(--brand-primary); transition: width .2s ease; }.grocery-empty { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; padding: 20px 12px 0; text-align: center; }.grocery-empty>i { margin-bottom: 11px; color: var(--brand-primary); font-size: 20px; }.grocery-empty p { max-width: 240px; }
.completion-dialog { padding: 4px 0 2px; }.completion-dialog h3 { margin-bottom: 12px; color: var(--text-body); font-size: 15px; font-weight: 500; }.deduction-list { margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--brand-secondary); }.deduction-list li { display: flex; align-items: center; justify-content: space-between; min-height: 42px; border-bottom: 1px solid var(--brand-secondary); color: var(--text-body); font-size: 14px; }.deduction-list strong { color: var(--brand-primary); font-size: 13px; font-weight: 500; }.no-deduction { padding: 16px; border: 1px dashed var(--brand-secondary); border-radius: 8px; color: var(--text-placeholder); font-size: 13px; line-height: 1.6; }
.history-layout { display: grid; grid-template-columns: minmax(0, 848px) minmax(0, 405px); gap: 38px; padding: 20px 12px 88px; }.history-filter { display: flex; align-items: center; justify-content: space-between; min-height: 30px; }.history-filter div { display: flex; gap: 20px; }.history-filter button { padding: 6px 7px; border-bottom: 2px solid transparent; color: var(--text-placeholder); font-size: 11px; }.history-filter button.is-current { border-color: var(--brand-primary); color: var(--text-body); }.history-filter span { padding: 4px 9px; border-radius: 999px; background: #edf2f7; color: var(--text-special); font-size: 10px; }.records-empty { display: flex; height: 174px; flex-direction: column; align-items: center; justify-content: center; margin-top: 18px; border: 1px solid var(--brand-secondary); border-radius: 12px 0 12px; text-align: center; }.records-empty>i { margin-bottom: 10px; color: var(--brand-primary); font-size: 22px; }.records-empty h2 { color: var(--text-body); font-size: 14px; font-weight: 500; }.records-empty p { margin-top: 7px; color: var(--text-placeholder); font-size: 10px; }.history-list { display: grid; gap: 8px; margin-top: 18px; list-style: none; }.history-list li { display: flex; align-items: center; justify-content: space-between; min-height: 52px; padding: 12px 16px; border: 1px solid var(--brand-secondary); border-radius: 8px 0 8px; }.history-list strong { color: var(--text-body); font-size: 13px; font-weight: 500; }.history-list span { color: var(--text-placeholder); font-size: 11px; }.top-recipes { min-height: 281px; padding: 18px; border: 1px solid var(--brand-primary-border); border-radius: 12px 0 12px; }.top-recipes header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid var(--brand-secondary); }.top-recipes h2 { color: var(--text-body); font-size: 13px; font-weight: 500; }.top-recipes h2 i { font-size: 7px; color: #000; }.top-recipes header span { color: var(--text-placeholder); font-size: 9px; }.top-recipes ol { padding: 10px 0; list-style: none; }.top-recipes li { display: grid; grid-template-columns: 18px 1fr auto; align-items: center; min-height: 38px; border-bottom: 1px dashed var(--brand-secondary); color: var(--text-secondary); font-size: 11px; }.top-recipes li b { display: grid; width: 14px; height: 14px; place-items: center; border-radius: 50%; background: var(--brand-secondary-light); font-size: 8px; }.top-recipes li:first-child b { background: var(--brand-special); color: #fff; }.top-recipes li em { color: var(--text-placeholder); font-size: 10px; font-style: normal; }.top-recipes>p { padding: 8px; border-left: 2px solid var(--brand-primary); background: var(--brand-secondary); color: var(--text-secondary); font-size: 9px; line-height: 1.45; }
@media(max-width:1199px){.journal-page{width:100%}.journal-layout{grid-template-columns:minmax(0,1fr) minmax(280px,.8fr);gap:24px;padding:24px 28px 64px}.selected-meal{grid-row:span 2}.meal-empty{height:auto;min-height:181px}.history-layout{grid-template-columns:minmax(0,1fr) 340px;padding:24px 28px 64px}}@media(max-width:780px){.journal-layout,.history-layout{display:flex;flex-direction:column;padding:20px 16px 44px}.selected-meal{min-height:280px}.grocery-card{grid-column:auto;grid-row:auto}.side-card{min-height:280px}.meal-banner{align-items:flex-start;flex-direction:column;padding:12px}.edit-menu{align-self:flex-end}.view-switch{width:100%}.view-switch button{flex:1}.history-layout{gap:20px}.top-recipes{min-height:0}}
</style>
