<script setup>
import { computed, reactive, ref } from 'vue'
import PageTitle from '@/components/layout/PageTitle.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import { useFamilyStore } from '@/stores/family'
import addIconUrl from '@/assets/figma/icon-add-duotone.svg'
import avatarPlaceholderUrl from '@/assets/figma/avatar-placeholder.svg'
import closeIconUrl from '@/assets/figma/icon-close.svg'
import tagRemoveIconUrl from '@/assets/figma/icon-tag-remove.svg'
import trainLocomotiveUrl from '@/assets/family-train-locomotive-ink.png'
import trainCarriageUrl from '@/assets/family-train-carriage-ink.png'

const familyStore = useFamilyStore()
const dialog = ref(null)
const editingId = ref(null)
const deletingMember = ref(null)
const formError = ref('')
const toast = ref(null)
const customAvoid = ref('')
const photoInput = ref(null)
let toastTimer

const commonIngredients = ['花生', '芒果', '大豆', '魚類', '芝麻', '蛋類', '堅果類', '甲殼類', '牛奶製品']
const spiceLevels = [
  { value: 'none', label: '不辣' },
  { value: 'light', label: '微辣' },
  { value: 'mild', label: '小辣' },
  { value: 'medium', label: '中辣' },
  { value: 'hot', label: '大辣' },
]
const portionOptions = [
  { value: 0.5, label: '兒童小份' },
  { value: 0.8, label: '長輩適中' },
  { value: 1, label: '標準成人' },
  { value: 1.2, label: '大食增量' },
]
const dietOptions = ['全素', '蛋素', '奶素', '奶蛋素', '植物五辛素']
const form = reactive({ name: '', portionFactor: 1, spiceLevel: 'none', dietaryNote: '', allergies: [], avoids: [], avatar: '' })
const members = computed(() => familyStore.activeMembers)
const totalPortions = computed(() => familyStore.totalPortionFactor.toFixed(1))

function resetForm(member = null) {
  Object.assign(form, member
    ? { name: member.name, portionFactor: member.portionFactor, spiceLevel: member.spiceLevel, dietaryNote: member.dietaryNote, allergies: [...member.allergies], avoids: [...member.avoids], avatar: member.avatar }
    : { name: '', portionFactor: 1, spiceLevel: 'none', dietaryNote: '', allergies: [], avoids: [], avatar: '' })
  customAvoid.value = ''
  formError.value = ''
}

function openAdd() { editingId.value = null; resetForm(); dialog.value = 'form' }
function openEdit(member) { editingId.value = member.id; resetForm(member); dialog.value = 'form' }

function addCustomPreference() {
  const source = customAvoid
  const name = source.value.trim()
  if (name && !hasRestrictedFood(name)) toggleRestrictedFood(name)
  source.value = ''
}

function choosePhoto(event) {
  const [file] = event.target.files ?? []
  if (!file) return
  const reader = new FileReader()
  reader.addEventListener('load', () => { form.avatar = String(reader.result) }, { once: true })
  reader.readAsDataURL(file)
}

function hasRestrictedFood(name) { return form.allergies.includes(name) || form.avoids.includes(name) }

function toggleRestrictedFood(name) {
  if (hasRestrictedFood(name)) {
    form.allergies = form.allergies.filter((item) => item !== name)
    form.avoids = form.avoids.filter((item) => item !== name)
    return
  }
  // Figma 將過敏與忌口合併為同一組選項；未特別標記的新增項目先視為忌口。
  form.avoids = [...form.avoids, name]
}

function saveMember() {
  const result = editingId.value ? familyStore.updateMember(editingId.value, form) : familyStore.addMember(form)
  if (result.error) { formError.value = result.error; return }
  dialog.value = null
  showToast(editingId.value ? `已儲存「${result.member.name}」的飲食設定` : `已儲存「${result.member.name}」的飲食設定，之後配餐會自動套用`)
}

function confirmDelete(member) { deletingMember.value = member; dialog.value = 'delete' }
function deleteMember() {
  const member = familyStore.removeMember(deletingMember.value.id)
  dialog.value = null
  if (member) showToast(`已刪除成員「${member.name}」`, member.id)
}
function showToast(message, undoId = null) { toast.value = { message, undoId }; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.value = null }, 5000) }
function undoDelete() { if (toast.value?.undoId) familyStore.restoreMember(toast.value.undoId); toast.value = null; clearTimeout(toastTimer) }
function dateLabel(value) { const days = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 86400000)); return days === 0 ? '剛剛' : `${days} 天前` }
</script>

<template>
  <section class="page">
    <PageTitle title="家庭成員與飲食偏好" description="設定每位成員的食量係數、過敏源與個人偏好，系統配餐時將自動為全家量身調整。">
      <template #actions><BaseButton @click="openAdd">＋ 新增成員</BaseButton></template>
    </PageTitle>
    <main class="content">
      <section class="summary" aria-label="家庭飲食摘要">
        <article><span>常駐用餐人數</span><strong>{{ members.length }} <small>位</small></strong><p>平日晚餐共食家庭名冊</p></article>
        <article><span>每餐總份量</span><strong>{{ totalPortions }} <small>人份</small></strong><p>依成員食量係數動態加權</p></article>
      </section>
      <section class="members" aria-labelledby="member-list-title">
        <aside class="family-train" :aria-label="`家庭列車，目前 ${members.length} 位成員`">
          <div class="train-caption"><small>煮意・家人列車</small><strong>一家人的列車</strong><span>一位成員，一節車廂</span></div>
          <div class="train-route">
            <span class="train-engine" aria-hidden="true"><img :src="trainLocomotiveUrl" alt="" /><small>煮意號</small></span>
            <span v-for="member in members" :key="member.id" class="train-car" :aria-label="member.name">
              <span class="train-car__body"><img :src="trainCarriageUrl" alt="" /><span class="train-car__window"><img v-if="member.avatar" :src="member.avatar" alt="" /><b v-else>{{ member.name.slice(0, 1) }}</b></span></span>
              <small>{{ member.name }}</small>
            </span>
            <button class="train-add" type="button" aria-label="新增一位家庭成員" @click="openAdd"><b>＋</b><small>下一位</small></button>
          </div>
        </aside>
        <header><h2 id="member-list-title">家庭成員名冊</h2><span>共 {{ members.length }} 位成員</span></header>
        <div class="member-grid">
          <article v-for="member in members" :key="member.id" class="member-card">
            <header><span class="avatar"><img v-if="member.avatar" :src="member.avatar" alt="" /><template v-else>{{ member.name.slice(0, 1) }}</template></span><div><h3>{{ member.name }}</h3><small>份量：{{ member.portionFactor.toFixed(1) }}x</small></div><div class="card-actions"><button type="button" :aria-label="`編輯 ${member.name}`" @click="openEdit(member)"><i class="fa-regular fa-pen-to-square" aria-hidden="true"></i></button><button type="button" :aria-label="`刪除 ${member.name}`" @click="confirmDelete(member)"><i class="fa-regular fa-trash-can" aria-hidden="true"></i></button></div></header>
            <dl><div><dt>過敏食材</dt><dd><span v-if="!member.allergies.length" class="tag">無</span><span v-for="item in member.allergies" :key="item" class="tag">{{ item }}</span></dd></div><div><dt>忌口食材</dt><dd><span v-if="!member.avoids.length" class="tag">無</span><span v-for="item in member.avoids" :key="item" class="tag">{{ item }}</span></dd></div><div class="two-column"><div><dt>飲食需求</dt><dd>{{ member.dietaryNote || '無' }}</dd></div><div><dt>辣度偏好</dt><dd>{{ spiceLevels.find((item) => item.value === member.spiceLevel)?.label }}</dd></div></div></dl>
            <footer>最近更新：{{ dateLabel(member.updatedAt) }}</footer>
          </article>
          <button class="add-card" type="button" @click="openAdd"><img :src="addIconUrl" alt="" /><span>{{ members.length ? '新增成員' : '目前尚未有成員' }}</span><small>{{ members.length ? '把家人的口味，記在這裡' : '點擊添加第一位成員' }}</small></button>
        </div>
      </section>
    </main>
    <div v-if="toast" class="toast" role="status">✓ {{ toast.message }} <button v-if="toast.undoId" type="button" @click="undoDelete">復原</button></div>
    <div v-if="dialog" class="overlay" @click.self="dialog = null">
      <form v-if="dialog === 'form'" class="dialog" @submit.prevent="saveMember">
        <header class="modal-heading"><div><h2>{{ editingId ? '編輯家庭成員' : '新增家庭成員' }}</h2><p>{{ editingId ? '修改後，之後的配餐會依新的設定調整。' : '填寫飲食限制與份量，系統於配餐時將避開禁忌食材。' }}</p></div><button class="close" type="button" aria-label="關閉" @click="dialog = null"><img :src="closeIconUrl" alt="" /></button></header>
        <div class="modal-body"><button class="avatar-picker" type="button" @click="photoInput?.click()"><span><img :src="form.avatar || avatarPlaceholderUrl" alt="" /></span><small>更換頭貼</small></button><input ref="photoInput" class="photo-input" type="file" accept="image/*" @change="choosePhoto" />
        <label>暱稱<input v-model="form.name" maxlength="20" required placeholder="請輸入" /></label>
        <fieldset><legend>每餐建議份量 <small>自動計算買菜總量</small></legend><div class="portions"><button v-for="item in portionOptions" :key="item.value" type="button" :class="{ selected: form.portionFactor === item.value }" @click="form.portionFactor = item.value"><b>{{ item.value.toFixed(1) }}x</b><span>{{ item.label }}</span></button></div></fieldset>
        <fieldset><legend>過敏與忌口食材 <small>點擊選擇</small></legend><div class="chips"><button v-for="name in commonIngredients" :key="name" type="button" :class="{ selected: hasRestrictedFood(name) }" @click="toggleRestrictedFood(name)">{{ name }}</button></div><div v-if="[...form.allergies, ...form.avoids].some((name) => !commonIngredients.includes(name))" class="chosen"><button v-for="name in [...new Set([...form.allergies, ...form.avoids])].filter((item) => !commonIngredients.includes(item))" :key="name" type="button" @click="toggleRestrictedFood(name)"><span>{{ name }}</span><img :src="tagRemoveIconUrl" alt="移除" /></button></div><div class="custom"><input v-model="customAvoid" placeholder="例如：茄子、木耳、苦瓜…" @keydown.enter.prevent="addCustomPreference" /><button type="button" @click="addCustomPreference">新增</button></div></fieldset>
        <fieldset><legend>特殊飲食需求 <small>點擊選擇</small></legend><div class="chips"><button v-for="diet in dietOptions" :key="diet" type="button" :class="{ selected: form.dietaryNote === diet }" @click="form.dietaryNote = form.dietaryNote === diet ? '' : diet">{{ diet }}</button></div></fieldset>
        <fieldset><legend>辣度偏好</legend><div class="spice"><button v-for="level in spiceLevels" :key="level.value" type="button" :class="{ selected: form.spiceLevel === level.value }" @click="form.spiceLevel = level.value">{{ level.label }}</button></div></fieldset>
        <p v-if="formError" class="error">{{ formError }}</p></div><footer class="modal-footer"><BaseButton variant="secondary" type="button" @click="dialog = null">取消</BaseButton><BaseButton type="submit">{{ editingId ? '儲存變更' : '儲存成員' }}</BaseButton></footer>
      </form>
      <section v-else class="dialog confirm" role="dialog" aria-modal="true"><button class="close" type="button" aria-label="關閉" @click="dialog = null">×</button><h2>確定要刪除「{{ deletingMember?.name }}」嗎？</h2><p>刪除後不會列入晚餐份量與飲食限制；你可在 5 秒內復原。</p><div class="dialog-actions"><BaseButton variant="secondary" @click="dialog = null">取消</BaseButton><BaseButton @click="deleteMember">確定刪除</BaseButton></div></section>
    </div>
  </section>
</template>

<style scoped>
.page { padding: var(--page-padding-y) var(--page-padding-x); }
.content { max-width: 1440px; padding: 28px 40px 40px; }
.summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
.summary article, .member-card { border: 1px solid var(--brand-secondary); border-radius: 12px 0 12px; background: #fff; }
.summary article { box-sizing: border-box; min-height: 0; height: 112px; padding: 14px 16px; }
.summary span, .members > header > span, .member-card small, .member-card dt, .member-card footer { color: var(--text-secondary); font-size: 13px; }
.summary span { font-size: 12px; }
.summary strong { display: block; color: var(--text-title); font-size: 24px; font-weight: 600; line-height: 1.25; }
.summary strong small { font-size: 14px; font-weight: 400; }
.summary p { margin: 4px 0 0; color: var(--text-secondary); font-size: 12px; line-height: 1.35; }
.members { margin-top: 32px; }
.family-train { margin-bottom: 16px; padding: 0 0 14px; border-bottom: 1px solid var(--brand-secondary); }
.train-caption { display: flex; align-items: baseline; gap: 8px; color: var(--text-body); white-space: nowrap; }
.train-caption small { color: #4a3930; font-size: 10px; letter-spacing: .12em; }
.train-caption strong { font-size: 18px; font-weight: 400; }
.train-caption span { color: var(--text-placeholder); font-size: 11px; }
.train-route { position: relative; display: flex; min-width: 0; height: 114px; align-items: flex-start; gap: 6px; overflow-x: auto; overflow-y: hidden; margin-top: 8px; padding: 0 5px; scrollbar-width: thin; }
.train-route::before { position: absolute; z-index: 0; top: 81px; right: 0; left: 0; height: 3px; border-radius: 70% 30% 45% 55%; background: #4a3930; box-shadow: 0 4px 0 -2px #b9a99a; content: ''; }
.train-engine, .train-car, .train-add { position: relative; z-index: 1; display: flex; flex: 0 0 auto; flex-direction: column; align-items: center; color: var(--text-secondary); font-size: 10px; line-height: 1.2; text-align: center; }
.train-engine { width: 114px; }
.train-engine > img { display: block; width: 108px; height: 88px; object-fit: contain; object-position: center bottom; mix-blend-mode: multiply; }
.train-engine > small, .train-car > small, .train-add > small { margin-top: 1px; font-size: inherit; white-space: nowrap; }
.train-car { width: 96px; }
.train-car::before { position: absolute; top: 65px; left: -7px; width: 9px; height: 2px; background: #493a30; content: ''; }
.train-car__body { position: relative; display: block; width: 92px; height: 75px; }
.train-car__body > img { display: block; width: 100%; height: 100%; object-fit: contain; mix-blend-mode: multiply; }
.train-car__window { position: absolute; top: 33%; left: 50%; display: grid; width: 27px; height: 27px; place-items: center; border-radius: 50%; background: rgba(249,244,235,.84); transform: translateX(-50%); }
.train-car__window > img, .train-car__window > b { width: 18px; height: 18px; border-radius: 50%; object-fit: cover; }
.train-car b { display: grid; place-items: center; background: var(--brand-secondary-light); font-weight: 400; line-height: 1; }
.train-add { width: 86px; margin-left: 4px; padding-top: 7px; border: 1px dashed #9c8877; border-radius: 12px 4px 10px 5px; background: rgba(248,245,242,.65); color: #796757; }
.train-add b { font-size: 17px; font-weight: 400; line-height: 1; }
.train-add > small { margin: 6px 0 7px; }
.members > header { display: flex; align-items: baseline; justify-content: space-between; }
.members h2 { color: var(--text-title); font-size: 24px; font-weight: 400; }
.member-grid { display: grid; grid-auto-rows: 312px; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 20px; }
.member-card { box-sizing: border-box; height: 100%; padding: 18px; }
.member-card > header { display: flex; align-items: center; gap: 12px; padding-bottom: 9px; border-bottom: 1px solid var(--brand-secondary); }
.avatar { display: grid; width: 46px; height: 46px; place-items: center; overflow: hidden; border: 1px solid var(--brand-primary-border); border-radius: 50%; background: var(--brand-secondary-light); color: var(--text-body); font-size: 19px; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.member-card h3 { color: var(--text-title); font-size: 19px; font-weight: 400; }
.card-actions { display: flex; gap: 10px; margin-left: auto; }
.card-actions button { display: grid; width: 24px; height: 24px; place-items: center; color: var(--brand-primary); font-size: 16px; }
.member-card dl { display: grid; gap: 9px; padding: 12px 0; }
.member-card dd { margin-top: 3px; color: var(--text-body); font-size: 13px; }
.tag { display: inline-block; margin: 0 4px 3px 0; padding: 3px 7px; border-radius: 999px; background: var(--brand-secondary-light); color: var(--text-body); font-size: 11px; }
.two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.member-card footer { padding-top: 9px; border-top: 1px solid var(--brand-secondary); }
.add-card { display: flex; box-sizing: border-box; height: 100%; flex-direction: column; align-items: center; justify-content: center; gap: 12px; border: 1px dashed var(--brand-primary-border); border-radius: 12px 0 12px; color: var(--text-body); }
.add-card img { width: 24px; height: 24px; }
.add-card small { color: var(--text-placeholder); font-size: 12px; }
.overlay { position: fixed; z-index: 30; inset: 0; display: grid; place-items: center; overflow: auto; padding: 16px; background: rgba(52, 38, 28, .35); }
/* Figma 的卡片以內容寬度為基準（440px），窄螢幕才隨視窗縮小。 */
.dialog { position: relative; display: flex; inline-size: fit-content; min-inline-size: min(27.5rem, calc(100vw - 32px)); max-inline-size: calc(100vw - 32px); max-height: calc(100dvh - 32px); flex-direction: column; padding: 0; border-radius: 12px 0 12px; background: #fff; box-shadow: 0 18px 44px rgba(52, 38, 28, .24); }
.modal-heading { display: flex; justify-content: space-between; gap: 18px; padding: 12px 18px; border-bottom: 1px solid var(--brand-secondary); }
.modal-heading h2 { color: var(--text-title); font-size: 20px; font-weight: 400; line-height: 1.25; }
.modal-heading p { margin-top: 2px; color: var(--text-secondary); font-size: 11px; line-height: 1.35; }
.close { align-self: flex-start; color: var(--text-secondary); font-size: 22px; line-height: 1; }
/* 正常桌機高度不會捲動；只有可視高度不足時才由這裡安全捲動。 */
.modal-body { inline-size: fit-content; max-inline-size: calc(100vw - 32px); overflow-y: auto; padding: 10px 18px 8px; }
.avatar-picker { display: flex; flex-direction: column; align-items: center; gap: 2px; margin: 0 auto 7px; color: var(--text-body); font-size: 13px; }
.avatar-picker span { display: block; width: 60px; height: 60px; overflow: hidden; border-radius: 50%; }
.avatar-picker img { display: block; width: 60px; height: 60px; object-fit: cover; }
.photo-input { display: none; }
.dialog label, .dialog fieldset { display: block; min-inline-size: 0; margin: 8px 0; border: 0; padding: 0; color: var(--text-body); font-size: 13px; line-height: 1.3; }
.dialog input { box-sizing: border-box; width: 100%; height: 36px; margin-top: 3px; padding: 6px 10px; border: 1px solid var(--brand-secondary); border-radius: 10px; background: #fff; font: inherit; }
.dialog legend { display: flex; justify-content: space-between; width: 100%; }
.dialog legend small { color: var(--text-placeholder); font-size: 10px; }
.portions { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin-top: 4px; }
.portions button { display: flex; min-height: 46px; flex-direction: column; align-items: center; justify-content: center; border: 1px solid var(--brand-secondary); border-radius: 10px; color: var(--text-body); font-size: 12px; }
.portions button.selected { border-color: var(--brand-secondary-active); background: var(--brand-secondary-active); color: var(--text-on-primary); }
.portions b { font-weight: 400; }
.portions span { color: var(--text-placeholder); font-size: 10px; }
.portions button.selected span { color: var(--text-on-primary); }
.chips, .custom, .chosen { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 5px; }
.chips button, .chosen button { padding: 5px 8px; border: 1px solid var(--brand-primary-border); border-radius: 999px; color: var(--text-body); font-size: 12px; line-height: 1.2; }
.chips .selected { border-color: var(--brand-primary); background: var(--brand-secondary); color: var(--text-body); }
.chosen button { display: inline-flex; align-items: center; gap: 8px; background: var(--brand-secondary); }
.chosen img { display: block; width: 14px; height: 14px; }
.custom { flex-wrap: nowrap; }
.custom input { height: 36px; margin: 0; }
.custom button { flex: 0 0 auto; padding: 8px 10px; border: 1px solid var(--brand-secondary); border-radius: 10px; background: var(--brand-secondary-light); color: var(--text-body); font-size: 12px; }
.spice { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); height: 29px; margin-top: 3px; border-radius: 10px; background: var(--brand-secondary-light); padding: 3px; }
.spice button { padding: 3px 2px; border-radius: 7px; color: var(--text-body); font-size: 12px; }
.spice .selected { background: #fff; box-shadow: 0 1px 2px rgba(52, 38, 28, .08); }
.error { margin: 8px 0; color: #b9534e; font-size: 12px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 8px 18px; }
.confirm { position: relative; padding: 28px; }
.confirm > .close { position: absolute; top: 18px; right: 18px; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
.toast { position: fixed; z-index: 40; top: 22px; left: 50%; padding: 12px 18px; border-radius: 999px; background: var(--brand-primary-active); box-shadow: 0 8px 24px rgba(0, 0, 0, .18); color: #fff; transform: translateX(-50%); }
.toast button { margin-left: 12px; color: #fff; text-decoration: underline; font-weight: 700; }

@media (min-width: 641px) and (max-width: 1024px) {
  .content { padding: 24px 28px 48px; }
  .summary { gap: 16px; }
  .summary article { height: 106px; padding: 14px; }
  .summary strong { font-size: 22px; }
  .members { margin-top: 28px; }
  .family-train { margin-bottom: 14px; }
  .members h2 { font-size: 22px; }
  /* 忌口標籤可能換行；列高以 320px 為下限並可隨內容增高，避免頁尾溢出卡片。 */
  .member-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: minmax(320px, auto); gap: 14px; margin-top: 16px; }
  .member-card { padding: 16px; }
  .member-card h3 { font-size: 18px; }
  .member-card dl { gap: 8px; padding: 10px 0; }
  .add-card { gap: 10px; }
}
@media (max-width: 640px) {
  /* 頁首唯一操作改放在標題右側，與冰箱／日誌的行動版操作位置一致。 */
  .page :deep(.page-title__text) { flex: 1 1 0; min-width: 0; }
  .page :deep(.page-title__actions) { width: auto; justify-content: flex-end; }
  .page :deep(.page-title__actions .btn) { min-height: 36px; padding: 6px 10px; font-size: 12px; }
  .content { padding: 20px var(--page-padding-x) 48px; }
  .page :deep(.page-title__desc) { font-size: 12px; line-height: 1.45; }
  .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .summary article { height: 100px; padding: 12px; }
  .summary span { font-size: 11px; }
  .summary strong { font-size: 21px; }
  .summary strong small { font-size: 12px; }
  .summary p { font-size: 11px; }
  .members { margin-top: 20px; }
  .family-train { margin-bottom: 12px; padding-bottom: 10px; }
  .train-caption { gap: 6px; }
  .train-caption small { font-size: 8px; }
  .train-caption strong { font-size: 15px; }
  .train-caption span { display: none; }
  .train-route { height: 85px; gap: 4px; margin-top: 7px; }
  .train-route::before { top: 61px; }
  .train-engine { width: 79px; font-size: 9px; }
  .train-engine > img { width: 76px; height: 65px; }
  .train-car { width: 66px; font-size: 9px; }
  .train-car::before { top: 49px; left: -5px; width: 6px; }
  .train-car__body { width: 63px; height: 51px; }
  .train-car__window { width: 19px; height: 19px; }
  .train-car__window > img, .train-car__window > b { width: 13px; height: 13px; }
  .train-car img, .train-car b { width: 15px; height: 15px; }
  .train-add { width: 64px; padding-top: 5px; font-size: 9px; }
  .train-add b { font-size: 14px; }
  .train-add > small { margin: 4px 0 5px; }
  .members h2 { font-size: 20px; }
  .members > header > span { font-size: 12px; }
  .member-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: auto; gap: 12px; margin-top: 14px; }
  .member-card, .add-card { height: auto; min-height: 232px; }
  /* 行動版卡片四邊保留一致且較充裕的內容留白。 */
  .member-card { padding: 16px; }
  .member-card > header { gap: 6px; padding-bottom: 8px; }
  .avatar { width: 32px; height: 32px; font-size: 14px; }
  .member-card h3 { font-size: 15px; }
  .card-actions { flex-direction: column; gap: 4px; }
  .card-actions button { width: 18px; height: 18px; font-size: 14px; }
  .member-card small, .member-card dt, .member-card footer, .member-card dd { font-size: 12px; }
  .member-card dl { gap: 7px; padding: 10px 0; }
  .tag { padding: 2px 6px; font-size: 10px; }
  .add-card { gap: 8px; font-size: 14px; }
  .add-card img { width: 20px; height: 20px; }
  .add-card small { font-size: 11px; }
  .dialog { inline-size: min(100%, 34rem); min-inline-size: 0; max-inline-size: 100%; }
  .modal-body { inline-size: 100%; }
  .portions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .two-column { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* 全站頁首比例由 PageTitle 統一處理；此頁只保留家庭管理按鈕尺寸。 */
@media (min-width: 1025px) {
  .page { padding-top: 0; }
  .page :deep(.page-title__actions .btn) { padding: 8px 10px; font-size: 13px; }
}

@media (min-width: 1025px) and (max-width: 1279px) {
  .content { padding: 24px 28px 48px; }
  .page :deep(.page-title) { padding: 36px 28px 28px; }
  .summary { gap: 16px; }
  .members { margin-top: 28px; }
  .family-train { margin-bottom: 14px; }
  /* 窄桌機仍維持三欄，因此卡片內容同步縮小，且列高不可裁切頁尾。 */
  .member-grid { grid-auto-rows: minmax(310px, auto); gap: 14px; margin-top: 16px; }
  .member-card { padding: 14px; }
  .member-card > header { gap: 8px; padding-bottom: 8px; }
  .avatar { width: 40px; height: 40px; font-size: 17px; }
  .member-card h3 { font-size: 17px; }
  .member-card small, .member-card dt, .member-card footer, .member-card dd { font-size: 12px; }
  .member-card dl { gap: 7px; padding: 10px 0; }
  .tag { padding: 2px 6px; font-size: 10px; }
  .card-actions { gap: 6px; }
  .card-actions button { width: 20px; height: 20px; font-size: 15px; }
}
</style>
