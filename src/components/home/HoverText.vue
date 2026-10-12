<script setup>
// 首頁大標用的逐字互動：滑鼠掃過的字會輕輕浮起、變成品牌色，離開後慢慢落回去
// 加上 auto 就不用滑鼠，自己從第一個字浮到最後一個字、循環播放
//   兩行要接成同一道波浪時，第二行用 start 接著第一行的字數往下數
// 螢幕報讀器只讀隱藏的整句文字，不會一個字一個字唸
import { computed } from 'vue'

const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  auto: Boolean,
  start: {
    type: Number,
    default: 0,
  },
})

// 一字一格；開頭引號黏後面的字、標點黏前面的字，免得換行時標點落在行首行尾
const chars = computed(() => props.text.match(/[「『（]*.[，。、！？：；」』）]*/gu) ?? [])
</script>

<template>
  <span class="hover-text">
    <span class="hover-text__sr">{{ text }}</span>
    <span aria-hidden="true">
      <span
        v-for="(char, index) in chars"
        :key="index"
        class="hover-text__char"
        :class="{ 'is-auto': auto }"
        :style="auto ? { '--char-index': start + index } : undefined"
        >{{ char }}</span
      >
    </span>
  </span>
</template>

<style scoped>
.hover-text__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.hover-text__char {
  display: inline-block;
  white-space: pre;
}

/* 落回去慢、浮起來快，滑鼠掃過會留下一小段波浪 */
@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .hover-text__char:not(.is-auto) {
    transition:
      transform 0.7s ease,
      color 0.7s ease;
  }

  .hover-text__char:not(.is-auto):hover {
    transform: translateY(-6px);
    color: var(--brand-primary);
    transition-duration: 0.15s;
  }
}

/* 自動播放：每個字輪流浮起一次，一輪 6 秒；前 1.5 秒先等主視覺進場 */
@keyframes hover-text-wave {
  4% {
    transform: translateY(-6px);
    color: var(--brand-primary);
  }

  16% {
    transform: none;
    color: inherit;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .hover-text__char.is-auto {
    animation: hover-text-wave 6s ease-in-out infinite;
    animation-delay: calc(1.5s + var(--char-index) * 0.14s);
  }
}
</style>
