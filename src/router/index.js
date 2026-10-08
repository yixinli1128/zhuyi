import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { useUserStore } from '@/stores/user'

// 頁面對應 Figma 的五大區塊；除首頁外都用懶載入
const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { title: '首頁' } },
  {
    path: '/create',
    name: 'create',
    component: () => import('@/views/CreateMenuView.vue'),
    meta: { title: '來點煮意' },
  },
  {
    path: '/journal',
    name: 'journal',
    component: () => import('@/views/JournalView.vue'),
    meta: { title: '餐食日誌' },
  },
  {
    path: '/fridge',
    name: 'fridge',
    component: () => import('@/views/FridgeView.vue'),
    meta: { title: '冰箱庫存' },
  },
  {
    path: '/family',
    name: 'family',
    component: () => import('@/views/FamilyView.vue'),
    meta: { title: '家庭管理' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    // layout: 'auth' → 桌機不顯示左側 navbar（Figma 登入頁是滿版）
    meta: { title: '會員登入', layout: 'auth' },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { title: '會員註冊', layout: 'auth' },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/views/ForgotPasswordView.vue'),
    meta: { title: '忘記密碼', layout: 'auth' },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/views/ResetPasswordView.vue'),
    meta: { title: '重設密碼', layout: 'auth' },
  },
  {
    path: '/account',
    name: 'account',
    component: () => import('@/views/AccountView.vue'),
    // requiresAuth：沒登入時先導到登入頁，登入後再回來
    meta: { title: '帳號設定', requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '找不到頁面' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  // 換頁時回到頁面頂端；網址有 #錨點 時捲到該區塊（例：/account#notifications）
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !useUserStore().isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title}｜煮意 ZHUYI` : '煮意 ZHUYI'
})

export default router
