<script setup>
// 本次用餐需求（Figma：來點煮意/本次用餐需求-設定中）：今天想吃什麼、調味、口感
// 家人與訪客的忌口還是優先，這裡只影響挑菜的順序
import { ref } from 'vue'
import { FLAVOR_OPTIONS, TEXTURE_OPTIONS, WANT_OPTIONS } from '@/utils/menuPlanner'
import BaseChip from '@/components/base/BaseChip.vue'
import OptionGroup from './OptionGroup.vue'

const needs = defineModel({ type: Object, required: true })

const showMore = ref(!!needs.value.note)

function toggle(list, value) {
  const index = list.indexOf(value)
  if (index === -1) list.push(value)
  else list.splice(index, 1)
}
</script>

<template>
  <div class="needs">
    <p class="needs__note">選擇後立即保留，收合不會清除，家人與訪客的忌口仍優先於這些喜好。</p>

    <OptionGroup title="今天想吃" hint="可複選">
      <BaseChip
        v-for="item in WANT_OPTIONS"
        :key="item"
        :selected="needs.wants.includes(item)"
        @click="toggle(needs.wants, item)"
      >
        {{ item }}
      </BaseChip>
    </OptionGroup>

    <OptionGroup title="調味偏好" hint="可複選">
      <BaseChip
        v-for="item in FLAVOR_OPTIONS"
        :key="item"
        :selected="needs.flavors.includes(item)"
        @click="toggle(needs.flavors, item)"
      >
        {{ item }}
      </BaseChip>
    </OptionGroup>

    <OptionGroup title="口感偏好" hint="單選">
      <BaseChip
        v-for="item in TEXTURE_OPTIONS"
        :key="item"
        :selected="needs.texture === item"
        @click="needs.texture = item"
      >
        {{ item }}
      </BaseChip>
    </OptionGroup>

    <button v-if="!showMore" type="button" class="needs__more" @click="showMore = true">
      <i class="fa-solid fa-plus" aria-hidden="true"></i>
      更多需求
    </button>
    <label v-else class="needs__other">
      <span class="needs__other-label">其他需求</span>
      <textarea
        v-model="needs.note"
        rows="2"
        maxlength="100"
        placeholder="例如：今天想快一點上桌、少用油"
        class="needs__textarea"
      ></textarea>
    </label>
  </div>
</template>

<style scoped>
.needs {
  display: flex;
  flex-direction: column;
  gap: var(--space-24);
}

.needs__note {
  font-size: var(--fs-caption-2);
  line-height: 1.5;
  color: var(--text-body);
}

.needs__more {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: var(--space-8);
  font-size: var(--fs-body-2);
  color: var(--text-body);
}

.needs__more i {
  font-size: 12px;
}

.needs__other {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.needs__other-label {
  font-size: var(--fs-body-2);
  color: var(--text-body);
}

.needs__textarea {
  padding: var(--space-8) var(--space-12);
  border: 1px solid var(--brand-secondary);
  border-radius: 8px;
  font: inherit;
  font-size: var(--fs-caption-2);
  color: var(--text-body);
  resize: vertical;
  outline: none;
}

.needs__textarea:focus {
  border-color: var(--brand-primary);
}
</style>
