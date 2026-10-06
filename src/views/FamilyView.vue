<script setup>
// 家庭管理（Figma Desktop - 家庭管理 1174:21494／Mobile 1554:17314）
import PageTitle from '@/components/layout/PageTitle.vue'
import BaseButton from '@/components/base/BaseButton.vue'
</script>

<template>
  <section class="page">
    <PageTitle
      title="家庭成員與飲食偏好"
      description="設定每位成員的食量係數、過敏源與個人偏好，系統配餐時將自動為全家量身調整。"
    >
      <template #actions>
        <BaseButton icon="fa-solid fa-plus">新增成員</BaseButton>
      </template>
    </PageTitle>
  </section>
</template>

<style scoped>
.page {
  padding: var(--page-padding-y) var(--page-padding-x);
}

/* 桌機：標題貼齊內容區頂部（標題本身已有 60px 上留白） */
@media (min-width: 1024px) {
  .page {
    padding-top: 0;
  }
}
</style>
