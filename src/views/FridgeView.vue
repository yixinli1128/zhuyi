<script setup>
import { computed, reactive, ref } from 'vue'
import PageTitle from '@/components/layout/PageTitle.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import { useFridgeStore } from '@/stores/fridge'
import addIconUrl from '@/assets/figma/fridge-add.svg'
import emptyIconUrl from '@/assets/figma/fridge-empty.svg'
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

const foodImageAssets = import.meta.glob('../../img/reffood/*.png', { eager: true, import: 'default', query: '?url' })
const foodImageNames = {
  牛番茄: '牛蕃茄',
  豬梅花肉片: '豬肉片',
  梅花豬肉片: '豬肉片',
  溫體黑豬梅花肉: '豬肉片',
  厚切鮭魚片: '鮭魚',
}

const store = useFridgeStore()
const ingredients = computed(() => store.activeIngredients)
const activeZone = ref('全部'), query = ref(''), view = ref('list'), dialog = ref(null), unitMenuOpen = ref(false)
const editingId = ref(null), deletingId = ref(null), submitted = ref(false), toast = ref('')
let toastTimer
const zones = [
  { name: '冷藏', label: '冷藏保鮮', hint: '0～4°C', days: 3, icon: chillZoneIconUrl },
  { name: '冷凍', label: '冷凍保存', hint: '-18°C', days: 30, icon: freezerZoneIconUrl },
  { name: '蔬果室', label: '蔬果專區', hint: '6～8°C', days: 5, icon: produceZoneIconUrl },
  { name: '常溫/調味', label: '常溫／乾貨', hint: '18°C', days: 90, icon: pantryZoneIconUrl },
]
const commonFoods = ['雞蛋', '牛番茄', '嫩豆腐', '豬梅花肉片']
const unitGroups = [
  { label: '常用單位（家庭備餐優先）', units: ['顆', '把', '個', '包', '盒', '片', '份'] },
  { label: '重量單位（精準秤重）', units: ['g（公克）', 'kg（公斤）'] },
  { label: '容量單位（液態飲品）', units: ['ml（毫升）', 'L（公升）'] },
]
const form = reactive({ name: '', amount: 1, unit: '', zone: '', expiry: '' })
const daysLeft = (date) => date ? Math.ceil((new Date(`${date}T00:00:00`) - new Date(new Date().toDateString())) / 86400000) : 0
const expiryText = (item) => { const days = daysLeft(item.expiry); return days < 0 ? '已過期' : days === 0 ? '今日到期' : `剩餘 ${days} 天` }
const expiryClass = (item) => { const days = daysLeft(item.expiry); return days <= 3 ? 'urgent' : days <= 7 ? 'soon' : '' }
const filtered = computed(() => ingredients.value.filter((item) => (activeZone.value === '全部' || item.zone === activeZone.value) && item.name.includes(query.value.trim())))
const count = (zone) => zone === '全部' ? ingredients.value.length : ingredients.value.filter((item) => item.zone === zone).length
const tabs = computed(() => [{ label: '全部', count: count('全部') }, ...zones.map((zone) => ({ label: zone.name, count: count(zone.name) }))])
const expiringCount = computed(() => ingredients.value.filter((item) => daysLeft(item.expiry) >= 0 && daysLeft(item.expiry) <= 3).length)
const pantryCount = computed(() => count('常溫/調味'))
function foodImage(name) {
  const alias = Object.keys(foodImageNames).find((key) => name.includes(key))
  const imageName = alias ? foodImageNames[alias] : Object.keys(foodImageAssets)
    .map((path) => path.split('/').pop().replace('.png', ''))
    .find((candidate) => name.includes(candidate) || candidate.includes(name))
  return imageName ? foodImageAssets[`../../img/reffood/${imageName}.png`] : null
}
const inZone = (zone) => ingredients.value.filter((item) => item.zone === zone)
const seasoning = (item) => /油|醬|鹽|醋|粉|香料|辣|胡椒/.test(item.name)
const boards = computed(() => [
  { id: 'frozen', title: '冷凍庫', hint: '-18°C・可保存約 1–3 個月', items: inZone('冷凍'), capacity: 5, rows: 1 },
  { id: 'chilled', title: '冷藏室', hint: '0–4°C・可保存約 3–7 天', items: inZone('冷藏'), capacity: 10, rows: 2 },
  { id: 'produce', title: '蔬果抽屜', hint: '6–8°C', items: inZone('蔬果室'), capacity: 5, rows: 1 },
])
const racks = computed(() => {
  const pantry = inZone('常溫/調味')
  return [{ id: 'pantry', title: '常溫櫃', hint: '陰涼乾燥處', items: pantry.filter((item) => !seasoning(item)), capacity: 10, rows: 2 }, { id: 'seasoning', title: '調味架', hint: '開封後請留意保存方式', items: pantry.filter(seasoning), capacity: 10, rows: 2 }]
})
function sectionRows(section) {
  const columns = Math.max(5, Math.ceil(section.items.length / section.rows))
  return Array.from({ length: section.rows }, (_, row) => Array.from({ length: columns }, (_, column) => section.items[row * columns + column] ?? null))
}
const errors = computed(() => ({ name: submitted.value && !form.name.trim(), zone: submitted.value && !form.zone, expiry: submitted.value && !form.expiry, amount: submitted.value && (!Number.isFinite(Number(form.amount)) || Number(form.amount) < .5 || Number(form.amount) > 500) }))
const recipes = computed(() => ingredients.value.length < 2 ? [] : [
  { name: '日式鮭魚豆腐味噌湯', text: '及時消耗冷藏食材，暖胃零浪費。', time: '20 分鐘' },
  { name: '經典家常番茄炒蛋', text: '充分消化即期食材的家常選擇。', time: '15 分鐘' },
  { name: '清炒初秋高麗菜', text: '快速完成今晚的一道家常菜。', time: '10 分鐘' },
])
function resetForm(item) { Object.assign(form, item ? { name: item.name, amount: item.amount, unit: item.unit, zone: item.zone, expiry: item.expiry } : { name: '', amount: 1, unit: '', zone: '', expiry: '' }); submitted.value = false; unitMenuOpen.value = false }
function showToast(message) { toast.value = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.value = '' }, 3600) }
function setZone(zone) { form.zone = zone.name; const date = new Date(); date.setDate(date.getDate() + zone.days); form.expiry = date.toISOString().slice(0, 10) }
function changeAmount(by) { form.amount = Math.max(.5, Math.min(500, Number(form.amount || 0) + by)) }
function chooseUnit(unit) { form.unit = unit; unitMenuOpen.value = false }
function openAdd() { editingId.value = null; resetForm(); dialog.value = 'form' }
function openEdit(item) { editingId.value = item.id; resetForm(item); dialog.value = 'form' }
function save() { submitted.value = true; if (Object.values(errors.value).some(Boolean)) return; const editing = Boolean(editingId.value); const result = editing ? store.updateIngredient(editingId.value, form) : store.addIngredient(form); if (result.error) return showToast(result.error); dialog.value = null; const item = result.ingredient; showToast(editing ? `已更新「${item.name}」的庫存資料` : `已將「${item.name} ${item.amount} ${item.unit}」加入${item.zone}，預估 ${Math.max(0, daysLeft(item.expiry))} 天內食用完畢`) }
function remove() { const item = store.removeIngredient(deletingId.value); dialog.value = null; showToast(`已刪除「${item?.name ?? '食材'}」`) }
</script>

<template>
  <section class="page">
    <PageTitle title="冰箱庫存與食材管理" description="直觀記錄食材保鮮期、溫區分類與庫存狀態，掌握家中常備食材。"><template #actions><div class="view-switch"><button :class="{ active: view === 'list' }" aria-label="列表檢視" @click="view = 'list'"><img :src="listIconUrl" alt="" /></button><button :class="{ active: view === 'grid' }" aria-label="整理食材檢視" @click="view = 'grid'"><img :src="gridIconUrl" alt="" /></button></div></template></PageTitle>
    <main class="content">
      <section class="metrics"><article><span>現有總品項</span><div><strong>{{ ingredients.length }}</strong><b>{{ ingredients.length ? '項儲備食材' : '尚無儲備食材' }}</b></div><small>涵蓋冷藏、冷凍與乾貨分區</small></article><article><span>3 天內即期優先</span><div><strong>{{ expiringCount }}</strong><b>{{ expiringCount ? '項需優先料理' : '暫無即期品項' }}</b></div><small>目前所有庫存均在安全賞味期限內</small></article><article><span>常備與調味基底</span><div><strong>{{ pantryCount }}</strong><b>{{ pantryCount ? '項常溫與調味' : '尚無常備品項' }}</b></div><small>可記錄常溫乾貨、油品與常態辛香料</small></article></section>
      <section class="inventory"><div class="inventory__tools"><div class="tabs"><button v-for="tab in tabs" :key="tab.label" :class="{ active: activeZone === tab.label }" @click="activeZone = tab.label">{{ tab.label }} ({{ tab.count }})</button></div><div class="search-actions"><label class="search"><img :src="searchIconUrl" alt="" /><input v-model="query" placeholder="搜尋食材" /></label><BaseButton class="inventory-add" @click="openAdd"><img class="button-icon" :src="addIconUrl" alt="" />新增食材</BaseButton></div></div>
        <button v-if="!ingredients.length && view === 'list'" class="empty-inventory" @click="openAdd"><img :src="emptyIconUrl" alt="" /><b>目前冰箱空空如也，尚無記錄食材</b><i><img :src="addIconUrl" alt="" />立刻登記第一批食材</i></button>
        <div v-else-if="view === 'list' && !filtered.length" class="no-results"><b>找不到「{{ query }}」</b><small>目前庫存沒有符合條件的食材，或試試調整關鍵字。</small><BaseButton size="sm" @click="openAdd">新增 {{ query || '食材' }}</BaseButton></div>
        <div v-else-if="view === 'list'" class="ingredients"><div class="table-head"><span>燈號</span><span>食材名稱</span><span>存放分區</span><span>數量</span><span>賞味期限</span><span>操作</span></div><article v-for="item in filtered" :key="item.id" class="ingredient" :class="expiryClass(item)" @click="openEdit(item)"><span class="signal"></span><b>{{ item.name }}</b><span>{{ item.zone }}</span><span>{{ item.amount }} {{ item.unit }}</span><span :class="expiryClass(item)">{{ expiryText(item) }}</span><button aria-label="刪除食材" @click.stop="deletingId = item.id; dialog = 'delete'">⌫</button></article></div>
        <div v-else class="fridge-board">
          <section class="fridge-cabinet">
            <section v-for="section in boards" :key="section.id" class="storage-zone">
              <header><b>{{ section.title }}</b><small>{{ section.hint }}</small><em>{{ section.items.length }} 項</em></header>
              <div v-for="(row, rowIndex) in sectionRows(section)" :key="`${section.id}-${rowIndex}`" class="food-layer">
                <div class="slot-row"><template v-for="(item, slotIndex) in row" :key="`${section.id}-${rowIndex}-${slotIndex}`"><button v-if="item" class="food-slot" :class="expiryClass(item)" @click="openEdit(item)"><strong>x{{ item.amount }}{{ item.unit }}</strong><img v-if="foodImage(item.name)" class="food-slot__image" :src="foodImage(item.name)" :alt="item.name" /><span v-else>{{ item.name.slice(0,1) }}</span><b>{{ item.name }}</b><i :style="{ width: `${Math.max(12, Math.min(100, daysLeft(item.expiry) / 30 * 100))}%` }"></i></button><button v-else class="empty-slot" @click="openAdd"><img :src="emptySlotAddIconUrl" alt="" /><small>空格</small></button></template></div>
                <span class="shelf-line"></span>
              </div>
            </section>
          </section>
          <div class="fridge-racks">
            <section v-for="section in racks" :key="section.id" class="storage-zone rack">
              <header><b>{{ section.title }}</b><small>{{ section.hint }}</small><em>{{ section.items.length }} 項</em></header>
              <div v-for="(row, rowIndex) in sectionRows(section)" :key="`${section.id}-${rowIndex}`" class="food-layer">
                <div class="slot-row"><template v-for="(item, slotIndex) in row" :key="`${section.id}-${rowIndex}-${slotIndex}`"><button v-if="item" class="food-slot" :class="expiryClass(item)" @click="openEdit(item)"><strong>x{{ item.amount }}{{ item.unit }}</strong><img v-if="foodImage(item.name)" class="food-slot__image" :src="foodImage(item.name)" :alt="item.name" /><span v-else>{{ item.name.slice(0,1) }}</span><b>{{ item.name }}</b><i :style="{ width: `${Math.max(12, Math.min(100, daysLeft(item.expiry) / 30 * 100))}%` }"></i></button><button v-else class="empty-slot" @click="openAdd"><img :src="emptySlotAddIconUrl" alt="" /><small>空格</small></button></template></div>
                <span class="shelf-line"></span>
              </div>
            </section>
            <footer><span class="legend-urgent">▢　3 天內即期</span><span>━　鮮度條（越短越快到期）</span><span>▢　空格・點擊新增</span></footer>
          </div>
        </div>
      </section>
      <section class="recipes"><header><h2>現有庫存可做料理</h2><span>依據現有食材直接運算，無需額外採買即可烹煮</span></header><div v-if="!recipes.length" class="empty-recipes"><span>⌁</span><b>尚未有足夠庫存食材可推薦料理</b><small>當您新增 2–3 項食材後，系統將自動比對並推薦免額外採買的今晚菜單與減損消耗提案。</small></div><div v-else class="recipe-list"><article v-for="recipe in recipes" :key="recipe.name" class="recipe"><div><em>庫存匹配 100%</em><small>◷ 約 {{ recipe.time }}</small></div><h3>{{ recipe.name }}</h3><p>{{ recipe.text }}</p><div class="recipe__tags"><span v-for="item in ingredients.slice(0,2)" :key="item.id">{{ item.name }} x {{ item.amount }}{{ item.unit }}</span></div><BaseButton block @click="showToast(`已將「${recipe.name}」加入今日餐單`)"><img class="button-icon" :src="addIconUrl" alt="" />加入今日餐單</BaseButton></article></div></section>
    </main>
    <div v-if="toast" class="toast" role="status">✓　{{ toast }}</div>
    <div v-if="dialog" class="overlay" @click.self="dialog = null">
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
            <label class="form-field">食材名稱
              <input v-model="form.name" :class="{ invalid: errors.name }" placeholder="請輸入" />
            </label>
            <div class="quick-foods">
              <span>常用快捷：</span>
              <button v-for="food in commonFoods" :key="food" type="button" @click="form.name = food"><img :src="shortcutAddIconUrl" alt="" />{{ food }}</button>
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

          <label class="form-field date-field">自訂指派有效日期
            <span><input v-model="form.expiry" :class="{ invalid: errors.expiry }" type="date" /><img :src="calendarIconUrl" alt="" /></span>
          </label>
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
        <div class="delete-info">{{ ingredients.find((item) => item.id === deletingId)?.name }} ・ {{ ingredients.find((item) => item.id === deletingId)?.amount }} {{ ingredients.find((item) => item.id === deletingId)?.unit }}</div>
        <div class="dialog__actions"><BaseButton variant="secondary" @click="dialog = null">取消</BaseButton><BaseButton @click="remove">確定刪除</BaseButton></div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.page{padding:var(--page-padding-y) var(--page-padding-x)}.content{max-width:1440px;padding:40px}.view-switch{display:flex;gap:4px;padding:4px;border-radius:12px;background:var(--brand-secondary-light)}.view-switch button{display:grid;width:40px;height:40px;place-items:center;border-radius:9px}.view-switch button.active{background:var(--brand-primary)}.view-switch img{width:24px;height:24px}.metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:40px}.metrics article{display:grid;gap:8px;min-height:126px;padding:21px;border:1px solid var(--brand-secondary);border-radius:12px 0 12px;background:#fff}.metrics span,.metrics small{color:var(--text-secondary);font-size:14px}.metrics div{display:flex;align-items:baseline;gap:8px}.metrics strong{color:var(--text-title);font-size:32px;font-weight:400;line-height:1}.metrics b{color:var(--text-body);font-size:16px;font-weight:400}.inventory{margin-top:40px}.inventory__tools{display:flex;align-items:center;justify-content:space-between;gap:24px}.tabs{display:flex;flex-wrap:wrap;gap:4px;padding:4px;border-radius:12px;background:var(--brand-secondary-light)}.tabs button{padding:8px;border-radius:9px;color:var(--text-body);font-size:14px}.tabs button.active{background:var(--brand-primary);color:#fff}.search-actions{display:flex;width:479px;gap:8px}.search{display:flex;min-width:0;flex:1;align-items:center;gap:12px;min-height:45px;padding:12px;border:1px solid var(--brand-primary-border);border-radius:999px;background:#fff}.search:focus-within{border-color:var(--brand-primary)}.search img{width:16px;height:16px}.search input,.search input:focus{width:100%;min-width:0;height:21px;border:0;outline:0;background:transparent;color:var(--text-body);font-size:16px;text-align:left}.search input::placeholder{color:var(--text-placeholder)}.button-icon{display:block;width:20px;height:20px}.empty-inventory,.empty-recipes,.no-results{display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid var(--brand-secondary);border-radius:12px 0 12px;text-align:center}.empty-inventory{min-height:305px;gap:16px;margin-top:24px;color:var(--text-body)}.empty-inventory>img{width:24px;height:24px}.empty-inventory b,.empty-recipes b{font-size:16px;font-weight:400}.empty-inventory i{display:inline-flex;align-items:center;gap:8px;padding:12px;border-radius:999px;background:var(--brand-primary);color:#fff;font-size:16px;font-style:normal}.empty-inventory i img{width:20px;height:20px}.no-results{min-height:220px;gap:8px;margin-top:24px;color:var(--text-secondary)}.ingredients{margin-top:24px}.table-head,.ingredient{display:grid;grid-template-columns:54px minmax(160px,1fr) 90px 80px 105px 60px;align-items:center;min-height:54px;border-bottom:1px solid var(--brand-secondary)}.table-head{background:var(--brand-secondary-light);color:var(--text-secondary);font-size:14px}.table-head>:first-child,.table-head>:nth-child(2),.ingredient>:first-child,.ingredient>:nth-child(2){padding-left:12px}.ingredient{color:var(--text-secondary);font-size:14px;cursor:pointer}.ingredient b{color:var(--text-body);font-weight:400}.ingredient>button{color:var(--text-secondary);font-size:21px}.signal{display:block;width:10px;height:10px;margin-left:18px;border-radius:50%;background:#856f5b}.ingredient.urgent .signal{background:#f14f6c}.ingredient.soon .signal{background:#f0d572}.urgent{color:#c84a45}.soon{color:#aa8c35}.fridge-board{display:grid;grid-template-columns:1.25fr 1fr;gap:28px;margin-top:20px}.fridge-cabinet{display:grid;gap:12px;padding:16px;border:3px solid #657a99;border-radius:12px 12px 8px 8px;background:#fff;box-shadow:0 10px 0 -5px #657a99}.fridge-racks{display:grid;align-content:start;gap:18px}.storage-zone{padding:20px;border:1.5px solid #9cadc4;border-radius:10px;background:#fff}.rack{border:2px solid var(--brand-primary)}.storage-zone header{display:flex;align-items:baseline;gap:8px;padding-bottom:12px;border-bottom:3px solid var(--brand-secondary)}.storage-zone header b{color:var(--text-title);font-size:20px;font-weight:400}.storage-zone header small{color:var(--text-secondary);font-size:13px}.storage-zone header em{margin-left:auto;padding:4px 8px;border-radius:999px;background:#eef2f7;color:#5e758e;font-size:14px;font-style:normal}.slot-strip{display:flex;gap:12px;overflow-x:auto;overscroll-behavior-inline:contain;padding:12px 1px 10px;scroll-snap-type:x mandatory}.food-slot,.empty-slot{position:relative;display:flex;flex:0 0 98px;min-height:127px;flex-direction:column;align-items:center;justify-content:center;gap:5px;overflow:hidden;border:1px solid #d9d9d9;border-radius:10px;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08);color:var(--text-body);scroll-snap-align:start}.food-slot>strong{position:absolute;top:4px;right:4px;padding:2px 5px;border-radius:999px;background:var(--brand-primary);color:#fff;font-size:9px;font-weight:400}.food-slot>span{display:grid;width:56px;height:56px;place-items:center;border-radius:50%;background:#efe8df;color:var(--brand-primary);font-size:24px}.food-slot>b{max-width:82px;overflow:hidden;font-size:12px;font-weight:400;text-overflow:ellipsis;white-space:nowrap}.food-slot>i{position:absolute;bottom:5px;left:9px;height:4px;border-radius:999px;background:var(--brand-primary)}.food-slot.urgent{border-color:#e38480}.food-slot.soon{border-color:#e4d384}.empty-slot{border-style:dashed;box-shadow:none}.empty-slot img{width:24px;height:24px}.empty-slot small{font-size:12px}.fridge-racks footer{display:flex;flex-wrap:wrap;gap:12px;color:var(--text-secondary);font-size:10px}.legend-urgent{color:#bc5550}.recipes{margin-top:40px}.recipes header{display:flex;align-items:baseline;justify-content:space-between}.recipes h2{color:var(--text-title);font-size:24px;font-weight:400}.recipes header span{color:var(--text-secondary);font-size:14px}.empty-recipes{min-height:305px;gap:8px;margin-top:16px}.empty-recipes>span{color:var(--brand-primary);font-size:24px}.empty-recipes small{max-width:520px;color:var(--text-secondary);font-size:12px}.recipe-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:16px}.recipe{display:flex;flex-direction:column;gap:8px;padding:17px;border:1px solid var(--brand-secondary);border-radius:12px 0 12px;background:#fff}.recipe>div:first-child{display:flex;justify-content:space-between}.recipe em{padding:4px 8px;border-radius:12px;background:#eef2f7;color:#5e758e;font-size:12px;font-style:normal}.recipe>div:first-child small{color:var(--text-placeholder);font-size:11px}.recipe h3{color:var(--text-body);font-size:16px;font-weight:400}.recipe p{min-height:32px;color:var(--text-secondary);font-size:12px}.recipe__tags{display:flex;flex-wrap:wrap;gap:6px}.recipe__tags span{padding:4px 8px;border-radius:999px;background:var(--brand-secondary-light);color:var(--text-body);font-size:12px}.recipe :deep(.btn){margin-top:auto;padding:8px;font-size:14px}.toast{position:fixed;z-index:40;top:36px;left:50%;max-width:calc(100vw - 32px);padding:14px 24px;border-radius:999px;background:var(--brand-primary);box-shadow:0 4px 10px rgba(52,38,28,.2);color:#fff;font-size:14px;transform:translateX(-50%)}.overlay{position:fixed;z-index:30;inset:0;display:grid;place-items:center;padding:24px;overflow-y:auto;background:rgba(46,35,28,.42)}.dialog{width:min(100%,620px);border-radius:12px 0 12px;background:#fff;box-shadow:0 18px 40px rgba(25,18,12,.22)}.ingredient-dialog>header{display:flex;justify-content:space-between;padding:22px 20px 16px;border-bottom:1px solid var(--brand-secondary)}.dialog h2{color:var(--text-title);font-size:24px;font-weight:400}.dialog p{margin-top:4px;color:var(--text-secondary);font-size:12px}.close{color:var(--text-title);font-size:30px;line-height:.8}.dialog__body{display:grid;gap:14px;padding:18px 20px}.dialog label,.dialog fieldset{display:grid;gap:7px;color:var(--text-body);font-size:14px}.dialog input,.dialog select{width:100%;min-height:42px;padding:10px 12px;border:1px solid var(--brand-primary-border);border-radius:10px;background:#fff;color:var(--text-body);font:inherit}.dialog input.invalid{border-color:#c84a45}.quick-foods{display:flex;flex-wrap:wrap;align-items:center;gap:7px;color:var(--text-secondary);font-size:12px}.quick-foods button{padding:5px 9px;border-radius:999px;background:var(--brand-secondary-light);color:var(--text-body);font-size:12px}.dialog legend{display:flex;width:100%;justify-content:space-between}.dialog legend small{color:var(--text-placeholder);font-size:10px}.amount{display:grid;grid-template-columns:42px minmax(0,1fr) 42px minmax(120px,.9fr)}.amount button,.amount input,.amount select{border-radius:0}.amount button{border:1px solid var(--brand-primary-border);background:var(--brand-secondary-light);color:var(--text-body);font-size:24px}.amount button:first-child{border-radius:10px 0 0 10px}.amount select{margin-left:12px;border-radius:10px}.zones{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.zones button{display:grid;gap:7px;min-height:80px;padding:10px;border:1px solid var(--brand-secondary);border-radius:10px;text-align:left}.zones button.selected{border-color:var(--brand-primary);background:var(--brand-secondary-light)}.zones b{font-size:13px;font-weight:400}.zones small{color:var(--text-secondary);font-size:11px}.error{color:#c84a45!important;font-size:11px!important}.dialog__actions{display:flex;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid var(--brand-secondary)}.confirm{position:relative;padding:32px}.confirm .close{position:absolute;top:18px;right:18px}.delete-info{margin:16px 0;padding:10px;border-radius:8px;background:var(--brand-secondary-light);color:var(--text-body);font-size:12px}@media(max-width:900px){.content{padding:28px 20px}.metrics{gap:16px}.inventory__tools{align-items:stretch;flex-direction:column}.search-actions{width:100%}.fridge-board{grid-template-columns:1fr}.recipes header{align-items:flex-start;flex-direction:column;gap:6px}.recipe-list{grid-template-columns:1fr}}@media(max-width:600px){.metrics{grid-template-columns:1fr}.table-head,.ingredient{grid-template-columns:36px minmax(100px,1fr) 74px 58px}.table-head>:nth-child(3),.table-head>:nth-child(6),.ingredient>:nth-child(3),.ingredient>:nth-child(6){display:none}.storage-zone{padding:14px}.storage-zone header{align-items:flex-start;flex-wrap:wrap}.storage-zone header b{font-size:18px}.zones{grid-template-columns:repeat(2,minmax(0,1fr))}.dialog legend{display:grid;gap:4px}.amount{grid-template-columns:38px minmax(0,1fr) 38px}.amount select{grid-column:1/-1;margin:8px 0 0}.overlay{align-items:start;padding:12px}.dialog{margin:12px 0}}
.empty-inventory { width: 100%; }
.slot-strip--two-rows { display: grid; grid-template-rows: repeat(2, 127px); grid-auto-flow: column; grid-auto-columns: 98px; align-items: stretch; }
.page :deep(.page-title){padding:60px 40px 41px}.page :deep(.page-title__text){gap:12px}.page :deep(.page-title__desc){font-size:16px}.fridge-board{grid-template-columns:650px minmax(0,1fr);align-items:start;gap:28px;margin-top:20px}.fridge-cabinet{position:relative;gap:12px;padding:16px;border:3px solid #5e7391;border-radius:12px;background:#fff;box-shadow:none}.fridge-cabinet::before,.fridge-cabinet::after{position:absolute;bottom:-12px;width:34px;height:12px;border-radius:0 0 6px 6px;background:#5e7391;content:""}.fridge-cabinet::before{left:12px}.fridge-cabinet::after{right:12px}.fridge-racks{gap:28px}.storage-zone{display:grid;gap:12px;padding:20px;border:1.5px solid #9cadc4;border-radius:12px}.rack{gap:14px;border:3px solid #7a6350;border-radius:18px}.storage-zone header{min-height:24px;padding:0;border:0}.food-layer{display:flex;flex-direction:column;gap:8px;min-width:0;padding:0 12px}.slot-row{display:flex;gap:12px;min-width:0;overflow-x:auto;padding:4px 8px;scroll-snap-type:x mandatory}.shelf-line{display:block;flex:0 0 6px;width:100%;border-radius:999px;background:var(--brand-secondary)}.rack .food-layer{padding:0}.rack .slot-row{padding:4px 0}.food-slot,.empty-slot{flex-basis:98px;min-height:127px;border-radius:12px}.empty-slot img{width:20px;height:20px}.empty-slot{gap:8px}.slot-strip,.slot-strip--two-rows{display:none}@media(min-width:901px) and (max-width:1439px){.inventory__tools{align-items:flex-start;flex-direction:column}.search-actions{align-self:flex-end}.fridge-board{grid-template-columns:1fr}.fridge-cabinet{max-width:650px}.fridge-racks{max-width:682px}}@media(max-width:900px){.page :deep(.page-title){padding:48px 32px 33px}.fridge-board{grid-template-columns:1fr}.fridge-cabinet{max-width:650px}.fridge-racks{grid-template-columns:1fr;max-width:682px}}@media(max-width:600px){.page :deep(.page-title){padding:32px 20px 28px}.food-layer{padding:0}.storage-zone{padding:14px}.slot-row{padding:4px 0}.fridge-board{gap:28px}}
.food-slot{justify-content:flex-start;padding:8px;gap:4px}.food-slot__image{display:block;flex:0 0 80px;width:80px;height:80px;border-radius:12px;object-fit:cover}.food-slot>b{max-width:80px}.food-slot>i{left:9px;max-width:80px}
.search-actions{height:45px;align-items:center}.search{box-sizing:border-box;min-height:45px;height:45px;padding:0 12px}.search-actions :deep(.inventory-add){display:inline-flex;flex:0 0 auto;min-height:39px;height:39px;padding:8px 10px;gap:4px;font-size:13px;line-height:19px}.search-actions :deep(.inventory-add .btn__label){display:inline-flex;align-items:center;gap:4px}.search-actions :deep(.inventory-add .button-icon){width:16px;height:16px}.view-switch button.active img{filter:brightness(0) invert(1)}
.metrics article{min-height:106px;padding:16px;gap:6px}.metrics strong{font-size:29px}.metrics span,.metrics small{font-size:13px}
/* 冰箱頁首完全沿用家庭管理頁的 PageTitle 尺寸，避免頁面各自偏移。 */
@media(min-width:1024px){.page :deep(.page-title){padding:48px 32px 33px}.page :deep(.page-title__text){gap:10px}.page :deep(.page-title__desc){font-size:13px}}
@media(max-width:1023px){.page :deep(.page-title){padding:60px 40px 41px}.page :deep(.page-title__text){gap:12px}.page :deep(.page-title__desc){font-size:var(--fs-body-1)}}

/* Figma ref/addnewfood/mc — Desktop - 冰箱/新增食材 */
.ingredient-dialog{display:grid;grid-template-rows:77px minmax(0,1fr) 70px;width:min(620px,calc(100vw - 32px));height:587px;max-height:calc(100dvh - 32px);overflow:hidden;border:1px solid #e9e1d9;border-radius:12px 0 12px;background:#fff;box-shadow:0 25px 50px -12px rgba(0,0,0,.25)}.ingredient-dialog:has(.unit-picker__menu){overflow:visible}
.ingredient-dialog__header{box-sizing:border-box;display:flex;align-items:flex-start;justify-content:space-between;padding:16px 20px 17px;border-bottom:1px solid #e9e1d9}.ingredient-dialog__header h2{font-size:24px;line-height:29px}.ingredient-dialog__header p{margin-top:0;font-size:12px;line-height:14px}.ingredient-dialog .close{display:grid;flex:0 0 24px;width:24px;height:24px;place-items:center}.ingredient-dialog .close img{width:24px;height:24px}
.ingredient-dialog .dialog__body{display:grid;min-height:0;align-content:start;gap:16px;overflow:visible;padding:16px 20px}.ingredient-dialog fieldset{min-width:0;margin:0;padding:0;border:0}.ingredient-dialog .form-field,.ingredient-dialog fieldset{gap:4px;font-size:16px;line-height:24px}.ingredient-dialog .form-field>input,.ingredient-dialog .date-field>span{box-sizing:border-box;width:100%;height:44px;min-height:44px;padding:0 12px;border:1px solid #e9e1d9;border-radius:12px;background:#fff;color:var(--text-body);font-size:14px}.ingredient-dialog .form-field>input{line-height:44px}.ingredient-dialog .form-field>input:focus,.ingredient-dialog .date-field>span:focus-within{border-color:#856f5b}.ingredient-dialog .form-field>input.invalid,.ingredient-dialog .date-field>span:has(.invalid){border-color:#c84a45}
.ingredient-dialog__name{display:grid;gap:8px}.quick-foods{gap:8px;font-size:14px;line-height:20px}.quick-foods button{display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:8px;font-size:12px;line-height:16px}.quick-foods button img{width:12px;height:12px}.ingredient-dialog legend{align-items:baseline;font-size:16px;line-height:24px}.ingredient-dialog legend small{font-size:12px;line-height:18px}
.ingredient-dialog .amount{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}.quantity-stepper{display:grid;grid-template-columns:36px minmax(0,1fr) 36px}.quantity-stepper>button,.quantity-stepper input{box-sizing:border-box;height:44px;min-height:44px;border-color:#e9e1d9}.quantity-stepper>button{display:grid;place-items:center;background:#f3efe9}.quantity-stepper>button img{width:18px;height:18px}.quantity-stepper>button:first-child{border-radius:12px 0 0 12px}.quantity-stepper input{border-right:0;border-left:0;border-radius:0;text-align:center;font-size:14px}.quantity-stepper>button:nth-child(3){border-radius:0 12px 12px 0}.unit-picker{position:relative;grid-column:auto}.unit-picker__trigger{display:flex;box-sizing:border-box;width:100%;height:44px;align-items:center;justify-content:space-between;padding:0 12px;border:1px solid #cbc4be;border-radius:12px;background:#fff;color:#5a4a3b;font-size:14px;text-align:left}.unit-picker__trigger.placeholder{color:#a39d9a}.unit-picker__trigger img{width:12px;height:24px;transform:rotate(90deg)}.unit-picker__trigger.open img{transform:rotate(-90deg)}.unit-picker__menu{position:absolute;z-index:50;top:52px;right:0;left:0;min-width:141px;overflow:hidden;padding:12px 0;border:1px solid #cbc4be;border-radius:20px;background:#fff;box-shadow:0 20px 30px rgba(52,38,28,.2)}.unit-picker__group{display:grid;gap:0;padding:0 0 8px}.unit-picker__group+ .unit-picker__group{padding-top:8px}.unit-picker__group p{display:flex;align-items:center;gap:10px;margin:0 12px 4px;color:#a39d9a;font-size:11px;white-space:nowrap}.unit-picker__group p span{display:block;flex:1;height:1px;background:#e9e1d9}.unit-picker__group button{width:100%;height:28px;padding:0;border:0;border-radius:0;background:transparent;color:#5a4a3b;font-size:14px;line-height:28px;text-align:center}.unit-picker__group button:hover,.unit-picker__group button.selected{background:#e9e1d9}
.ingredient-dialog .form-field,.ingredient-dialog legend{color:#5a4a3b}.ingredient-dialog legend small,.quick-foods{color:#a39d9a}.ingredient-dialog .amount input{color:#5a4a3b}
.ingredient-dialog .zones{gap:8px}.ingredient-dialog .zones button{display:grid;min-height:90px;align-content:start;gap:3px;padding:13px;border:1px solid #f2efec;border-radius:12px;background:#fff}.ingredient-dialog .zones button.selected{padding:12px;border:2px solid #856f5b;background:#fff}.zone-card__head{display:flex;align-items:center;gap:6px;min-width:0}.zone-card__head i{width:8px;height:8px;border-radius:50%;background:#e9e1d9}.zone-card__head b{color:#716c6c;font-size:12px;line-height:16px;white-space:nowrap}.zone-card__head img{width:20px;height:20px;margin-left:auto;filter:brightness(0) saturate(100%) invert(78%) sepia(17%) saturate(672%) hue-rotate(175deg) brightness(86%) contrast(84%)}.zone-card__temperature{color:#716c6c;font-size:12px;line-height:16px}.zone-card__days{width:100%;margin-top:4px;padding-top:7px;border-top:1px solid #f2efec;color:#716c6c;font-size:10px;line-height:14px;text-align:left}.ingredient-dialog .zones button.selected .zone-card__head i{background:#856f5b}.ingredient-dialog .zones button.selected .zone-card__head img{filter:brightness(0) saturate(100%) invert(42%) sepia(31%) saturate(728%) hue-rotate(175deg) brightness(94%) contrast(85%)}.ingredient-dialog .zones button.selected .zone-card__head b,.ingredient-dialog .zones button.selected .zone-card__temperature,.ingredient-dialog .zones button.selected .zone-card__days{color:#5a4a3b}.ingredient-dialog .zones button.selected .zone-card__days{border-top-color:#856f5b}
.ingredient-dialog .date-field>span{position:relative;display:flex;align-items:center;padding:0}.ingredient-dialog .date-field input{height:42px;min-height:42px;padding:0 42px 0 12px;border:0;border-radius:12px;background:transparent;font-size:14px;outline:0}.ingredient-dialog .date-field input::-webkit-calendar-picker-indicator{position:absolute;right:0;width:42px;height:42px;margin:0;opacity:0;cursor:pointer}.ingredient-dialog .date-field img{position:absolute;right:12px;width:17px;height:17px;pointer-events:none}.ingredient-dialog .dialog__actions{min-height:70px;align-items:center;padding:13px 20px 12px;border-top:1px solid #e9e1d9}.ingredient-dialog .dialog__actions :deep(.btn){min-height:45px;padding:0 12px;font-size:16px}

/* ref/unit/click：閉合狀態與 Figma 相同，避免被通用按鈕字級放大。 */
.ingredient-dialog .unit-picker__trigger{font-size:14px;font-weight:400;line-height:18px}
@media(max-width:600px){.ingredient-dialog{height:auto;max-height:calc(100dvh - 24px)}.ingredient-dialog .dialog__body{overflow-y:auto;padding:16px}.ingredient-dialog__header,.ingredient-dialog .dialog__actions{padding-right:16px;padding-left:16px}.ingredient-dialog .zones{grid-template-columns:repeat(2,minmax(0,1fr))}.ingredient-dialog .amount{grid-template-columns:1fr}.unit-picker{grid-column:auto;margin-top:0}.ingredient-dialog .dialog__actions{min-height:64px}}
</style>
