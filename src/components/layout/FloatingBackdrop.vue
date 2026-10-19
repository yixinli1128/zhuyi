<script setup>
// 全站背景的浮動小元素，細線手繪感、低彩度，固定在畫面上慢慢漂
// 依頁面換主題：來點煮意是驚嘆號問號、餐食日誌是筆和便條紙、冰箱庫存是小食材、家庭管理是小人物，其他頁是餐具廚具和蒸氣
// 放在所有內容後面、不擋點擊；系統設定「減少動態」時靜止
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const HEAD = (cx, cy, r) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0`

// 可愛小人物：大頭身、點點眼、微笑、腮紅；extra 是頭髮、帽子、眼鏡等
function cute(cx, cy, r, extra = [], { eyes = true, smile = true } = {}) {
  const neck = cy + r
  return {
    color: '#ad8f7b',
    paths: [
      HEAD(cx, cy, r),
      `M${cx - 4} 22 C${cx - 4} ${neck + 1.2} ${cx - 2.2} ${neck} ${cx} ${neck} C${cx + 2.2} ${neck} ${cx + 4} ${neck + 1.2} ${cx + 4} 22`,
      ...(smile ? [`M${cx - 1} ${cy + 2} Q${cx} ${cy + 2.8} ${cx + 1} ${cy + 2}`] : []),
      ...extra,
    ],
    dots: eyes ? [[cx - 2.4, cy + 0.2, 0.75], [cx + 2.4, cy + 0.2, 0.75]] : [],
    blush: [[cx - 3.8, cy + 1.9], [cx + 3.8, cy + 1.9]],
  }
}

const icons = {
  // 餐具、廚具
  fork: {
    color: '#ad8f7b',
    paths: ['M12 21 V11', 'M8.5 3 V8 C8.5 10 10 11 12 11 C14 11 15.5 10 15.5 8 V3', 'M12 3 V8'],
  },
  spoon: {
    color: '#a7ae96',
    paths: ['M12 21 V12', 'M12 12 C9.5 12 8.5 9.5 8.5 7.5 C8.5 5 10 3 12 3 C14 3 15.5 5 15.5 7.5 C15.5 9.5 14.5 12 12 12 Z'],
  },
  chopsticks: {
    color: '#ad8f7b',
    paths: ['M6 21 L16 3', 'M10 21 L19 4'],
  },
  bowl: {
    color: '#b0bfd2',
    paths: ['M3 11 H21 C21 15.5 17 18.5 12 18.5 C7 18.5 3 15.5 3 11 Z', 'M9 18.5 V20.5 H15 V18.5'],
  },
  ladle: {
    color: '#a7ae96',
    paths: ['M19 3 L13.5 12', 'M5 12 H15 C15 15.5 12.8 18 10 18 C7.2 18 5 15.5 5 12 Z'],
  },
  pot: {
    color: '#ad8f7b',
    paths: ['M4.5 10 H19.5 V16 C19.5 17.7 18.2 19 16.5 19 H7.5 C5.8 19 4.5 17.7 4.5 16 Z', 'M2 11 H4.5 M19.5 11 H22', 'M6 7.5 H18', 'M11 5.5 H13'],
  },
  whisk: {
    color: '#cdbba8',
    paths: ['M12 21 V14', 'M12 14 C7.5 10.5 8.5 3 12 3 C15.5 3 16.5 10.5 12 14', 'M12 14 C10.5 10 10.8 4.5 12 3 C13.2 4.5 13.5 10 12 14'],
  },
  steam: {
    color: '#b0bfd2',
    paths: ['M8 20 c-4 -4 4 -6 0 -10 c-3 -3 2 -6 4 -7', 'M15 20 c-3 -3 3 -5 0 -8'],
  },

  // 小人物：圓圓大頭、點點眼睛、腮紅
  baby: { ...cute(12, 10, 6.5, ['M12 3.5 C11 2 12.6 1.2 13.4 2.2']), color: '#a7ae96' },
  girl: { ...cute(12, 10, 6.5, [HEAD(6.6, 5, 1.9), HEAD(17.4, 5, 1.9)]), color: '#c4a08e' },
  mom: cute(12, 10, 6.5, ['M5.6 9 C6.5 5 10 3.6 12 5.2 C14 3.6 17.5 5 18.4 9']),
  grandpa: { ...cute(12, 10, 6.5, [HEAD(9.6, 10, 1.6), HEAD(14.4, 10, 1.6), 'M11.2 10 H12.8', 'M10.6 13.6 C11.3 13 12.7 13 13.4 13.6'], { eyes: false, smile: false }), color: '#b0bfd2' },
  chef: { ...cute(12, 11.5, 5.6, ['M7.6 7 C6 6.6 6.2 3.4 8.8 3.8 C9.6 1.8 14.4 1.8 15.2 3.8 C17.8 3.4 18 6.6 16.4 7 Z']), color: '#cdbba8' },
  // 小食材
  carrot: {
    color: '#c99a7a',
    paths: ['M15.5 8.5 C12.5 10.5 8 15.5 5.5 20 C10 17.5 15 13 16.5 10 Z', 'M16 9 L17.5 4 M16.3 9.3 L21 6.5 M15.7 8.8 L14 4.5'],
  },
  mushroom: {
    color: '#ad8f7b',
    paths: ['M4 12 C4 7 8 4 12 4 C16 4 20 7 20 12 Z', 'M9.5 12 V18 C9.5 19.8 14.5 19.8 14.5 18 V12'],
  },
  egg: {
    color: '#d6c38f',
    paths: ['M12 3 C8 3 5.5 9 5.5 13.5 C5.5 17.5 8.5 20.5 12 20.5 C15.5 20.5 18.5 17.5 18.5 13.5 C18.5 9 16 3 12 3 Z'],
  },
  tomato: {
    color: '#c4877a',
    paths: ['M4.5 13.5 a7.5 7 0 1 0 15 0 a7.5 7 0 1 0 -15 0', 'M12 6.5 V3.5', 'M8.5 7.2 L12 6.5 L15.5 7.2'],
  },
  spinach: {
    color: '#a7ae96',
    paths: [
      'M12 18 C8 18.5 3.5 17.5 3.5 14 C3.5 11.5 5.5 10.5 7 11 C5.6 8.4 7 6.8 8.8 7.4 C8.4 4 10.2 2 12 2 C13.8 2 15.6 4 15.2 7.4 C17 6.8 18.4 8.4 17 11 C18.5 10.5 20.5 11.5 20.5 14 C20.5 17.5 16 18.5 12 18 Z',
      'M12 22 V5',
      'M12 15.5 Q9 15 6 13.4 M12 15.5 Q15 15 18 13.4',
      'M12 12 Q10 11 8.4 9.4 M12 12 Q14 11 15.6 9.4',
      'M12 8.6 Q11 7.6 10.6 6.4 M12 8.6 Q13 7.6 13.4 6.4',
    ],
  },
  // 筆、便條紙
  pen: {
    color: '#ad8f7b',
    paths: ['M5 19 L6 15 L16 5 L19 8 L9 18 Z', 'M14 7 L17 10', 'M6 15 L9 18'],
  },
  pencil: {
    color: '#d6c38f',
    paths: ['M4 20 L5.5 15.5 L15.5 5.5 L18.5 8.5 L8.5 18.5 Z', 'M5.5 15.5 L8.5 18.5', 'M13.5 7.5 L16.5 10.5', 'M4 20 L5.2 16.6'],
  },
  sticky: {
    color: '#c4a08e',
    paths: ['M5 4 H19 V15 L14 20 H5 Z', 'M14 20 V15 H19', 'M8 8.5 H16 M8 11.5 H13'],
  },
  memo: {
    color: '#b0bfd2',
    paths: ['M6 4 H18 V21 H6 Z', 'M9 2.5 V5.5 M12 2.5 V5.5 M15 2.5 V5.5', 'M8.5 10 H15.5 M8.5 13 H15.5 M8.5 16 H13'],
  },

  // 驚嘆號、問號
  exclaim: {
    color: '#ad8f7b',
    paths: ['M12 4 V14'],
    dots: [[12, 19, 1.3]],
  },
  question: {
    color: '#b0bfd2',
    paths: ['M8.5 8 C8.5 5.5 10 4 12 4 C14.2 4 15.7 5.5 15.7 7.6 C15.7 10.6 12 10.6 12 14'],
    dots: [[12, 19, 1.3]],
  },
  exclaimSoft: {
    color: '#c4a08e',
    paths: ['M12 4 V14'],
    dots: [[12, 19, 1.3]],
  },
  questionSoft: {
    color: '#a7ae96',
    paths: ['M8.5 8 C8.5 5.5 10 4 12 4 C14.2 4 15.7 5.5 15.7 7.6 C15.7 10.6 12 10.6 12 14'],
    dots: [[12, 19, 1.3]],
  },

  fish: {
    color: '#b0bfd2',
    paths: ['M3 12 C6 7.5 12 7.5 16 12 C12 16.5 6 16.5 3 12 Z', 'M16 12 L21 8.5 V15.5 Z', 'M6.5 11.3 V11.4'],
  },
}

// 位置固定，換主題時只換圖案
const spots = [
  { x: 3, y: 14, size: 28, rotate: -20, duration: 16 },
  { x: 8, y: 46, size: 30, rotate: 6, duration: 14 },
  { x: 4, y: 78, size: 26, rotate: 10, duration: 18 },
  { x: 22, y: 6, size: 30, rotate: 0, duration: 20, mobile: false },
  { x: 36, y: 88, size: 28, rotate: -15, duration: 17 },
  { x: 48, y: 30, size: 26, rotate: -30, duration: 13, mobile: false },
  { x: 58, y: 62, size: 26, rotate: 35, duration: 15, mobile: false },
  { x: 70, y: 9, size: 30, rotate: -6, duration: 19 },
  { x: 80, y: 74, size: 24, rotate: 25, duration: 11, mobile: false },
  { x: 92, y: 24, size: 28, rotate: -25, duration: 21 },
  { x: 95, y: 56, size: 28, rotate: 0, duration: 18 },
  { x: 88, y: 90, size: 26, rotate: -8, duration: 16, mobile: false },
]

const themes = {
  kitchen: ['fork', 'bowl', 'chopsticks', 'steam', 'ladle', 'whisk', 'spoon', 'pot', 'fork', 'spoon', 'steam', 'bowl'],
  people: ['mom', 'baby', 'grandpa', 'girl', 'chef', 'baby', 'girl', 'mom', 'grandpa', 'baby', 'chef', 'girl'],
  ingredients: ['carrot', 'egg', 'spinach', 'tomato', 'mushroom', 'fish', 'carrot', 'tomato', 'egg', 'spinach', 'mushroom', 'fish'],
  notes: ['pen', 'sticky', 'pencil', 'memo', 'sticky', 'pen', 'memo', 'pencil', 'sticky', 'pen', 'memo', 'sticky'],
  ideas: ['question', 'exclaim', 'questionSoft', 'exclaimSoft', 'question', 'exclaimSoft', 'questionSoft', 'exclaim', 'question', 'exclaimSoft', 'questionSoft', 'exclaim'],
}

// 人物、食材保持正向，只微微傾斜
const upright = new Set(['people', 'ingredients', 'notes', 'ideas'])

const route = useRoute()

const theme = computed(() => {
  if (route.path.startsWith('/family')) return 'people'
  if (route.path.startsWith('/fridge')) return 'ingredients'
  if (route.path.startsWith('/journal')) return 'notes'
  if (route.path.startsWith('/create')) return 'ideas'
  return 'kitchen'
})

const items = computed(() =>
  spots.map((spot, index) => ({
    ...spot,
    rotate: upright.has(theme.value) ? Math.max(-12, Math.min(12, spot.rotate)) : spot.rotate,
    icon: icons[themes[theme.value][index]],
  })),
)
</script>

<template>
  <div :key="theme" class="floating-backdrop" aria-hidden="true">
    <span
      v-for="(item, index) in items"
      :key="index"
      class="drift"
      :class="{ 'is-desktop-only': item.mobile === false }"
      :style="{
        left: `${item.x}%`,
        top: `${item.y}%`,
        width: `${item.size}px`,
        height: `${item.size}px`,
        '--r': `${item.rotate}deg`,
        animationDuration: `${item.duration}s`,
        animationDelay: `${-index * 2.3}s`,
      }"
    >
      <svg viewBox="0 0 24 24" :stroke="item.icon.color">
        <path v-for="d in item.icon.paths" :key="d" :d="d" />
        <circle v-for="([x, y, r], i) in item.icon.dots" :key="`d${i}`" :cx="x" :cy="y" :r="r" :fill="item.icon.color" stroke="none" />
        <circle v-for="([x, y], i) in item.icon.blush" :key="`b${i}`" :cx="x" :cy="y" r="1.1" class="blush" />
      </svg>
    </span>
  </div>
</template>

<style scoped>
.floating-backdrop {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

.drift {
  position: absolute;
  opacity: 0.6;
  transform: rotate(var(--r));
  animation: backdrop-drift 16s ease-in-out infinite;
}

.drift svg {
  display: block;
  width: 100%;
  height: 100%;
  fill: none;
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 小人物的腮紅 */
.blush {
  fill: #e3a99b;
  stroke: none;
  opacity: 0.55;
}

@keyframes backdrop-drift {
  0%,
  100% {
    transform: translate(0, 0) rotate(var(--r));
  }
  30% {
    transform: translate(10px, -14px) rotate(calc(var(--r) + 14deg));
  }
  65% {
    transform: translate(-8px, -6px) rotate(calc(var(--r) - 10deg));
  }
}

@media (prefers-reduced-motion: reduce) {
  .drift {
    animation: none;
  }
}

/* 手機畫面小，只留一半 */
@media (max-width: 767px) {
  .drift.is-desktop-only {
    display: none;
  }
}
</style>
