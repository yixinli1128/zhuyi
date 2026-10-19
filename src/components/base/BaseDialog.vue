<script setup>
// Figma Dialog（確定要登出嗎？／確定要刪除帳號嗎？）：標題列＋內容＋底部按鈕
//   <BaseDialog v-model:open="open" title="確定要登出嗎？" description="...">
//     內容（可省略）
//     <template #footer><BaseButton>...</BaseButton></template>
//   </BaseDialog>
// 點遮罩、右上角 ✕ 或按 Esc 都會關閉
import { onBeforeUnmount, useId, watch } from 'vue'

const open = defineModel('open', { type: Boolean, default: false })

defineProps({
  title: {
    type: String,
    required: true,
  },
  description: String,
  width: {
    type: Number,
    default: 480,
  },
})

const titleId = useId()

function close() {
  open.value = false
}

function onKeydown(event) {
  if (event.key === 'Escape') close()
}

// 開著的時候鎖住背景捲動、監聽 Esc
watch(open, (value) => {
  document.body.style.overflow = value ? 'hidden' : ''
  if (value) window.addEventListener('keydown', onKeydown)
  else window.removeEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="open" class="dialog-overlay" @click.self="close">
        <div
          class="dialog"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :style="{ maxWidth: `${width}px` }"
        >
          <header class="dialog__header" :class="{ 'has-body': $slots.default }">
            <div class="dialog__heading">
              <h2 :id="titleId" class="dialog__title">{{ title }}</h2>
              <p v-if="description" class="dialog__desc">{{ description }}</p>
            </div>
            <button type="button" class="dialog__close" aria-label="關閉" @click="close">
              <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </header>

          <div v-if="$slots.default" class="dialog__body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="dialog__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-20);
  background: rgba(31, 26, 41, 0.38);
}

.dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 100%; /* 內容太長時只捲動中間 */
  background: var(--bg-surface);
  border: 1px solid var(--brand-secondary);
  border-radius: 12px 0;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-16);
  padding: var(--space-20) var(--space-24);
}

.dialog__header.has-body {
  border-bottom: 1px solid var(--brand-secondary);
}

.dialog__heading {
  display: flex;
  flex-direction: column;
  gap: 6px;
  line-height: normal;
}

.dialog__title {
  font-size: var(--fs-subtitle-1);
  font-weight: 400;
  color: var(--text-title);
}

.dialog__desc {
  font-size: var(--fs-caption-2);
  color: var(--text-secondary);
}

.dialog__close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  font-size: 20px;
  line-height: 1;
  color: var(--text-body);
}

.dialog__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
  padding: var(--space-24);
  overflow-y: auto;
}

.dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-8);
  padding: var(--space-12) var(--space-24);
  border-top: 1px solid var(--brand-secondary);
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}
</style>
