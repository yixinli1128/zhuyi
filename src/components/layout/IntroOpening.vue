<script setup>
// 開場動畫畫面：點描版畫風格
// 散落的墨點繞成一圈圈橢圓漩渦往中心收，再聚成一只有蓋的湯鍋，鍋蓋冒出點點熱氣
// 四周配上細十字線和字距拉開的小字，像一張雜誌版畫
import { onBeforeUnmount, onMounted, ref } from 'vue'

const canvas = ref(null)

const INK = [90, 70, 54]

let raf = 0
let cleanup = null

// 固定種子的亂數，每次播出來的圖都一樣
function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const easeOut = (t) => 1 - (1 - t) ** 3
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))

// ---------- 鍋子的點（以鍋身中心為原點，y 向下）----------
const R = 120
const R2 = 106
const RIM_Y = -28
const RY = 24
const BOT_Y = 70

function potPoints(rand) {
  const pts = []
  const add = (x, y, dark) => pts.push({ x, y, size: dark > 1.1 ? 1.6 : 1.2 })

  // 鍋身：左邊和兩側比較暗，鍋底和鍋緣下方加深
  for (let i = 0; i < 14000; i++) {
    const u = rand() * 2 - 1
    const f = rand()
    const w = R - (R - R2) * f
    const yTop = RIM_Y + RY * Math.sqrt(1 - u * u)
    const yBot = BOT_Y + RY * 0.9 * Math.sqrt(1 - u * u)
    let shade = 0.12 + 0.75 * Math.abs(u) ** 2.4 + (u < 0 ? 0.35 * -u : 0)
    if (f > 0.86) shade += 0.35
    if (f < 0.1) shade += 0.55
    if (f > 0.42 && f < 0.47) shade += 0.4
    if (rand() < shade * 0.75) add(u * w, yTop + (yBot - yTop) * f, shade)
  }

  // 鍋蓋：圓頂，邊緣深、右上方受光
  for (let i = 0; i < 11000; i++) {
    const u = rand() * 2 - 1
    const g = rand()
    const k = Math.sqrt(1 - u * u)
    const yBase = RIM_Y + RY * k
    const yTopDome = RIM_Y - RY * k - 70 * (1 - u * u) ** 0.8
    let shade = 0.08 + 0.7 * Math.abs(u) ** 2.2 + (u < 0 ? 0.3 * -u : 0)
    if (g < 0.12) shade += 0.6
    if (g > 0.55 && u > -0.1 && u < 0.5) shade -= 0.08
    if (rand() < shade * 0.7) add(u * R * 1.03, yBase + (yTopDome - yBase) * g, shade)
  }

  // 鍋緣的線
  for (let i = 0; i < 420; i++) {
    const a = rand() * Math.PI
    add(Math.cos(a) * R * 1.05 + (rand() - 0.5) * 2, RIM_Y + Math.sin(a) * RY * 1.08 + (rand() - 0.5) * 2.5, 1.2)
  }

  // 蓋子的提把
  const knobY = RIM_Y - RY - 78
  for (let i = 0; i < 420; i++) {
    const a = rand() * Math.PI * 2
    const r = Math.sqrt(rand())
    add(Math.cos(a) * 14 * r, knobY + Math.sin(a) * 7 * r, 1.2)
  }
  for (let i = 0; i < 120; i++) add((rand() - 0.5) * 8, knobY + rand() * 10, 1.2)

  // 兩側把手
  for (const side of [-1, 1]) {
    for (let i = 0; i < 260; i++) {
      const a = Math.PI / 2 + rand() * Math.PI
      const r = 15 + rand() * 4
      add(side * (R + 6 - Math.cos(a) * r * 1.1), -6 + Math.sin(a) * r * 0.8, 1.2)
    }
  }
  return pts
}

onMounted(() => {
  const el = canvas.value
  const ctx = el.getContext('2d')
  const rand = seeded(20261012)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  let W = 0
  let H = 0

  function resize() {
    W = el.clientWidth
    H = el.clientHeight
    el.width = W * dpr
    el.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()
  window.addEventListener('resize', resize)

  // 漩渦：分成幾圈，內圈轉得快、外圈慢
  const bands = [150, 185, 225, 270, 320, 380, 450, 530]
  const rings = Array.from({ length: 2600 }, () => {
    const band = bands[Math.floor(rand() ** 1.3 * bands.length)]
    const rx = band + (rand() + rand() + rand() - 1.5) * 18
    return {
      rx,
      a: rand() * Math.PI * 2,
      w: (0.5 + rand() * 0.3) * (170 / rx),
      alpha: 0.25 + 0.65 * (1 - (rx - 150) / 420) * rand() ** 0.5,
      size: rand() < 0.02 ? 2.6 : 1 + rand() * 0.8,
    }
  })

  // 鍋子的點：從漩渦外圈飛進來就位
  const pot = potPoints(rand).map((p) => {
    const a = rand() * Math.PI * 2
    const r = 260 + rand() * 260
    return {
      ...p,
      sx: Math.cos(a) * r,
      sy: Math.sin(a) * r * 0.3 + 78,
      delay: 0.8 + rand() * 1.1,
      keep: rand(),
      curl: (rand() - 0.5) * 80,
    }
  })

  // 熱氣：從提把往上飄的點
  const steam = Array.from({ length: 200 }, () => ({
    lane: Math.floor(rand() * 3) - 1,
    t0: 2.3 + rand() * 2.6,
    life: 1.8 + rand() * 0.9,
    jitter: (rand() - 0.5) * 2.5,
  }))

  // 外圍幾條細的虛線弧
  const arcs = [
    { r: 300, from: 3.6, len: 1.3, w: 0.06 },
    { r: 360, from: 4.7, len: 1.1, w: -0.05 },
    { r: 430, from: 3.3, len: 1.6, w: 0.04 },
    { r: 460, from: 5.4, len: 0.9, w: -0.03 },
  ]

  const start = performance.now()
  let last = start

  function frame(now) {
    const t = (now - start) / 1000
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now

    // 手機畫面窄，鍋子放大一點，漩渦外圈超出畫面沒關係
    const s = W < 768 ? Math.min(W / 620, H / 720) : Math.min(W / 900, H / 800)
    // 畫面小時點會擠成一團，按比例少畫一些
    const keep = clamp((s / 0.95) ** 1.3, 0.4, 1)
    const cx = W / 2
    // 電腦版整體往下放，上方多留一些空白
    const cy = H * (W < 768 ? 0.5 : 0.56)

    // 用透明度慢慢擦掉上一格，讓動的點留下拖尾，像漩渦的筆觸
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.fillRect(0, 0, W, H)
    ctx.globalCompositeOperation = 'source-over'

    const ink = (a) => `rgba(${INK[0]},${INK[1]},${INK[2]},${a})`

    // 外圍虛線弧
    const arcIn = easeOut(clamp((t - 0.3) / 1.4))
    ctx.setLineDash([1.2, 6])
    ctx.lineWidth = 1
    for (const arc of arcs) {
      ctx.strokeStyle = ink(0.35 * arcIn)
      ctx.beginPath()
      ctx.ellipse(cx, cy + 10 * s, arc.r * s, arc.r * s * 0.82, 0, arc.from + arc.w * t, arc.from + arc.w * t + arc.len * arcIn)
      ctx.stroke()
    }
    ctx.setLineDash([])

    // 漩渦：一開始散在外面，1.6 秒內收攏成圈
    const gather = easeOut(clamp(t / 1.8))
    const fadeIn = clamp(t / 0.5)
    const potIn = clamp((t - 1.2) / 1.2)

    const drawRing = (front) => {
      for (const p of rings) {
        p.a += p.w * dt
        const sin = Math.sin(p.a)
        if (front !== sin > 0) continue
        const spread = 1 + 1.6 * (1 - gather)
        const x = cx + Math.cos(p.a) * p.rx * spread * s
        const y = cy + (78 + sin * p.rx * 0.27 * spread) * s
        // 鍋子成形後，被鍋身擋住的後排點就不畫
        if (!front && potIn > 0.5 && Math.abs(x - cx) < R * s && y < cy + BOT_Y * s) continue
        ctx.fillStyle = ink(p.alpha * fadeIn)
        ctx.fillRect(x, y, p.size, p.size)
      }
    }

    drawRing(false)

    for (const p of pot) {
      if (p.keep > keep) continue
      const k = clamp((t - p.delay) / 0.9)
      if (k <= 0) continue
      const e = easeOut(k)
      const bend = Math.sin(Math.PI * e) * p.curl
      const x = cx + (p.sx + (p.x - p.sx) * e + bend) * s
      const y = cy + (p.sy + (p.y - p.sy) * e - bend * 0.3) * s
      ctx.fillStyle = ink(0.35 + 0.6 * e)
      ctx.fillRect(x, y, p.size, p.size)
    }

    drawRing(true)

    // 熱氣
    for (const p of steam) {
      const k = (t - p.t0) / p.life
      if (k <= 0 || k >= 1) continue
      const rise = k * 90
      // 每一縷沿著同一條 S 形往上，點排起來就像一縷縷煙
      const x = cx + (p.lane * 18 + Math.sin(rise * 0.075 + p.lane * 2 + t * 1.2) * (4 + rise * 0.1) + p.jitter) * s
      const y = cy + (RIM_Y - RY - 92 - rise) * s
      ctx.fillStyle = ink(0.75 * Math.sin(Math.PI * k))
      ctx.fillRect(x, y, 1.6, 1.6)
    }

    raf = requestAnimationFrame(frame)
  }

  raf = requestAnimationFrame(frame)

  cleanup = () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
  }
})

onBeforeUnmount(() => cleanup?.())
</script>

<template>
  <div class="opening" aria-hidden="true">
    <canvas ref="canvas" class="opening__canvas"></canvas>

    <span class="opening__line opening__line--h"></span>
    <span class="opening__line opening__line--v"></span>

    <p class="opening__title">
      <span>煮</span>
      <span>意</span>
      <span class="opening__title-en">ZHUYI</span>
    </p>

    <p class="opening__side">HOME · COOKING · CARE</p>

    <p class="opening__coord">
      <span>Food is not just fuel,</span>
      <span>it's memory.</span>
    </p>

    <p class="opening__tagline">每天一點煮意 · 一桌家的心意</p>
  </div>
</template>

<style scoped>
.opening {
  --ink: rgb(90, 70, 54);

  position: absolute;
  inset: 0;
  color: var(--ink);
  overflow: hidden;
}

/* 紙的顆粒 */
.opening::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.42 0 0 0 0 0.36 0 0 0 0 0.3 0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: 0.35;
  mix-blend-mode: multiply;
}

.opening__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* ---------- 細十字線 ---------- */
.opening__line {
  position: absolute;
  background: var(--ink);
  opacity: 0.35;
}

.opening__line--h {
  top: 46%;
  left: 6%;
  right: 6%;
  height: 1px;
  transform: scaleX(0);
  animation: opening-line-x 1.6s cubic-bezier(0.6, 0, 0.2, 1) 0.2s forwards;
}

.opening__line--v {
  left: 50%;
  top: 4%;
  height: 18%;
  width: 1px;
  transform: scaleY(0);
  transform-origin: top;
  animation: opening-line-y 1.2s cubic-bezier(0.6, 0, 0.2, 1) 0.5s forwards;
}

/* ---------- 文字 ---------- */
.opening__title,
.opening__side,
.opening__coord,
.opening__tagline {
  position: absolute;
  margin: 0;
  opacity: 0;
  animation: opening-text 1s ease forwards;
}

.opening__title {
  top: 6%;
  left: calc(50% + 14px);
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 15px;
  letter-spacing: 0.4em;
  animation-delay: 1s;
}

.opening__title-en {
  margin-top: 6px;
  font-size: 11px;
  letter-spacing: 0.5em;
}

.opening__side {
  top: 22%;
  left: 7%;
  writing-mode: vertical-rl;
  font-size: 10px;
  letter-spacing: 0.5em;
  animation-delay: 1.4s;
}

.opening__coord {
  top: calc(46% + 10px);
  right: 9%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  letter-spacing: 0.25em;
  animation-delay: 1.7s;
}

.opening__coord span:last-child {
  padding-left: 2.5em;
}

.opening__tagline {
  bottom: 8%;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 13px;
  letter-spacing: 1.2em;
  animation-delay: 2.6s;
}

@keyframes opening-line-x {
  to {
    transform: scaleX(1);
  }
}

@keyframes opening-line-y {
  to {
    transform: scaleY(1);
  }
}

@keyframes opening-text {
  to {
    opacity: 1;
  }
}

/* 電腦版：配合鍋子往下移，上方留白多一點 */
@media (min-width: 768px) {
  .opening__line--h {
    top: 52%;
  }

  .opening__line--v {
    top: 10%;
  }

  .opening__title {
    top: 12%;
  }

  .opening__side {
    top: 30%;
  }

  .opening__coord {
    top: calc(52% + 10px);
  }
}

@media (max-width: 767px) {
  .opening__side {
    top: 8%;
    left: 5%;
  }

  .opening__coord {
    top: auto;
    bottom: 22%;
    right: 6%;
    font-size: 10px;
  }

  .opening__tagline {
    font-size: 12px;
    letter-spacing: 0.6em;
  }
}
</style>
