<script setup>
// 帳號設定（Figma Desktop - 共用/帳號設定（新）1465:14769、刪除帳號確認（新）1465:15116）
// 個人資料、修改密碼、通知設定、刪除帳號；資料都存在 user store（localStorage）
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'
import { checkConfirmPassword, checkNewPassword } from '@/utils/validators'
import PageTitle from '@/components/layout/PageTitle.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseSwitch from '@/components/base/BaseSwitch.vue'
import BaseDialog from '@/components/base/BaseDialog.vue'

const NAME_MAX = 20
const AVATAR_SIZE = 160 // 頭貼縮成 160px 再存，避免塞爆 localStorage

const userStore = useUserStore()
const toast = useToastStore()
const router = useRouter()

const account = computed(() => userStore.account)

// ---------- 個人資料 ----------
const profile = reactive({
  name: account.value?.name ?? '',
  avatar: account.value?.avatar ?? '',
})
const nameError = ref('')
const avatarInput = ref(null)

// 讀取圖片並縮小成正方形 JPEG
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const side = Math.min(img.width, img.height)
        const canvas = document.createElement('canvas')
        canvas.width = AVATAR_SIZE
        canvas.height = AVATAR_SIZE
        canvas
          .getContext('2d')
          .drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

async function onAvatarChange(event) {
  const file = event.target.files?.[0]
  event.target.value = '' // 同一張圖也能再選一次
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast.show('請選擇圖片檔', { variant: 'error' })
    return
  }
  try {
    profile.avatar = await resizeImage(file)
  } catch {
    toast.show('圖片讀取失敗，請換一張試試', { variant: 'error' })
  }
}

function saveProfile() {
  const name = profile.name.trim()
  nameError.value = !name ? '請輸入暱稱' : name.length > NAME_MAX ? `暱稱最多 ${NAME_MAX} 個字` : ''
  if (nameError.value) return
  userStore.updateAccount({ name, avatar: profile.avatar })
  toast.show('已儲存變更')
}

const providers = [
  { key: 'google', label: 'Google' },
  { key: 'line', label: 'LINE' },
]

// 第三方登入沒有真的串接，按「連結帳號」直接視為連結成功
function linkProvider(provider) {
  userStore.updateAccount({ linked: { ...account.value.linked, [provider.key]: true } })
  toast.show(`已連結 ${provider.label} 帳號`)
}

// ---------- 修改密碼 ----------
const passwords = reactive({ current: '', next: '', confirm: '' })
const passwordErrors = reactive({ current: '', next: '', confirm: '' })

function updatePassword() {
  passwordErrors.current = passwords.current ? '' : '請輸入目前密碼'
  passwordErrors.next = checkNewPassword(passwords.next)
  passwordErrors.confirm = checkConfirmPassword(passwords.confirm, passwords.next)
  if (Object.values(passwordErrors).some(Boolean)) return

  const result = userStore.changePassword(passwords.current, passwords.next)
  if (!result.ok) {
    passwordErrors.current = '目前密碼不正確'
    return
  }
  Object.assign(passwords, { current: '', next: '', confirm: '' })
  toast.show('密碼已更新')
}

// ---------- 通知設定 ----------
const notifications = [
  { key: 'expiry', title: '即期食材提醒', desc: '每天早上 9:00，提醒 3 天內到期的食材' },
  { key: 'dinner', title: '今日晚餐提醒', desc: '下午 4:30 提醒今天的餐單與待買食材' },
  { key: 'shopping', title: '採買清單提醒', desc: '出門採買前，推播尚未勾選的食材' },
  { key: 'newsletter', title: '煮意電子報', desc: '每月當季食材與新功能消息' },
]

function setNotification(key, value) {
  userStore.updateAccount({ notifications: { ...account.value.notifications, [key]: value } })
}

// ---------- 刪除帳號 ----------
const CONFIRM_WORD = '刪除'
const deleteOpen = ref(false)
const deleteInput = ref('')

function openDelete() {
  deleteInput.value = ''
  deleteOpen.value = true
}

function confirmDelete() {
  if (deleteInput.value.trim() !== CONFIRM_WORD) return
  deleteOpen.value = false
  userStore.deleteAccount()
  toast.show('帳號已刪除')
  router.push('/')
}
</script>

<template>
  <section v-if="account" class="page">
    <PageTitle title="帳號設定" description="管理你的個人資料、密碼與通知偏好。" />

    <div class="settings">
      <!-- 個人資料 -->
      <form class="card" novalidate @submit.prevent="saveProfile">
        <div class="card__head">
          <h2 class="card__title">個人資料</h2>
          <p class="card__desc">暱稱會顯示在帳號選單與家庭名冊中。</p>
        </div>

        <div class="profile">
          <div class="profile__avatar">
            <span class="profile__avatar-img">
              <img v-if="profile.avatar" :src="profile.avatar" alt="目前的頭貼" />
            </span>
            <button type="button" class="card__link" @click="avatarInput.click()">更換頭貼</button>
            <input ref="avatarInput" type="file" accept="image/*" hidden @change="onAvatarChange" />
          </div>

          <div class="profile__fields">
            <BaseInput v-model="profile.name" label="暱稱" placeholder="請輸入暱稱" autocomplete="nickname" :error="nameError" />

            <div class="info">
              <p class="info__label">電子信箱</p>
              <div class="info__value">
                <span class="info__email">{{ account.email }}</span>
                <span v-if="account.verified" class="chip">已驗證</span>
              </div>
            </div>

            <div class="info">
              <p class="info__label">第三方登入</p>
              <div class="info__value info__value--linked">
                <template v-for="provider in providers" :key="provider.key">
                  <span v-if="account.linked[provider.key]">{{ provider.label }}：已連結</span>
                  <button v-else type="button" class="info__connect" @click="linkProvider(provider)">
                    {{ provider.label }}：連結帳號
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <div class="card__actions">
          <BaseButton type="submit">儲存變更</BaseButton>
        </div>
      </form>

      <!-- 修改密碼 -->
      <form class="card" novalidate @submit.prevent="updatePassword">
        <div class="card__head">
          <h2 class="card__title">修改密碼</h2>
          <p class="card__desc">至少 8 碼，需包含英文與數字。</p>
        </div>

        <div class="password__fields">
          <BaseInput
            v-model="passwords.current"
            label="目前密碼"
            type="password"
            placeholder="請輸入目前密碼"
            autocomplete="current-password"
            :error="passwordErrors.current"
          />
          <BaseInput
            v-model="passwords.next"
            label="新密碼"
            type="password"
            placeholder="請輸入新密碼"
            autocomplete="new-password"
            :error="passwordErrors.next"
          />
          <BaseInput
            v-model="passwords.confirm"
            label="確認新密碼"
            type="password"
            placeholder="再輸入一次新密碼"
            autocomplete="new-password"
            :error="passwordErrors.confirm"
          />
        </div>

        <div class="card__actions">
          <BaseButton type="submit">更新密碼</BaseButton>
        </div>
      </form>

      <!-- 通知設定（帳號選單「通知設定」會捲到這裡） -->
      <div id="notifications" class="card card--list">
        <div class="card__head">
          <h2 class="card__title">通知設定</h2>
          <p class="card__desc">選擇你想收到的提醒，可隨時更改。</p>
        </div>

        <ul class="notify">
          <li v-for="item in notifications" :key="item.key" class="notify__item">
            <div class="notify__text">
              <p class="notify__title">{{ item.title }}</p>
              <p class="notify__desc">{{ item.desc }}</p>
            </div>
            <BaseSwitch
              :model-value="account.notifications[item.key]"
              :label="item.title"
              @update:model-value="setNotification(item.key, $event)"
            />
          </li>
        </ul>
      </div>

      <!-- 刪除帳號 -->
      <div class="card card--danger">
        <div class="card__head">
          <h2 class="card__title">刪除帳號</h2>
          <p class="card__desc">刪除後，家庭成員、冰箱庫存與餐食日誌都會永久移除，無法復原。</p>
        </div>
        <div>
          <BaseButton variant="secondary" @click="openDelete">刪除帳號</BaseButton>
        </div>
      </div>
    </div>

    <BaseDialog v-model:open="deleteOpen" title="確定要刪除帳號嗎？" description="這個動作無法復原，請確認後再繼續。" :width="520">
      <div class="will-delete">
        <p class="will-delete__title">以下資料將被永久刪除：</p>
        <p>・家庭成員與飲食設定</p>
        <p>・冰箱庫存食材</p>
        <p>・餐食日誌與歷史紀錄</p>
      </div>
      <BaseInput v-model="deleteInput" :label="`請輸入「${CONFIRM_WORD}」以確認`" :placeholder="CONFIRM_WORD" />

      <template #footer>
        <BaseButton variant="secondary" @click="deleteOpen = false">取消</BaseButton>
        <BaseButton variant="danger" :disabled="deleteInput.trim() !== CONFIRM_WORD" @click="confirmDelete">
          永久刪除
        </BaseButton>
      </template>
    </BaseDialog>
  </section>
</template>

<style scoped>
.page {
  padding: var(--page-padding-y) var(--page-padding-x);
}

.settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-24);
  padding: var(--space-24) 0 var(--space-60);
}

/* ---------- 卡片（Figma card/個人資料 等） ---------- */
.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
  padding: var(--space-24) var(--space-20);
  background: var(--bg-surface);
  border: 1px solid var(--brand-primary-border);
  border-radius: 12px 0;
  scroll-margin-top: calc(var(--mobile-header-height) + var(--space-16));
}

.card--list {
  gap: 0;
}

.card--danger {
  border-color: var(--status-error);
}

.card__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  line-height: normal;
}

.card--list .card__head {
  padding-bottom: var(--space-20);
}

.card__title {
  font-size: var(--fs-subtitle-2);
  font-weight: 700;
  color: var(--text-title);
}

.card--danger .card__title {
  color: var(--text-danger);
}

.card__desc {
  font-size: 13px;
  color: var(--text-secondary);
}

.card__actions {
  display: flex;
  justify-content: flex-end;
}

.card__link {
  font-size: 13px;
  line-height: normal;
  color: var(--text-body);
  text-decoration: underline;
}

/* ---------- 個人資料 ---------- */
.profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-24);
}

.profile__avatar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-8);
}

.profile__avatar-img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--brand-secondary);
}

.profile__avatar-img img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile__fields {
  flex: 1;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  line-height: normal;
}

.info__label {
  font-size: var(--fs-body-2);
  color: var(--text-title);
}

.info__value {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  font-size: var(--fs-body-2);
  color: var(--text-body);
}

.info__value--linked {
  gap: var(--space-16);
}

.info__email {
  font-size: 15px;
  word-break: break-all;
}

.chip {
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--status-success-subtle);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-success);
}

.info__connect {
  font-size: inherit;
  line-height: inherit;
  color: var(--text-special);
  text-decoration: underline;
}

/* ---------- 修改密碼 ---------- */
.password__fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

/* ---------- 通知設定 ---------- */
.notify {
  list-style: none;
  padding: 0;
}

.notify__item {
  display: flex;
  align-items: center;
  gap: var(--space-16);
  padding: var(--space-16) 0;
  border-top: 1px solid var(--brand-secondary);
}

.notify__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: normal;
}

.notify__title {
  font-size: 15px;
  color: var(--text-title);
}

.notify__desc {
  font-size: 13px;
  color: var(--text-secondary);
}

/* ---------- 刪除帳號彈窗 ---------- */
.will-delete {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px var(--space-16);
  border-radius: 10px;
  background: var(--status-error-subtle);
  font-size: 13px;
  line-height: normal;
  color: var(--text-body);
}

.will-delete__title {
  font-weight: 700;
  color: var(--text-danger);
}

/* ---------- 平板以上 ---------- */
@media (min-width: 768px) {
  .card {
    padding: var(--space-28) 32px;
  }

  .profile {
    flex-direction: row;
    align-items: flex-start;
    gap: 32px;
  }

  .password__fields {
    flex-direction: row;
  }

  .password__fields > * {
    flex: 1;
    min-width: 0;
  }
}

/* ---------- 桌機：跟 PageTitle 一樣左右留 40px ---------- */
@media (min-width: 1024px) {
  .page {
    padding-top: 0;
  }

  .settings {
    padding: var(--space-24) var(--space-40) var(--space-60);
  }

  .card {
    scroll-margin-top: var(--space-24);
  }
}
</style>
