<script setup>
// Figma 首頁「當季時蔬」輪播：一次介紹一種食材，左邊輪播它的 3 道推薦菜色，下方圓點切換菜色
// 每 3 秒自動換下一道、播到最後一道再回到第一道循環；滑鼠移入或鍵盤聚焦時暫停，系統設定「減少動態」時不自動播放
// 換食材（點下方食材卡）時從第一道菜重新開始
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  veg: {
    type: Object,
    required: true,
  },
})

const INTERVAL = 3000

const current = ref(0)
const paused = ref(false)
const dish = computed(() => props.veg.dishPhotos[current.value])

let timer = null
let autoplay = false

function goTo(index) {
  const total = props.veg.dishPhotos.length
  current.value = (index + total) % total
}

function start() {
  stop()
  if (!autoplay) return
  timer = setInterval(() => {
    if (!paused.value) goTo(current.value + 1)
  }, INTERVAL)
}

function stop() {
  clearInterval(timer)
  timer = null
}

// 手動點圓點後重新計時，免得剛點完馬上又被換掉
function select(index) {
  goTo(index)
  start()
}

watch(
  () => props.veg.no,
  () => {
    current.value = 0
    start()
  },
)

onMounted(() => {
  autoplay = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  start()
})

onBeforeUnmount(stop)
</script>

<template>
  <div
    class="season-carousel"
    role="region"
    aria-roledescription="carousel"
    :aria-label="`${veg.name}推薦菜色`"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
    @focusin="paused = true"
    @focusout="paused = false"
  >
    <div class="season-carousel__image">
      <Transition name="season-fade" mode="out-in">
        <img :key="dish.name" :src="dish.imageUrl" :alt="dish.name" />
      </Transition>
    </div>

    <div class="season-carousel__text">
      <Transition name="season-fade" mode="out-in">
        <div :key="veg.no" class="season-carousel__content">
          <p class="season-carousel__meta">
            <span>{{ veg.no }} // {{ veg.trait }}</span>
            <span>{{ veg.origin }}</span>
          </p>
          <h3 class="season-carousel__name">{{ veg.name }}</h3>
          <p class="season-carousel__intro">{{ veg.intro }}</p>
          <div class="season-carousel__dishes">
            <p class="season-carousel__label">推薦菜色 :</p>
            <p class="season-carousel__list">
              <template v-for="(item, index) in veg.dishPhotos" :key="item.name">
                <span v-if="index" class="season-carousel__separator" aria-hidden="true">、</span>
                <button
                  type="button"
                  class="season-carousel__dish-button"
                  :class="{ 'is-active': index === current }"
                  :aria-pressed="index === current"
                  @click="select(index)"
                >
                  {{ item.name }}
                </button>
              </template>
            </p>
          </div>
        </div>
      </Transition>

      <div class="season-carousel__dots">
        <button
          v-for="(item, index) in veg.dishPhotos"
          :key="item.name"
          type="button"
          class="season-carousel__dot"
          :class="{ 'is-active': index === current }"
          :aria-label="`第 ${index + 1} 道：${item.name}`"
          :aria-current="index === current ? 'true' : undefined"
          @click="select(index)"
        ></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 手機、平板的字級和間距用 vw 等比縮小；放得下兩欄（各 240px）就左圖右文並排，手機直式才上下排 */
.season-carousel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-20) clamp(20px, 3.5vw, 36px);
}

.season-carousel__image {
  flex: 1 1 240px;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  border-radius: 12px 0;
  background: var(--brand-secondary-light);
}

.season-carousel__image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.season-carousel__text {
  flex: 1 1 240px;
  display: flex;
  flex-direction: column;
  gap: clamp(12px, 2vw, 20px);
}

.season-carousel__content {
  display: flex;
  flex-direction: column;
  gap: clamp(12px, 2vw, 20px);
}

.season-carousel__meta {
  display: flex;
  justify-content: space-between;
  gap: var(--space-8);
  padding-bottom: 9px;
  border-bottom: 1px solid var(--brand-special);
  font-size: var(--fs-caption-2);
  color: var(--text-special);
}

.season-carousel__name {
  font-size: clamp(20px, 2.6vw, 26px);
  font-weight: 700;
  color: var(--text-title);
}

.season-carousel__intro {
  font-size: clamp(14px, 1.7vw, 16px);
  line-height: 1.6;
  text-indent: 2em;
  color: var(--text-body);
}

.season-carousel__dishes {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.season-carousel__label {
  font-size: clamp(14px, 1.6vw, 16px);
  color: var(--text-title);
}

.season-carousel__list {
  font-size: clamp(15px, 2.1vw, 20px);
  color: var(--text-body);
}

/* 菜名底線：用背景畫 1px 細線，寬度從 0 長到 100% */
.season-carousel__dish-button {
  padding: 0 0 4px;
  border: 0;
  background-color: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  padding-bottom: 4px;
  background: linear-gradient(var(--brand-special), var(--brand-special)) no-repeat right bottom / 0 1px;
  transition: background-size 0.4s ease;
}

/* 目前照片上的那道菜：線從左滑到右；換下一道時往右收掉 */
.season-carousel__dish-button.is-active {
  background-position: left bottom;
  background-size: 100% 1px;
}

.season-carousel__dish-button:hover {
  color: var(--text-title);
}

.season-carousel__dish-button:focus-visible {
  outline: 2px solid var(--brand-special);
  outline-offset: 4px;
}

/* 圓點放在切換動畫外面，換頁時按鈕不會重建、鍵盤焦點不會跑掉 */
.season-carousel__dots {
  display: flex;
  align-items: center;
  gap: var(--space-8);
}

.season-carousel__dot {
  width: 8px;
  height: 8px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: var(--brand-primary-border);
  cursor: pointer;
  transition: width 0.3s, background-color 0.3s;
}

.season-carousel__dot.is-active {
  width: 24px;
  background: var(--brand-primary);
}

.season-carousel__dot:focus-visible {
  outline: 2px solid var(--brand-special);
  outline-offset: 3px;
}

.season-fade-enter-active,
.season-fade-leave-active {
  transition: opacity 0.4s ease;
}

.season-fade-enter-from,
.season-fade-leave-to {
  opacity: 0;
}

/* 桌機：Figma 1920 的尺寸 */
@media (min-width: 1025px) {
  .season-carousel {
    gap: var(--space-24) clamp(32px, 3.125vw, 60px);
  }

  .season-carousel__text,
  .season-carousel__content {
    gap: var(--space-24);
  }

  .season-carousel__name {
    font-size: clamp(24px, 1.67vw, 32px);
  }

  .season-carousel__intro,
  .season-carousel__label {
    font-size: var(--fs-body-1);
  }

  .season-carousel__dishes {
    padding-top: var(--space-8);
  }

  .season-carousel__list {
    font-size: clamp(17px, 1.3vw, 20px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .season-fade-enter-active,
  .season-fade-leave-active,
  .season-carousel__dot,
  .season-carousel__dish-button {
    transition: none;
  }
}

</style>
