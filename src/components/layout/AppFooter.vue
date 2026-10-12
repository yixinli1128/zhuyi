<script setup>
import logoMark from '@/assets/zhuyi-img/logo/logo_footer.png'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="app-footer">
    <!-- 裝飾：右下水彩小屋，再疊一層和紙紋理；純 SVG，不另外載圖 -->
    <div class="footer-ink" aria-hidden="true">
      <svg class="footer-ink__defs" focusable="false">
        <defs>
        <!-- 水彩：邊緣化開、顏料在邊上積得深一點，再帶點紙紋的斑駁 -->
        <filter id="footer-watercolor" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="4" result="flow" />
          <feDisplacementMap in="SourceGraphic" in2="flow" scale="7" result="shape" />
          <feGaussianBlur in="shape" stdDeviation="1.1" result="soft" />
          <feMorphology in="shape" operator="erode" radius="1.6" result="inner" />
          <feComposite in="shape" in2="inner" operator="out" result="rim" />
          <feGaussianBlur in="rim" stdDeviation="0.6" result="rimSoft" />
          <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="3" seed="9" result="paper" />
          <feColorMatrix in="paper" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.7 1.1" result="mottle" />
          <feComposite in="soft" in2="mottle" operator="in" result="body" />
          <feMerge>
            <feMergeNode in="body" />
            <feMergeNode in="rimSoft" />
          </feMerge>
        </filter>
        </defs>
      </svg>

      <!-- 右下：水彩小屋，只用灰藍、米褐、磚紅三個低彩度色；煙囪冒著炊煙 -->
      <svg class="footer-ink__houses" focusable="false" viewBox="0 0 600 120" preserveAspectRatio="xMaxYMax meet">
        <g filter="url(#footer-watercolor)">
          <!-- 後排：灰藍遠景 -->
          <g fill="#b0bfd2" opacity="0.32">
            <path d="M232 120 V80 L262 58 L292 80 V120 Z" />
            <path d="M300 120 V70 L326 50 L352 70 V120 Z" />
            <path d="M420 120 V74 L452 52 L484 74 V120 Z" />
          </g>
          <!-- 前排牆面：米褐 -->
          <g fill="#cdbba8" opacity="0.6">
            <path d="M322 120 V96 H374 V120 Z" />
            <path d="M390 120 V88 H466 V120 Z" />
            <path d="M480 120 V100 H528 V120 Z" />
            <path d="M542 120 V92 H596 V120 Z" />
          </g>
          <!-- 屋頂與煙囪：磚紅 -->
          <g fill="#ad8f7b" opacity="0.55">
            <path d="M316 98 L348 75 L380 98 Z" />
            <path d="M382 91 L428 59 L474 91 Z" />
            <path d="M474 102 L504 81 L534 102 Z" />
            <path d="M536 95 L569 71 L600 94 Z" />
            <path d="M451 72 V54 H461 V72 Z" />
          </g>
          <!-- 窗門：灰藍小點 -->
          <g fill="#8c9cb1" opacity="0.45">
            <path d="M342 101 h10 v9 h-10 Z" />
            <path d="M403 96 h11 v9 h-11 Z M440 96 h11 v9 h-11 Z" />
            <path d="M498 106 h11 v14 h-11 Z" />
            <path d="M561 99 h12 v9 h-12 Z" />
          </g>
        </g>

        <path
          class="footer-ink__smoke"
          d="M456 52 c-5 -6 5 -9 0 -15 c-5 -6 5 -9 0 -15"
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
        />
        <!-- 遠方兩隻飛鳥 -->
        <g class="footer-ink__birds" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round">
          <path d="M300 30 q5 -5 9 0 q4 -5 9 0" />
          <path d="M324 40 q3 -3 6 0 q3 -3 6 0" />
        </g>
      </svg>
    </div>

    <div class="footer-brand">
      <div class="footer-tagline">
        <img class="footer-logo" :src="logoMark" alt="煮意 ZHUYI" width="60" height="60" />
        <p class="footer-caption">日常備餐・靈感與心意 // COOK WITH CARE &amp; IDEA</p>
      </div>
      <p class="footer-slogan">每天一點煮意，一桌家的心意。</p>
    </div>
    <p class="footer-copyright">
      © {{ year }} 煮意 ZHUYI. All rights reserved. Designed for mindful home cooking.
    </p>
  </footer>
</template>

<style scoped>
/* 手機（Figma Mobile Footer 1573:23629）：文字直排、不顯示 logo */
.app-footer {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: var(--space-24);
  padding: var(--space-20);
  /* Figma 手機版底色，與桌機的 secondary 不同 */
  background-color: #f1ede6;
  color: var(--text-body);
}

/* 和紙質感：細碎顆粒＋雲狀深淺＋零星紙纖維，multiply 疊在底色上 */
.app-footer::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.27 0 0 0 0 0.2 0 0 0 0.7 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600'%3E%3Cfilter id='m'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.012' numOctaves='3' seed='11' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.42 0 0 0 0 0.33 0 0 0 0 0.25 0 0 0 0.9 -0.3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23m)'/%3E%3C/svg%3E"),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='360'%3E%3Cg fill='none' stroke='%236b5646' stroke-linecap='round'%3E%3Cpath d='M226 173Q215 188 214 191' stroke-width='0.5' stroke-opacity='0.65'/%3E%3Cpath d='M266 325Q287 332 300 341' stroke-width='0.8' stroke-opacity='0.65'/%3E%3Cpath d='M194 247Q178 258 157 252' stroke-width='0.35' stroke-opacity='0.35'/%3E%3Cpath d='M286 15Q306 27 339 30' stroke-width='0.8' stroke-opacity='0.5'/%3E%3Cpath d='M170 290Q156 293 159 308' stroke-width='0.35' stroke-opacity='0.35'/%3E%3Cpath d='M141 125Q130 148 133 169' stroke-width='0.6' stroke-opacity='0.5'/%3E%3Cpath d='M117 175Q113 215 117 242' stroke-width='0.5' stroke-opacity='0.65'/%3E%3Cpath d='M205 118Q213 133 201 164' stroke-width='0.5' stroke-opacity='0.65'/%3E%3Cpath d='M127 213Q108 209 96 221' stroke-width='0.35' stroke-opacity='0.35'/%3E%3Cpath d='M243 241Q262 276 265 293' stroke-width='0.8' stroke-opacity='0.35'/%3E%3Cpath d='M312 177Q300 204 293 242' stroke-width='0.5' stroke-opacity='0.35'/%3E%3Cpath d='M148 263Q144 281 157 307' stroke-width='0.6' stroke-opacity='0.65'/%3E%3Cpath d='M67 32Q67 54 74 60' stroke-width='0.5' stroke-opacity='0.65'/%3E%3Cpath d='M56 232Q91 235 110 240' stroke-width='0.5' stroke-opacity='0.5'/%3E%3Cpath d='M215 155Q189 172 161 176' stroke-width='0.6' stroke-opacity='0.35'/%3E%3Cpath d='M272 12Q290 37 300 44' stroke-width='0.35' stroke-opacity='0.5'/%3E%3Cpath d='M301 209Q286 228 281 251' stroke-width='0.5' stroke-opacity='0.35'/%3E%3Cpath d='M72 229Q81 230 79 248' stroke-width='0.35' stroke-opacity='0.65'/%3E%3Cpath d='M332 144Q348 158 348 167' stroke-width='0.5' stroke-opacity='0.35'/%3E%3Cpath d='M264 268Q291 287 314 305' stroke-width='0.35' stroke-opacity='0.35'/%3E%3Cpath d='M145 203Q136 205 113 217' stroke-width='0.6' stroke-opacity='0.65'/%3E%3Cpath d='M114 318Q113 325 119 331' stroke-width='0.8' stroke-opacity='0.65'/%3E%3Cpath d='M183 261Q189 265 177 278' stroke-width='0.5' stroke-opacity='0.35'/%3E%3Cpath d='M77 30Q93 49 102 71' stroke-width='0.35' stroke-opacity='0.65'/%3E%3Cpath d='M269 162Q265 157 256 171' stroke-width='0.8' stroke-opacity='0.5'/%3E%3Cpath d='M146 86Q144 104 160 125' stroke-width='0.5' stroke-opacity='0.5'/%3E%3Cpath d='M257 165Q230 177 213 194' stroke-width='0.8' stroke-opacity='0.35'/%3E%3Cpath d='M314 276Q304 297 289 308' stroke-width='0.6' stroke-opacity='0.35'/%3E%3Cpath d='M113 139Q114 164 113 179' stroke-width='0.35' stroke-opacity='0.35'/%3E%3Cpath d='M143 58Q152 62 159 83' stroke-width='0.6' stroke-opacity='0.65'/%3E%3Cpath d='M167 45Q153 73 121 94' stroke-width='0.5' stroke-opacity='0.65'/%3E%3Cpath d='M242 98Q245 108 229 126' stroke-width='0.6' stroke-opacity='0.35'/%3E%3Cpath d='M90 245Q94 270 89 309' stroke-width='0.8' stroke-opacity='0.5'/%3E%3Cpath d='M237 238Q243 258 241 273' stroke-width='0.35' stroke-opacity='0.35'/%3E%3Cpath d='M129 225Q163 243 182 267' stroke-width='0.35' stroke-opacity='0.65'/%3E%3Cpath d='M160 163Q177 193 174 206' stroke-width='0.5' stroke-opacity='0.35'/%3E%3Cpath d='M135 9Q157 30 192 48' stroke-width='0.8' stroke-opacity='0.65'/%3E%3Cpath d='M291 209Q288 228 285 235' stroke-width='0.35' stroke-opacity='0.35'/%3E%3Cpath d='M348 234Q325 244 316 253' stroke-width='0.8' stroke-opacity='0.5'/%3E%3Cpath d='M61 61Q43 85 34 105' stroke-width='0.35' stroke-opacity='0.35'/%3E%3Cpath d='M42 293Q60 304 84 321' stroke-width='0.5' stroke-opacity='0.35'/%3E%3Cpath d='M280 145Q285 158 309 180' stroke-width='0.6' stroke-opacity='0.65'/%3E%3C/g%3E%3C/svg%3E");
  opacity: 0.45;
  mix-blend-mode: multiply;
}

.footer-ink {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  color: var(--brand-primary);
}

/* 只放濾鏡定義，本身不佔位 */
.footer-ink__defs {
  position: absolute;
  width: 0;
  height: 0;
}

.footer-ink__houses {
  position: absolute;
  right: 0;
  bottom: 0;
  width: min(60%, 560px);
  height: 70%;
  opacity: 0.8;
}

.footer-ink__smoke {
  opacity: 0.3;
}

/* 手機文字會壓到飛鳥，桌機才顯示 */
.footer-ink__birds {
  display: none;
  opacity: 0.5;
}

.footer-brand {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
}

.footer-tagline {
  display: flex;
  align-items: center;
  gap: var(--space-24);
}

.footer-logo {
  display: none;
  flex-shrink: 0;
  width: 60px;
  height: 60px;
}

.footer-caption,
.footer-copyright {
  font-size: var(--fs-caption-2);
}

.footer-slogan {
  font-size: var(--fs-subtitle-2);
}

/* 平板 */
@media (min-width: 641px) {
  .app-footer {
    padding: var(--space-20) var(--page-padding-x);
  }
}

/* 桌機（Figma footer/mc 1150:15025）：左品牌、右版權，左右留白同 navbar 寬 */
@media (min-width: 1025px) {
  .app-footer {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-20) var(--navbar-width);
    background-color: var(--brand-secondary);
  }

  .footer-logo {
    display: block;
    mix-blend-mode: multiply;
  }

  /* 遠山放在右側留白裡，不壓到版權文字 */
  .footer-ink__houses {
    width: calc(var(--navbar-width) + 200px);
    height: 100%;
    opacity: 1;
  }

  .footer-ink__birds {
    display: inline;
  }
}
</style>
