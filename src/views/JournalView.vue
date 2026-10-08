<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageTitle from '@/components/layout/PageTitle.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import { useMealPlanStore } from '@/stores/mealPlans'
import { useRecipeStore } from '@/stores/recipes'
import { fromDateKey, toDateKey } from '@/utils/date'

const router = useRouter()
const mealPlans = useMealPlanStore()
const recipes = useRecipeStore()
const today = toDateKey()
const month = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const selectedDate = ref(today)
const deleteOpen = ref(false)

const monthLabel = computed(() => `${month.value.getFullYear()} 年 ${month.value.getMonth() + 1} 月`)
const selectedPlan = computed(() => mealPlans.getPlan(selectedDate.value))
const selectedRecipes = computed(() =>
  (selectedPlan.value?.dishes ?? []).map((dish) => recipes.getRecipe(dish.recipeId)).filter(Boolean),
)
const plansByDate = computed(() => Object.fromEntries(mealPlans.plans.map((plan) => [plan.date, plan])))

const calendarDays = computed(() => {
  const year = month.value.getFullYear()
  const monthIndex = month.value.getMonth()
  const firstDay = new Date(year, monthIndex, 1).getDay()
  const dayCount = new Date(year, monthIndex + 1, 0).getDate()
  const previousCount = new Date(year, monthIndex, 0).getDate()
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - firstDay + 1
    const date = day < 1
      ? new Date(year, monthIndex - 1, previousCount + day)
      : day > dayCount
        ? new Date(year, monthIndex + 1, day - dayCount)
        : new Date(year, monthIndex, day)
    const key = toDateKey(date)
    return { key, number: date.getDate(), inMonth: date.getMonth() === monthIndex, plan: plansByDate.value[key] }
  })
})

function previousMonth() { month.value = new Date(month.value.getFullYear(), month.value.getMonth() - 1, 1) }
function nextMonth() { month.value = new Date(month.value.getFullYear(), month.value.getMonth() + 1, 1) }
function selectDay(day) { selectedDate.value = day.key }
function openCreate() { router.push({ path: '/create', query: { date: selectedDate.value } }) }
function removeSelectedPlan() {
  if (selectedPlan.value) mealPlans.removePlan(selectedPlan.value.id)
  deleteOpen.value = false
}
function friendlyDate(key) {
  const date = fromDateKey(key)
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`
}
</script>

<template>
  <section class="page">
    <PageTitle title="餐食日誌" description="記錄每日晚餐，讓每一餐的安排都有跡可循。">
      <template #actions>
        <BaseButton size="sm" icon="fa-solid fa-plus" @click="openCreate">安排晚餐</BaseButton>
      </template>
    </PageTitle>

    <main class="journal">
      <section class="calendar-card" aria-label="晚餐月曆">
        <header class="calendar-card__header">
          <div>
            <p>晚餐行事曆</p>
            <h2>{{ monthLabel }}</h2>
          </div>
          <div class="calendar-card__nav">
            <button aria-label="上個月" @click="previousMonth"><i class="fa-solid fa-chevron-left"></i></button>
            <button class="calendar-card__today" @click="month = new Date(); selectedDate = today">今天</button>
            <button aria-label="下個月" @click="nextMonth"><i class="fa-solid fa-chevron-right"></i></button>
          </div>
        </header>

        <div class="weekdays" aria-hidden="true"><span v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day">{{ day }}</span></div>
        <div class="calendar-grid">
          <button
            v-for="day in calendarDays"
            :key="day.key"
            class="calendar-day"
            :class="{ 'is-other': !day.inMonth, 'is-today': day.key === today, 'is-selected': day.key === selectedDate, 'has-plan': day.plan }"
            @click="selectDay(day)"
          >
            <span>{{ day.number }}</span>
            <small v-if="day.plan">晚餐</small>
          </button>
        </div>
      </section>

      <section class="detail-card" aria-live="polite">
        <header class="detail-card__header">
          <div><p>晚餐安排</p><h2>{{ friendlyDate(selectedDate) }}</h2></div>
          <span v-if="selectedPlan" class="servings">{{ selectedPlan.servings }} 人份</span>
        </header>

        <template v-if="selectedPlan">
          <div class="meal-list">
            <article v-for="recipe in selectedRecipes" :key="recipe.id" class="meal-row">
              <img v-if="recipe.imageUrl" :src="recipe.imageUrl" :alt="recipe.imageAlt || recipe.name" />
              <div class="meal-row__placeholder" v-else><i class="fa-solid fa-utensils"></i></div>
              <div><span>{{ recipe.type === 'soup' ? '湯品' : '菜色' }}</span><h3>{{ recipe.name }}</h3><p>約 {{ recipe.cookTime }} 分鐘</p></div>
            </article>
          </div>
          <footer class="detail-card__actions">
            <BaseButton variant="outline" size="sm" icon="fa-solid fa-pen" @click="openCreate">調整餐單</BaseButton>
            <button class="text-button is-danger" @click="deleteOpen = true">刪除安排</button>
          </footer>
        </template>

        <div v-else class="empty-plan">
          <i class="fa-regular fa-calendar-plus"></i>
          <h3>這一天還沒有晚餐安排</h3>
          <p>從家人的偏好與冰箱庫存，配出一桌剛好的晚餐。</p>
          <BaseButton size="sm" icon="fa-solid fa-plus" @click="openCreate">安排這天晚餐</BaseButton>
        </div>
      </section>
    </main>

    <div v-if="deleteOpen" class="overlay" @click.self="deleteOpen = false">
      <section class="confirm" role="dialog" aria-modal="true" aria-labelledby="delete-title">
        <h2 id="delete-title">刪除這天的晚餐安排？</h2>
        <p>刪除後，此日期的餐單將不再顯示於餐食日誌。</p>
        <div><BaseButton variant="secondary" @click="deleteOpen = false">取消</BaseButton><BaseButton @click="removeSelectedPlan">確認刪除</BaseButton></div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.journal{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);gap:24px;padding:32px}.calendar-card,.detail-card{border:1px solid var(--brand-secondary);border-radius:12px 0 12px;background:var(--bg-surface)}.calendar-card{padding:24px}.calendar-card__header,.detail-card__header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:20px;border-bottom:1px solid var(--brand-secondary)}.calendar-card__header p,.detail-card__header p{margin-bottom:4px;color:var(--text-placeholder);font-size:12px}.calendar-card h2,.detail-card h2{color:var(--text-title);font-size:24px;font-weight:400}.calendar-card__nav{display:flex;align-items:center;gap:8px}.calendar-card__nav button{display:grid;width:32px;height:32px;place-items:center;border:1px solid var(--brand-secondary);border-radius:8px;color:var(--text-body)}.calendar-card__nav .calendar-card__today{width:auto;padding:0 10px;font-size:12px}.weekdays,.calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}.weekdays{margin-top:16px;color:var(--text-placeholder);font-size:12px;text-align:center}.calendar-grid{margin-top:8px;border-top:1px solid var(--brand-secondary);border-left:1px solid var(--brand-secondary)}.calendar-day{display:flex;min-height:76px;flex-direction:column;align-items:flex-start;gap:6px;padding:9px;border-right:1px solid var(--brand-secondary);border-bottom:1px solid var(--brand-secondary);color:var(--text-body);font-size:13px;text-align:left}.calendar-day.is-other{color:var(--brand-secondary)}.calendar-day.is-today>span{display:grid;width:24px;height:24px;place-items:center;border-radius:50%;background:var(--brand-secondary-light);color:var(--brand-primary)}.calendar-day.is-selected{background:#f8f5f2;box-shadow:inset 0 0 0 2px var(--brand-primary)}.calendar-day small{padding:3px 6px;border-radius:999px;background:var(--brand-primary);color:#fff;font-size:10px}.detail-card{min-height:480px;padding:24px}.servings{padding:5px 9px;border-radius:999px;background:#eef2f7;color:var(--text-special);font-size:12px}.meal-list{display:grid;gap:12px;padding:20px 0}.meal-row{display:flex;align-items:center;gap:12px}.meal-row img,.meal-row__placeholder{width:58px;height:58px;flex:0 0 58px;border-radius:10px;object-fit:cover}.meal-row__placeholder{display:grid;place-items:center;background:var(--brand-secondary-light);color:var(--brand-primary)}.meal-row span,.meal-row p{color:var(--text-placeholder);font-size:12px}.meal-row h3{margin:3px 0;color:var(--text-body);font-size:16px;font-weight:400}.detail-card__actions{display:flex;align-items:center;justify-content:space-between;padding-top:16px;border-top:1px solid var(--brand-secondary)}.text-button{color:var(--text-secondary);font-size:13px}.text-button.is-danger{color:var(--text-danger)}.empty-plan{display:flex;min-height:350px;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center}.empty-plan>i{color:var(--brand-primary);font-size:30px}.empty-plan h3{color:var(--text-body);font-size:18px;font-weight:400}.empty-plan p{max-width:280px;color:var(--text-secondary);font-size:13px;line-height:1.7}.overlay{position:fixed;z-index:40;inset:0;display:grid;place-items:center;padding:20px;background:rgba(52,38,28,.42)}.confirm{width:min(420px,100%);padding:28px;border:1px solid var(--brand-secondary);border-radius:12px 0 12px;background:#fff}.confirm h2{color:var(--text-title);font-size:22px;font-weight:400}.confirm p{margin:10px 0 24px;color:var(--text-secondary);font-size:14px;line-height:1.6}.confirm>div{display:flex;justify-content:flex-end;gap:8px}@media(max-width:900px){.journal{grid-template-columns:1fr;padding:28px 20px}.detail-card{min-height:0}}@media(max-width:600px){.journal{padding:20px 16px}.calendar-card,.detail-card{padding:16px}.calendar-card h2,.detail-card h2{font-size:20px}.calendar-day{min-height:56px;padding:6px;font-size:12px}.calendar-day small{display:none}.calendar-card__nav .calendar-card__today{padding:0 7px}.empty-plan{min-height:250px}}
</style>
