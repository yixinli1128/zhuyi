<script setup>
// 忘記密碼（Figma Desktop - 會員登入 F1 輸入信箱、F2 信箱格式不正確、F3 已寄出重設信）
// 沒有後端寄信：F3 下方多一個「展示用」連結，模擬點開信中的重設連結
import { computed, onBeforeUnmount, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { checkEmail } from '@/utils/validators'
import AuthLayout from '@/components/auth/AuthLayout.vue'
import AuthCard from '@/components/auth/AuthCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseInput from '@/components/base/BaseInput.vue'

const RESEND_SECONDS = 60

const userStore = useUserStore()
const route = useRoute()

// 從登入頁或「連結已失效」帶過來的信箱會自動填好
const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const error = ref('')
const status = ref('idle') // idle → loading → sent
const token = ref(null) // 信箱有註冊才會有
const resendIn = ref(0)

let timer = null

const loginLink = computed(() => ({ path: '/login', query: { email: email.value.trim() } }))

function startResendCountdown() {
  clearInterval(timer)
  resendIn.value = RESEND_SECONDS
  timer = setInterval(() => {
    resendIn.value -= 1
    if (resendIn.value <= 0) clearInterval(timer)
  }, 1000)
}

function sendResetMail() {
  token.value = userStore.requestPasswordReset(email.value)
  startResendCountdown()
}

async function onSubmit() {
  error.value = checkEmail(email.value)
  if (error.value) return

  status.value = 'loading'
  await new Promise((resolve) => setTimeout(resolve, 800)) // 模擬寄信
  sendResetMail()
  status.value = 'sent'
}

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <AuthLayout>
    <!-- F3 已寄出重設信 -->
    <AuthCard v-if="status === 'sent'" icon="fa-regular fa-envelope" title="請查看你的信箱">
      <p>
        若 {{ email.trim() }} 已註冊，<br />
        你將在幾分鐘內收到重設密碼的信件，連結 {{ userStore.RESET_MINUTES }} 分鐘內有效。
      </p>
      <template #actions>
        <BaseButton :to="loginLink" block>返回登入</BaseButton>
      </template>
      <template #footer>
        <span>沒收到信？請檢查垃圾郵件，或</span>
        <span v-if="resendIn > 0" class="forgot__wait">{{ resendIn }} 秒後重新寄送</span>
        <button v-else type="button" class="forgot__resend" @click="sendResetMail">重新寄送</button>
      </template>
    </AuthCard>

    <!-- F1、F2 輸入信箱 -->
    <AuthCard
      v-else
      as="form"
      title="忘記密碼"
      subtitle="請輸入註冊時使用的電子信箱，我們會寄送重設密碼連結給你。"
      @submit="onSubmit"
    >
      <BaseInput
        v-model="email"
        label="電子信箱"
        type="email"
        placeholder="請輸入電子信箱"
        autocomplete="email"
        :error="error"
      />

      <BaseButton type="submit" block :class="{ 'is-loading': status === 'loading' }" :aria-busy="status === 'loading'">
        {{ status === 'loading' ? '送出中…' : '送出' }}
      </BaseButton>

      <template #footer>
        想起密碼了？
        <RouterLink to="/login">返回登入</RouterLink>
      </template>
    </AuthCard>

    <!-- 展示用：沒有真的寄信，直接打開信中的重設連結 -->
    <p v-if="status === 'sent' && token" class="forgot__demo">
      展示用：
      <RouterLink :to="{ path: '/reset-password', query: { token } }">開啟信中的重設連結</RouterLink>
    </p>
  </AuthLayout>
</template>

<style scoped>
.forgot__wait {
  color: var(--text-placeholder);
}

.forgot__resend {
  font-size: inherit;
  line-height: inherit;
  font-weight: 700;
  color: var(--text-body);
  text-decoration: underline;
}

.is-loading {
  pointer-events: none;
}

.forgot__demo {
  margin-top: var(--space-16);
  font-size: var(--fs-caption-2);
  line-height: normal;
  text-align: center;
  color: var(--text-placeholder);
}

.forgot__demo a {
  text-decoration: underline;
}
</style>
