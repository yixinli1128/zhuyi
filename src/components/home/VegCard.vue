<script setup>
// Figma 首頁「當季時蔬」下方食材卡：食材照片、編號產地、名稱、介紹
// 整張卡可點，點了讓上方輪播換成這個食材的菜色
defineProps({
  veg: {
    type: Object,
    required: true,
  },
  active: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['select'])
</script>

<template>
  <article class="veg-card" :class="{ 'is-active': active }">
    <div class="veg-card__image">
      <img :src="veg.imageUrl" :alt="veg.name" loading="lazy" />
    </div>

    <div class="veg-card__body">
      <p class="veg-card__meta">
        <span>{{ veg.no }} // {{ veg.trait }}</span>
        <span>{{ veg.origin }}</span>
      </p>
      <h3 class="veg-card__name">
        <button type="button" class="veg-card__button" :aria-pressed="active" @click="$emit('select')">
          {{ veg.name }}
        </button>
      </h3>
      <p class="veg-card__intro">{{ veg.intro }}</p>
    </div>
  </article>
</template>

<style scoped>
/* 設成 container：卡片被排得多窄，裡面的字和間距就用 cqw 跟著等比縮小（Figma 卡寬 320） */
.veg-card {
  position: relative;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 5cqw, 16px);
  container-type: inline-size;
}

/* 左上、右下圓角，與 Figma 圖片一致 */
.veg-card__image {
  position: relative;
  aspect-ratio: 10 / 9;
  overflow: hidden;
  border-radius: 12px 0;
  background: var(--brand-secondary-light);
}

.veg-card__image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.veg-card:hover .veg-card__image img {
  transform: scale(1.04);
}

@media (prefers-reduced-motion: reduce) {
  .veg-card__image img {
    transition: none;
  }
}

.veg-card__body {
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 2.5cqw, 8px);
}

/* 卡片太窄放不下一行時，產地自動換到第二行 */
.veg-card__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 2px var(--space-8);
  font-size: clamp(10px, 3.8cqw, 12px);
  color: var(--text-special);
}

.veg-card__name {
  font-size: clamp(15px, 6.3cqw, 20px);
  font-weight: 700;
  color: var(--text-title);
}

/* 按鈕蓋滿整張卡，點哪裡都算 */
.veg-card__button {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.veg-card__button::after {
  content: '';
  position: absolute;
  inset: 0;
}

.veg-card__button:focus-visible {
  outline: none;
}

.veg-card:has(.veg-card__button:focus-visible) {
  outline: 2px solid var(--brand-special);
  outline-offset: 6px;
}

.veg-card.is-active .veg-card__name {
  color: var(--brand-primary);
}

.veg-card.is-active .veg-card__image {
  outline: none;
}

/* 固定 8px 藍線／8px 留白，直接錨定在圖片邊界。 */
.veg-card.is-active .veg-card__image::after {
  content: '';
  position: absolute;
  z-index: 1;
  inset: 0;
  pointer-events: none;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='100' height='100' rx='8' fill='none' stroke='%23b0bfd2' stroke-width='4' stroke-linecap='round' stroke-dasharray='8 8' vector-effect='non-scaling-stroke'/%3E%3C/svg%3E") center / 100% 100% no-repeat;
}

.veg-card__intro {
  font-size: clamp(12px, 4.4cqw, 14px);
  line-height: 1.6;
  text-indent: 2em;
  color: var(--text-body);
}
</style>
