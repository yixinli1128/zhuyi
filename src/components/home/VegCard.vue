<script setup>
// Figma 首頁「當季時蔬」下方食材卡：食材照片、編號產地、名稱、介紹
// 整張卡可點，點了讓上方輪播換成這個食材的菜色
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

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

// 選取時的藍色虛線：依圖片實際尺寸畫路徑，圓角跟圖片一樣只在左上、右下；
// 線段長度微調到剛好整除周長，虛線不會在某個角擠在一起，四個角都落在線段正中央
const imageEl = ref(null)
const size = ref({ w: 0, h: 0 })
let resizeObserver

onMounted(() => {
  resizeObserver = new ResizeObserver(([entry]) => {
    size.value = { w: entry.contentRect.width, h: entry.contentRect.height }
  })
  resizeObserver.observe(imageEl.value)
})
onBeforeUnmount(() => resizeObserver?.disconnect())

const STROKE = 2
const RADIUS = 12
const DASH = 8
const GAP = 8

const dashFrame = computed(() => {
  const { w, h } = size.value
  if (!w || !h) return null
  const i = STROKE / 2
  const r = RADIUS - i
  const d = [
    `M${w - i},${i}`,
    `V${h - i - r}`,
    `A${r},${r} 0 0 1 ${w - i - r},${h - i}`,
    `H${i}`,
    `V${i + r}`,
    `A${r},${r} 0 0 1 ${i + r},${i}`,
    'Z',
  ].join(' ')
  const length = 2 * (w - 2 * i) + 2 * (h - 2 * i) - 4 * r + Math.PI * r
  const segments = Math.max(2, Math.round(length / ((DASH + GAP) * 2)) * 2)
  const scale = length / (segments * (DASH + GAP))
  // 圓頭線帽會讓每段兩端各多出半個線寬，先扣掉，看起來才是設定的線段長度與留白
  const visible = DASH * scale - STROKE
  return {
    d,
    viewBox: `0 0 ${w} ${h}`,
    dasharray: `${visible} ${GAP * scale + STROKE}`,
    dashoffset: visible / 2,
  }
})
</script>

<template>
  <article class="veg-card" :class="{ 'is-active': active }">
    <div ref="imageEl" class="veg-card__image">
      <img :src="veg.imageUrl" :alt="veg.name" loading="lazy" />
      <svg v-if="active && dashFrame" class="veg-card__frame" :viewBox="dashFrame.viewBox" aria-hidden="true">
        <path
          :d="dashFrame.d"
          :stroke-width="STROKE"
          :stroke-dasharray="dashFrame.dasharray"
          :stroke-dashoffset="dashFrame.dashoffset"
        />
      </svg>
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

/* 選取虛線：路徑在 script 裡依圖片尺寸算好，這裡只管顏色 */
.veg-card__frame {
  position: absolute;
  z-index: 1;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  fill: none;
  stroke: #b0bfd2;
  stroke-linecap: round;
}

.veg-card__intro {
  font-size: clamp(12px, 4.4cqw, 14px);
  line-height: 1.6;
  text-indent: 2em;
  color: var(--text-body);
}
</style>
