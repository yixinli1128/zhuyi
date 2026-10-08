<script setup>
// Figma menu/guest_setting、menu/need_setting：可展開的設定卡片（＋ 展開、－ 收合）
//   <SettingPanel v-model:open="open" title="本次訪客" :subtitle="...">
//     內容
//     <template #footer>清除／確認按鈕</template>
//   </SettingPanel>
import { useId } from 'vue'

const open = defineModel('open', { type: Boolean, default: false })

defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: String,
  done: Boolean, // 已設定：副標題變成綠色
})

const bodyId = useId()
</script>

<template>
  <section class="panel" :class="{ 'is-open': open }">
    <button type="button" class="panel__header" :aria-expanded="open" :aria-controls="bodyId" @click="open = !open">
      <span class="panel__heading">
        <span class="panel__title">{{ title }}</span>
        <span v-if="subtitle" class="panel__subtitle" :class="{ 'is-done': done }">{{ subtitle }}</span>
      </span>
      <i :class="open ? 'fa-solid fa-minus' : 'fa-solid fa-plus'" class="panel__toggle" aria-hidden="true"></i>
    </button>

    <div v-show="open" :id="bodyId" class="panel__body">
      <slot />
      <div v-if="$slots.footer" class="panel__footer">
        <slot name="footer" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.panel {
  align-self: start;
  border: 1px solid var(--brand-secondary);
  border-radius: 4px;
  background: var(--bg-surface);
}

.panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-16);
  width: 100%;
  padding: var(--space-20) var(--space-20) var(--space-16);
  text-align: left;
}

.panel__heading {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  line-height: normal;
}

.panel__title {
  font-size: var(--fs-subtitle-2);
  color: var(--text-title);
}

.panel__subtitle {
  font-size: var(--fs-caption-2);
  color: var(--text-secondary);
}

.panel__subtitle.is-done {
  color: var(--text-success);
}

.panel__toggle {
  flex-shrink: 0;
  font-size: 20px;
  color: var(--text-body);
}

.panel__header:focus-visible {
  outline: 2px solid var(--brand-special);
  outline-offset: -2px;
}

.panel__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-24);
  margin: 0 var(--space-20);
  padding: var(--space-20) 0;
  border-top: 1px solid var(--brand-secondary);
}

.panel__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-8);
}
</style>
