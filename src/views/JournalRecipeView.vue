<script setup>
// 餐食日誌的料理明細：從已排定餐單進來時，以該餐份數換算食材。
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageTitle from '@/components/layout/PageTitle.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import { useMealPlanStore } from '@/stores/mealPlans'
import { useRecipeStore } from '@/stores/recipes'
import { formatAmount, formatNote } from '@/utils/amount'

const route = useRoute()
const router = useRouter()
const recipes = useRecipeStore()
const mealPlans = useMealPlanStore()

const recipe = computed(() => recipes.getRecipe(route.params.recipeId))
const plan = computed(() => typeof route.query.planId === 'string'
  ? mealPlans.plans.find((item) => item.id === route.query.planId) ?? null
  : null)
const servings = computed(() => plan.value?.servings ?? recipe.value?.servings ?? 1)
// 保留原始份量，畫面上由 formatAmount 依「餐單份數 ÷ 食譜份數」換算一次（先換算再傳比例會放大兩次）
const ingredients = computed(() => recipe.value?.ingredients ?? [])
// 擴充食譜資料尚未附圖片時，仍保留 Figma 的成品照卡版位；有原圖的食譜一律優先使用原圖。
const recipeImage = computed(() => recipe.value?.imageUrl || recipes.recipes.find((item) => item.imageUrl)?.imageUrl || '')
const ingredientGroups = computed(() => {
  const groups = new Map()
  ingredients.value.forEach((item) => {
    const name = item.group || '食材準備'
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name).push(item)
  })
  return [...groups.entries()].map(([name, items]) => ({ name, items }))
})
const timerOpen = ref(false)
const timerRunning = ref(false)
const timerSeconds = ref(0)
const timerTotalSeconds = ref(0)
const timerPresetSeconds = ref(0)
const timerStep = ref('')
const timerFinished = ref(false)
const timerEditing = ref(false)
const timerMinutesInput = ref('05:00')
const timerMinutesField = ref(null)
let timerInterval

const timerLabel = computed(() => {
  const minutes = Math.floor(timerSeconds.value / 60)
  const seconds = timerSeconds.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const timerProgress = computed(() => {
  if (!timerTotalSeconds.value) return 0
  return Math.max(0, Math.min(100, (timerSeconds.value / timerTotalSeconds.value) * 100))
})

function stopTimer() {
  timerRunning.value = false
  clearInterval(timerInterval)
  timerInterval = undefined
}

function startTimer(step) {
  if (step) {
    stopTimer()
    timerSeconds.value = Math.max(0, Number(step.minutes ?? 0) * 60)
    timerTotalSeconds.value = timerSeconds.value
    timerPresetSeconds.value = timerSeconds.value
    timerStep.value = step.title
  } else if (!timerTotalSeconds.value) {
    timerSeconds.value = 5 * 60
    timerTotalSeconds.value = timerSeconds.value
    timerPresetSeconds.value = timerSeconds.value
    timerStep.value = ''
  }
  timerFinished.value = false
  timerOpen.value = true
}

function adjustTimer(minutes) {
  stopTimer()
  timerSeconds.value = Math.max(0, timerSeconds.value + minutes * 60)
  timerTotalSeconds.value = timerSeconds.value
  timerPresetSeconds.value = timerSeconds.value
  timerFinished.value = false
}

function resetTimer() {
  stopTimer()
  timerSeconds.value = timerPresetSeconds.value || 5 * 60
  timerTotalSeconds.value = timerSeconds.value
  timerFinished.value = false
}

function beginTimeEdit() {
  stopTimer()
  timerMinutesInput.value = timerLabel.value === '00:00' ? '05:00' : timerLabel.value
  timerEditing.value = true
  nextTick(() => timerMinutesField.value?.select())
}

function commitTimeEdit() {
  const value = String(timerMinutesInput.value).trim()
  const match = value.match(/^(\d{1,3})(?::([0-5]\d))?$/)
  const seconds = match
    ? Math.min(180 * 60, Math.max(1, Number(match[1]) * 60 + Number(match[2] ?? 0)))
    : 5 * 60
  timerSeconds.value = seconds
  timerTotalSeconds.value = timerSeconds.value
  timerPresetSeconds.value = timerSeconds.value
  timerMinutesInput.value = timerLabel.value
  timerFinished.value = false
  timerEditing.value = false
}

function toggleTimer() {
  if (!timerSeconds.value) return
  if (timerRunning.value) return stopTimer()
  timerRunning.value = true
  timerInterval = setInterval(() => {
    if (timerSeconds.value <= 1) {
      timerSeconds.value = 0
      stopTimer()
      timerFinished.value = true
      return
    }
    timerSeconds.value -= 1
  }, 1000)
}

onBeforeUnmount(stopTimer)

function handleTimerShortcut(event) {
  if (event.metaKey || event.ctrlKey || event.altKey || event.target?.matches('input, textarea, select')) return
  if (!/^[1-9]$/.test(event.key)) return
  stopTimer()
  timerSeconds.value = Number(event.key) * 60
  timerTotalSeconds.value = timerSeconds.value
  timerPresetSeconds.value = timerSeconds.value
  timerStep.value = ''
  timerFinished.value = false
  timerOpen.value = true
}

onMounted(() => window.addEventListener('keydown', handleTimerShortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', handleTimerShortcut))

function backToJournal() {
  router.push({ path: '/journal', query: route.query.date ? { date: route.query.date } : {} })
}
</script>

<template>
  <section v-if="recipe" class="page recipe-page">
    <PageTitle class="recipe-page-title" :title="`食譜步驟・${recipe.name}`" description="從食材準備到料理完成的清楚步驟指引，享受從容舒心的下廚時光。">
      <template #title><span class="recipe-page-title__prefix">食譜步驟</span><span class="recipe-page-title__name">{{ recipe.name }}</span></template>
      <template #actions><BaseButton class="recipe-back" icon="fa-solid fa-arrow-left" @click="backToJournal">返回餐食日誌</BaseButton></template>
    </PageTitle>

    <main class="recipe-layout">
      <section class="recipe-steps">
        <header class="recipe-banner">
          <div class="recipe-banner__meta">
            <h2>烹飪指引與步驟（共 {{ recipe.steps.length }} 步）</h2>
            <span class="recipe-banner__dot" aria-hidden="true"></span>
            <span>{{ servings }} 人份</span>
            <span><i class="fa-regular fa-clock"></i>標準烹調耗時約 {{ recipe.cookTime }} 分鐘</span>
          </div>
        </header>
        <article v-for="step in recipe.steps" :key="step.no" class="step-card">
          <span class="step-card__number">{{ String(step.no).padStart(2, '0') }}</span>
          <div><header><h2>{{ step.title }}</h2><span>{{ step.tag }}</span></header><p>{{ step.desc }}</p><small v-if="step.keyTip">關鍵：{{ step.keyTip }}</small><button v-if="step.minutes" class="step-timer" @click="startTimer(step)"><i class="fa-regular fa-clock"></i> {{ step.minutes }} 分鐘計時</button></div>
        </article>
      </section>

      <aside class="recipe-side">
        <section class="recipe-overview">
          <img v-if="recipeImage" :src="recipeImage" :alt="recipe.imageAlt || recipe.name" />
        </section>
        <section class="ingredient-card">
          <header><h2>所需食材與調味</h2><span>已依 {{ servings }} 人份核算</span></header>
          <section v-for="group in ingredientGroups" :key="group.name" class="ingredient-group">
            <h3>{{ group.name }}</h3>
            <ul :class="{ 'ingredient-list--highlight': group.name === '主要食材' }">
              <li v-for="item in group.items" :key="`${item.no}-${item.name}`"><span>{{ item.name }}</span><b>{{ formatAmount(item, servings / recipe.servings) }}<em v-if="item.note">（{{ formatNote(item, servings / recipe.servings) }}）</em></b></li>
            </ul>
          </section>
          <aside v-if="recipe.prepNote" class="ingredient-tip"><strong>備料小提醒</strong><span>{{ recipe.prepNote }}</span></aside>
        </section>
      </aside>
    </main>

    <aside v-if="timerOpen" class="floating-timer" aria-label="料理計時器">
      <div :class="['timer-dial', { 'is-paused': !timerRunning && timerSeconds && !timerFinished, 'is-finished': timerFinished }]" :style="{ '--timer-progress': `${timerProgress}%` }">
        <div class="timer-adjuster" aria-label="調整計時分鐘"><button aria-label="減少一分鐘" @click="adjustTimer(-1)">−</button><span>1 分鐘</span><button aria-label="增加一分鐘" @click="adjustTimer(1)">+</button></div>
        <button v-if="!timerEditing" class="timer-time" aria-label="點擊設定倒數時間" @click="beginTimeEdit">{{ timerLabel }}</button>
        <input v-else ref="timerMinutesField" v-model="timerMinutesInput" class="timer-time-input" type="text" inputmode="numeric" maxlength="6" aria-label="設定倒數時間，格式為分鐘:秒數" @blur="commitTimeEdit" @keydown.enter.prevent="commitTimeEdit" @keydown.esc="timerEditing = false" />
        <div class="timer-controls"><button class="timer-toggle" :disabled="!timerSeconds" :aria-label="timerRunning ? '暫停計時' : '開始計時'" @click="toggleTimer"><i :class="timerRunning ? 'fa-solid fa-pause' : 'fa-solid fa-play'"></i></button><button class="timer-reset" aria-label="重設計時" @click="resetTimer"><i class="fa-solid fa-rotate-left"></i></button></div>
      </div>
      <button class="timer-collapse" aria-label="收合計時器" @click="timerOpen = false"><i class="fa-solid fa-clock"></i><span>計時器</span></button>
    </aside>
    <button :class="['timer-launch', { 'is-finished': timerFinished }]" v-else @click="startTimer()"><i class="fa-regular fa-clock"></i> <span v-if="timerSeconds">{{ timerLabel }}</span><span v-else>計時器</span></button>
  </section>
  <section v-else class="page recipe-not-found"><PageTitle title="找不到這道料理" description="這道料理可能已不在目前的資料庫中。" /><BaseButton @click="backToJournal">返回餐食日誌</BaseButton></section>
</template>

<style scoped>
.recipe-page { width: 100%; }
.recipe-page :deep(.recipe-back) { gap: 6px; min-height: 39px; padding: 8px 12px; font-size: 13px; line-height: 18px; }.recipe-page :deep(.recipe-back .btn__icon) { font-size: 16px; }
.recipe-layout { display: grid; grid-template-columns: minmax(0, 2fr) minmax(360px, 1fr); gap: 40px; padding: 20px 40px 88px; }
/* 與日誌月曆、歷史、採買卡共用同一組 Figma card 節奏；計時器功能仍保留我們後續加上的互動。 */
.recipe-steps { display: grid; align-content: start; gap: 16px; }.recipe-banner { display: flex; min-height: 54px; align-items: center; justify-content: space-between; padding: 16px; border-radius: 12px 0 12px; box-shadow: 0 1px 1.5px rgba(0, 0, 0, .02); }.recipe-banner__meta { display: flex; flex: 1; flex-wrap: wrap; align-items: center; gap: 6px 10px; color: var(--text-secondary); font-size: 16px; }.recipe-banner h2 { color: var(--text-title); font-size: 22px; font-weight: 400; }.recipe-banner__dot { display: block; width: 4px; height: 4px; padding: 0; border-radius: 50%; background: var(--text-secondary); }.recipe-banner__meta span { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 6px; }.recipe-banner__meta i { color: var(--brand-primary); }
.step-card { display: grid; box-sizing: border-box; grid-template-columns: 36px 1fr; gap: 16px; min-height: 138px; padding: 21px; border: 1px solid var(--brand-secondary); border-radius: 12px 0 12px; background: var(--bg-surface); }.step-card__number { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 12px; background: var(--brand-primary-subtle, var(--brand-secondary-light)); color: var(--text-body); font-size: 16px; }.step-card div { position: relative; min-width: 0; padding-bottom: 20px; }.step-card header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }.step-card header span { padding: 4px 8px; border-radius: 999px; background: var(--brand-secondary-light); color: var(--text-body); font-size: 14px; white-space: nowrap; }.step-card h2 { color: var(--text-body); font-size: 16px; font-weight: 400; }.step-card div > p { margin-top: 8px; color: var(--text-secondary); font-size: 12px; line-height: 1.45; }.step-card small { display: block; margin-top: 7px; color: var(--text-placeholder); font-size: 12px; }.step-timer { position: absolute; right: 0; bottom: 0; color: var(--brand-primary); font-size: 12px; }.step-timer:hover { color: var(--brand-primary-hover); }
.recipe-side { display: grid; align-content: start; gap: 40px; }.recipe-overview { box-sizing: border-box; overflow: hidden; height: 336px; padding: 21px; border: 1px solid var(--brand-secondary); border-radius: 12px 0 12px; background: var(--bg-surface); }.recipe-overview img { display: block; width: 100%; height: 292px; border-radius: 8px; object-fit: cover; }.ingredient-card { display: flex; flex-direction: column; gap: 10px; border: 1px solid var(--brand-secondary); border-radius: 12px 0 12px; background: var(--bg-surface); padding: 20px; box-shadow: 0 4px 2px rgba(0, 0, 0, .02); }.ingredient-card header { display: flex; align-items: baseline; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid var(--brand-secondary); }.ingredient-card h2 { color: var(--text-body); font-size: 14px; font-weight: 400; }.ingredient-card header span { width: 88px; color: var(--text-placeholder); font-size: 10px; text-align: right; }.ingredient-group { display: grid; gap: 6px; }.ingredient-group h3 { color: var(--text-body); font-size: 12px; font-weight: 400; }.ingredient-card ul { overflow: hidden; margin: 0; padding: 0; border: 1px solid var(--brand-secondary); border-radius: 12px; list-style: none; }.ingredient-card li { display: flex; justify-content: space-between; gap: 12px; padding: 9px 12px; border-top: 1px solid var(--brand-secondary); color: var(--text-body); font-size: 12px; }.ingredient-card li:first-child { border-top: 0; }.ingredient-card ul.ingredient-list--highlight { border: 0; background: var(--brand-secondary-light); }.ingredient-list--highlight li { border-top: 0; }.ingredient-card b { color: var(--text-secondary); font-weight: 400; text-align: right; }.ingredient-card em { color: var(--text-secondary); font-style: normal; }.ingredient-tip { display: grid; gap: 4px; padding: 10px; border: 1px solid var(--brand-secondary); border-radius: 12px; background: var(--brand-secondary-light); color: var(--text-on-secondary); }.ingredient-tip strong { font-size: 10px; font-weight: 400; }.ingredient-tip span { font-size: 9px; line-height: 1.45; }
.timer-launch, .floating-timer { position: fixed; right: 60px; bottom: 96px; z-index: 20; }.timer-launch, .timer-collapse { display: inline-flex; align-items: center; gap: 8px; height: 45px; padding: 0 20px 0 18px; border-radius: 999px; background: var(--brand-primary); box-shadow: 0 8px 24px rgba(52, 38, 28, .18); color: var(--text-on-primary); font-size: 16px; font-weight: 700; }.timer-launch i, .timer-collapse i { font-size: 20px; }.timer-launch.is-finished { animation: timer-pulse 1s ease-in-out infinite; }.floating-timer { display: grid; justify-items: center; width: 300px; }.timer-dial { position: relative; display: grid; width: 300px; height: 300px; place-items: center; overflow: hidden; border: 1px solid var(--brand-primary-border); border-radius: 50%; background: conic-gradient(var(--brand-secondary-active) var(--timer-progress), var(--brand-secondary) 0); box-shadow: 0 10px 26px rgba(52, 38, 28, .14); }.timer-dial::before { position: absolute; inset: 15px; border-radius: inherit; background: var(--brand-secondary-light); content: ''; }.timer-dial > * { position: relative; z-index: 1; }.timer-dial.is-paused { animation: none; }.timer-dial.is-finished { background: conic-gradient(var(--brand-secondary-active) 100%, var(--brand-secondary-active) 0); }.timer-adjuster { position: absolute; top: 48px; display: flex; align-items: center; gap: 18px; padding: 11px 22px; border-radius: 999px; background: var(--brand-secondary); color: var(--text-body); }.timer-adjuster button { color: var(--text-body); font-family: Inter, sans-serif; font-size: 22px; font-weight: 700; line-height: 1; }.timer-adjuster span { font-size: 16px; white-space: nowrap; }.timer-time, .timer-time-input { position: absolute; top: 116px; width: 210px; border: 0; background: transparent; color: var(--text-title); font-family: Inter, sans-serif; font-size: 68px; font-weight: 700; letter-spacing: -3px; line-height: 1; text-align: center; }.timer-time { cursor: text; }.timer-time:hover { color: var(--brand-primary); }.timer-time-input { outline: 1px solid var(--brand-primary-border); border-radius: 8px; background: #fff; font-size: 58px; }.timer-controls { position: absolute; bottom: 30px; display: flex; gap: 18px; }.timer-controls button { display: grid; width: 60px; height: 60px; place-items: center; border-radius: 50%; box-shadow: 0 2px 8px rgba(52, 38, 28, .16); }.timer-toggle { background: var(--brand-primary); color: var(--text-on-primary); font-size: 20px; }.timer-toggle:disabled { background: var(--brand-greige); color: var(--brand-secondary); }.timer-reset { border: 2px solid var(--brand-primary-border); background: var(--bg-surface); color: var(--brand-primary); font-size: 20px; }.timer-collapse { margin-top: 16px; }@keyframes timer-pulse { 50% { opacity: .82; transform: scale(.98); } }
.recipe-not-found { display: grid; gap: 24px; place-items: start; }
.recipe-page-title__prefix::after { content: '・'; }
@media (min-width: 641px) and (max-width: 1024px) { .recipe-layout { grid-template-columns: 1fr; padding: 24px 16px 60px; }.recipe-banner { align-items: flex-start; flex-direction: column; }.recipe-overview { min-height: 0; }.timer-launch, .floating-timer { right: 16px; bottom: 22px; }.floating-timer { transform: scale(.82); transform-origin: right bottom; } }
@media (min-width: 641px) and (max-width: 1024px) {
  /* 食譜步驟沒有通用 .page 包裝，補上與家庭管理／冰箱相同的外層頁面留白。 */
  .recipe-page { box-sizing: border-box; padding: var(--page-padding-y) var(--page-padding-x) 0; }
  .recipe-layout { gap: 24px; padding: 20px 28px 72px; }
  .recipe-steps { gap: 14px; }
  .recipe-banner { min-height: 0; padding: 14px; }
  .recipe-banner__meta { font-size: 15px; }
  .recipe-banner h2 { font-size: 20px; }
  .step-card { min-height: 118px; padding: 16px; }
  .step-card h2 { font-size: 15px; }
  .step-card header span { font-size: 12px; }
  .recipe-side { gap: 20px; }
  .recipe-overview { height: 280px; padding: 16px; }
  .recipe-overview img { height: 246px; }
  .ingredient-card { padding: 16px; }
  .timer-launch { right: 24px; bottom: 32px; height: 41px; font-size: 14px; }
}
@media (min-width: 1025px) and (max-width: 1279px) {
  .recipe-page :deep(.page-title) { padding: 36px 28px 28px; }
  .recipe-layout { grid-template-columns: minmax(0, 1.45fr) minmax(280px, .85fr); gap: 24px; padding: 20px 28px 72px; }
  .recipe-steps { gap: 14px; }
  .step-card { min-height: 118px; padding: 16px; }
  .recipe-side { gap: 20px; }
  .recipe-overview { height: 280px; padding: 16px; }
  .recipe-overview img { height: 246px; }
  .ingredient-card { padding: 16px; }
  .timer-launch { right: 28px; bottom: 40px; height: 41px; font-size: 14px; }
}
@media (max-width: 640px) {
  /* 食譜步驟補上通用 .page 外層，頁首對齊冰箱／家庭管理。 */
  .recipe-page { box-sizing: border-box; padding: var(--page-padding-y) var(--page-padding-x) 0; }
  .recipe-page :deep(.page-title) { padding: var(--space-28) var(--space-20) 24px; }
  /* 手機將功能名稱與菜名拆為兩行，讓長菜名不用與「食譜步驟」搶同一行。 */
  .recipe-page-title__prefix, .recipe-page-title__name { display: block; }
  .recipe-page-title__prefix::after { content: ''; }
  .recipe-page-title__prefix { font-size: 18px; line-height: 1.25; }
  .recipe-page-title__name { margin-top: 3px; font-size: 16px; line-height: 1.3; letter-spacing: .04em; }
  /* 標題區塊沿用全站 PageTitle；僅縮小回上一頁按鈕本身。 */
  .recipe-page :deep(.recipe-back) { min-height: 36px; padding: 6px 10px; font-size: 12px; }
  /* 手機先展示成品照，再閱讀步驟，最後才是食材明細。 */
  .recipe-layout { display: flex; flex-direction: column; gap: 20px; padding: 20px 16px 84px; }
  .recipe-side { display: contents; }
  .recipe-overview { order: 1; }
  .recipe-steps { order: 2; }
  .ingredient-card { order: 3; }
  .recipe-steps { gap: 12px; }
  .recipe-banner { min-height: 0; padding: 12px; }
  .recipe-banner__meta { gap: 5px 8px; font-size: 14px; }
  .recipe-banner h2 { font-size: 19px; }
  .step-card { grid-template-columns: 28px minmax(0, 1fr); gap: 10px; min-height: 0; padding: 14px; }
  .step-card__number { width: 28px; height: 28px; border-radius:9px; font-size: 13px; }
  /* 計時器改隨內容排列，不再為每張步驟卡預留一整段底部空白。 */
  .step-card div { padding-bottom: 0; }
  .step-card header { gap: 8px; }
  .step-card h2 { font-size: 14px; }
  .step-card header span { padding: 3px 6px; font-size: 11px; }
  .step-card div > p { margin-top: 6px; font-size: 11px; }
  .step-card small, .step-timer { font-size: 10px; }
  .step-timer { position: static; display: inline-flex; align-items: center; gap: 4px; margin-top: 7px; }
  .recipe-overview { height: auto; padding: 14px; }
  .recipe-overview img { height: 210px; }
  .ingredient-card { gap: 8px; padding: 14px; }
  .ingredient-card li { padding: 8px 10px; font-size: 11px; }
  .timer-launch { right: 16px; bottom: 76px; height: 36px; padding: 0 14px; font-size: 13px; }
  .timer-launch i { font-size: 16px; }
  .floating-timer { right: 8px; bottom: 62px; transform: scale(.7); }
}
</style>
