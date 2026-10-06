<script setup>
// 如果 Navbar 是要每一頁都固定顯示的最上方導覽列，可以直接在這裡 import 並放進 template
import Navbar from './components/Navbar.vue';
</script>

<template>
  <!-- 如果希望導覽列固定在最上方，可以放在 router-view 外面 -->
  <Navbar />
  
  <!-- 這裡會根據你點擊的路由切換顯示不同的頁面元件 -->
  <router-view />
</template>

<style scoped>
</style>