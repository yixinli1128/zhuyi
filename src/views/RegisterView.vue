<script setup>
// 會員註冊（Figma Desktop - 會員登入 R1 預設、R2 欄位驗證、R3 建立中、R4 註冊成功）
import { reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { checkConfirmPassword, checkEmail, checkNewPassword } from '@/utils/validators'
import AuthLayout from '@/components/auth/AuthLayout.vue'
import AuthCard from '@/components/auth/AuthCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseCheckbox from '@/components/base/BaseCheckbox.vue'

const userStore = useUserStore()

const form = reactive({ email: '', password: '', confirm: '', agree: false })
const errors = reactive({ email: '', password: '', confirm: '', agree: '' })
const status = ref('idle') // idle → loading → success
const welcomeName = ref('')

function validate() {
  errors.email = checkEmail(form.email)
  if (!errors.email && userStore.findAccount(form.email)) {
    errors.email = '此電子信箱已經註冊過，請直接登入或使用其他信箱'
  }
  errors.password = checkNewPassword(form.password)
  errors.confirm = checkConfirmPassword(form.confirm, form.password)
  errors.agree = form.agree ? '' : '請先勾選同意服務條款與隱私權政策'
  return Object.values(errors).every((message) => !message)
}

async function onSubmit() {
  if (!validate()) return

  status.value = 'loading'
  await new Promise((resolve) => setTimeout(resolve, 800)) // 模擬建立中

  const result = userStore.register({ email: form.email, password: form.password })
  if (!result.ok) {
    status.value = 'idle'
    errors.email = '此電子信箱已經註冊過，請直接登入或使用其他信箱'
    return
  }

  // 註冊完直接登入
  userStore.login(result.account, { remember: true })
  welcomeName.value = result.account.name
  status.value = 'success'
}
</script>

<template>
  <AuthLayout>
    <!-- R4 註冊成功 -->
    <AuthCard v-if="status === 'success'" icon="✓" tone="success" title="註冊成功！">
      <p>
        歡迎加入煮意，{{ welcomeName }}<br />
        接下來花 3 分鐘設定家人與冰箱，系統就能為你配餐。
      </p>
      <template #actions>
        <BaseButton to="/family" block>開始設定</BaseButton>
        <RouterLink to="/" class="register__later">稍後再說，直接前往首頁</RouterLink>
      </template>
    </AuthCard>

    <!-- R1～R3 註冊表單 -->
    <AuthCard v-else as="form" title="建立帳號" subtitle="加入煮意，開始為家人安排每一餐。" @submit="onSubmit">
      <div class="register__fields">
        <BaseInput
          v-model="form.email"
          label="電子信箱"
          type="email"
          placeholder="請輸入電子信箱"
          autocomplete="email"
          :error="errors.email"
        />
        <BaseInput
          v-model="form.password"
          label="密碼"
          type="password"
          placeholder="至少 8 碼，需包含英文與數字"
          autocomplete="new-password"
          :error="errors.password"
        />
        <BaseInput
          v-model="form.confirm"
          label="確認密碼"
          type="password"
          placeholder="請再輸入一次密碼"
          autocomplete="new-password"
          :error="errors.confirm"
        />
      </div>

      <div class="register__agree">
        <BaseCheckbox v-model="form.agree">
          我已閱讀並同意 <span class="register__term">服務條款</span> 與
          <span class="register__term">隱私權政策</span>
        </BaseCheckbox>
        <p v-if="errors.agree" class="register__error">{{ errors.agree }}</p>
      </div>

      <BaseButton type="submit" block :class="{ 'is-loading': status === 'loading' }" :aria-busy="status === 'loading'">
        {{ status === 'loading' ? '建立帳號中…' : '建立帳號' }}
      </BaseButton>

      <template #footer>
        已經有帳號？
        <RouterLink to="/login">立即登入</RouterLink>
      </template>
    </AuthCard>
  </AuthLayout>
</template>

<style scoped>
.register__fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.register__agree {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.register__term {
  text-decoration: underline;
}

.register__error {
  font-size: var(--fs-caption-2);
  line-height: normal;
  color: var(--text-danger);
}

.is-loading {
  pointer-events: none;
}

.register__later {
  font-size: var(--fs-body-2);
  line-height: normal;
  color: var(--text-body);
  text-decoration: underline;
}
</style>
