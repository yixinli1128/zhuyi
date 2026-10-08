<script setup>
// Figma menu/changeDish：更換菜色彈窗，列出同類型、符合家人限制的其他菜色
import { ref, watch } from 'vue'
import BaseDialog from '@/components/base/BaseDialog.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import RecipeMeta from './RecipeMeta.vue'

const open = defineModel('open', { type: Boolean, default: false })

const props = defineProps({
  current: Object, // 目前這道
  candidates: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['confirm'])

const selectedId = ref('')

// 每次打開都預選分數最高的那道（標「目前推薦」）
watch(open, (value) => {
  if (value) selectedId.value = props.candidates[0]?.id ?? ''
})

function confirm() {
  if (!selectedId.value) return
  emit('confirm', selectedId.value)
}
</script>

<template>
  <BaseDialog
    v-model:open="open"
    title="更換菜色"
    :description="current ? `換掉「${current.name}」，以下都符合這次家人與訪客的飲食限制。` : ''"
    :width="620"
  >
    <div v-if="candidates.length" class="swap-list" role="radiogroup" aria-label="可更換的菜色">
      <label
        v-for="(recipe, index) in candidates.slice(0, 4)"
        :key="recipe.id"
        class="swap-item"
        :class="{ 'is-selected': selectedId === recipe.id }"
      >
        <input v-model="selectedId" type="radio" name="swap" :value="recipe.id" class="swap-item__radio" />
        <span class="swap-item__body">
          <span class="swap-item__head">
            <span class="swap-item__name">{{ recipe.name }}</span>
            <span v-if="index === 0" class="swap-item__badge">目前推薦</span>
          </span>
          <RecipeMeta :minutes="recipe.cookTime" :kcal="recipe.kcal" divider />
          <span class="swap-item__ingredients">{{ recipe.mainIngredients.join('、') }}</span>
        </span>
      </label>
    </div>
    <p v-else class="swap-empty">
      目前沒有其他符合條件的{{ current?.type === 'soup' ? '湯品' : '菜色' }}可以替換。<br />
      可以調整本次訪客或用餐需求後，再重新建立餐單。
    </p>

    <template #footer>
      <BaseButton variant="secondary" @click="open = false">取消</BaseButton>
      <BaseButton :disabled="!candidates.length" @click="confirm">確定</BaseButton>
    </template>
  </BaseDialog>
</template>

<style scoped>
.swap-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
}

.swap-item {
  display: flex;
  gap: var(--space-16);
  padding: var(--space-16) var(--space-16) var(--space-12);
  border: 1px solid var(--brand-secondary);
  border-radius: 0 4px 4px;
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s;
}

.swap-item:hover {
  border-color: var(--brand-primary-border);
}

.swap-item.is-selected {
  border-color: var(--brand-primary);
  background: var(--brand-secondary-light);
}

.swap-item__radio {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 4px;
  accent-color: var(--brand-primary);
}

.swap-item__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  min-width: 0;
}

.swap-item__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-8);
}

.swap-item__name {
  font-size: var(--fs-subtitle-2);
  line-height: normal;
  color: var(--text-title);
}

.swap-item__badge {
  flex-shrink: 0;
  font-size: var(--fs-caption-2);
  color: var(--text-body);
}

.swap-item__ingredients {
  padding-top: var(--space-8);
  border-top: 1px solid var(--brand-secondary);
  font-size: var(--fs-caption-2);
  line-height: normal;
  color: var(--text-secondary);
}

.swap-empty {
  font-size: var(--fs-body-2);
  line-height: 1.6;
  color: var(--text-secondary);
}
</style>
