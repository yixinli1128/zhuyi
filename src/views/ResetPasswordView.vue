<script setup>
// 重設密碼（Figma Desktop - 會員登入 F4 設定新密碼、F5 密碼不符規則、F6 連結已失效、F7 重設成功）
// 網址：/reset-password?token=…（token 由忘記密碼頁產生，30 分鐘內有效、只能用一次）
import { reactive, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { checkConfirmPassword, checkNewPassword } from '@/utils/validators'
import AuthLayout from '@/components/auth/AuthLayout.vue'
import AuthCard from '@/components/auth/AuthCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseInput from '@/components/base/BaseInput.vue'

const userStore = useUserStore()
const route = useRoute()

const token = typeof route.query.token === 'string' ? route.query.token : ''
const email = userStore.checkResetToken(token) ?? ''

const form = reactive({ password: '', confirm: '' })
const errors = reactive({ password: '', confirm: '' })
const status = ref(email ? 'idle' : 'expired') // idle → loading → done；或 expired

function validate() {
  errors.password = checkNewPassword(form.password)
  errors.confirm = checkConfirmPassword(form.confirm, form.password)
  return !errors.password && !errors.confirm
}

async function onSubmit() {
  if (!validate()) return

  status.value = 'loading'
  await new Promise((resolve) => setTimeout(resolve, 800)) // 模擬更新中

  const result = userStore.resetPassword(token, form.password)
  status.value = result.ok ? 'done' : 'expired'
}
</script>

<template>
  <AuthLayout>
    <!-- F7 重設成功 -->
    <AuthCard v-if="status === 'done'" icon="✓" tone="success" title="密碼已更新">
      <p>請使用新密碼重新登入。</p>
      <template #actions>
        <BaseButton :to="{ path: '/login', query: { email } }" block>前往登入</BaseButton>
      </template>
    </AuthCard>

    <!-- F6 連結已失效 -->
    <AuthCard v-else-if="status === 'expired'" icon="!" tone="danger" title="重設連結已失效">
      <p>
        這個連結已超過 {{ userStore.RESET_MINUTES }} 分鐘或已經使用過。<br />
        請重新申請一次重設密碼。
      </p>
      <template #actions>
        <BaseButton to="/forgot-password" block>重新寄送重設連結</BaseButton>
      </template>
      <template #footer>
        想起密碼了？
        <RouterLink to="/login">返回登入</RouterLink>
      </template>
    </AuthCard>

    <!-- F4、F5 設定新密碼 -->
    <AuthCard v-else as="form" title="設定新密碼" :subtitle="`請為 ${email} 設定一組新的密碼。`" @submit="onSubmit">
      <div class="reset__fields">
        <BaseInput
          v-model="form.password"
          label="新密碼"
          type="password"
          placeholder="至少 8 碼，需包含英文與數字"
          autocomplete="new-password"
          :error="errors.password"
        />
        <BaseInput
          v-model="form.confirm"
          label="確認新密碼"
          type="password"
          placeholder="請再輸入一次新密碼"
          autocomplete="new-password"
          :error="errors.confirm"
        />
      </div>

      <BaseButton type="submit" block :class="{ 'is-loading': status === 'loading' }" :aria-busy="status === 'loading'">
        {{ status === 'loading' ? '更新中…' : '更新密碼' }}
      </BaseButton>

      <template #footer>
        想起密碼了？
        <RouterLink to="/login">返回登入</RouterLink>
      </template>
    </AuthCard>
  </AuthLayout>
</template>

<style scoped>
.reset__fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.is-loading {
  pointer-events: none;
}
</style>
