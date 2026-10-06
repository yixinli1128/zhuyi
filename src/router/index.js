import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

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
    meta: { title: '會員登入' },
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
  // 換頁時回到頁面頂端
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title}｜煮意 ZHUYI` : '煮意 ZHUYI'
})

export default router
