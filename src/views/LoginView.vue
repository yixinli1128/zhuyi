<script setup>
// 會員登入（Figma Desktop - 會員登入 01～04、E1～E7）
// 假登入：帳號存在 Pinia user store（localStorage），示範帳號 oliver@example.com ／ zhuyi1234
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'
import { checkEmail } from '@/utils/validators'
import AuthLayout from '@/components/auth/AuthLayout.vue'
import AuthCard from '@/components/auth/AuthCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseCheckbox from '@/components/base/BaseCheckbox.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'

const REDIRECT_SECONDS = 3

const userStore = useUserStore()
const toast = useToastStore()
const route = useRoute()
const router = useRouter()

// 從忘記密碼、註冊頁帶回來的信箱會自動填好
const form = reactive({
  email: typeof route.query.email === 'string' ? route.query.email : '',
  password: '',
  remember: false,
})
const errors = reactive({ email: '', password: '' })
const alert = ref(null) // { variant, title, message, link?: { to, label } }
const status = ref('idle') // idle → loading → success
const countdown = ref(REDIRECT_SECONDS)
const welcomeName = ref('')

let timer = null

const redirectTo = computed(() => (typeof route.query.redirect === 'string' ? route.query.redirect : '/'))

function validate() {
  errors.email = checkEmail(form.email)
  errors.password = form.password ? '' : '請輸入密碼'
  return !errors.email && !errors.password
}

function failureAlert(result) {
  if (result.reason === 'not-found') {
    return {
      variant: 'error',
      title: '找不到這個帳號',
      message: '請確認信箱是否輸入正確，或建立一個新帳號。',
      link: { to: '/register', label: '立即註冊 →' },
    }
  }
  if (result.reason === 'locked') {
    const minutes = Math.max(1, Math.ceil((result.lockedUntil - Date.now()) / 60000))
    return {
      variant: 'info',
      title: '登入失敗次數過多，帳號已暫時鎖定',
      message: `為保護你的帳號安全，請於 ${minutes} 分鐘後再試，或透過「忘記密碼」重設密碼。`,
      link: { to: '/forgot-password', label: '重設密碼 →' },
    }
  }
  return {
    variant: 'error',
    title: '電子信箱或密碼錯誤',
    message: `請確認後再試一次，你還有 ${result.remaining} 次嘗試機會。`,
  }
}

function startRedirect() {
  countdown.value = REDIRECT_SECONDS
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearInterval(timer)
      router.push(redirectTo.value)
    }
  }, 1000)
}

function finishLogin(account) {
  userStore.login(account, { remember: form.remember })
  welcomeName.value = account.name
  status.value = 'success'
  startRedirect()
}

// E6：沒有網路時顯示提示條，可以按「重試」
function isOffline() {
  if (navigator.onLine) return false
  toast.show('連線逾時，請檢查網路後再試一次', {
    variant: 'error',
    duration: 6000,
    action: { label: '重試', onClick: onSubmit },
  })
  return true
}

async function onSubmit() {
  alert.value = null
  if (!validate() || isOffline()) return

  status.value = 'loading'
  await new Promise((resolve) => setTimeout(resolve, 800)) // 模擬驗證中

  const result = userStore.authenticate(form.email, form.password)
  if (result.ok) {
    finishLogin(result.account)
  } else {
    status.value = 'idle'
    alert.value = failureAlert(result)
  }
}

// Google／LINE 沒有真的串接，先用示範帳號登入
// E7 第三方授權失敗：離線時顯示
function onSocialLogin(provider) {
  alert.value = null
  if (!navigator.onLine) {
    alert.value = {
      variant: 'error',
      title: `無法使用 ${provider} 帳號登入`,
      message: '授權已取消或逾時。請再試一次，或改用電子信箱與密碼登入。',
    }
    return
  }
  finishLogin(userStore.accounts[0])
}

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <AuthLayout>
    <!-- 04 登入成功 -->
    <AuthCard v-if="status === 'success'" icon="✓" tone="success" title="登入成功！">
      <p>
        歡迎回來，{{ welcomeName }}<br />
        正在為你前往首頁…
      </p>
      <div class="success__progress" role="progressbar" aria-label="即將跳轉">
        <span class="success__bar" :style="{ animationDuration: `${REDIRECT_SECONDS}s` }"></span>
      </div>
      <p class="success__hint">{{ countdown }} 秒後自動跳轉</p>
    </AuthCard>

    <!-- 01～03 登入表單、E1～E7 錯誤 -->
    <AuthCard v-else as="form" title="會員登入" subtitle="歡迎回來！請輸入你的電子信箱與密碼。" @submit="onSubmit">
      <BaseAlert v-if="alert" :variant="alert.variant" :title="alert.title" :message="alert.message">
        <RouterLink v-if="alert.link" :to="alert.link.to">{{ alert.link.label }}</RouterLink>
      </BaseAlert>

      <div class="login__fields">
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
          placeholder="請輸入密碼"
          autocomplete="current-password"
          :error="errors.password"
        />
      </div>

      <div class="login__options">
        <BaseCheckbox v-model="form.remember">記住我</BaseCheckbox>
        <RouterLink :to="{ path: '/forgot-password', query: form.email ? { email: form.email } : {} }" class="login__link">
          忘記密碼？
        </RouterLink>
      </div>

      <BaseButton type="submit" block :class="{ 'is-loading': status === 'loading' }" :aria-busy="status === 'loading'">
        {{ status === 'loading' ? '登入中…' : '登入' }}
      </BaseButton>

      <div class="login__divider"><span>或</span></div>

      <div class="login__social">
        <BaseButton variant="outline" block icon="fa-brands fa-google" @click="onSocialLogin('Google')">
          使用 Google 帳號登入
        </BaseButton>
        <BaseButton variant="outline" block icon="fa-brands fa-line" @click="onSocialLogin('LINE')">
          使用 LINE 帳號登入
        </BaseButton>
      </div>

      <template #footer>
        還沒有帳號？
        <RouterLink to="/register">立即註冊</RouterLink>
      </template>
    </AuthCard>
  </AuthLayout>
</template>

<style scoped>
.login__fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.login__options {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.login__link {
  font-size: var(--fs-body-2);
  line-height: normal;
  color: var(--text-body);
  text-decoration: underline;
}

.is-loading {
  pointer-events: none;
}

.login__divider {
  display: flex;
  align-items: center;
  gap: var(--space-16);
  font-size: var(--fs-body-2);
  line-height: normal;
  color: var(--text-placeholder);
}

.login__divider::before,
.login__divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--brand-secondary);
}

.login__social {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
}

/* ---------- 04 登入成功 ---------- */
.success__progress {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: var(--brand-secondary);
  overflow: hidden;
}

.success__bar {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--brand-primary);
  animation: progress linear forwards;
}

@keyframes progress {
  from {
    width: 0;
  }
  to {
    width: 100%;
  }
}

.success__hint {
  font-size: var(--fs-caption-2);
  line-height: normal;
  color: var(--text-placeholder);
}
</style>
