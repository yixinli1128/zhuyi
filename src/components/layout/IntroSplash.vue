<script setup>
// 網站的兩種進場動畫
// - 開場（每個分頁第一次打開網站）：點描版畫風，墨點繞成漩渦聚成一只湯鍋（IntroOpening），最後淡化消散
// - 重新整理：畫面中央滴下一個墨點，暈開成 logo 的墨色底，再用筆刷一筆一筆刷出圖標和「煮意」
// 網址加 ?intro 可以重看開場；點一下或按任意鍵可以略過；系統設定「減少動態」時都不播
import { onBeforeUnmount, onMounted, ref } from 'vue'
// 高解析 logo（內含 2000px 去背圖），放大到開場尺寸仍清楚
import logoUrl from '@/assets/zhuyi-img/logo/logo_1.svg'
import IntroOpening from './IntroOpening.vue'

const STORAGE_KEY = 'zhuyi:intro-seen'
// 開場約 8 秒：停留 5 秒（湯鍋聚好、熱氣飄完一輪），再以 3 秒粒子消散；離場開始即可操作頁面。
// 重新整理：筆刷約 3.45 秒刷完（最後一筆 2.85s＋0.25s、補滿 3.05s＋0.4s），刷完再停 0.55 秒才淡出，動畫不會被切掉。
const HOLD = { opening: 5000, refresh: 4000 }

const mode = ref(null)
const leaving = ref(false)
// 開場要等中文字型下載完才開始：字型第一次載入約 1～1.5 秒，載完時整頁會重新排版，
// 跟開場動畫撞在一起就會卡一下。等待期間先蓋著紙色底，最多等 FONT_WAIT 就照播。
const FONT_WAIT = 1500
const started = ref(false)
let timer = null

function waitForFonts() {
  const ready = document.fonts?.ready ?? Promise.resolve()
  return Promise.race([ready, new Promise((resolve) => setTimeout(resolve, FONT_WAIT))])
}

function readSeen() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // 無痕模式等情況存不了就算了，頂多下次再播一次開場
  }
}

function isReload() {
  const [entry] = performance.getEntriesByType('navigation')
  return entry?.type === 'reload'
}

function pickMode() {
  if (new URLSearchParams(window.location.search).has('intro')) return 'opening'
  if (!readSeen()) return 'opening'
  if (isReload()) return 'refresh'
  return null
}

function leave() {
  if (leaving.value) return
  // 還在等字型、動畫根本還沒開始就被略過：直接收掉，不用等粒子消散
  if (!started.value) {
    done()
    window.removeEventListener('keydown', leave)
    return
  }
  leaving.value = true
  // 消散期間背景頁面已可捲動／點擊，避免手機誤以為尚未載入完成。
  document.documentElement.style.overflow = ''
  clearTimeout(timer)
  window.removeEventListener('keydown', leave)
}

function done() {
  mode.value = null
  document.documentElement.style.overflow = ''
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const picked = pickMode()
  if (!picked) return
  markSeen()
  mode.value = picked
  document.documentElement.style.overflow = 'hidden'
  window.addEventListener('keydown', leave)
  const begin = () => {
    if (!mode.value) return
    started.value = true
    timer = setTimeout(leave, HOLD[picked])
  }
  // 重新整理時字型多半已在快取裡，而且 logo 動畫是圖片、不受字型影響，直接開始
  if (picked === 'opening') waitForFonts().then(begin)
  else begin()
})

onBeforeUnmount(() => {
  clearTimeout(timer)
  window.removeEventListener('keydown', leave)
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <div
    v-if="mode"
    class="intro"
    :class="[`intro--${mode}`, { 'is-leaving': leaving }]"
    role="presentation"
    @click="leave"
    @animationend.self="mode === 'refresh' && leaving && done()"
  >
    <!-- ---------- 開場：點描版畫風的湯鍋 ---------- -->
    <IntroOpening v-if="mode === 'opening' && started" :dissolving="leaving" @dissolved="done" />

    <!-- ---------- 重新整理：墨點筆刷 ---------- -->
    <svg v-else-if="mode === 'refresh'" class="intro__logo" viewBox="0 0 202 404" role="img" aria-label="煮意 ZHUYI">
      <defs>
        <!-- 筆刷邊緣：用雜訊把遮罩的邊推得毛毛的，像墨水在紙上暈開、乾筆拖出的鋸齒 -->
        <filter id="intro-brush" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="3" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="intro-bloom-edge" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="11" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="34" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="intro-drop" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence type="fractalNoise" baseFrequency="0.35" numOctaves="2" seed="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        <!-- 遮罩：白色筆畫刷到哪裡，logo 就出現到哪裡 -->
        <mask id="intro-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="202" height="404">
          <!-- 墨點暈開成左邊的灰色墨底，邊緣用較粗的雜訊推成不規則的暈染 -->
          <g filter="url(#intro-bloom-edge)">
            <circle class="m-bloom" cx="56" cy="98" r="62" fill="#fff" />
          </g>
          <g filter="url(#intro-brush)" fill="none" stroke="#fff" stroke-linejoin="round">
            <!-- 圖標：兩根筷子、橫筆、Z 形湯匙 -->
            <path class="m-stroke m-1" pathLength="1" stroke-width="26" d="M76 16 L72 162" />
            <path class="m-stroke m-2" pathLength="1" stroke-width="26" d="M103 16 L99 162" />
            <path class="m-stroke m-3" pathLength="1" stroke-width="28" d="M48 50 L150 46" />
            <path class="m-stroke m-4" pathLength="1" stroke-width="32" d="M56 102 C110 92 168 66 178 96 C186 122 130 132 106 126 C140 132 172 142 194 126" />
            <!-- 煮、意：由上往下來回刷 -->
            <path class="m-stroke m-5" pathLength="1" stroke-width="28" d="M52 186 L142 184 L52 212 L142 210 L52 238 L142 236 L52 264 L142 264" />
            <path class="m-stroke m-6" pathLength="1" stroke-width="28" d="M48 286 L140 284 L48 312 L140 310 L48 338 L140 336 L48 364 L140 364" />
            <!-- zhuyi 小字 -->
            <path class="m-stroke m-7" pathLength="1" stroke-width="20" d="M144 344 L190 342 L144 370 L190 370" />
          </g>
          <!-- 最後整張補滿，確保筆刷沒刷到的邊角也完整 -->
          <rect class="m-fill" width="202" height="404" fill="#fff" />
        </mask>
      </defs>

      <image :href="logoUrl" width="202" height="404" mask="url(#intro-mask)" />
      <circle class="intro__drop" cx="56" cy="98" r="7" filter="url(#intro-drop)" />
    </svg>

    <p class="intro__skip">點一下略過</p>
  </div>
</template>

<style scoped>
.intro {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  background: var(--bg-default);
  cursor: pointer;
}

.intro.is-leaving {
  animation: intro-out 0.6s ease forwards;
}

/* 開場離場由 IntroOpening 的鍋子解體與紙面淡去接手，父層保持透明讓首頁露出。 */
.intro--opening.is-leaving {
  animation: none;
  background: transparent;
  cursor: default;
  pointer-events: none;
}

.intro--opening.is-leaving .intro__skip {
  animation: intro-opening-skip-out 0.25s ease-out forwards;
}

.intro__logo {
  width: auto;
  height: min(56vh, 480px);
  overflow: visible;
}

.intro__skip {
  position: absolute;
  bottom: var(--space-24);
  left: 0;
  right: 0;
  text-align: center;
  font-size: var(--fs-caption-2);
  color: var(--text-placeholder);
  letter-spacing: 0.1em;
  opacity: 0;
  animation: intro-fade 0.6s ease 1s forwards;
}

/* ---------- 墨點 ---------- */
.intro__drop {
  fill: #2b221c;
  transform-box: fill-box;
  transform-origin: center;
  transform: scale(0);
  animation: intro-drop 1s cubic-bezier(0.3, 0.7, 0.3, 1) forwards;
}

/* ---------- 遮罩動畫 ---------- */
.m-bloom {
  transform-box: fill-box;
  transform-origin: center;
  transform: scale(0);
  animation: intro-bloom 0.9s cubic-bezier(0.25, 0.6, 0.3, 1) 0.45s forwards;
}

.m-stroke {
  stroke-dasharray: 1 1;
  stroke-dashoffset: 1;
  animation: intro-brush 0.35s cubic-bezier(0.45, 0, 0.25, 1) forwards;
}

.m-1 { animation-delay: 0.95s; }
.m-2 { animation-delay: 1.15s; }
.m-3 { animation-delay: 1.35s; }
.m-4 { animation-delay: 1.5s; animation-duration: 0.5s; }
.m-5 { animation-delay: 2s; animation-duration: 0.5s; }
.m-6 { animation-delay: 2.4s; animation-duration: 0.5s; }
.m-7 { animation-delay: 2.85s; animation-duration: 0.25s; }

.m-fill {
  opacity: 0;
  animation: intro-fade 0.4s ease 3.05s forwards;
}

@keyframes intro-drop {
  0% {
    transform: scale(0);
  }
  35% {
    transform: scale(1.15);
  }
  45% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(3.2);
    opacity: 0;
  }
}

@keyframes intro-bloom {
  to {
    transform: scale(1);
  }
}

@keyframes intro-brush {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes intro-fade {
  to {
    opacity: 1;
  }
}

@keyframes intro-out {
  to {
    opacity: 0;
    visibility: hidden;
  }
}

@keyframes intro-opening-skip-out {
  to {
    opacity: 0;
  }
}

@media (max-width: 767px) {
  .intro__logo {
    height: min(46vh, 360px);
  }
}
</style>
