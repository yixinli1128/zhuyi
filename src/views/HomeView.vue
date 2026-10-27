<script setup>
// 首頁（Figma Desktop - 首頁1 1238:30932）：主視覺、公告、品牌理念、當季時蔬
import heroImg from '@/assets/zhuyi-img/home-hero.webp'
import heroImg2 from '@/assets/zhuyi-img/home-hero2.webp'
import heroImg3 from '@/assets/zhuyi-img/home-hero3.webp'
import heroImg4 from '@/assets/zhuyi-img/home-hero4.webp'
import conceptImg from '@/assets/web/zhuyi-img/home-Concept.webp'
import { onBeforeUnmount, ref } from 'vue'
import seasonalData from '@/data/seasonal.json'
import SeasonCarousel from '@/components/home/SeasonCarousel.vue'
import VegCard from '@/components/home/VegCard.vue'
import HoverText from '@/components/home/HoverText.vue'

// 食材照片抓 zhuyi-img 底下「食材」資料夾，用檔名對應 seasonal.json 的 image
// 推薦菜色照片放在 assets/home/dishes，檔名＝菜名（例：鹽烤茭白筍.webp）
const vegFiles = import.meta.glob('../assets/zhuyi-img/**/食材/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
})
const dishFiles = import.meta.glob('../assets/home/dishes/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
})

function byFileName(files) {
  return Object.fromEntries(Object.entries(files).map(([path, url]) => [path.split('/').pop(), url]))
}

const vegByName = byFileName(vegFiles)
// 縮小過的 WebP（scripts/optimize-images.py 產生），同名的話優先用
const webVegByStem = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/web/zhuyi-img/**/食材/*.webp', { eager: true, import: 'default' }))
    .map(([path, url]) => [path.split('/').pop().replace('.webp', ''), url]),
)
const dishByName = byFileName(dishFiles)

const seasonal = seasonalData.map((veg) => ({
  ...veg,
  imageUrl: webVegByStem[String(veg.image).replace(/\.[^.]+$/, '')] ?? vegByName[veg.image] ?? '',
  dishPhotos: veg.dishes.map((name) => ({ name, imageUrl: dishByName[`${name}.webp`] ?? '' })),
}))

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// 目前輪播的食材；點下方食材卡就換過去，並捲回輪播
const activeVeg = ref(0)
const carouselRef = ref(null)

function selectVeg(index) {
  activeVeg.value = index
  carouselRef.value?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
}

// 捲動進場：區塊進到畫面才淡入上浮，只播一次；v-reveal="120" 是延遲毫秒，用來做前後錯開
// 系統設定「減少動態」時不做任何處理，內容直接顯示
const revealObserver = reduceMotion
  ? null
  : new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-revealed')
          revealObserver.unobserve(entry.target)
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px' },
    )

const vReveal = {
  created(el, { value }) {
    if (!revealObserver) return
    el.classList.add('reveal')
    if (value) el.style.transitionDelay = `${value}ms`
  },
  mounted(el) {
    revealObserver?.observe(el)
  },
  unmounted(el) {
    revealObserver?.unobserve(el)
  },
}

onBeforeUnmount(() => revealObserver?.disconnect())

// 主視覺輪播：每 5 秒換一張，大圖與標語卡底圖一起淡入淡出
const heroSlides = [
  { src: heroImg, alt: '木桌上擺著白飯、熱湯與幾道家常菜' },
  { src: heroImg2, alt: '一桌家常料理' },
  { src: heroImg3, alt: '一桌家常料理' },
  { src: heroImg4, alt: '一桌家常料理' },
]
const heroIndex = ref(0)
const heroTimer = setInterval(() => {
  heroIndex.value = (heroIndex.value + 1) % heroSlides.length
}, 5000)

onBeforeUnmount(() => clearInterval(heroTimer))

const announcement = '2026.10.01 「秋季當令餐單」上線：自動適配當季茭白筍、芋頭與蓮藕，減鹽低卡無負擔。'

const pillars = [
  { title: '主意 · ZERO FATIGUE', desc: '靈感隨心生。根據冰箱常備、時令節氣自動配餐，不再苦惱菜色搭配。' },
  { title: '心意 · THOUGHTFUL', desc: '細膩顧及每位成員。寶寶副食品、長輩少鹽、伴侶抗敏，一鍋兼顧。' },
]
</script>

<template>
  <div class="home">
    <!-- 主視覺：大圖右下角挖空（slot 的底色），放半透明標語卡 -->
    <section class="home-hero">
      <div class="home-hero__stage">
        <div class="home-hero__photo">
          <img
            v-for="(slide, index) in heroSlides"
            :key="slide.src"
            :src="slide.src"
            :alt="index === heroIndex ? slide.alt : ''"
            :aria-hidden="index !== heroIndex"
            :class="{ 'is-current': index === heroIndex }"
          />
        </div>
        <div class="home-hero__slot">
          <div class="home-hero__card">
            <img
              v-for="(slide, index) in heroSlides"
              :key="slide.src"
              class="home-hero__card-bg"
              :class="{ 'is-current': index === heroIndex }"
              :src="slide.src"
              alt=""
              aria-hidden="true"
            />
            <div class="home-hero__card-content">
              <h1 class="home-hero__title">
                <span class="home-hero__title-strong"><HoverText text="每天一點煮意，" auto /></span>
                <span class="home-hero__title-end"><HoverText text="一桌家的心意。" auto :start="6" /></span>
              </h1>
              <p class="home-hero__desc">
                專為現代小家庭設計的一站式家庭配餐幫手。告別每日「今天晚上煮什麼」的疲倦與焦慮，在極簡的留白裡，重獲圍坐一桌的溫熱心意。
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 公告列：寬度跟主要內容一樣 -->
    <aside v-reveal class="home-notice" aria-label="最新公告">
      <span class="home-notice__badge">
        <span class="home-notice__dot" aria-hidden="true"></span>
        公告
      </span>
      <!-- 手機版是跑馬燈：文字放兩份接成一圈，第二份只是視覺用 -->
      <p class="home-notice__text">
        <span class="home-notice__track">
          <span>{{ announcement }}</span>
          <span class="home-notice__copy" aria-hidden="true">{{ announcement }}</span>
        </span>
      </p>
    </aside>

    <!-- 品牌理念 -->
    <section class="home-section home-essay" aria-labelledby="home-essay-title">
      <p v-reveal class="home-tag">ESSAY &amp; ESSENCE // 品牌理念與初心</p>

      <div class="home-essay__grid">
        <div v-reveal class="home-essay__text">
          <h2 id="home-essay-title" class="home-heading home-essay__heading">
            <span><HoverText text="「煮」是煙火溫度，" /></span>
            <span class="home-essay__heading-end"><HoverText text="「意」是巧思與心意。" /></span>
          </h2>

          <div class="home-essay__paragraphs">
            <p class="is-indent">
              在快節奏的當代都市裡，一家人圍坐吃頓飯成了最奢侈的奢侈品。我們深知做飯的疲憊，往往不是站在爐灶前的那半小時，而是從下午三點就開始縈繞的焦慮——「今天晚上到底煮什麼？」
            </p>
            <p>
              「煮意」因此誕生：讓「主意」交由智慧系統打理，過濾過敏忌口、精算當令時蔬；而你，只管專心交付那份親手為家人端出熱湯的「意」。
            </p>
          </div>

          <ul class="home-essay__pillars">
            <li v-for="pillar in pillars" :key="pillar.title" class="home-essay__pillar">
              <h3 class="home-essay__pillar-title">{{ pillar.title }}</h3>
              <p class="home-essay__pillar-desc">{{ pillar.desc }}</p>
            </li>
          </ul>
        </div>

        <div v-reveal="150" class="home-essay__image">
          <img :src="conceptImg" alt="窗邊木桌上的陶壺、炭爐與當季蔬果" loading="lazy" />
        </div>
      </div>
    </section>

    <!-- 當季時蔬 -->
    <section class="home-section home-season" aria-labelledby="home-season-title">
      <div v-reveal class="home-season__intro">
        <p class="home-tag">HARVEST &amp; CYCLES // 二十四節氣・當季時蔬</p>
        <h2 id="home-season-title" class="home-heading">
          <span><HoverText text="大地的旬味手帖，" /></span>
          <span class="home-season__heading-sub"><HoverText text="順應時序，即是最高明的調味。" /></span>
        </h2>
        <p class="home-season__desc">
          當季的蔬菜在最合適的溫濕度下成長，甘味最足、農藥最低，更是大自然給予換季體質的溫潤解方。
        </p>
      </div>

      <div ref="carouselRef" v-reveal class="home-season__carousel">
        <SeasonCarousel :veg="seasonal[activeVeg]" />
      </div>

      <div class="home-season__cards">
        <VegCard
          v-for="(veg, index) in seasonal"
          :key="veg.no"
          v-reveal="index * 100"
          :veg="veg"
          :active="index === activeVeg"
          @select="selectVeg(index)"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ---------- 手機 ≤ 640px（預設）：字級、間距跟著螢幕寬度等比縮放 ---------- */
.home {
  padding: 0 var(--page-padding-x);
}

/* 主視覺：手機版照片在上、標語卡疊在照片下緣 */
.home-hero {
  padding-top: var(--space-20);
}

.home-hero__stage {
  position: relative;
  display: flex;
  flex-direction: column;
}

.home-hero__photo {
  position: relative;
  aspect-ratio: 1427 / 640;
  overflow: hidden;
}

/* 輪播的幾張圖疊在一起，只有目前這張不透明 */
.home-hero__photo img {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.home-hero__photo img,
.home-hero__card-bg {
  opacity: 0;
  transition: opacity 1.2s ease;
}

.home-hero__photo img.is-current,
.home-hero__card-bg.is-current {
  opacity: 1;
}

.home-hero__card-bg {
  display: none;
}

/* 標語卡的位置：手機版往上疊進照片下緣（390 寬時約 40px），左邊內縮 */
.home-hero__slot {
  position: relative;
  margin: -10vw 0 0 6vw;
}

.home-hero__card {
  position: relative;
  overflow: hidden;
  background: rgba(250, 247, 243, 0.94);
  box-shadow: 0 10px 15px rgba(51, 36, 26, 0.12);
}

.home-hero__card-content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: clamp(12px, 4vw, 20px);
  padding: clamp(16px, 5.5vw, 24px) clamp(14px, 5vw, 20px);
}

.home-hero__title {
  display: flex;
  flex-direction: column;
  font-size: clamp(20px, 5.8vw, 30px);
  line-height: 1.4;
  letter-spacing: 0.05em;
  color: #2e1c12;
}

.home-hero__title-strong {
  font-weight: 700;
}

.home-hero__title-end {
  align-self: flex-end;
}

.home-hero__desc {
  font-size: clamp(14px, 3.6vw, 16px);
  line-height: 1.6;
  color: #453326;
}

/* 主視覺進場：照片先淡入，標語卡晚一點從下方浮上來 */
@keyframes home-fade-in {
  from {
    opacity: 0;
  }
}

@keyframes home-rise-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
}

.home-hero__photo {
  animation: home-fade-in 1s ease both;
}

.home-hero__card {
  animation: home-rise-in 0.8s ease 0.35s both;
}

/* 捲動進場（搭配 v-reveal） */
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.8s ease,
    transform 0.8s ease;
}

.reveal.is-revealed {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .home-hero__photo,
  .home-hero__card,
  .home-notice__dot {
    animation: none;
  }

  .home-hero__photo img,
  .home-hero__card-bg {
    transition: none;
  }

  .home-tag::after,
  .home-essay__pillar-title,
  .home-essay__image img {
    transition: none;
  }
}

/* 公告列：底色只到主要內容的寬度，不往左右留白延伸 */
.home-notice {
  display: flex;
  align-items: center;
  gap: var(--space-12);
  margin-top: var(--space-40);
  padding: 10px var(--space-8);
  background: var(--brand-secondary-disabled);
  border-radius: 12px 0px 12px 0px ;
}

.home-notice__badge {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 12px;
  background: var(--brand-primary);
  /* 手機公告只是輔助資訊，避免和首頁主內容搶視覺焦點 */
  font-size: 12px;
  color: var(--text-on-primary);
}

.home-notice__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand-secondary-light);
  animation: home-dot-pulse 1.8s ease-in-out infinite alternate;
}

/* 公告圓點：像呼吸一樣慢慢縮放 */
@keyframes home-dot-pulse {
  to {
    opacity: 0.45;
    transform: scale(0.7);
  }
}

/* 手機：公告只留一行，放不下的字用跑馬燈由右往左帶出來；左右兩端淡出 */
.home-notice__text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  /* 公告內文比標籤再小一級，避免在窄手機上顯得像正文。 */
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
  mask-image: linear-gradient(to right, transparent, #000 12px, #000 calc(100% - 24px), transparent);
}

/* 兩份文字各帶一段間隔，往左走半條（剛好一份）就回到原點，接起來看不出斷點 */
.home-notice__track {
  display: inline-flex;
  gap: var(--space-40);
  padding: 0 var(--space-40) 0 var(--space-12);
  animation: home-notice-marquee 18s linear 1.5s infinite;
}

/* 手指按住或滑鼠移上去時先停，方便看清楚 */
.home-notice:hover .home-notice__track {
  animation-play-state: paused;
}

@keyframes home-notice-marquee {
  to {
    transform: translateX(-50%);
  }
}

/* 減少動態：不跑，改回自動換行顯示全文 */
@media (prefers-reduced-motion: reduce) {
  .home-notice__text {
    white-space: normal;
    mask-image: none;
  }

  .home-notice__track {
    display: inline;
    padding: 0;
    animation: none;
  }

  .home-notice__copy {
    display: none;
  }
}

/* 共用：區塊標籤、大標 */
.home-section {
  display: flex;
  flex-direction: column;
}

.home-tag {
  display: flex;
  align-items: center;
  gap: var(--space-16);
  font-size: var(--fs-body-2);
  color: var(--text-secondary);
}

.home-tag::after {
  content: '';
  width: 48px;
  height: 1px;
  background: var(--brand-secondary);
  transition:
    width 0.5s ease,
    background-color 0.5s ease;
}

/* 滑過標籤：後面的短線拉長、變深 */
.home-tag:hover::after {
  width: 96px;
  background: var(--brand-primary);
}

.home-heading {
  display: flex;
  flex-direction: column;
  font-size: clamp(21px, 6vw, 34px);
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: 0.05em;
  color: var(--text-title);
}

/* 品牌理念 */
.home-essay {
  gap: var(--space-28);
  padding: 48px 0;
}

.home-essay__grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-28);
}

/* 手機：文字欄不自成一塊（display: contents），裡面的標題、內文、理念直接跟圖片排在同一欄，
   才能用 order 排成「標題與內文 → 圖片 → 兩個理念」 */
.home-essay__text {
  display: contents;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-28);
}

.home-essay__heading-end {
  align-self: flex-end;
}

.home-essay__paragraphs {
  display: flex;
  flex-direction: column;
  gap: var(--space-24);
  font-size: clamp(14px, 3.9vw, 16px);
  line-height: 1.6;
  color: var(--text-secondary);
}

.home-essay__paragraphs .is-indent {
  text-indent: 2em;
}

.home-essay__pillars {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-16);
  margin: 0;
  padding: 20px 0 0;
  order: 2;
  list-style: none;
  border-top: 1px solid var(--brand-secondary);
}

/* 設成 container，手機版的說明文字才能照欄寬縮放 */
.home-essay__pillar {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  container-type: inline-size;
}

/* 滑過理念：標題底下的細線從左滑到右（跟輪播菜名同一種線） */
.home-essay__pillar-title {
  align-self: flex-start;
  padding-bottom: 4px;
  background: linear-gradient(var(--brand-special), var(--brand-special)) no-repeat right bottom / 0 1px;
  font-size: clamp(14px, 3.7vw, 17px);
  color: var(--text-title);
  transition: background-size 0.4s ease;
}

.home-essay__pillar:hover .home-essay__pillar-title {
  background-position: left bottom;
  background-size: 100% 1px;
}

/* 手機：一行固定排 16 個字（欄寬的 6%），最長的那段 31 個字剛好兩行 */
.home-essay__pillar-desc {
  font-size: min(6cqw, 14px);
  line-height: 1.6;
  color: var(--text-secondary);
}

/* 手機：圖片夾在內文和兩個理念中間 */
.home-essay__image {
  order: 1;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 12px 0;
}

.home-essay__image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.8s ease;
}

/* 滑過圖片：慢慢放大一點（跟食材卡一致） */
.home-essay__image:hover img {
  transform: scale(1.04);
}

/* 當季時蔬 */
.home-season {
  gap: var(--space-28);
  padding: 48px 0;
}

.home-season__intro {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.home-season__heading-sub {
  color: var(--text-secondary);
}

.home-season__desc {
  font-size: var(--fs-body-2);
  line-height: 1.625;
  color: var(--text-secondary);
}

/* 手機版捲回輪播時，別被上方固定的 header 蓋住 */
.home-season__carousel {
  scroll-margin-top: calc(var(--mobile-header-height) + var(--space-16));
}

/* 手機：兩欄，右欄往下錯開一點 */
.home-season__cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-24) var(--space-16);
}

.home-season__cards > :nth-child(even) {
  padding-top: var(--space-24);
}

/* ---------- 平板 641–1024px：版面跟桌機一樣，整體等比縮小 ---------- */
@media (min-width: 641px) {
  .home-hero {
    padding: var(--space-28) 0 var(--space-40);
  }

  /* 照片右下挖空、標語卡疊上去。設成 container，底下的尺寸與位置都用 cqw / cqh 跟著等比縮放
     --hero-x：標語卡左緣在外框寬度的幾成；平板的卡片比桌機寬一點、外框高一點，字才放得下 */
  .home-hero__stage {
    --hero-x: 0.44;
    --hero-frame: 1.54cqw;
    display: block;
    aspect-ratio: 1560 / 900;
    container-type: size;
  }

  .home-hero__photo {
    position: absolute;
    inset: 0 auto auto 0;
    width: 91.47%;
    height: 80%;
    aspect-ratio: auto;
  }

  /* Figma：照片本體是 1560 × 860，比外框（1560 × 800）大，外框只露出左上 1427 × 640；
     標語卡裡放同一張、對齊同一個原點，露出的就是被裁掉的右下角 */
  .home-hero__photo img,
  .home-hero__card-bg {
    position: absolute;
    left: 0;
    top: 0;
    width: 100cqw;
    max-width: none;
    height: 107.5cqh;
    object-fit: cover;
  }

  /* slot 的底色就是照片上的缺口（Figma notch，比卡片往左上多 24px）；
     高度至少到外框一半，字多時連同缺口一起往上長 */
  .home-hero__slot {
    position: absolute;
    left: calc(var(--hero-x) * 100cqw - var(--hero-frame));
    right: 0;
    bottom: 0;
    min-height: calc(50% + var(--hero-frame));
    margin: 0;
    display: flex;
    padding: var(--hero-frame) 0 0 var(--hero-frame);
    background: var(--bg-default);
  }

  .home-hero__card {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: transparent;
  }

  /* 卡片底圖：往左上推回照片原點，再蓋一層米白，看起來像磨砂玻璃。
     用 bottom 定位，卡片往上長高時照片也不會跑掉 */
  .home-hero__card-bg {
    display: block;
    left: calc(var(--hero-x) * -100cqw);
    top: auto;
    bottom: -7.5cqh;
    filter: blur(0.5px);
  }

  .home-hero__card::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(250, 247, 243, 0.72);
  }

  .home-hero__card-content {
    z-index: 1;
    gap: clamp(10px, 1.8vw, 20px);
    padding: clamp(16px, 2.6vw, 28px) clamp(18px, 3vw, 32px);
  }

  .home-hero__title {
    font-size: clamp(20px, 3.1vw, 32px);
  }

  .home-hero__desc {
    font-size: clamp(14px, 1.6vw, 16px);
  }

  .home-notice {
    margin-top: 0;
  }

  .home-notice__badge,
  .home-notice__text {
    font-size: var(--fs-caption-2);
  }

  /* 平板以上放得下，直接顯示全文，不跑馬燈 */
  .home-notice__text {
    overflow: visible;
    white-space: normal;
    mask-image: none;
  }

  .home-notice__track {
    display: inline;
    padding: 0;
    animation: none;
  }

  .home-notice__copy {
    display: none;
  }

  .home-heading {
    font-size: clamp(22px, 3.5vw, 36px);
  }

  .home-essay {
    gap: clamp(28px, 4.5vw, 48px);
    padding: clamp(56px, 9vw, 96px) 0;
  }

  /* 左文字、右圖片並排（7 : 5），不往下疊 */
  .home-essay__grid {
    display: grid;
    grid-template-columns: 7fr 5fr;
    gap: clamp(24px, 4vw, 44px);
  }

  .home-essay__text {
    display: flex;
    gap: clamp(24px, 4vw, 40px);
  }

  .home-essay__paragraphs {
    gap: var(--space-16);
    font-size: clamp(14px, 1.9vw, 18px);
  }

  .home-essay__pillars {
    gap: clamp(12px, 2.4vw, 28px);
  }

  .home-essay__pillar-title {
    font-size: clamp(14px, 1.9vw, 18px);
  }

  .home-essay__pillar-desc {
    font-size: clamp(14px, 1.5vw, 16px);
  }

  .home-essay__image {
    order: 0;
    aspect-ratio: auto;
    min-height: 100%;
  }

  .home-season {
    gap: clamp(28px, 4vw, 40px);
    padding: clamp(56px, 9vw, 96px) 0 var(--space-40);
  }

  .home-season__intro {
    gap: var(--space-20);
  }

  /* 四張卡片一排、高低錯落，間距跟著螢幕縮放 */
  .home-season__cards {
    grid-template-columns: repeat(4, 1fr);
    gap: clamp(16px, 2.8vw, 28px);
  }

  .home-season__cards > :nth-child(4n + 1),
  .home-season__cards > :nth-child(4n) {
    padding-top: 2.5vw;
  }

  .home-season__cards > :nth-child(4n + 2) {
    padding-top: 5vw;
  }

  .home-season__cards > :nth-child(4n + 3) {
    padding-top: 7.5vw;
  }
}

/* ---------- 桌機 ≥ 1025px：以 Figma 1920 為基準，1025–1440 用 vw 等比縮小 ---------- */
@media (min-width: 1025px) {
  .home-hero {
    padding: clamp(32px, 3.125vw, 60px) 0;
  }

  /* Figma：卡片在 830 / 1560，外框 1560 × 800 */
  .home-hero__stage {
    --hero-x: 0.532;
    aspect-ratio: 1560 / 800;
  }

  .home-hero__card-content {
    gap: clamp(16px, 2.08vw, 40px);
    padding: clamp(20px, 2.3vw, 44px) clamp(22px, 2.5vw, 48px) clamp(20px, 2.08vw, 40px);
  }

  .home-hero__title {
    font-size: clamp(22px, 2.08vw, 40px);
  }

  .home-hero__desc {
    font-size: clamp(14px, 1.04vw, 20px);
  }

  .home-heading {
    font-size: clamp(28px, 2.71vw, 52px);
  }

  .home-essay {
    gap: clamp(36px, 3.33vw, 64px);
    padding: clamp(72px, 6.25vw, 120px) 0;
  }

  /* Figma 12 欄：左 7 欄文字、右 5 欄圖片 */
  .home-essay__grid {
    grid-template-columns: repeat(12, 1fr);
    gap: clamp(28px, 3.33vw, 64px);
  }

  .home-essay__text {
    grid-column: span 7;
    gap: clamp(36px, 3.125vw, 60px);
  }

  .home-essay__paragraphs {
    gap: var(--space-24);
    font-size: clamp(15px, 1.25vw, 24px);
  }

  .home-essay__pillars {
    gap: clamp(16px, 2.08vw, 40px);
    padding-top: 25px;
  }

  .home-essay__pillar-title {
    font-size: clamp(15px, 1.25vw, 24px);
  }

  .home-essay__pillar-desc {
    font-size: clamp(14px, 0.83vw, 16px);
  }

  .home-essay__image {
    grid-column: span 5;
  }

  .home-season {
    gap: var(--space-40);
    padding: clamp(72px, 6.25vw, 120px) 0 var(--space-60);
  }

  .home-season__intro {
    gap: var(--space-24);
  }

  .home-season__cards {
    gap: clamp(24px, 3.125vw, 60px);
  }

  .home-season__cards > :nth-child(4n + 1),
  .home-season__cards > :nth-child(4n) {
    padding-top: clamp(20px, 2.08vw, 40px);
  }

  .home-season__cards > :nth-child(4n + 2) {
    padding-top: clamp(40px, 4.17vw, 80px);
  }

  .home-season__cards > :nth-child(4n + 3) {
    padding-top: clamp(60px, 6.25vw, 120px);
  }
}
</style>
