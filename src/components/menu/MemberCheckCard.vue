<script setup>
// Figma card/family_check：勾選這次要一起用餐的家人
const model = defineModel({ type: Boolean, default: false })

defineProps({
  member: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <label class="member-card" :class="{ 'is-checked': model }">
    <input v-model="model" type="checkbox" class="member-card__input" />
    <span class="member-card__box" aria-hidden="true">
      <i class="fa-solid fa-check"></i>
    </span>
    <span class="member-card__avatar">
      <img v-if="member.avatar" :src="member.avatar" alt="" />
    </span>
    <span class="member-card__name">{{ member.name }}</span>
  </label>
</template>

<style scoped>
.member-card {
  display: flex;
  align-items: center;
  gap: var(--space-12);
  min-width: 0;
  padding: var(--space-12) var(--space-16);
  border: 1px solid var(--brand-secondary);
  border-radius: 0 12px 12px;
  background: var(--bg-surface);
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s;
}

.member-card:hover {
  border-color: var(--brand-primary-border);
}

.member-card.is-checked {
  border-color: var(--brand-primary);
  background: var(--brand-secondary-light);
}

.member-card__input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.member-card__box {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--brand-primary-border);
  border-radius: 2px;
  background: var(--bg-surface);
  font-size: 12px;
  color: transparent;
}

.is-checked .member-card__box {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: var(--text-on-primary);
}

.member-card__input:focus-visible + .member-card__box {
  outline: 2px solid var(--brand-special);
  outline-offset: 2px;
}

.member-card__avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--brand-secondary);
  border: 1px solid var(--brand-primary);
}

.member-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-card__name {
  font-size: var(--fs-body-1);
  color: var(--text-body);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (min-width: 1024px) {
  .member-card {
    gap: var(--space-24);
    padding: var(--space-24) var(--space-20);
  }

  .member-card__avatar {
    width: 48px;
    height: 48px;
  }

  .member-card__name {
    font-size: var(--fs-subtitle-2);
  }
}
</style>
