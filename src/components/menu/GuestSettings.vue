<script setup>
// 本次訪客（Figma：來點煮意/本次訪客-設定中）：訪客的忌口、素食與辣度，只套用這一餐
// v-model 是 { allergens, avoid, dietTypes, spicy }，點選後立刻生效
import { ref } from 'vue'
import allergens from '@/data/allergens.json'
import dietTypes from '@/data/dietTypes.json'
import { SPICY_LEVELS } from '@/utils/menuPlanner'
import BaseChip from '@/components/base/BaseChip.vue'
import OptionGroup from './OptionGroup.vue'

const guest = defineModel({ type: Object, required: true })

const custom = ref('')
const customError = ref('')

function toggle(list, value) {
  const index = list.indexOf(value)
  if (index === -1) list.push(value)
  else list.splice(index, 1)
}

function addCustom() {
  const words = custom.value
    .split(/[、,，\s]+/)
    .map((word) => word.trim())
    .filter(Boolean)

  if (!words.length) {
    customError.value = '請輸入要避開的食物'
    return
  }

  words.forEach((word) => {
    if (!guest.value.avoid.includes(word)) guest.value.avoid.push(word)
  })
  custom.value = ''
  customError.value = ''
}

function setSpicy(level) {
  guest.value.spicy = guest.value.spicy === level ? null : level
}
</script>

<template>
  <div class="guest">
    <!-- 與家庭管理的新增成員共用相同的欄位命名與選取視覺；資料只暫存於本次訪客。 -->
    <OptionGroup title="過敏與忌口食材" hint="點擊選擇">
      <BaseChip
        v-for="item in allergens"
        :key="item.id"
        :selected="guest.allergens.includes(item.name)"
        @click="toggle(guest.allergens, item.name)"
      >
        {{ item.name }}
      </BaseChip>
      <BaseChip v-for="word in guest.avoid" :key="word" selected removable @click="toggle(guest.avoid, word)">
        {{ word }}
      </BaseChip>

      <form class="guest__custom" @submit.prevent="addCustom">
        <input
          v-model="custom"
          class="guest__input"
          :class="{ 'has-error': customError }"
          placeholder="例如：茄子、木耳、苦瓜…"
          aria-label="其他忌口的食物"
          @input="customError = ''"
        />
        <button type="submit" class="guest__add">新增</button>
      </form>
      <p v-if="customError" class="guest__error">{{ customError }}</p>
    </OptionGroup>

    <OptionGroup title="特殊飲食需求" hint="點擊選擇">
      <BaseChip
        v-for="type in dietTypes"
        :key="type.id"
        :selected="guest.dietTypes.includes(type.id)"
        @click="toggle(guest.dietTypes, type.id)"
      >
        {{ type.name }}
      </BaseChip>
    </OptionGroup>

    <OptionGroup title="辣度偏好">
      <div class="spice" role="radiogroup" aria-label="辣度偏好">
        <button
          v-for="(label, level) in SPICY_LEVELS"
          :key="label"
          type="button"
          role="radio"
          :class="{ selected: guest.spicy === level }"
          :aria-checked="guest.spicy === level"
          @click="setSpicy(level)"
        >
          {{ label }}
        </button>
      </div>
    </OptionGroup>
  </div>
</template>

<style scoped>
.guest {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

/* 對齊家庭管理的新增成員彈窗選項區。 */
.guest :deep(.option-group__head) {
  margin-bottom: 5px;
}

.guest :deep(.option-group__title) {
  font-size: 16px;
  color: var(--text-body);
}

.guest :deep(.option-group__hint) {
  font-size: 14px;
  color: var(--text-placeholder);
}

.guest :deep(.option-group__body) {
  gap: 6px;
}

.guest :deep(.chip) {
  padding: 5px 8px;
  border-color: var(--brand-primary-border);
  background: transparent;
  font-size: 14px;
  line-height: 1.2;
}

.guest :deep(.chip.is-selected) {
  border-color: var(--brand-primary);
  background: var(--brand-secondary);
}

.guest__custom {
  display: flex;
  gap: var(--space-8);
  width: 100%;
  margin-top: 5px;
}

.guest__input {
  flex: 1;
  min-width: 0;
  height: 32px;
  padding: 0 var(--space-12);
  border: 1px solid var(--brand-secondary);
  border-radius: 10px;
  font: inherit;
  font-size: var(--fs-caption-2);
  color: var(--text-body);
  outline: none;
}

.guest__input::placeholder {
  color: var(--text-placeholder);
}

.guest__input:focus {
  border-color: var(--brand-primary);
}

.guest__input.has-error {
  border-color: var(--status-error);
}

.guest__add {
  flex-shrink: 0;
  padding: 0 var(--space-12);
  border: 1px solid var(--brand-secondary);
  border-radius: 10px;
  background: var(--brand-secondary-light);
  font-size: var(--fs-caption-2);
  color: var(--text-body);
}

.guest__add:hover {
  background: var(--brand-secondary);
}

.guest__error {
  width: 100%;
  font-size: var(--fs-caption-2);
  color: var(--text-danger);
}

/* 與新增成員使用同一組分段辣度偏好樣式。 */
.spice {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  width: 100%;
  height: 36px;
  align-items: stretch;
  padding: 3px;
  margin-top: 3px;
  border-radius: 10px;
  background: var(--brand-secondary-light);
}

.spice button {
  display: grid;
  min-height: 0;
  height: 100%;
  place-items: center;
  padding: 0 4px;
  border-radius: 7px;
  color: var(--text-body);
  font-size: 14px;
  line-height: 1.2;
}

.spice .selected {
  background: #fff;
  box-shadow: 0 1px 2px rgba(52, 38, 28, .08);
}

.spice button:focus-visible {
  outline: 2px solid var(--brand-special);
}
</style>
