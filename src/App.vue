<script setup>
import { computed, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useUserStore } from './stores/user'
import { useFamilyStore } from './stores/family'
import { useHouseholdStore } from './stores/household'
import { useToastStore } from './stores/toast'
import AppNavbar from './components/layout/AppNavbar.vue'
import AppFooter from './components/layout/AppFooter.vue'
import AppToast from './components/layout/AppToast.vue'
import FloatingBackdrop from './components/layout/FloatingBackdrop.vue'
import IntroSplash from './components/layout/IntroSplash.vue'
import BaseDialog from './components/base/BaseDialog.vue'
import BaseButton from './components/base/BaseButton.vue'
import OnboardingTour from './components/onboarding/OnboardingTour.vue'

const route = useRoute()
// 登入、註冊等頁面：桌機不顯示左側 navbar，內容滿版
const isAuthLayout = computed(() => route.meta.layout === 'auth')

// 登入後帳號本人自動成為家庭成員；帳號設定改名字或頭像、或加入別的家庭時一起同步
const userStore = useUserStore()
const householdStore = useHouseholdStore()
const familyStore = useFamilyStore()
const toast = useToastStore()
watch(() => [userStore.user, householdStore.householdId], ([profile]) => {
  if (profile) familyStore.ensureOwner(profile)
}, { immediate: true, deep: true })

// 第一次登入：提示補上本人的飲食偏好；「現在設定」直接打開家庭管理的本人編輯視窗
const router = useRouter()
const ownerSetup = computed(() => {
  const email = userStore.user?.email?.toLowerCase()
  return email ? familyStore.activeMembers.find((member) => member.ownerEmail === email && member.ownerSetupPending) ?? null : null
})
const ownerSetupOpen = computed({
  get: () => Boolean(ownerSetup.value) && !isAuthLayout.value,
  set: (value) => { if (!value) skipOwnerSetup() },
})
function skipOwnerSetup() {
  if (ownerSetup.value) familyStore.dismissOwnerSetup(ownerSetup.value.id)
}
// 有別的帳號邀請自己加入家庭：登入後跳出邀請（按「稍後」這次登入期間不再跳出，家庭管理頁仍看得到）
const snoozedInvites = ref(new Set())
const pendingInvite = computed(() => householdStore.receivedInvites.find((invite) => !snoozedInvites.value.has(invite.id)) ?? null)
const inviteOpen = computed({
  get: () => Boolean(pendingInvite.value) && !isAuthLayout.value && !ownerSetup.value && route.path !== '/family',
  set: (value) => { if (!value) snoozeInvite() },
})
function inviterName(invite) {
  return userStore.findAccount(invite.invitedBy)?.name ?? invite.invitedBy
}
function snoozeInvite() {
  if (pendingInvite.value) snoozedInvites.value = new Set([...snoozedInvites.value, pendingInvite.value.id])
}
function declineInvite() {
  if (pendingInvite.value) householdStore.declineInvite(pendingInvite.value.id)
}
function acceptInvite() {
  const invite = pendingInvite.value
  if (!invite) return
  const result = householdStore.acceptInvite(invite.id)
  if (result.error) toast.show(result.error, { variant: 'error' })
  else {
    toast.show(`已加入「${result.household.name}」`)
    router.push('/family')
  }
}

function startOwnerSetup() {
  const id = ownerSetup.value?.id
  if (!id) return
  familyStore.dismissOwnerSetup(id)
  router.push({ path: '/family', query: { edit: id } })
}
</script>

<template>
  <div class="app-layout">
    <FloatingBackdrop />
    <div class="app-body">
      <AppNavbar :hide-sidebar="isAuthLayout" />
      <main class="app-main" :class="{ 'is-full': isAuthLayout }">
        <RouterView />
      </main>
    </div>
    <AppFooter :class="{ 'is-mobile-hidden': !isAuthLayout }" />
    <AppToast />
    <IntroSplash />
    <BaseDialog
      v-model:open="ownerSetupOpen"
      title="已幫你建立本人的家庭卡片"
      description="花 30 秒補上你的份量、辣度、過敏與忌口，之後配餐會更準。"
    >
      <template #footer>
        <BaseButton variant="secondary" @click="skipOwnerSetup">稍後</BaseButton>
        <BaseButton @click="startOwnerSetup">現在設定</BaseButton>
      </template>
    </BaseDialog>
    <BaseDialog
      v-model:open="inviteOpen"
      :title="`${pendingInvite ? inviterName(pendingInvite) : ''} 邀請你加入「${pendingInvite?.household.name ?? ''}」`"
      description="加入後，你會和他們共用同一份家庭成員、冰箱庫存與餐食日誌。你目前家庭的資料會留在原本的家。"
    >
      <template #footer>
        <BaseButton variant="secondary" @click="declineInvite">婉拒</BaseButton>
        <BaseButton @click="acceptInvite">加入家庭</BaseButton>
      </template>
    </BaseDialog>
    <OnboardingTour :blocked="ownerSetupOpen || inviteOpen" />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1;
  min-width: 0;
}

/* 桌機 Figma grid：1920px = 240px 導覽 / 1440px 主要內容 / 240px 留白。 */
@media (min-width: 1025px) {
  .app-body {
    display: grid;
    /* 保留 Figma 的三欄構圖，同時避免 1025–1439px 時側欄被壓得太窄。 */
    grid-template-columns: clamp(180px, 12.5vw, 240px) minmax(0, 1fr) clamp(40px, 12.5vw, 180px);
  }

  .app-main {
    grid-column: 2;
    width: auto;
  }

  /* 會員頁沒有左側導覽，內容橫跨三欄滿版（1025–1919px 也要，否則登入頁插畫會被擠小） */
  .app-main.is-full {
    grid-column: 1 / -1;
  }
}

/* 只有手機有固定底部導覽，需要為它保留內容安全距離。 */
@media (max-width: 640px) {
  .app-main {
    padding-bottom: calc(64px + env(safe-area-inset-bottom));
  }

  /* 手機版只有會員登入相關頁面保留 footer。 */
  .is-mobile-hidden {
    display: none;
  }

  /* 會員頁沒有左側導覽，內容橫跨三欄滿版 */
  .app-main.is-full {
    grid-column: 1 / -1;
    width: auto;
  }
}

/* 1920px 設計稿以像素鎖定三欄；超出畫布的空間平均保留在兩側。 */
@media (min-width: 1920px) {
  .app-body {
    grid-template-columns: minmax(240px, 1fr) 1440px minmax(240px, 1fr);
  }

  .app-main:not(.is-full) {
    width: 1440px;
  }
  .app-main.is-full {
    grid-column: 1 / -1;
    width: auto;
    padding-right: 0;
  }
}
</style>
