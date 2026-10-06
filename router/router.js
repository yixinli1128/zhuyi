import { createRouter, createWebHistory } from 'vue-router';
import Navbar from '@/components/Navbar.vue';

const routes = [
  { path: '/', name: 'home', component: Navbar }, // 讓首頁直接對應 Navbar
];

const router = createRouter({
  routes,
  history: createWebHistory(),
});

export default router;