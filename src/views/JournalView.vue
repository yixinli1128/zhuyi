<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageTitle from '@/components/layout/PageTitle.vue'
import { useMealPlanStore } from '@/stores/mealPlans'
import { useRecipeStore } from '@/stores/recipes'
import { fromDateKey, toDateKey } from '@/utils/date'

const router = useRouter()
const mealPlans = useMealPlanStore()
const recipes = useRecipeStore()
const view = ref('calendar')
const today = toDateKey()
const month = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const selectedDate = ref(today)
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

function previousMonth() { month.value = new Date(month.value.getFullYear(), month.value.getMonth() - 1, 1) }
function nextMonth() { month.value = new Date(month.value.getFullYear(), month.value.getMonth() + 1, 1) }
function goToday() { const now = new Date(); month.value = new Date(now.getFullYear(), now.getMonth(), 1); selectedDate.value = today }
function selectDay(day) {
  selectedDate.value = day.key
  if (!day.inMonth) { const date = fromDateKey(day.key); month.value = new Date(date.getFullYear(), date.getMonth(), 1) }
}
function openCreate() { router.push({ path: '/create', query: { date: selectedDate.value } }) }
</script>

<template>
  <section class="page journal-page">
    <PageTitle title="餐食日誌・餐單行事曆" description="掌握全月份配餐與料理歷程，選取日期即時檢視專屬菜單與生鮮採買清單。">
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
          <button class="edit-menu" @click="openCreate"><i class="fa-regular fa-pen-to-square"></i> 編輯餐單</button>
        </header>
        <div v-if="selectedPlan && selectedRecipes.length" class="planned-meal">
          <article v-for="recipe in selectedRecipes" :key="recipe.id" class="planned-dish">
            <img v-if="recipe.imageUrl" :src="recipe.imageUrl" :alt="recipe.imageAlt || recipe.name" />
            <div v-else class="dish-placeholder"><i class="fa-solid fa-utensils"></i></div>
            <div><p>{{ recipe.type === 'soup' ? '湯品' : '今日菜色' }}</p><h3>{{ recipe.name }}</h3><span>約 {{ recipe.cookTime }} 分鐘</span></div>
          </article>
        </div>
        <div v-else class="meal-empty">
          <i class="fa-solid fa-utensils"></i><h3>今日尚未規劃餐單</h3>
          <p>系統已為您備妥家庭飲食偏好與冰箱食材庫存，隨時可一鍵啟動智能配餐，為今晚餐桌帶來旬味靈感。</p>
          <button class="start-menu" @click="openCreate"><i class="fa-solid fa-plus"></i> 開始安排晚餐</button>
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
        <header class="grocery-header"><div class="grocery-icon"><i class="fa-solid fa-bag-shopping"></i></div><div><h2>{{ groceryDateLabel }} 食材清單</h2><p>依選取餐單即時彙整</p></div><span>0 / 4 項已買</span></header>
        <div class="grocery-progress"><div><span>採買進度</span><strong>0%</strong></div><i><b></b></i></div>
        <div class="grocery-empty"><i class="fa-solid fa-bag-shopping"></i><h3>當日無待買食材</h3><p>排定今日餐單後，系統將自動比對家庭冰箱庫存，僅精準列出短缺的生鮮食材與建議份量。</p></div>
      </section>
    </main>

    <main v-else class="history-empty"><i class="fa-regular fa-calendar"></i><h2>尚未有餐食紀錄</h2><p>完成第一份晚餐餐單後，料理歷程會顯示在這裡。</p><button class="start-menu" @click="openCreate"><i class="fa-solid fa-plus"></i> 安排晚餐</button></main>
  </section>
</template>

<style scoped>
.view-switch{display:inline-flex;padding:4px;border-radius:8px 0 8px;background:var(--brand-secondary-light)}.view-switch button{min-width:92px;padding:8px 12px;border-radius:6px 0 6px;color:var(--text-secondary);font-size:12px;transition:.18s ease}.view-switch button.is-active{background:var(--brand-primary);color:var(--text-on-primary);box-shadow:0 2px 5px rgb(52 38 28 / 14%)}
.journal-layout{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:342px 339px;gap:40px;padding:20px 40px 88px}.selected-meal{grid-column:span 2;grid-row:span 2;display:flex;min-width:0;flex-direction:column;overflow:hidden;border:1px solid var(--brand-secondary);border-radius:12px 0 12px;background:var(--bg-surface)}.meal-banner{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:60px;padding:14px 20px;border-bottom:1px solid var(--brand-secondary);background:var(--brand-secondary-light)}.meal-banner__copy{display:flex;align-items:center;flex-wrap:wrap;gap:8px;color:var(--text-secondary);font-size:12px}.meal-banner__copy h2{color:var(--text-title);font-size:18px;font-weight:500}.meal-banner__copy i{color:var(--text-placeholder)}.meal-banner__dot{width:3px;height:3px;border-radius:50%;background:var(--text-placeholder)}.edit-menu,.today-button{padding:7px 11px;border:1px solid var(--brand-primary-border);border-radius:7px 0 7px;background:#fff;color:var(--text-body);font-size:12px;white-space:nowrap}.edit-menu:hover,.today-button:hover{border-color:var(--brand-primary);background:var(--brand-secondary-light)}
.meal-empty,.grocery-empty{display:flex;flex:1;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center}.meal-empty>i,.grocery-empty>i{margin-bottom:13px;color:var(--brand-primary);font-size:25px}.meal-empty h3,.grocery-empty h3{color:var(--text-body);font-size:16px;font-weight:500}.meal-empty p,.grocery-empty p{max-width:420px;margin-top:8px;color:var(--text-placeholder);font-size:12px;line-height:1.8}.start-menu{margin-top:20px;padding:9px 17px;border-radius:999px;background:var(--brand-primary);color:#fff;font-size:13px}.start-menu:hover{background:var(--brand-primary-hover)}.planned-meal{display:grid;align-content:center;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;flex:1;padding:28px}.planned-dish{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--brand-secondary);border-radius:10px 0 10px}.planned-dish img,.dish-placeholder{width:58px;height:58px;flex:0 0 58px;border-radius:8px;object-fit:cover}.dish-placeholder{display:grid;place-items:center;background:var(--brand-secondary-light);color:var(--brand-primary)}.planned-dish p,.planned-dish span{color:var(--text-placeholder);font-size:11px}.planned-dish h3{margin:3px 0;color:var(--text-body);font-size:15px;font-weight:500}
.side-card{overflow:hidden;border:1px solid var(--brand-secondary);border-radius:12px 0 12px;background:var(--bg-surface);padding:21px}.month-card__header,.month-title,.grocery-header{display:flex;align-items:center}.month-card__header{justify-content:space-between;gap:8px}.month-title{gap:5px}.month-title h2{color:var(--text-title);font-size:15px;font-weight:500;white-space:nowrap}.month-title button{display:grid;width:20px;height:25px;place-items:center;color:var(--text-secondary);font-size:11px}.today-button{padding:5px 9px;font-size:11px}.weekday-row,.month-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}.weekday-row{margin-top:14px;padding:7px 0;border-bottom:1px solid var(--brand-secondary);color:var(--text-placeholder);font-size:10px;letter-spacing:.08em;text-align:center}.month-grid{gap:4px;margin-top:8px}.month-day{display:grid;min-width:0;height:40px;place-items:center;border-radius:999px;color:var(--text-body);font-size:12px}.month-day:hover{background:var(--brand-secondary-light)}.month-day.is-muted{color:var(--brand-secondary)}.month-day.has-plan::after{content:'';width:3px;height:3px;margin-top:-3px;border-radius:50%;background:var(--brand-primary)}.month-day.is-selected{background:var(--brand-special);color:#fff}.month-day.is-selected::after{background:#fff}
.grocery-card{display:flex;flex-direction:column}.grocery-header{gap:10px}.grocery-icon{display:grid;width:43px;height:43px;flex:0 0 43px;place-items:center;border-radius:8px 0 8px;background:var(--brand-secondary-light);color:var(--brand-primary);font-size:17px}.grocery-header h2{color:var(--text-title);font-size:15px;font-weight:500}.grocery-header p,.grocery-header>span{color:var(--text-placeholder);font-size:10px}.grocery-header>span{margin-left:auto;white-space:nowrap}.grocery-progress{margin-top:17px}.grocery-progress>div{display:flex;justify-content:space-between;color:var(--text-placeholder);font-size:10px}.grocery-progress strong{font-weight:400}.grocery-progress>i{display:block;height:5px;margin-top:6px;overflow:hidden;border-radius:999px;background:var(--brand-secondary-light)}.grocery-progress b{display:block;width:0;height:100%;background:var(--brand-primary)}.grocery-empty{min-height:0;padding:25px 12px 10px}.grocery-empty>i{font-size:23px}.grocery-empty p{max-width:260px;font-size:10px;line-height:1.7}
.history-empty{display:flex;min-height:450px;flex-direction:column;align-items:center;justify-content:center;gap:8px;margin:20px 40px 88px;border:1px solid var(--brand-secondary);border-radius:12px 0 12px;background:var(--bg-surface);text-align:center}.history-empty>i{color:var(--brand-primary);font-size:26px}.history-empty h2{color:var(--text-body);font-size:18px;font-weight:500}.history-empty p{color:var(--text-placeholder);font-size:12px}
@media(max-width:1120px){.journal-layout{grid-template-columns:minmax(0,1fr) minmax(280px,.8fr);gap:24px;padding:24px 28px 64px}.selected-meal{grid-column:auto;grid-row:span 2}.history-empty{margin:24px 28px 64px}}@media(max-width:780px){.journal-layout{display:flex;flex-direction:column;padding:20px 16px 44px}.selected-meal{min-height:360px}.side-card{min-height:auto}.month-card{min-height:320px}.grocery-card{min-height:280px}.history-empty{min-height:320px;margin:20px 16px 44px}.meal-banner{align-items:flex-start;flex-direction:column}.edit-menu{align-self:flex-end}.view-switch{width:100%}.view-switch button{flex:1}}
</style>
