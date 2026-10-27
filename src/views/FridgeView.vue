<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageTitle from '@/components/layout/PageTitle.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import DatePickerDialog from '@/components/base/DatePickerDialog.vue'
import AppIcon from '@/components/base/AppIcon.vue'
import { useFridgeStore } from '@/stores/fridge'
import { useRecipeStore } from '@/stores/recipes'
import { addDays, toDateKey } from '@/utils/date'
import { englishUnits } from '@/utils/amount'
import addIconUrl from '@/assets/figma/fridge-add.svg'
import gridIconUrl from '@/assets/figma/fridge-grid.svg'
import listIconUrl from '@/assets/figma/fridge-list.svg'
import searchIconUrl from '@/assets/figma/fridge-search.svg'
import emptySlotAddIconUrl from '@/assets/figma/fridge-empty-add.svg'
import closeIconUrl from '@/assets/figma/fridge-modal-close.svg'
import shortcutAddIconUrl from '@/assets/figma/fridge-modal-small-add.svg'
import amountMinusIconUrl from '@/assets/figma/fridge-modal-minus.svg'
import amountPlusIconUrl from '@/assets/figma/fridge-modal-plus.svg'
import chillZoneIconUrl from '@/assets/figma/fridge-zone-chill.svg'
import freezerZoneIconUrl from '@/assets/figma/fridge-zone-freezer.svg'
import produceZoneIconUrl from '@/assets/figma/fridge-zone-produce.svg'
import pantryZoneIconUrl from '@/assets/figma/fridge-zone-pantry.svg'
import calendarIconUrl from '@/assets/figma/fridge-modal-calendar.svg'
import unitChevronUrl from '@/assets/figma/fridge-unit-chevron.svg'

// 食材圖用縮小過的 WebP（scripts/optimize-images.py 產生，原圖每張約 650 KB）；還沒轉檔的新圖退回用原本的 PNG
const foodImageAssets = Object.fromEntries([
  ...Object.entries(import.meta.glob('../../img/reffood/*.png', { eager: true, import: 'default', query: '?url' })),
  ...Object.entries(import.meta.glob('../assets/web/reffood/*.webp', { eager: true, import: 'default', query: '?url' })),
].map(([path, url]) => [path.split('/').pop().replace(/\.(png|webp)$/, ''), url]))
const foodImageNames = {
  // 兩者名稱相近，不能交給模糊比對；蔬果室的「辣椒」必須使用新鮮辣椒圖。
  辣椒: '辣椒',
  剝皮辣椒: '剝皮辣椒',
  米酒: '米酒',
  牛番茄: '牛蕃茄',
  豬梅花肉片: '豬肉片',
  梅花豬肉片: '豬肉片',
  溫體黑豬梅花肉: '豬肉片',
  厚切鮭魚片: '鮭魚',
}

const store = useFridgeStore()
const recipeStore = useRecipeStore()
const router = useRouter()
// 快到期的排前面；沒填到期日的放最後，同一天再依名稱排
const byExpiry = (a, b) => (a.expiry || '9999-12-31').localeCompare(b.expiry || '9999-12-31') || a.name.localeCompare(b.name, 'zh-Hant')
const ingredients = computed(() => [...store.activeIngredients].sort(byExpiry))
const activeZone = ref('全部'), query = ref(''), view = ref('list'), dialog = ref(null), unitMenuOpen = ref(false)
const editingId = ref(null), deletingId = ref(null), submitted = ref(false), toast = ref('')
let toastTimer
const zones = [
  { name: '冷藏', label: '冷藏保鮮', hint: '0～4°C', days: 3, icon: chillZoneIconUrl },
  { name: '冷凍', label: '冷凍保存', hint: '-18°C', days: 30, icon: freezerZoneIconUrl },
  { name: '蔬果室', label: '蔬果專區', hint: '6～8°C', days: 5, icon: produceZoneIconUrl },
  { name: '常溫/調味', label: '常溫／乾貨', hint: '18°C', days: 90, icon: pantryZoneIconUrl },
]
const commonFoods = ['雞蛋', '牛番茄', '嫩豆腐']
// 常見食材以家庭採買時最常用的單位預填；使用者仍可在下方自行更改。
const suggestedUnits = {
  雞蛋: '顆', 溫泉蛋: '顆', 熟鹹鴨蛋: '顆',
  高麗菜: '顆', 當季高麗菜: '顆', 大白菜: '顆', 綠花椰菜: '顆', 花椰菜: '顆',
  牛番茄: '顆', 番茄: '顆', 洋蔥: '顆', 馬鈴薯: '顆', 南瓜: '顆', 冬瓜: '顆', 苦瓜: '條', 絲瓜: '條', 茄子: '條', 小黃瓜: '條',
  紅蘿蔔: '根', 白蘿蔔: '根', 辣椒: '根', 蒜苗: '根', 玉米: '根', 蘆筍: '把',
  青蔥: '把', 菠菜: '把', 空心菜: '把', 青江菜: '把', 芹菜: '把', 九層塔: '把', 綜合生菜: '把',
  蒜頭: '顆', 薑: '塊', 老薑: '塊', 紅蔥頭: '顆',
  豆腐: '盒', 嫩豆腐: '盒', 板豆腐: '盒', 五香豆干: '盒', 豆皮: '包', 毛豆仁: '包',
  金針菇: '包', 鮮香菇: '包', 乾香菇: '包', 鮮菇: '包', 綜合菇: '包', 杏鮑菇: '包',
  雞腿排: '片', 鮭魚: '片', 鯖魚: '片',
  豬梅花肉片: 'g（公克）', 豬肉片: 'g（公克）', 豬五花肉: 'g（公克）', 豬里肌肉: 'g（公克）', 豬絞肉: 'g（公克）', 牛肉片: 'g（公克）', 雞胸肉: 'g（公克）', 雞腿肉: 'g（公克）',
  鮮蝦: '盒', 鮮蝦仁: '盒', 蝦米: '包', 蛤蜊: '包',
  醬油: '瓶', 醬油膏: '瓶', 植物油: '瓶', 食用油: '瓶', 麻油: '瓶', 香油: '瓶', 米酒: '瓶', 醋: '瓶', 烏醋: '瓶', 白醋: '瓶', 番茄醬: '瓶', 蠔油: '瓶', 沙茶醬: '罐', 白味噌: '盒', 剝皮辣椒: '罐',
  鹽: '包', 白糖: '包', 砂糖: '包', 冰糖: '包', 白胡椒: '罐', 黑胡椒: '罐', 五香粉: '罐', 太白粉: '包', 白米: 'kg（公斤）', 水餃: '包', 海帶芽: '包', 乾紫菜: '包', 菜脯: '包',
}
const unitGroups = [
  { label: '常用單位', units: ['顆', '個', '根', '把', '束', '片', '塊', '條', '份'] },
  { label: '包裝單位', units: ['包', '袋', '盒', '罐', '瓶'] },
  { label: '重量單位（精準秤重）', units: ['g（公克）', 'kg（公斤）'] },
  { label: '容量單位（液態飲品）', units: ['ml（毫升）', 'L（公升）', '大匙', '茶匙', '杯'] },
]
const form = reactive({ name: '', amount: 1, unit: '', zone: '', expiry: '' })
const expiryPickerOpen = ref(false)
const expiryTrigger = ref(null)
const daysLeft = (date) => date ? Math.ceil((new Date(`${date}T00:00:00`) - new Date(new Date().toDateString())) / 86400000) : 0
// 單位只顯示英文縮寫，例如「g（公克）」顯示為「g」；儲存值不變。
const unitText = (unit = '') => String(unit).replace(/（.*?）|\(.*?\)/g, '').trim()
const expiryText = (item) => { const days = daysLeft(item.expiry); return days < 0 ? '已過期' : days === 0 ? '今日到期' : `剩餘 ${days} 天` }
const expiryClass = (item) => { const days = daysLeft(item.expiry); return days <= 3 ? 'urgent' : days <= 7 ? 'soon' : '' }
const filtered = computed(() => ingredients.value.filter((item) => (activeZone.value === '全部' || item.zone === activeZone.value) && item.name.includes(query.value.trim())))
const count = (zone) => zone === '全部' ? ingredients.value.length : ingredients.value.filter((item) => item.zone === zone).length
const tabs = computed(() => [{ label: '全部', count: count('全部') }, ...zones.map((zone) => ({ label: zone.name, count: count(zone.name) }))])
// 即期卡片同時算入已過期食材，並在說明文字提醒處理
const expiredCount = computed(() => ingredients.value.filter((item) => daysLeft(item.expiry) < 0).length)
const expiringCount = computed(() => ingredients.value.filter((item) => daysLeft(item.expiry) <= 3).length)
const expiringHint = computed(() => expiredCount.value
  ? `含 ${expiredCount.value} 項已過期，請盡快確認或刪除`
  : expiringCount.value ? '請優先安排這些食材入菜' : '目前所有庫存均在安全賞味期限內')
const pantryCount = computed(() => count('常溫/調味'))
function foodImage(name) {
  // 先比對較長的名稱，避免「剝皮辣椒」被較短的「辣椒」誤判。
  const alias = Object.keys(foodImageNames).sort((a, b) => b.length - a.length).find((key) => name.includes(key))
  const imageName = alias ? foodImageNames[alias] : Object.keys(foodImageAssets)
    .find((candidate) => name.includes(candidate) || candidate.includes(name))
  return imageName ? foodImageAssets[imageName] ?? null : null
}
const inZone = (zone) => ingredients.value.filter((item) => item.zone === zone)
// 常溫食材在畫面上分成乾貨櫃與調味架；糖、酒與味醂／味精也屬調味品。
const seasoning = (item) => /油|醬|鹽|醋|粉|香料|辣|胡椒|糖|酒|味醂|味精/.test(item.name)
const boards = computed(() => [
  { id: 'frozen', zone: '冷凍', title: '冷凍庫', hint: '-18°C・可保存約 1–3 個月', items: inZone('冷凍'), capacity: 5, rows: 1 },
  { id: 'chilled', zone: '冷藏', title: '冷藏室', hint: '0–4°C・可保存約 3–7 天', items: inZone('冷藏'), capacity: 10, rows: 2 },
  { id: 'produce', zone: '蔬果室', title: '蔬果抽屜', hint: '6–8°C', items: inZone('蔬果室'), capacity: 5, rows: 1 },
])
const racks = computed(() => {
  const pantry = inZone('常溫/調味')
  return [{ id: 'pantry', zone: '常溫/調味', title: '常溫櫃', hint: '陰涼乾燥處', items: pantry.filter((item) => !seasoning(item)), capacity: 10, rows: 2 }, { id: 'seasoning', zone: '常溫/調味', title: '調味架', hint: '開封後請留意保存方式', items: pantry.filter(seasoning), capacity: 10, rows: 2 }]
})
function sectionRows(section) {
  // 各分區永遠保留一格可新增食材；食材數量排滿一列時自動延展，不會失去新增入口。
  const columns = Math.max(5, Math.ceil((section.items.length + 1) / section.rows))
  return Array.from({ length: section.rows }, (_, row) => Array.from({ length: columns }, (_, column) => section.items[row * columns + column] ?? null))
}
const errors = computed(() => ({ name: submitted.value && !form.name.trim(), zone: submitted.value && !form.zone, expiry: submitted.value && !form.expiry, amount: submitted.value && (!Number.isFinite(Number(form.amount)) || Number(form.amount) < .5 || Number(form.amount) > 500) }))
const recipeMatches = computed(() => recipeStore.recipes
  .map((recipe) => ({ ...recipe, match: store.matchRecipeRequirements(recipe.ingredients, { skipStaples: true }) })))
const recipes = computed(() => recipeMatches.value
  .filter((recipe) => recipe.match.isComplete)
  .sort((a, b) => b.match.matchedIngredients.length - a.match.matchedIngredients.length || a.cookTime - b.cookTime))
const almostRecipes = computed(() => recipeMatches.value
  .filter((recipe) => !recipe.match.isComplete && recipe.match.missingIngredients.length >= 1 && recipe.match.missingIngredients.length <= 3)
  .sort((a, b) => a.match.missingIngredients.length - b.match.missingIngredients.length || b.match.matchedRequirements - a.match.matchedRequirements || a.cookTime - b.cookTime)
  .slice(0, 3))
function missingIngredientLabel(ingredient) {
  const amount = ingredient.missingQty
  return englishUnits(`${ingredient.name}${amount == null ? '' : ` ${amount}${ingredient.unit ?? ''}`}`)
}
function resetForm(item) { Object.assign(form, item ? { name: item.name, amount: item.amount, unit: item.unit, zone: item.zone, expiry: item.expiry } : { name: '', amount: 1, unit: '', zone: '', expiry: '' }); submitted.value = false; unitMenuOpen.value = false }
function showToast(message) { toast.value = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.value = '' }, 3600) }
// 預設到期日用本地日期計算（toISOString 是 UTC，台灣凌晨 0–8 點會少一天）
function setZone(zone) { form.zone = zone.name; form.expiry = addDays(toDateKey(), zone.days) }
function changeAmount(by) { form.amount = Math.max(.5, Math.min(500, Number(form.amount || 0) + by)) }
function chooseUnit(unit) { form.unit = unit; unitMenuOpen.value = false }
function applySuggestedUnit(name) {
  const unit = suggestedUnits[String(name).trim()]
  if (unit && !editingId.value) form.unit = unit
}
function chooseQuickFood(food) {
  form.name = food
  applySuggestedUnit(food)
}
watch(() => form.name, applySuggestedUnit)
function openAdd(zoneName = '') {
  editingId.value = null
  resetForm()
  const zone = zones.find((item) => item.name === zoneName)
  if (zone) setZone(zone)
  dialog.value = 'form'
}
function openEdit(item) { editingId.value = item.id; resetForm(item); dialog.value = 'form' }
function save() { submitted.value = true; if (Object.values(errors.value).some(Boolean)) return; const editing = Boolean(editingId.value); const result = editing ? store.updateIngredient(editingId.value, form) : store.addIngredient(form); if (result.error) return showToast(result.error); dialog.value = null; const item = result.ingredient; showToast(editing ? `已更新「${item.name}」的庫存資料` : `已將「${item.name} ${item.amount} ${unitText(item.unit)}」加入${item.zone}，預估 ${Math.max(0, daysLeft(item.expiry))} 天內食用完畢`) }
function remove() { const item = store.removeIngredient(deletingId.value); dialog.value = null; showToast(`已刪除「${item?.name ?? '食材'}」`) }
function addRecipeToToday(recipe) {
  router.push({ path: '/create', query: { date: toDateKey(), recipeId: recipe.id, source: 'fridge' } })
}
</script>

<template>
  <section class="page">
    <PageTitle title="冰箱庫存與食材管理" description="直觀記錄食材保鮮期、溫區分類與庫存狀態，掌握家中常備食材。"><template #actions><div class="view-switch"><button :class="{ active: view === 'list' }" aria-label="列表檢視" @click="view = 'list'"><img :src="listIconUrl" alt="" /></button><button :class="{ active: view === 'grid' }" aria-label="整理食材檢視" @click="view = 'grid'"><img :src="gridIconUrl" alt="" /></button></div></template></PageTitle>
    <main class="content">
      <section class="metrics"><article><span>現有總品項</span><div><strong>{{ ingredients.length }}</strong><b>{{ ingredients.length ? '項儲備食材' : '尚無儲備食材' }}</b></div><small>涵蓋冷藏、冷凍與乾貨分區</small></article><article><span>3 天內即期優先</span><div><strong>{{ expiringCount }}</strong><b>{{ expiringCount ? '項需優先料理' : '暫無即期品項' }}</b></div><small :class="{ 'metric-alert': expiredCount }">{{ expiringHint }}</small></article><article><span>常備與調味基底</span><div><strong>{{ pantryCount }}</strong><b>{{ pantryCount ? '項常溫與調味' : '尚無常備品項' }}</b></div><small>可記錄常溫乾貨、油品與常態辛香料</small></article></section>
      <section class="inventory"><div v-if="view === 'list'" class="inventory__tools"><div class="tabs"><button v-for="tab in tabs" :key="tab.label" :class="{ active: activeZone === tab.label }" @click="activeZone = tab.label">{{ tab.label }} ({{ tab.count }})</button></div><div class="search-actions"><label class="search"><img :src="searchIconUrl" alt="" /><input v-model="query" placeholder="搜尋食材" /></label><BaseButton class="inventory-add" data-onboarding-target="fridge-add" @click="openAdd"><img class="button-icon" :src="addIconUrl" alt="" />新增食材</BaseButton></div></div>
        <button v-if="!ingredients.length && view === 'list'" class="empty-inventory" @click="openAdd"><AppIcon name="fridge" /><b>目前冰箱空空如也，尚無記錄食材</b><i><img :src="addIconUrl" alt="" />立刻登記第一批食材</i></button>
        <div v-else-if="view === 'list' && !filtered.length" class="no-results"><b>找不到「{{ query }}」</b><small>目前庫存沒有符合條件的食材，或試試調整關鍵字。</small><BaseButton size="sm" @click="openAdd">新增 {{ query || '食材' }}</BaseButton></div>
        <div v-else-if="view === 'list'" class="ingredients"><div class="table-head"><span>燈號</span><span>食材名稱</span><span>存放分區</span><span>數量</span><span>賞味期限</span><span>操作</span></div><article v-for="item in filtered" :key="item.id" class="ingredient" :class="expiryClass(item)" @click="openEdit(item)"><span class="signal"></span><b>{{ item.name }}</b><span>{{ item.zone }}</span><span>{{ item.amount }} {{ unitText(item.unit) }}</span><span :class="expiryClass(item)">{{ expiryText(item) }}</span><button aria-label="刪除食材" @click.stop="deletingId = item.id; dialog = 'delete'">⌫</button></article></div>
        <div v-else class="fridge-board">
          <section class="fridge-cabinet">
            <section v-for="section in boards" :key="section.id" :class="['storage-zone', `storage-zone--${section.id}`]">
              <header><b>{{ section.title }}</b><small>{{ section.hint }}</small><em>{{ section.items.length }} 項</em></header>
              <div v-for="(row, rowIndex) in sectionRows(section)" :key="`${section.id}-${rowIndex}`" class="food-layer">
                <div class="slot-row"><template v-for="(item, slotIndex) in row" :key="`${section.id}-${rowIndex}-${slotIndex}`"><button v-if="item" class="food-slot" :class="expiryClass(item)" @click="openEdit(item)"><strong>x{{ item.amount }}{{ unitText(item.unit) }}</strong><img v-if="foodImage(item.name)" class="food-slot__image" :src="foodImage(item.name)" :alt="item.name" /><span v-else>{{ item.name.slice(0,1) }}</span><b>{{ item.name }}</b><i :style="{ width: `${Math.max(12, Math.min(100, daysLeft(item.expiry) / 30 * 100))}%` }"></i></button><button v-else class="empty-slot" @click="openAdd(section.zone)"><img :src="emptySlotAddIconUrl" alt="" /><small>空格</small></button></template></div>
                <span class="shelf-line"></span>
              </div>
            </section>
          </section>
          <div class="fridge-racks">
            <section v-for="section in racks" :key="section.id" :class="['storage-zone', 'rack', `storage-zone--${section.id}`]">
              <header><b>{{ section.title }}</b><small>{{ section.hint }}</small><em>{{ section.items.length }} 項</em></header>
              <div v-for="(row, rowIndex) in sectionRows(section)" :key="`${section.id}-${rowIndex}`" class="food-layer">
                <div class="slot-row"><template v-for="(item, slotIndex) in row" :key="`${section.id}-${rowIndex}-${slotIndex}`"><button v-if="item" class="food-slot" :class="expiryClass(item)" @click="openEdit(item)"><strong>x{{ item.amount }}{{ unitText(item.unit) }}</strong><img v-if="foodImage(item.name)" class="food-slot__image" :src="foodImage(item.name)" :alt="item.name" /><span v-else>{{ item.name.slice(0,1) }}</span><b>{{ item.name }}</b><i :style="{ width: `${Math.max(12, Math.min(100, daysLeft(item.expiry) / 30 * 100))}%` }"></i></button><button v-else class="empty-slot" @click="openAdd(section.zone)"><img :src="emptySlotAddIconUrl" alt="" /><small>空格</small></button></template></div>
                <span class="shelf-line"></span>
              </div>
            </section>
            <footer><span class="legend-urgent">▢　3 天內即期</span><span>━　鮮度條（越短越快到期）</span><span>▢　空格・點擊新增</span></footer>
          </div>
        </div>
      </section>
      <section class="recipes"><header><h2>現有庫存可做料理</h2><span>依據有效庫存與食譜所需份量運算，無需額外採買即可烹煮</span></header><div v-if="!recipes.length" class="empty-recipes" :class="{ 'empty-recipes--compact': almostRecipes.length }"><span><AppIcon name="tableware" /></span><b>尚未有足夠庫存食材可推薦料理</b><small>推薦會檢查每道食譜的有效庫存與所需份量；補齊食材後便會自動出現。</small></div><div v-else class="recipe-list"><article v-for="recipe in recipes" :key="recipe.id" class="recipe"><div><em>庫存匹配 100%</em><small>◷ 約 {{ recipe.cookTime }} 分鐘</small></div><h3>{{ recipe.name }}</h3><p>{{ recipe.intro }}</p><div class="recipe__tags"><span v-for="item in recipe.match.matchedIngredients.slice(0,3)" :key="item.id">{{ item.name }} x {{ item.amount }}{{ unitText(item.unit) }}</span></div><BaseButton block icon="fa-solid fa-plus" class="recipe-add-button" @click="addRecipeToToday(recipe)">加入今日餐單</BaseButton></article></div></section>
      <section v-if="almostRecipes.length" class="recipes recipes--nearby"><header><h2>再補幾樣就能做</h2><span>只顯示尚缺 1–3 項食材的料理；帶入今日餐單後可一併建立採買清單</span></header><div class="recipe-list"><article v-for="recipe in almostRecipes" :key="recipe.id" class="recipe recipe--partial"><div><em>尚缺 {{ recipe.match.missingIngredients.length }} 項</em><small>◷ 約 {{ recipe.cookTime }} 分鐘</small></div><h3>{{ recipe.name }}</h3><p>{{ recipe.intro }}</p><div class="recipe__tags recipe__tags--missing"><span v-for="item in recipe.match.missingIngredients" :key="item.name">缺 {{ missingIngredientLabel(item) }}</span></div><BaseButton block icon="fa-solid fa-plus" class="recipe-add-button" @click="addRecipeToToday(recipe)">帶入今日餐單</BaseButton></article></div></section>
    </main>
    <div v-if="toast" class="toast" role="status">✓　{{ toast }}</div>
    <div v-if="dialog" :class="['overlay', { 'overlay--confirm': dialog === 'delete' }]" @click.self="dialog = null">
      <form v-if="dialog === 'form'" class="dialog ingredient-dialog" @submit.prevent="save">
        <header class="ingredient-dialog__header">
          <div>
            <h2>{{ editingId ? '編輯食材' : '新增食材入庫' }}</h2>
            <p>登記食材與保鮮期限，自動推算最佳賞味期與庫存排程</p>
          </div>
          <button class="close" type="button" aria-label="關閉" @click="dialog = null"><img :src="closeIconUrl" alt="" /></button>
        </header>
        <div class="dialog__body">
          <section class="ingredient-dialog__name">
            <label class="form-field"><span class="form-field__label">食材名稱</span>
              <input v-model="form.name" :class="{ invalid: errors.name }" placeholder="請輸入" />
            </label>
            <div class="quick-foods">
              <span>常用快捷：</span>
              <button v-for="food in commonFoods" :key="food" type="button" @click="chooseQuickFood(food)"><img :src="shortcutAddIconUrl" alt="" />{{ food }}</button>
            </div>
          </section>

          <fieldset class="amount-field">
            <legend>數量與單位組合規格 <small>只能輸入數字，支援小數（如 0.5、1、500）</small></legend>
            <div class="amount">
              <div class="quantity-stepper">
                <button type="button" aria-label="減少數量" @click="changeAmount(-.5)"><img :src="amountMinusIconUrl" alt="" /></button>
                <input v-model.number="form.amount" :class="{ invalid: errors.amount }" type="number" min=".5" max="500" step=".5" />
                <button type="button" aria-label="增加數量" @click="changeAmount(.5)"><img :src="amountPlusIconUrl" alt="" /></button>
              </div>
              <div class="unit-picker">
                <button class="unit-picker__trigger" :class="{ placeholder: !form.unit, open: unitMenuOpen }" type="button" aria-haspopup="listbox" :aria-expanded="unitMenuOpen" @click="unitMenuOpen = !unitMenuOpen">
                  <span>{{ form.unit || '請選擇' }}</span><img :src="unitChevronUrl" alt="" />
                </button>
                <div v-if="unitMenuOpen" class="unit-picker__menu" role="listbox" aria-label="選擇食材單位">
                  <section v-for="group in unitGroups" :key="group.label" class="unit-picker__group">
                    <p><span></span>{{ group.label }}<span></span></p>
                    <button v-for="unit in group.units" :key="unit" type="button" role="option" :aria-selected="form.unit === unit" :class="{ selected: form.unit === unit }" @click="chooseUnit(unit)">{{ unit }}</button>
                  </section>
                </div>
              </div>
            </div>
            <small v-if="errors.amount" class="error">請輸入 0.5 至 500 的數量</small>
          </fieldset>

          <fieldset class="zone-field">
            <legend>存放分區（溫區聯動推算） <small>自動設定預估保存期</small></legend>
            <div class="zones">
              <button v-for="zone in zones" :key="zone.name" type="button" :class="{ selected: form.zone === zone.name }" @click="setZone(zone)">
                <span class="zone-card__head"><i></i><b>{{ zone.label }}</b><img :src="zone.icon" alt="" /></span>
                <span class="zone-card__temperature">{{ zone.hint }}</span>
                <span class="zone-card__days">推薦 +{{ zone.days }} 天</span>
              </button>
            </div>
            <small v-if="errors.zone" class="error">請選擇食材存放分區</small>
          </fieldset>

          <label class="form-field date-field"><span class="form-field__label">自訂指派有效日期</span>
            <span><button ref="expiryTrigger" type="button" class="date-trigger" :class="{ invalid: errors.expiry, 'is-empty': !form.expiry }" @click="expiryPickerOpen = true">{{ form.expiry ? form.expiry.replaceAll('-', ' / ') : '請選擇日期' }}</button><img :src="calendarIconUrl" alt="" /></span>
          </label>
          <DatePickerDialog v-model:open="expiryPickerOpen" :anchor="expiryTrigger" :value="form.expiry" title="選擇有效日期" @confirm="form.expiry = $event" />
        </div>
        <footer class="dialog__actions">
          <BaseButton variant="secondary" type="button" @click="dialog = null">取消</BaseButton>
          <BaseButton type="submit">{{ editingId ? '儲存變更' : '確認入庫登記' }}</BaseButton>
        </footer>
      </form>
      <section v-else class="dialog confirm">
        <button class="close" @click="dialog = null">×</button>
        <h2>確定要刪除「{{ ingredients.find((item) => item.id === deletingId)?.name }}」嗎？</h2>
        <p>刪除後，這項食材將不再列入庫存與可做料理推薦。</p>
        <div class="delete-info">{{ ingredients.find((item) => item.id === deletingId)?.name }} ・ {{ ingredients.find((item) => item.id === deletingId)?.amount }} {{ unitText(ingredients.find((item) => item.id === deletingId)?.unit) }}</div>
        <div class="dialog__actions"><BaseButton variant="secondary" @click="dialog = null">取消</BaseButton><BaseButton @click="remove">確定刪除</BaseButton></div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.page{padding:var(--page-padding-y) var(--page-padding-x)}
.content{max-width:1440px;padding:40px}
.view-switch{display:flex;gap:4px;padding:4px;border-radius:12px;background:var(--brand-secondary-light)}
.view-switch button{display:grid;width:40px;height:40px;place-items:center;border-radius:9px}
.view-switch button.active{background:var(--brand-primary)}
.view-switch img{width:24px;height:24px}
.metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:40px}
.metrics article{display:grid;gap:8px;min-height:126px;padding:21px;border:1px solid var(--brand-secondary);border-radius:12px 0 12px;background:#fff}
.metrics span,.metrics small{color:var(--text-secondary);font-size:14px}
.metrics div{display:flex;align-items:baseline;gap:8px}
.metrics strong{color:var(--text-title);font-size:32px;font-weight:400;line-height:1}
.metrics b{color:var(--text-body);font-size:14px;font-weight:400}
.inventory{margin-top:40px}
.inventory__tools{display:flex;align-items:center;justify-content:space-between;gap:24px}
.tabs{display:flex;flex-wrap:wrap;gap:4px;padding:4px;border-radius:12px;background:var(--brand-secondary-light)}
.tabs button{padding:8px;border-radius:9px;color:var(--text-body);font-size:14px}
.tabs button.active{background:var(--brand-primary);color:#fff}
.search-actions{display:flex;width:479px;gap:8px}
.search{display:flex;min-width:0;flex:1;align-items:center;gap:12px;min-height:45px;padding:12px;border:1px solid var(--brand-primary-border);border-radius:999px;background:#fff}
.search:focus-within{border-color:var(--brand-primary)}
.search img{width:16px;height:16px}
.search input,.search input:focus{width:100%;min-width:0;height:21px;border:0;outline:0;background:transparent;color:var(--text-body);font-size:16px;text-align:left}
/* 搜尋框的焦點由外層 .search:focus-within 呈現；覆蓋共用 input 焦點環，避免雙框。 */
.search input:not([type='checkbox']):not([type='radio']):not([type='file']):focus{border-color:transparent!important;box-shadow:none!important}
.search input::placeholder{color:var(--text-placeholder)}
.button-icon{display:block;width:20px;height:20px}
.empty-inventory,.empty-recipes,.no-results{display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid var(--brand-secondary);border-radius:12px 0 12px;text-align:center}
.empty-inventory{min-height:305px;gap:16px;margin-top:24px;color:var(--text-body)}
.empty-inventory>.app-icon{color:#a1a1aa;font-size:24px}
.empty-inventory b,.empty-recipes b{font-size:16px;font-weight:400}
.empty-inventory i{display:inline-flex;align-items:center;gap:8px;padding:12px;border-radius:999px;background:var(--brand-primary);color:#fff;font-size:16px;font-style:normal}
.empty-inventory i img{width:20px;height:20px}
.no-results{min-height:220px;gap:8px;margin-top:24px;color:var(--text-secondary)}
.ingredients{margin-top:24px}
.table-head,.ingredient{display:grid;grid-template-columns:54px minmax(160px,1fr) 90px 80px 105px 60px;align-items:center;min-height:54px;border-bottom:1px solid var(--brand-secondary)}
.table-head{background:var(--brand-secondary-light);color:var(--text-secondary);font-size:14px}
.table-head>:first-child,.table-head>:nth-child(2),.ingredient>:first-child,.ingredient>:nth-child(2){padding-left:12px}
.ingredient{color:var(--text-secondary);font-size:14px;cursor:pointer}
.ingredient b{color:var(--text-body);font-weight:400}
.ingredient>button{color:var(--text-secondary);font-size:21px}
.signal{display:block;width:10px;height:10px;margin-left:18px;border-radius:50%;background:#856f5b}
.ingredient.urgent .signal{background:#f14f6c}
.ingredient.soon .signal{background:#f0d572}
.urgent{color:#c84a45}
.soon{color:#aa8c35}
.fridge-board{display:grid;grid-template-columns:1.25fr 1fr;gap:28px;margin-top:20px}
.fridge-cabinet{display:grid;gap:12px;padding:16px;border:3px solid #657a99;border-radius:12px 12px 8px 8px;background:#fff;box-shadow:0 10px 0 -5px #657a99}
.fridge-racks{display:grid;align-content:start;gap:18px}
.storage-zone{padding:20px;border:1.5px solid #9cadc4;border-radius:10px;background:#fff}
.rack{border:2px solid var(--brand-primary)}
.storage-zone header{display:flex;align-items:baseline;gap:8px;padding-bottom:12px;border-bottom:3px solid var(--brand-secondary)}
.storage-zone header b{color:var(--text-title);font-size:20px;font-weight:400}
.storage-zone header small{color:var(--text-secondary);font-size:14px}
.storage-zone header em{margin-left:auto;padding:4px 8px;border-radius:999px;background:#eef2f7;color:#5e758e;font-size:14px;font-style:normal}
.slot-strip{display:flex;gap:12px;overflow-x:auto;overscroll-behavior-inline:contain;padding:12px 1px 10px;scroll-snap-type:x mandatory}
.food-slot,.empty-slot{position:relative;display:flex;flex:0 0 98px;min-height:127px;flex-direction:column;align-items:center;justify-content:center;gap:5px;overflow:hidden;border:1px solid #d9d9d9;border-radius:10px;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08);color:var(--text-body);scroll-snap-align:start}
.food-slot>strong{position:absolute;top:4px;right:4px;padding:2px 5px;border-radius:999px;background:var(--brand-primary);color:#fff;font-size:14px;font-weight:400}
.food-slot>span{display:grid;width:56px;height:56px;place-items:center;border-radius:50%;background:#efe8df;color:var(--brand-primary);font-size:24px}
.food-slot>b{max-width:82px;overflow:hidden;font-size:14px;font-weight:400;text-overflow:ellipsis;white-space:nowrap}
.food-slot>i{position:absolute;bottom:5px;left:9px;height:4px;border-radius:999px;background:var(--brand-primary)}
.food-slot.urgent{border-color:#e38480}
.food-slot.soon{border-color:#e4d384}
.empty-slot{border-style:dashed;box-shadow:none}
.empty-slot img{width:24px;height:24px}
.empty-slot small{font-size:14px}
.fridge-racks footer{display:flex;flex-wrap:wrap;gap:12px;color:var(--text-secondary);font-size:14px}
.legend-urgent{color:#bc5550}
.recipes{margin-top:40px}
.recipes header{display:flex;align-items:baseline;justify-content:space-between}
.recipes h2{color:var(--text-title);font-size:24px;font-weight:400}
.recipes header span{color:var(--text-secondary);font-size:14px}
.empty-recipes{min-height:305px;gap:8px;margin-top:16px}
.empty-recipes>span{color:var(--brand-primary);font-size:24px}
.empty-recipes small{max-width:520px;color:var(--text-secondary);font-size:14px}
.recipe-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:16px}
.recipe{display:flex;flex-direction:column;gap:8px;padding:17px;border:1px solid var(--brand-secondary);border-radius:12px 0 12px;background:#fff}
.recipe>div:first-child{display:flex;justify-content:space-between}
.recipe em{padding:4px 8px;border-radius:12px;background:#eef2f7;color:#5e758e;font-size:14px;font-style:normal}
.recipe>div:first-child small{color:var(--text-placeholder);font-size:14px}
.recipe h3{color:var(--text-body);font-size:16px;font-weight:400}
.recipe p{min-height:32px;color:var(--text-secondary);font-size:14px}
.recipe__tags{display:flex;flex-wrap:wrap;gap:6px}
.recipe__tags span{padding:4px 8px;border-radius:999px;background:var(--brand-secondary-light);color:var(--text-body);font-size:14px}
.recipe :deep(.btn){margin-top:auto;padding:8px;font-size:14px}
.toast{position:fixed;z-index:40;top:36px;left:50%;max-width:calc(100vw - 32px);padding:14px 24px;border-radius:999px;background:var(--brand-primary);box-shadow:0 4px 10px rgba(52,38,28,.2);color:#fff;font-size:14px;transform:translateX(-50%)}
.overlay{position:fixed;z-index:30;inset:0;display:grid;place-items:center;padding:24px;overflow-y:auto;background:rgba(46,35,28,.42)}
.dialog{width:min(100%,620px);border-radius:12px 0 12px;background:#fff;box-shadow:0 18px 40px rgba(25,18,12,.22)}
.ingredient-dialog>header{display:flex;justify-content:space-between;padding:22px 20px 16px;border-bottom:1px solid var(--brand-secondary)}
.dialog h2{color:var(--text-title);font-size:24px;font-weight:400}
.dialog p{margin-top:4px;color:var(--text-secondary);font-size:14px}
.close{color:var(--text-title);font-size:30px;line-height:.8}
.dialog__body{display:grid;gap:14px;padding:18px 20px}
.dialog label,.dialog fieldset{display:grid;gap:7px;color:var(--text-body);font-size:14px}
.dialog input,.dialog select{width:100%;min-height:42px;padding:10px 12px;border:1px solid var(--brand-primary-border);border-radius:10px;background:#fff;color:var(--text-body);font:inherit}
.dialog input.invalid{border-color:#c84a45}
.quick-foods{display:flex;flex-wrap:wrap;align-items:center;gap:7px;color:var(--text-secondary);font-size:14px}
.quick-foods button{padding:5px 9px;border-radius:999px;background:var(--brand-secondary-light);color:var(--text-body);font-size:14px}
.dialog legend{display:flex;width:100%;justify-content:space-between}
.dialog legend small{color:var(--text-placeholder);font-size:14px}
.amount{display:grid;grid-template-columns:42px minmax(0,1fr) 42px minmax(120px,.9fr)}
.amount button,.amount input,.amount select{border-radius:0}
.amount button{border:1px solid var(--brand-primary-border);background:var(--brand-secondary-light);color:var(--text-body);font-size:24px}
.amount button:first-child{border-radius:10px 0 0 10px}
.amount select{margin-left:12px;border-radius:10px}
.zones{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.zones button{display:grid;gap:7px;min-height:80px;padding:10px;border:1px solid var(--brand-secondary);border-radius:10px;text-align:left}
.zones button.selected{border-color:var(--brand-primary);background:var(--brand-secondary-light)}
.zones b{font-size:14px;font-weight:400}
.zones small{color:var(--text-secondary);font-size:14px}
.error{color:#c84a45!important;font-size:14px!important}
.dialog__actions{display:flex;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid var(--brand-secondary)}
.confirm{position:relative;padding:32px}
.confirm .close{position:absolute;top:18px;right:18px}
.delete-info{margin:16px 0;padding:10px;border-radius:8px;background:var(--brand-secondary-light);color:var(--text-body);font-size:14px}
@media (max-width:900px) {
.content{padding:28px 20px}
.metrics{gap:16px}
.inventory__tools{align-items:stretch;flex-direction:column}
.search-actions{width:100%}
.fridge-board{grid-template-columns:1fr}
.recipes header{align-items:flex-start;flex-direction:column;gap:6px}
.recipe-list{grid-template-columns:1fr}
}
@media (max-width:600px) {
.metrics{grid-template-columns:1fr}
.table-head,.ingredient{grid-template-columns:36px minmax(100px,1fr) 74px 58px}
.table-head>:nth-child(3),.table-head>:nth-child(6),.ingredient>:nth-child(3),.ingredient>:nth-child(6){display:none}
.storage-zone{padding:14px}
.storage-zone header{align-items:flex-start;flex-wrap:wrap}
.storage-zone header b{font-size:18px}
.zones{grid-template-columns:repeat(2,minmax(0,1fr))}
.dialog legend{display:grid;gap:4px}
.amount{grid-template-columns:38px minmax(0,1fr) 38px}
.amount select{grid-column:1/-1;margin:8px 0 0}
.overlay{align-items:start;padding:12px}
.dialog{margin:12px 0}
}
.empty-inventory { width: 100%; }

.slot-strip--two-rows { display: grid; grid-template-rows: repeat(2, 127px); grid-auto-flow: column; grid-auto-columns: 98px; align-items: stretch; }

.page :deep(.page-title){padding:60px 40px 41px}
.page :deep(.page-title__text){gap:12px}
.page :deep(.page-title__desc){font-size:16px}
.fridge-board{grid-template-columns:650px minmax(0,1fr);align-items:start;gap:28px;margin-top:20px}
.fridge-cabinet{position:relative;gap:12px;padding:16px;border:3px solid #5e7391;border-radius:12px;background:#fff;box-shadow:none}
.fridge-cabinet::before,.fridge-cabinet::after{position:absolute;bottom:-12px;width:34px;height:12px;border-radius:0 0 6px 6px;background:#5e7391;content:""}
.fridge-cabinet::before{left:12px}
.fridge-cabinet::after{right:12px}
.fridge-racks{gap:28px}
.storage-zone{display:grid;gap:12px;padding:20px;border:1.5px solid #9cadc4;border-radius:12px}
.rack{gap:14px;border:3px solid #7a6350;border-radius:18px}
.storage-zone header{min-height:24px;padding:0;border:0}
.food-layer{display:flex;flex-direction:column;gap:8px;min-width:0;padding:0 12px}
.slot-row{display:flex;gap:12px;min-width:0;overflow-x:auto;padding:4px 8px;scroll-snap-type:x mandatory}
.shelf-line{display:block;flex:0 0 6px;width:100%;border-radius:999px;background:var(--brand-secondary)}
.rack .food-layer{padding:0}
.rack .slot-row{padding:4px 0}
.food-slot,.empty-slot{flex-basis:98px;min-height:127px;border-radius:12px}
.empty-slot img{width:20px;height:20px}
.empty-slot{gap:8px}
.slot-strip,.slot-strip--two-rows{display:none}
@media (min-width:901px) and (max-width:1439px) {
.inventory__tools{align-items:flex-start;flex-direction:column}
.search-actions{align-self:flex-end}
.fridge-board{grid-template-columns:1fr}
.fridge-cabinet{max-width:650px}
.fridge-racks{max-width:682px}
}
@media (max-width:900px) {
.page :deep(.page-title){padding:48px 32px 33px}
.fridge-board{grid-template-columns:1fr}
.fridge-cabinet{max-width:650px}
.fridge-racks{grid-template-columns:1fr;max-width:682px}
}
@media (max-width:600px) {
.page :deep(.page-title){padding:32px 20px 28px}
.food-layer{padding:0}
.storage-zone{padding:14px}
.slot-row{padding:4px 0}
.fridge-board{gap:28px}
}
.food-slot{justify-content:flex-start;padding:8px;gap:4px}
.food-slot__image{display:block;flex:0 0 80px;width:80px;height:80px;border-radius:12px;object-fit:cover}
.food-slot>b{max-width:80px}
.food-slot>i{left:9px;max-width:80px}

.search-actions{height:45px;align-items:center}
.search{box-sizing:border-box;min-height:45px;height:45px;padding:0 12px}
.search-actions :deep(.inventory-add){display:inline-flex;flex:0 0 auto;min-height:39px;height:39px;padding:8px 10px;gap:4px;font-size:14px;line-height:19px}
.search-actions :deep(.inventory-add .btn__label){display:inline-flex;align-items:center;gap:4px}
.search-actions :deep(.inventory-add .button-icon){width:16px;height:16px}
.view-switch button.active img{filter:brightness(0) invert(1)}

.metrics article{box-sizing:border-box;min-height:0;height:112px;padding:14px 16px;gap:4px}
.metrics strong{font-size:24px}
.metrics b{font-size:14px}
.metrics span,.metrics small{font-size:14px}
.metrics small{line-height:1.35}

/* 冰箱頁首完全沿用家庭管理頁的 PageTitle 尺寸，避免頁面各自偏移。 */
@media (min-width:1025px) {
.page :deep(.page-title){padding:48px 32px 33px}
.page :deep(.page-title__text){gap:10px}
.page :deep(.page-title__desc){font-size:14px}
}

@media (min-width:641px) and (max-width:1024px) {
.page :deep(.page-title){padding:36px 28px 28px}
.page :deep(.page-title__text){gap:var(--space-8)}
.page :deep(.page-title__desc){font-size:14px}
}


@media (min-width:641px) and (max-width:1024px) {
.content{padding:24px 28px 48px}
.metrics{gap:16px}
.metrics article{height:auto;min-height:136px;padding:16px;gap:6px}
.metrics strong{font-size:24px}
.inventory{margin-top:28px}
.recipe-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.recipe{padding:14px}
.recipes{margin-top:28px}
.recipes h2{font-size:21px}
.recipes header span{font-size:14px}
}


/* 緊湊桌機：保留左側導覽，但不沿用寬螢幕三欄與過大留白。 */
@media (min-width:1025px) and (max-width:1279px) {
.page :deep(.page-title){padding:36px 28px 28px}
.content{padding:24px 28px 48px}
.metrics{gap:16px}
.inventory{margin-top:28px}
.recipes{margin-top:28px}
.recipe-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.recipe{padding:14px}
}


/* 手機頁首與其他主要頁面使用相同緊湊留白。 */
@media (max-width:640px) {
.page :deep(.page-title){padding:var(--space-28) var(--space-20) 24px}
.page :deep(.page-title__text){gap:var(--space-8)}
.page :deep(.page-title__desc){font-size:14px;line-height:1.45}
}


/* Figma ref/addnewfood/mc — Desktop - 冰箱/新增食材 */
.ingredient-dialog{display:grid;grid-template-rows:77px minmax(0,1fr) 70px;width:min(620px,calc(100vw - 32px));height:587px;max-height:calc(100dvh - 32px);overflow:hidden;border:1px solid #e9e1d9;border-radius:12px 0 12px;background:#fff;box-shadow:0 25px 50px -12px rgba(0,0,0,.25)}
.ingredient-dialog:has(.unit-picker__menu){overflow:visible}

/* 新增食材彈窗在所有裝置固定置中；內容僅在彈窗內捲動。 */
.overlay:has(.ingredient-dialog){align-items:center;place-items:center}

.ingredient-dialog__header{box-sizing:border-box;display:flex;align-items:flex-start;justify-content:space-between;padding:16px 20px 17px;border-bottom:1px solid #e9e1d9}
.ingredient-dialog__header h2{font-size:24px;line-height:29px}
.ingredient-dialog__header p{margin-top:0;font-size:14px;line-height:14px}
.ingredient-dialog .close{display:grid;flex:0 0 24px;width:24px;height:24px;place-items:center}
.ingredient-dialog .close img{width:24px;height:24px}

.ingredient-dialog .dialog__body{display:grid;min-height:0;align-content:start;gap:12px;overflow:hidden;padding:16px 20px}
.ingredient-dialog:has(.unit-picker__menu) .dialog__body{overflow:visible}
.ingredient-dialog fieldset{min-width:0;margin:0;padding:0;border:0}

/* 保留原本 header / body / footer 三列高度；每組欄位使用同一個標題列與間距，並完整收納在 body 內。 */
.ingredient-dialog .form-field{display:grid;grid-template-rows:24px 44px;gap:4px;font-size:16px;line-height:24px}
.ingredient-dialog .form-field__label{display:block;height:24px}
.ingredient-dialog fieldset{display:block;font-size:16px;line-height:24px}
.ingredient-dialog fieldset>legend{box-sizing:border-box;height:24px;margin:0 0 4px;padding:0}
.ingredient-dialog .form-field>input,.ingredient-dialog .date-field>span:not(.form-field__label){box-sizing:border-box;width:100%;height:44px;min-height:44px;padding:0 12px;border:1px solid #e9e1d9;border-radius:12px;background:#fff;color:var(--text-body);font-size:14px}
.ingredient-dialog .form-field>input{line-height:44px}
.ingredient-dialog .form-field>input:focus,.ingredient-dialog .date-field>span:not(.form-field__label):focus-within{border-color:#856f5b}
.ingredient-dialog .form-field>input.invalid,.ingredient-dialog .date-field>span:not(.form-field__label):has(.invalid){border-color:#c84a45}

.ingredient-dialog__name{display:grid;gap:8px}
.quick-foods{gap:8px;font-size:14px;line-height:20px}
.quick-foods button{display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:8px;font-size:14px;line-height:16px}
.quick-foods button img{width:12px;height:12px}
.ingredient-dialog legend{align-items:baseline;font-size:16px;line-height:24px}
.ingredient-dialog legend small{font-size:14px;line-height:18px}

.ingredient-dialog .amount{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}
.quantity-stepper{display:grid;grid-template-columns:36px minmax(0,1fr) 36px}
.quantity-stepper>button,.quantity-stepper input{box-sizing:border-box;height:44px;min-height:44px;border-color:#e9e1d9}
.quantity-stepper>button{display:grid;place-items:center;background:#f3efe9}
.quantity-stepper>button img{width:18px;height:18px}
.quantity-stepper>button:first-child{border-radius:12px 0 0 12px}
.quantity-stepper input{border-right:0;border-left:0;border-radius:0;text-align:center;font-size:14px}
.quantity-stepper>button:nth-child(3){border-radius:0 12px 12px 0}
.unit-picker{position:relative;z-index:2;grid-column:auto}
.unit-picker__trigger{display:flex;box-sizing:border-box;width:100%;height:44px;align-items:center;justify-content:space-between;padding:0 12px;border:1px solid #cbc4be;border-radius:12px;background:#fff;color:#5a4a3b;font-size:14px;text-align:left}
.unit-picker__trigger.placeholder{color:#a39d9a}
.unit-picker__trigger img{width:12px;height:24px;transform:rotate(90deg)}
.unit-picker__trigger.open img{transform:rotate(-90deg)}
.unit-picker__menu{position:absolute;z-index:50;top:52px;right:0;left:0;min-width:141px;max-height:min(340px,calc(100dvh - 180px));overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;padding:12px 0;border:1px solid #cbc4be;border-radius:20px;background:#fff;box-shadow:0 20px 30px rgba(52,38,28,.2)}
.unit-picker__group{display:grid;gap:0;padding:0 0 8px}
.unit-picker__group+ .unit-picker__group{padding-top:8px}
.unit-picker__group p{display:flex;align-items:center;gap:10px;margin:0 12px 4px;color:#a39d9a;font-size:14px;white-space:nowrap}
.unit-picker__group p span{display:block;flex:1;height:1px;background:#e9e1d9}
.unit-picker__group button{width:100%;height:28px;padding:0;border:0;border-radius:0;background:transparent;color:#5a4a3b;font-size:14px;line-height:28px;text-align:center}
.unit-picker__group button:hover,.unit-picker__group button.selected{background:#e9e1d9}

.ingredient-dialog .form-field,.ingredient-dialog legend{color:#5a4a3b}
.ingredient-dialog legend small,.quick-foods{color:#a39d9a}
.ingredient-dialog .amount input{color:#5a4a3b}

.ingredient-dialog .zones{gap:8px}
.ingredient-dialog .zones button{display:grid;min-height:90px;align-content:start;gap:3px;padding:13px;border:1px solid #f2efec;border-radius:12px;background:#fff}
.ingredient-dialog .zones button.selected{padding:12px;border:2px solid #856f5b;background:#fff}
.zone-card__head{display:flex;align-items:center;gap:6px;min-width:0}
.zone-card__head i{width:8px;height:8px;border-radius:50%;background:#e9e1d9}
.zone-card__head b{color:#716c6c;font-size:14px;line-height:16px;white-space:nowrap}
.zone-card__head img{width:20px;height:20px;margin-left:auto;filter:brightness(0) saturate(100%) invert(78%) sepia(17%) saturate(672%) hue-rotate(175deg) brightness(86%) contrast(84%)}
.zone-card__temperature{color:#716c6c;font-size:14px;line-height:16px}
.zone-card__days{width:100%;margin-top:4px;padding-top:7px;border-top:1px solid #f2efec;color:#716c6c;font-size:14px;line-height:14px;text-align:left}
.ingredient-dialog .zones button.selected .zone-card__head i{background:#856f5b}
.ingredient-dialog .zones button.selected .zone-card__head img{filter:brightness(0) saturate(100%) invert(42%) sepia(31%) saturate(728%) hue-rotate(175deg) brightness(94%) contrast(85%)}
.ingredient-dialog .zones button.selected .zone-card__head b,.ingredient-dialog .zones button.selected .zone-card__temperature,.ingredient-dialog .zones button.selected .zone-card__days{color:#5a4a3b}
.ingredient-dialog .zones button.selected .zone-card__days{border-top-color:#856f5b}

.ingredient-dialog .date-field>span:not(.form-field__label){position:relative;display:flex;align-items:center;padding:0}
.ingredient-dialog .date-field input{height:42px;min-height:42px;padding:0 42px 0 12px;border:0;border-radius:12px;background:transparent;font-size:14px;outline:0}
.ingredient-dialog .date-field input::-webkit-calendar-picker-indicator{position:absolute;right:0;width:42px;height:42px;margin:0;opacity:0;cursor:pointer}
.ingredient-dialog .date-field .date-trigger{width:100%;height:100%;padding:0 42px 0 12px;border:0;border-radius:12px;background:transparent;color:var(--text-body);font-size:14px;text-align:left;cursor:pointer}
.ingredient-dialog .date-field .date-trigger.is-empty{color:var(--text-placeholder)}
.ingredient-dialog .date-field img{position:absolute;right:12px;width:17px;height:17px;pointer-events:none}
.ingredient-dialog .dialog__actions{min-height:70px;align-items:center;padding:13px 20px 12px;border-top:1px solid #e9e1d9}
.ingredient-dialog .dialog__actions :deep(.btn){min-height:36px;height:36px;padding:0 12px;font-size:16px}


/* ref/unit/click：閉合狀態與 Figma 相同，避免被通用按鈕字級放大。 */
.ingredient-dialog .unit-picker__trigger{border:1px solid #cbc4be!important;border-radius:12px!important;font-size:14px;font-weight:400;line-height:18px}

@media (max-width:640px) {

  /* iPhone 寬度下，數量控制與單位欄必須各佔同一欄寬。 */
  /* 標題與說明可依文字換行撐開，避免說明被 70px 固定列高截斷。 */
  .ingredient-dialog{grid-template-rows:auto minmax(0,1fr) 62px;height:auto;max-height:calc(100dvh - 24px)}

  .ingredient-dialog__header{min-height:82px;padding-top:13px;padding-bottom:12px}

  .ingredient-dialog__header h2{font-size:22px;line-height:27px;overflow-wrap:anywhere}

  .ingredient-dialog__header p{margin-top:3px;font-size:12px;line-height:17px;overflow-wrap:anywhere}

  .ingredient-dialog .dialog__body{gap:10px;overflow-y:auto;padding:14px 16px}

  .ingredient-dialog__header,.ingredient-dialog .dialog__actions{padding-right:16px;padding-left:16px}

  .ingredient-dialog .form-field{grid-template-rows:21px 40px;gap:3px;font-size:14px;line-height:21px}

  .ingredient-dialog .form-field__label,.ingredient-dialog fieldset,.ingredient-dialog fieldset>legend{font-size:14px;line-height:21px}

  .ingredient-dialog .form-field__label{height:21px}

  .ingredient-dialog fieldset>legend{display:grid;height:auto;gap:1px;margin-bottom:3px}

  .ingredient-dialog legend small{display:block;font-size:14px;line-height:14px}

  .ingredient-dialog .form-field>input,.ingredient-dialog .date-field>span:not(.form-field__label),.quantity-stepper>button,.quantity-stepper input,.unit-picker__trigger{height:40px;min-height:40px}

  .ingredient-dialog .amount{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}

  .unit-picker{grid-column:auto;margin-top:0}

  /* 下拉選單與按鈕等寬，僅顯示約六個選項高度，其餘於選單內捲動。 */
  .unit-picker__menu{top:46px;min-width:0;max-height:min(216px,calc(100dvh - 330px));padding:8px 0;border-radius:16px}

  .unit-picker__group{padding-bottom:4px}

  .unit-picker__group+ .unit-picker__group{padding-top:4px}

  /* 選單和按鈕等寬，分組標題要收得進去，選單只能上下捲動。 */
  .unit-picker__group p{justify-content:center;gap:4px;margin:0 6px 2px;font-size:13px;letter-spacing:0}

  .unit-picker__group p span{min-width:4px}

  .unit-picker__group button{height:30px;font-size:14px;line-height:30px}

  .ingredient-dialog .zones{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}

  .ingredient-dialog .zones button{min-height:78px;padding:10px}

  .ingredient-dialog .zones button.selected{padding:9px}

  .zone-card__head b,.zone-card__temperature{font-size:14px;line-height:15px}

  .zone-card__days{margin-top:2px;padding-top:5px;font-size:14px;line-height:12px}

  .quick-foods{gap:6px;font-size:14px}

  .quick-foods button{padding:4px 7px;font-size:14px}

  .ingredient-dialog .dialog__actions{min-height:62px;padding-top:10px;padding-bottom:10px}

  .ingredient-dialog .dialog__actions :deep(.btn){min-height:36px;height:36px;padding:0 10px;font-size:14px}

}

.recipe :deep(.recipe-add-button){flex-direction:row;min-height:36px;height:36px;margin-top:0;padding:6px 12px;font-size:14px;line-height:18px}
.recipe :deep(.recipe-add-button .btn__icon){font-size:16px}

/* 摘要卡改為 112px 後，同步收斂上下段落距離。 */
@media (min-width:901px) {
.content{padding:28px 40px 48px}
.metrics{gap:24px}
.inventory{margin-top:28px}
.recipes{margin-top:32px}
.recipe-list{gap:14px}
.recipe{padding:16px}
}

.metrics small.metric-alert{color:var(--text-danger)}
.recipes--nearby{margin-top:28px}
.empty-recipes--compact{min-height:170px}
.recipe--partial em{background:var(--brand-secondary-light);color:var(--brand-primary)}
.recipe__tags--missing span{background:#f7efea;color:var(--text-secondary)}

@media (max-width:640px) {
.content{padding:20px 16px 40px}
.metrics{grid-template-columns:repeat(3,minmax(146px,1fr));gap:10px;overflow-x:auto;padding-bottom:4px;scroll-snap-type:x mandatory}
.metrics article{height:104px;padding:12px;scroll-snap-align:start}
.metrics strong{font-size:22px}
.metrics b{font-size:14px}
.metrics span,.metrics small{font-size:14px}
.inventory{margin-top:20px}
.tabs{flex-wrap:nowrap;overflow-x:auto}
.tabs button{flex:0 0 auto;font-size:14px}
.recipe-list{display:flex;overflow-x:auto;padding-bottom:4px;scroll-snap-type:x mandatory}
.recipe{flex:0 0 min(78vw,290px);gap:6px;padding:14px;scroll-snap-align:start}
.recipe h3{font-size:15px}
.recipe p{min-height:0;font-size:14px;line-height:1.45}
.recipe__tags span{font-size:14px}
.recipe :deep(.recipe-add-button){min-height:36px;height:36px;padding:6px 10px;font-size:14px;line-height:18px}
.recipes{margin-top:28px}
.recipes header{align-items:flex-start;flex-direction:column;gap:4px}
.recipes h2{font-size:18px}
.recipes header span{font-size:14px;line-height:1.45}
.empty-recipes{min-height:170px}
.empty-recipes--compact{min-height:140px}
}

@media (max-width:640px) {

  /* 冰箱只有兩個 icon 操作，手機版可保留在標題右側，不必佔一整列。 */
  .page :deep(.page-title__text){flex:1 1 0;min-width:0}

  .page :deep(.page-title__actions){width:auto;justify-content:flex-end}

  .view-switch{padding:3px;border-radius:10px}

  .view-switch button{width:34px;height:34px;border-radius:8px}

  .view-switch img{width:19px;height:19px}

  .tabs{gap:3px;padding:3px;border-radius:10px}

  .tabs button{padding:6px 7px;border-radius:7px;font-size:14px}

  .search-actions{gap:6px;height:38px}

  .search{min-height:38px;height:38px;padding:0 10px}

  .search input,.search input:focus{font-size:14px}

  .search-actions :deep(.inventory-add){min-height:36px;height:36px;padding:6px 8px;font-size:14px}


  /* 摘要三卡在手機內完整呈現，不以橫向捲動保留桌機尺寸。 */
  .metrics{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;overflow:visible;padding-bottom:0;scroll-snap-type:none}

  .metrics article{height:92px;padding:9px;gap:3px;scroll-snap-align:none}

  .metrics span,.metrics small{font-size:10px;line-height:1.25}

  .metrics div{gap:3px;min-width:0;white-space:nowrap}

  .metrics strong{font-size:19px}

  .metrics b{overflow:hidden;font-size:10px;text-overflow:ellipsis;white-space:nowrap}


  /* 庫存列表保留必要四欄，但以行動版欄寬與字級重新排版。 */
  .ingredients{margin-top:14px}

  .table-head,.ingredient{grid-template-columns:28px minmax(0,1fr) 48px 58px 34px;min-height:48px}

  .table-head{font-size:14px}

  .ingredient{font-size:14px}

  .table-head>:first-child,.table-head>:nth-child(2),.ingredient>:first-child,.ingredient>:nth-child(2){padding-left:6px}

  .table-head>:nth-child(3),.ingredient>:nth-child(3){display:none}

  .table-head>:nth-child(6),.ingredient>:nth-child(6){display:grid}

  .ingredient>button{display:grid;width:34px;height:34px;place-items:center}

  .signal{width:8px;height:8px;margin-left:8px}


  /* 推薦料理卡使用手機密度，仍可橫向瀏覽多張。 */
  .recipe-list{gap:10px}

  .recipe{flex-basis:min(68vw,248px);gap:5px;padding:11px}

  .recipe h3{font-size:14px}

  .recipe p{font-size:14px;line-height:1.4}

  .recipe em,.recipe>div:first-child small,.recipe__tags span{font-size:14px}

  .recipe em,.recipe__tags span{padding:3px 6px}

  .recipe :deep(.recipe-add-button){min-height:36px;height:36px;padding:6px 8px;font-size:14px;line-height:18px}


  /* 格狀冰箱的所有分區套用一致的行動版縮放比例。 */
  .storage-zone{gap:8px;padding:10px}

  .storage-zone .slot-row{gap:8px;padding:3px 0}

  .storage-zone .food-slot,.storage-zone .empty-slot{flex-basis:74px;min-height:94px;border-radius:9px}

  .storage-zone .food-slot{padding:6px;gap:3px}

  .storage-zone .food-slot__image{flex-basis:58px;width:58px;height:58px;border-radius:8px}

  .storage-zone .food-slot>b{max-width:62px;font-size:14px}

  .storage-zone .food-slot>strong{font-size:14px}

  .storage-zone .food-slot>i{bottom:4px;left:6px;height:3px}

  .storage-zone .empty-slot small{font-size:14px}

}


/* 原生 input 不一定會自動繼承頁面字型；搜尋欄與提示文字固定使用全站字體。 */
.search input,
.search input:focus,
.search input::placeholder{
  font-family:var(--font-family);
}

/* 清單上的刪除動作使用與家庭管理一致的垃圾桶圖示。 */
.ingredient > button {
  font-size: 0;
}


.ingredient > button::before {
  content: '\f2ed';
  font-family: 'Font Awesome 7 Free';
  font-size: 18px;
  font-weight: 400;
}


/* 操作欄標題與垃圾桶共用同一個欄位中心。 */
.table-head > :last-child,
.ingredient > button {
  justify-self: center;
  text-align: center;
}


/* 燈號不沿用第一欄文字的左內距；三種裝置皆固定顯示為正圓狀態點。 */
.ingredient > .signal {
  box-sizing: border-box;
  width: 10px;
  min-width: 10px;
  height: 10px;
  min-height: 10px;
  margin: 0;
  padding: 0 !important;
  border-radius: 50%;
  justify-self: center;
  align-self: center;
}


/* 優先確保賞味期限完整一行呈現，名稱欄再吸收剩餘寬度。 */
@media (min-width:641px) {

  .table-head,
  .ingredient {
    grid-template-columns: 54px minmax(140px, 1fr) 90px 80px 124px 60px;
  }


  .table-head > :nth-child(5),
  .ingredient > :nth-child(5) {
    white-space: nowrap;
  }

}


@media (max-width:640px) {

  .table-head,
  .ingredient {
    grid-template-columns: 28px minmax(0, 1fr) 48px 70px 34px;
  }


  .table-head > :nth-child(5),
  .ingredient > :nth-child(5) {
    white-space: nowrap;
  }


  .ingredient > .signal {
    width: 8px;
    min-width: 8px;
    height: 8px;
    min-height: 8px;
    margin: 0;
    padding: 0 !important;
  }

}


/* 條列式工具列：手機版搜尋與新增在上、分類在下；平板版分類與搜尋同一列。圖像分頁不顯示分類。 */
@media (max-width:640px) {

  .inventory__tools { flex-direction: column; align-items: stretch; gap: 10px; }

  .search-actions { order: -1; width: 100%; height: 40px; gap: 8px; }

  .search { min-height: 40px; height: 40px; padding: 0 14px; }

  .search input, .search input:focus { font-size: 14px; }

  .search-actions :deep(.inventory-add) { min-height: 40px; height: 40px; padding: 6px 14px; font-size: 14px; }

  .tabs { display: flex; width: 100%; box-sizing: border-box; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }

  .tabs::-webkit-scrollbar { display: none; }

  .tabs button { flex: 1 1 auto; padding: 7px 3px; font-size: 14px; white-space: nowrap; }

}


@media (min-width:641px) and (max-width:1024px) {

  .inventory__tools { flex-direction: row; align-items: center; justify-content: space-between; gap: 12px; }

  .tabs { flex: 0 0 auto; flex-wrap: nowrap; }

  .tabs button { flex: 0 0 auto; padding: 8px 7px; font-size: 14px; white-space: nowrap; }

  .search-actions { flex: 0 1 330px; width: auto; min-width: 200px; align-self: center; margin-left: auto; }

  .search input, .search input:focus { font-size: 14px; }

}

@media (min-width:1025px) {

  .inventory__tools { flex-direction: row; align-items: center; justify-content: space-between; gap: 16px; }

  .tabs { flex: 0 0 auto; flex-wrap: nowrap; }

  .tabs button { white-space: nowrap; }

  .search-actions { flex: 0 1 380px; width: auto; min-width: 240px; align-self: center; }

}

@media (min-width:641px) and (max-width:819px) {

  .tabs button { padding: 7px 5px; font-size: 14px; }

}

@media (min-width:641px) {

  .search-actions { margin-left: auto; }

}


/* 手機：提示條縮小並維持單行。 */
@media (max-width:640px) {

  .toast { max-width: calc(100vw - 24px); padding: 8px 14px; overflow: hidden; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }

}


/* 搜尋與新增操作維持次要、緊湊的工具列比例，不搶走庫存內容的視覺層級。 */
.search-actions { height: 38px; gap: 6px; }

.search { min-height: 38px; height: 38px; gap: 8px; padding: 0 11px; }

.search img { width: 14px; height: 14px; }

.search input, .search input:focus { height: 18px; font-size: 14px; }

.search-actions :deep(.inventory-add) { min-height: 36px; height: 36px; gap: 4px; padding: 6px 10px; font-size: 14px; line-height: 18px; }

.search-actions :deep(.inventory-add .button-icon) { width: 15px; height: 15px; }


@media (max-width:640px) {

  .search-actions { height: 36px; gap: 6px; }

  .search { min-height: 36px; height: 36px; padding: 0 10px; }

  .search input, .search input:focus { font-size: 14px; }

  .search-actions :deep(.inventory-add) { min-height: 36px; height: 36px; padding: 6px 9px; font-size: 14px; }

}


/* 空狀態的主要操作與其他一般操作按鈕一致。 */
.empty-inventory > i { height: 36px; padding: 0 12px; font-size: 14px; line-height: 18px; }

.empty-inventory > i img { width: 16px; height: 16px; }

/* 僅收斂卡片內各列的間距；四邊內距沿用各版面既有比例。 */
.recipe { --recipe-space: 8px; gap: var(--recipe-space); }

.recipe > * { margin: 0; }

.recipe p { min-height: 0; }

.recipe__tags { column-gap: 6px; row-gap: var(--recipe-space); }

.recipe > .recipe-add-button { margin-top: 0; }

@media (min-width:641px) and (max-width:1024px) {

  .recipe { --recipe-space: 7px; }

}

@media (max-width:640px) {

  .recipe { --recipe-space: 6px; gap: var(--recipe-space); }

}


/* 393px 以下採更緊湊但可閱讀的冰箱比例：分區名稱與狀態數字不再壓過格內食材，
   空狀態說明也保有左右安全距離。 */
@media (max-width:400px) {

  .page :deep(.page-title) { padding: 24px 16px 20px; }

  .page :deep(.page-title__heading) { line-height: 1.25; }

  .page :deep(.page-title__desc) { font-size: 14px; line-height: 1.55; }

  .content { padding: 16px 12px 36px; }


  .metrics { gap: 6px; }

  .metrics article { height: 88px; padding: 8px; }

  .metrics span, .metrics small { font-size: 10px; }

  .metrics strong { font-size: 18px; }

  .metrics b { font-size: 10px; }


  .inventory { margin-top: 16px; }

  .recipes { margin-top: 22px; }

  .recipes h2 { font-size: 16px; }

  .recipes header span { font-size: 12px; }

  .recipe-list { gap: 8px; }

  .recipe { flex-basis: min(72vw, 238px); }


  .storage-zone { gap: 7px; padding: 8px; }

  .storage-zone header { gap: 5px; min-height: 20px; }

  .storage-zone header b { font-size: 14px; }

  .storage-zone header small { font-size: 14px; }

  .storage-zone header em { padding: 3px 6px; font-size: 14px; }

  .storage-zone .slot-row { gap: 7px; }

  .storage-zone .food-slot, .storage-zone .empty-slot { flex-basis: 70px; min-height: 90px; }

  .storage-zone .food-slot__image { flex-basis: 54px; width: 54px; height: 54px; }

  .storage-zone .food-slot > b { max-width:58px; font-size: 14px; }

  .storage-zone .food-slot > strong { font-size: 14px; }

  .storage-zone .empty-slot small { font-size: 14px; }


  .empty-recipes { min-height: 156px; padding: 0 20px; }

  .empty-recipes small { max-width: 278px; font-size: 14px; line-height: 1.55; }

}


/* 所有分區標頭以同一條中線對齊，冷凍庫的溫度／保存提示不會貼在標題上緣。 */
.storage-zone header { align-items: center; }

.storage-zone header small { align-self: center; line-height: 1.2; }


/* 新增食材、刪除食材與家庭管理使用相同的關閉鈕座標與確認視窗節奏。 */
.ingredient-dialog__header { position: relative; padding-right: 60px; }

.ingredient-dialog .close { position: absolute; top: 19px; right: 19px; }

.overlay--confirm { align-items: center !important; place-items: center !important; padding: 16px; }

.confirm { box-sizing: border-box; width: min(100%, 480px); min-height: 0; height: auto; padding: 24px; }

.confirm .close { top: 20px; right: 20px; }

.confirm h2 { padding-right: 40px; line-height: 1.25; }

.confirm .dialog__actions { margin: 16px 0 0; padding: 16px 0 0; border-top: 1px solid var(--brand-secondary); }


@media (max-width:640px) {

  .ingredient-dialog__header { padding-right: 60px; }

  .ingredient-dialog .close { top: 19px; right: 19px; }

  .confirm .close { top: 20px; right: 20px; }

  .overlay--confirm { align-items: center !important; padding: 16px; }

  .confirm { margin: 0; padding: 20px; }

  .confirm .dialog__actions { margin-top: 14px; padding-top: 14px; }

}


/* 375px 等更窄的手機：單位分組標題拿掉兩側裝飾線，讓文字完整放進選單。 */
@media (max-width: 400px){.unit-picker__group p span{display:none}}
</style>
