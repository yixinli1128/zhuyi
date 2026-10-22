<script setup>
// 家庭管理頁的「共用家庭」：顯示目前家庭與共用帳號，開啟視窗可用 email 或邀請碼邀請、加入其他家庭、
// 離開或移除帳號。模擬版沒有後端與寄信，被邀請的帳號在同一個瀏覽器登入後就會看到邀請。
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useHouseholdStore } from '@/stores/household'
import { useToastStore } from '@/stores/toast'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseDialog from '@/components/base/BaseDialog.vue'
import BaseInput from '@/components/base/BaseInput.vue'

const userStore = useUserStore()
const householdStore = useHouseholdStore()
const toast = useToastStore()
const route = useRoute()

const open = ref(false)
const household = computed(() => householdStore.current)
const accounts = computed(() => householdStore.accounts)
const isOwner = computed(() => householdStore.isOwner)
const form = reactive({ name: '', email: '', code: '' })
const errors = reactive({ name: '', email: '', code: '' })
// 需要再確認一次的操作：{ type: 'join' | 'leave' | 'remove', household?, email?, name? }
const confirming = ref(null)

watch(open, (value) => {
  if (!value) return
  Object.assign(form, { name: household.value?.name ?? '', email: '', code: '' })
  Object.assign(errors, { name: '', email: '', code: '' })
  confirming.value = null
})

function displayName(email) {
  return userStore.findAccount(email)?.name ?? email
}

function saveName() {
  const result = householdStore.renameHousehold(form.name)
  errors.name = result.error ?? ''
  if (!result.error) toast.show('已更新家庭名稱')
}

function sendInvite() {
  const result = householdStore.inviteByEmail(form.email)
  errors.email = result.error ?? ''
  if (result.error) return
  form.email = ''
  toast.show(result.hasAccount ? `已邀請 ${result.invite.email}，對方登入後就會看到邀請` : `已邀請 ${result.invite.email}，對方用這個信箱註冊後就會看到邀請`)
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(household.value.inviteCode)
    toast.show('已複製邀請碼')
  } catch {
    toast.show(`邀請碼：${household.value.inviteCode}`)
  }
}

function regenerateCode() {
  householdStore.regenerateCode()
  toast.show('已產生新的邀請碼，舊的邀請碼不能再使用')
}

function checkCode() {
  const target = householdStore.previewCode(form.code)
  if (!target) { errors.code = '找不到這組邀請碼，請確認後再試一次。'; return }
  if (target.id === household.value?.id) { errors.code = '這是你目前家庭的邀請碼。'; return }
  errors.code = ''
  confirming.value = { type: 'join', household: target }
}

function confirmAction() {
  const action = confirming.value
  if (!action) return
  if (action.type === 'join') {
    const result = householdStore.joinByCode(form.code)
    if (result.error) { errors.code = result.error; confirming.value = null; return }
    toast.show(`已加入「${result.household.name}」`)
    open.value = false
  } else if (action.type === 'leave') {
    householdStore.leaveHousehold()
    toast.show('已離開家庭，現在使用你自己的家')
    open.value = false
  } else if (action.type === 'remove') {
    householdStore.removeAccount(action.email)
    toast.show(`已將 ${action.name} 移出家庭`)
    confirming.value = null
  }
}

const confirmText = computed(() => {
  const action = confirming.value
  if (!action) return null
  if (action.type === 'join') {
    return {
      title: `要加入「${action.household.name}」嗎？`,
      body: `加入後會看到「${action.household.name}」的家庭成員、冰箱庫存與餐食日誌，你的本人卡片也會加進他們的名冊。${accounts.value.length > 1 ? '你會離開目前的家庭，' : ''}目前家庭的資料會留在原本的家。`,
      action: '加入家庭',
    }
  }
  if (action.type === 'leave') {
    return {
      title: `要離開「${household.value?.name}」嗎？`,
      body: '離開後就看不到這個家庭的成員、冰箱與餐單，你會回到自己的家（沒有的話會建立一個新的空白家庭）。',
      action: '離開家庭',
    }
  }
  return {
    title: `要將 ${action.name} 移出家庭嗎？`,
    body: '對方將看不到這個家庭的資料，他的本人卡片也會從家庭名冊移除。',
    action: '移出家庭',
  }
})

const memberSummary = computed(() => {
  if (!household.value) return ''
  return accounts.value.length > 1 ? `${accounts.value.length} 個帳號共用` : '目前只有你，邀請家人一起管理'
})

// 收到的邀請（家庭管理頁直接顯示，不另外跳窗）
const received = computed(() => householdStore.receivedInvites)
function acceptInvite(invite) {
  const result = householdStore.acceptInvite(invite.id)
  if (result.error) toast.show(result.error, { variant: 'error' })
  else toast.show(`已加入「${result.household.name}」`)
}
</script>

<template>
  <section class="share" aria-label="共用家庭">
    <article v-for="invite in received" :key="invite.id" class="invite-banner" role="status">
      <i class="fa-regular fa-envelope-open" aria-hidden="true"></i>
      <p><b>{{ displayName(invite.invitedBy) }}</b> 邀請你加入「{{ invite.household.name }}」，加入後共用家庭成員、冰箱與餐單。</p>
      <div class="invite-banner__actions">
        <BaseButton variant="secondary" size="sm" @click="householdStore.declineInvite(invite.id)">婉拒</BaseButton>
        <BaseButton size="sm" @click="acceptInvite(invite)">加入</BaseButton>
      </div>
    </article>

    <div class="share-bar">
      <template v-if="household">
        <div class="share-bar__avatars" aria-hidden="true">
          <span v-for="account in accounts.slice(0, 4)" :key="account.email" class="mini-avatar">
            <img v-if="account.avatar" :src="account.avatar" alt="" /><template v-else>{{ account.name.slice(0, 1) }}</template>
          </span>
        </div>
        <div class="share-bar__text">
          <strong>{{ household.name }}</strong>
          <span>{{ memberSummary }}</span>
        </div>
        <BaseButton variant="secondary" size="sm" icon="fa-solid fa-user-plus" @click="open = true">共用家庭</BaseButton>
      </template>
      <template v-else>
        <div class="share-bar__text">
          <strong>和家人共用</strong>
          <span>登入後可以邀請家人的帳號，一起管理成員、冰箱和餐單</span>
        </div>
        <BaseButton variant="secondary" size="sm" :to="{ path: '/login', query: { redirect: route.fullPath } }">登入</BaseButton>
      </template>
    </div>

    <BaseDialog v-model:open="open" title="共用家庭" description="同一個家庭的帳號會看到同一份家庭成員、冰箱庫存與餐食日誌。" :width="520">
      <div v-if="confirming" class="confirm">
        <h3>{{ confirmText.title }}</h3>
        <p>{{ confirmText.body }}</p>
        <div class="confirm__actions">
          <BaseButton variant="secondary" @click="confirming = null">取消</BaseButton>
          <BaseButton :variant="confirming.type === 'join' ? 'primary' : 'danger'" @click="confirmAction">{{ confirmText.action }}</BaseButton>
        </div>
      </div>

      <div v-else-if="household" class="panel">
        <form v-if="isOwner" class="row" novalidate @submit.prevent="saveName">
          <BaseInput v-model="form.name" label="家庭名稱" :maxlength="20" :error="errors.name" />
          <BaseButton type="submit" variant="secondary" :disabled="form.name.trim() === household.name">儲存</BaseButton>
        </form>
        <div v-else class="info">
          <span class="label">家庭名稱</span>
          <strong>{{ household.name }}</strong>
        </div>

        <div class="block">
          <span class="label">共用帳號（{{ accounts.length }}）</span>
          <ul class="accounts">
            <li v-for="account in accounts" :key="account.email">
              <span class="mini-avatar"><img v-if="account.avatar" :src="account.avatar" alt="" /><template v-else>{{ account.name.slice(0, 1) }}</template></span>
              <div class="accounts__who">
                <b>{{ account.name }}<small v-if="account.isMe">（你）</small></b>
                <span>{{ account.email }}</span>
              </div>
              <span v-if="account.isOwner" class="role">擁有者</span>
              <button v-else-if="isOwner" type="button" class="link-danger" @click="confirming = { type: 'remove', email: account.email, name: account.name }">移出</button>
            </li>
          </ul>
        </div>

        <form class="block" novalidate @submit.prevent="sendInvite">
          <div class="row">
            <BaseInput v-model="form.email" type="email" label="用電子信箱邀請" placeholder="家人的電子信箱" autocomplete="off" :error="errors.email" />
            <BaseButton type="submit">邀請</BaseButton>
          </div>
          <ul v-if="householdStore.sentInvites.length" class="pending">
            <li v-for="invite in householdStore.sentInvites" :key="invite.id">
              <span>{{ invite.email }}</span><small>等待回覆</small>
              <button type="button" class="link" @click="householdStore.cancelInvite(invite.id)">取消邀請</button>
            </li>
          </ul>
        </form>

        <div class="block">
          <span class="label">或把邀請碼給家人</span>
          <div class="code">
            <strong>{{ household.inviteCode }}</strong>
            <button type="button" class="link" @click="copyCode"><i class="fa-regular fa-copy" aria-hidden="true"></i> 複製</button>
            <button v-if="isOwner" type="button" class="link" @click="regenerateCode"><i class="fa-solid fa-rotate" aria-hidden="true"></i> 重新產生</button>
          </div>
          <p class="hint">家人登入後，在家庭管理的「共用家庭」輸入這組邀請碼即可加入。</p>
        </div>

        <form class="block block--divider" novalidate @submit.prevent="checkCode">
          <div class="row">
            <BaseInput v-model="form.code" label="加入其他家庭" placeholder="輸入 6 碼邀請碼" :maxlength="6" autocomplete="off" :error="errors.code" />
            <BaseButton type="submit" variant="secondary">加入</BaseButton>
          </div>
        </form>

        <button v-if="accounts.length > 1" type="button" class="link-danger leave" @click="confirming = { type: 'leave' }">離開這個家庭</button>
      </div>
    </BaseDialog>
  </section>
</template>

<style scoped>
.share { display: grid; gap: 12px; margin-bottom: 20px; }
.share-bar, .invite-banner { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 1px solid var(--brand-secondary); border-radius: 12px 0 12px; background: #fff; }
.share-bar__avatars { display: flex; }
.share-bar__avatars .mini-avatar + .mini-avatar { margin-left: -8px; }
.share-bar__text { display: grid; flex: 1; min-width: 0; gap: 2px; }
.share-bar__text strong { color: var(--text-title); font-size: 16px; font-weight: 400; }
.share-bar__text span { color: var(--text-secondary); font-size: 14px; }
.invite-banner { border-color: var(--brand-special); background: #f4f7fb; color: var(--text-body); font-size: 14px; }
.invite-banner > i { color: var(--text-special); font-size: 18px; }
.invite-banner p { flex: 1; min-width: 0; }
.invite-banner__actions { display: flex; flex: 0 0 auto; gap: 6px; }
.mini-avatar { display: grid; flex: 0 0 auto; width: 32px; height: 32px; place-items: center; overflow: hidden; border: 2px solid #fff; border-radius: 50%; background: var(--brand-secondary); color: var(--text-body); font-size: 14px; }
.mini-avatar img { width: 100%; height: 100%; object-fit: cover; }

.panel { display: grid; gap: 18px; }
.row { display: flex; align-items: flex-start; gap: 8px; }
.row > :deep(.field) { flex: 1; }
.row > .btn { flex: 0 0 auto; margin-top: 22px; }
.label { display: block; margin-bottom: 6px; color: var(--text-body); font-size: var(--fs-body-1); }
.info strong { color: var(--text-title); font-size: 16px; font-weight: 400; }
.block--divider { padding-top: 16px; border-top: 1px solid var(--brand-secondary); }
.accounts, .pending { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.accounts li { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; background: var(--brand-secondary-light); }
.accounts__who { display: grid; flex: 1; min-width: 0; }
.accounts__who b { color: var(--text-title); font-size: 14px; font-weight: 400; }
.accounts__who small { color: var(--text-secondary); font-size: 14px; }
.accounts__who span { overflow: hidden; color: var(--text-secondary); font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.role { padding: 2px 8px; border-radius: 999px; background: var(--brand-primary); color: var(--text-on-primary); font-size: 14px; }
.pending { margin-top: 8px; }
.pending li { display: flex; align-items: center; gap: 8px; color: var(--text-body); font-size: 14px; }
.pending small { color: var(--text-placeholder); font-size: 14px; }
.pending .link { margin-left: auto; }
.code { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }
.code strong { padding: 6px 14px; border: 1px dashed var(--brand-primary-border); border-radius: 10px; color: var(--text-title); font-size: 22px; font-weight: 400; letter-spacing: .18em; }
.hint { margin-top: 6px; color: var(--text-secondary); font-size: 14px; }
.link, .link-danger { color: var(--brand-primary); font-size: 14px; text-decoration: underline; text-underline-offset: 3px; }
.link-danger { color: var(--text-danger); }
.leave { justify-self: start; }
.confirm h3 { color: var(--text-title); font-size: 18px; font-weight: 400; }
.confirm p { margin-top: 8px; color: var(--text-body); font-size: 14px; line-height: 1.6; }
.confirm__actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }

@media (max-width: 640px) {
  .share { margin-bottom: 14px; }
  .share-bar, .invite-banner { padding: 10px 12px; }
  .share-bar__avatars { display: none; }
  .share-bar__text strong { font-size: 14px; }
  .share-bar__text span { font-size: 14px; }
  .invite-banner { flex-wrap: wrap; font-size: 14px; }
  .invite-banner__actions { width: 100%; justify-content: flex-end; }
  .code strong { font-size: 18px; }
}
</style>
