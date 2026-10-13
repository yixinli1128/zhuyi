<script setup>
// 日期選擇月曆（依 Figma 排餐月曆）：浮在觸發欄位下方，月份切換、狀態同餐食日誌月曆（滑過淺米色、選取灰藍色）、取消／確認
//   <DatePickerDialog v-model:open="open" :anchor="fieldEl" :value="date" :min="today" @confirm="date = $event" />
// anchor：月曆要貼齊的元素；下方空間不夠時改浮在上方。點月曆外面或按 Esc 會收起。
// autoClose=false 時由外層決定確認後是否關閉（例：日期已有餐單時保留月曆）
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import BaseButton from './BaseButton.vue'
import { fromDateKey, toDateKey } from '@/utils/date'

const open = defineModel('open', { type: Boolean, default: false })
const props = defineProps({
  value: { type: String, default: '' },
  min: String,
  max: String,
  // 已有安排的日期，數字下方加一個小點
  marked: { type: Array, default: () => [] },
  title: { type: String, default: '選擇日期' },
  confirmLabel: { type: String, default: '確認' },
  autoClose: { type: Boolean, default: true },
  anchor: { type: Object, default: null },
})
const emit = defineEmits(['confirm'])

const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const today = toDateKey()
const selected = ref('')
const month = ref(new Date())
const panel = ref(null)
const position = ref({ top: 0, left: 0, width: 360 })

// 依觸發元素位置計算月曆座標（fixed），左右不超出畫面
function place() {
  const anchorEl = props.anchor?.$el ?? props.anchor
  if (!anchorEl?.getBoundingClientRect) return
  const rect = anchorEl.getBoundingClientRect()
  const gap = 8
  const width = Math.min(360, window.innerWidth - 32)
  const height = panel.value?.offsetHeight ?? 420
  let left = rect.left
  if (left + width > window.innerWidth - 16) left = rect.right - width
  left = Math.max(16, Math.min(left, window.innerWidth - width - 16))
  let top = rect.bottom + gap
  if (top + height > window.innerHeight - gap && rect.top - height - gap > gap) top = rect.top - height - gap
  position.value = { top, left, width }
}

function onOutside(event) {
  const anchorEl = props.anchor?.$el ?? props.anchor
  if (panel.value?.contains(event.target) || anchorEl?.contains?.(event.target)) return
  open.value = false
}

function listen(on) {
  const method = on ? 'addEventListener' : 'removeEventListener'
  window[method]('scroll', place, true)
  window[method]('resize', place)
  document[method]('pointerdown', onOutside, true)
}

watch(open, async (isOpen) => {
  listen(false)
  if (!isOpen) return
  selected.value = props.value || (props.min && props.min > today ? props.min : today)
  const date = fromDateKey(selected.value)
  month.value = new Date(date.getFullYear(), date.getMonth(), 1)
  place()
  await nextTick()
  place()
  listen(true)
  panel.value?.focus({ preventScroll: true })
}, { immediate: true })
watch(month, () => nextTick(place))
onBeforeUnmount(() => listen(false))

const monthLabel = computed(() => `${month.value.getFullYear()} 年 ${month.value.getMonth() + 1} 月`)
const markedSet = computed(() => new Set(props.marked))
// 只顯示本月日期，月初前、月底後留白
const cells = computed(() => {
  const year = month.value.getFullYear()
  const monthIndex = month.value.getMonth()
  const blanks = new Date(year, monthIndex, 1).getDay()
  const total = new Date(year, monthIndex + 1, 0).getDate()
  const list = Array.from({ length: blanks }, (_, index) => ({ key: `blank-${index}`, blank: true }))
  for (let day = 1; day <= total; day += 1) {
    const key = toDateKey(new Date(year, monthIndex, day))
    list.push({ key, number: day, disabled: (props.min && key < props.min) || (props.max && key > props.max) })
  }
  return list
})

function shiftMonth(step) {
  month.value = new Date(month.value.getFullYear(), month.value.getMonth() + step, 1)
}

function confirm() {
  if (!selected.value) return
  emit('confirm', selected.value)
  if (props.autoClose) open.value = false
}
</script>

<template>
  <Teleport to="body">
    <Transition name="date-picker">
        <section
          v-if="open"
          ref="panel"
          class="date-picker__panel"
          :style="{ top: `${position.top}px`, left: `${position.left}px`, width: `${position.width}px` }"
          role="dialog"
          :aria-label="title"
          tabindex="-1"
          @keydown.esc.stop="open = false"
        >
          <header class="date-picker__header">
            <button type="button" aria-label="上個月" @click="shiftMonth(-1)"><i class="fa-solid fa-chevron-left"></i></button>
            <h3>{{ monthLabel }}</h3>
            <button type="button" aria-label="下個月" @click="shiftMonth(1)"><i class="fa-solid fa-chevron-right"></i></button>
          </header>
          <div class="date-picker__weekdays" aria-hidden="true">
            <span v-for="day in weekdays" :key="day">{{ day }}</span>
          </div>
          <div class="date-picker__days">
            <template v-for="cell in cells" :key="cell.key">
              <span v-if="cell.blank" aria-hidden="true"></span>
              <button
                v-else
                type="button"
                :class="{
                  'is-today': cell.key === today,
                  'is-selected': cell.key === selected,
                  'has-mark': markedSet.has(cell.key),
                }"
                :disabled="cell.disabled"
                :aria-pressed="cell.key === selected"
                :aria-label="`${cell.key}${markedSet.has(cell.key) ? ' 已有餐單' : ''}`"
                @click="selected = cell.key"
              >
                {{ cell.number }}
              </button>
            </template>
          </div>
          <footer class="date-picker__actions">
            <BaseButton variant="secondary" type="button" @click="open = false">取消</BaseButton>
            <BaseButton type="button" @click="confirm">{{ confirmLabel }}</BaseButton>
          </footer>
        </section>
    </Transition>
  </Teleport>
</template>

<style scoped>
.date-picker__panel {
  position: fixed;
  z-index: 80;
  padding: 20px 18px 16px;
  border: 1px solid var(--brand-secondary);
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 12px 32px rgb(52 38 28 / 0.16);
  outline: none;
}

.date-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.date-picker__header h3 {
  color: var(--text-body);
  font-size: 18px;
  font-weight: 400;
  letter-spacing: 0.5px;
}

.date-picker__header button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 50%;
  color: var(--text-secondary);
  font-size: 12px;
}

.date-picker__header button:hover {
  background: var(--brand-secondary-light);
}

.date-picker__weekdays,
.date-picker__days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  justify-items: center;
}

.date-picker__weekdays {
  margin-bottom: 6px;
  color: var(--text-placeholder);
  font-size: 13px;
}

.date-picker__weekdays span {
  padding: 6px 0;
}

.date-picker__days {
  row-gap: 4px;
}

.date-picker__days button {
  position: relative;
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 50%;
  color: var(--text-body);
  font-size: 15px;
}

/* 點選後直接變咖啡色實心，不顯示外框（鍵盤操作時才顯示焦點框） */
.date-picker__days button:focus {
  outline: none;
}

.date-picker__days button:focus-visible {
  outline: 2px solid var(--brand-special);
  outline-offset: 2px;
}

.date-picker__days button:hover:not(:disabled):not(.is-selected) {
  background: var(--brand-secondary-light);
}

/* 選取日：跟餐食日誌月曆一樣用灰藍色 */
.date-picker__days button.is-selected {
  border-color: var(--brand-special);
  background: var(--brand-special);
  color: #fff;
}

/* 有餐單的日期：數字稍微上移，小點離外框留點距離 */
.date-picker__days button.has-mark {
  padding-bottom: 5px;
}

.date-picker__days button.has-mark::after {
  position: absolute;
  bottom: 8px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--brand-primary);
  content: '';
}

.date-picker__days button.is-selected::after {
  background: #fff;
}

.date-picker__days button:disabled {
  color: var(--brand-secondary);
  cursor: not-allowed;
}

.date-picker__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

.date-picker-enter-active,
.date-picker-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.date-picker-enter-from,
.date-picker-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 640px) {
  .date-picker__panel {
    padding: 20px 14px 16px;
  }

  .date-picker__days button {
    width: 36px;
    height: 36px;
    font-size: 14px;
  }
}
</style>
