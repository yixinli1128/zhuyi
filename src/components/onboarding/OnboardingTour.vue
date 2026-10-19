<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useFamilyStore } from '@/stores/family'
import { useFridgeStore } from '@/stores/fridge'
import { useMealPlanStore } from '@/stores/mealPlans'
import { useOnboardingStore } from '@/stores/onboarding'
import { load, save } from '@/stores/storage'

const props = defineProps({
  blocked: Boolean,
})

const TOUR_KEY = 'first-use-tour'
const TOUR_STEPS = ['family', 'fridge', 'menu']

const userStore = useUserStore()
const familyStore = useFamilyStore()
const fridgeStore = useFridgeStore()
const mealPlanStore = useMealPlanStore()
const onboardingStore = useOnboardingStore()
const route = useRoute()
const router = useRouter()
const savedTours = ref(load(TOUR_KEY, {}))
const pageDialogOpen = ref(false)
const pausedForAction = ref(false)
const popoverStyle = ref({})

let targetElement = null
let dialogObserver = null
let resumeTimer = null

const userEmail = computed(() => userStore.user?.email?.toLowerCase() ?? '')
// Oliver 是已備妥範例資料的示範帳號，不需要顯示任何新手導覽步驟。
const isOliverDemo = computed(() => userEmail.value === 'oliver@example.com')
const hasAddedFamily = computed(() => familyStore.activeMembers.some((member) => !member.ownerEmail))
const hasIngredients = computed(() => fridgeStore.activeIngredients.length > 0)
const hasFirstMenu = computed(() => mealPlanStore.plans.some((plan) => !plan.demo))
const tourState = computed(() => savedTours.value[userEmail.value] ?? { step: 'family' })

const steps = {
  family: {
    route: '/family',
    target: 'family-add',
    title: '先告訴我們家裡有誰',
    description: '新增每位家人的份量、過敏與忌口，之後配餐會自動避開不適合的食材。',
    action: '新增第一位家人',
    skip: '略過這一步',
  },
  fridge: {
    route: '/fridge',
    target: 'fridge-add',
    title: '登記冰箱裡的食材',
    description: '記下食材和存放位置，系統會提醒即期食材，並優先用現有庫存配餐。',
    action: '登記食材',
    skip: '略過這一步',
  },
  'menu-people': {
    route: '/create',
    target: 'menu-people',
    title: '設定用餐人數',
    description: '人數至少為 1 位；可依實際用餐人數調整，最多 20 位。',
    requiresInteraction: true,
    skip: '結束引導',
  },
  'menu-dishes': {
    route: '/create',
    target: 'menu-dishes',
    title: '想煮幾道菜？',
    description: '菜數至少為 1 道；湯數可先維持 0，之後也能再調整。',
    requiresInteraction: true,
    skip: '結束引導',
  },
  'menu-build': {
    route: '/create',
    target: 'menu-build',
    title: '建立第一份餐單',
    description: '設定已完成。按下建立餐單，系統會依人數、菜數與已選擇的偏好為你配餐。',
    action: '開始使用',
    skip: '結束引導',
  },
}

const activeStep = computed(() => tourState.value.step)
const menuStep = computed(() => {
  const { people, dishCount } = onboardingStore.menuSetup
  if (people < 1) return 'menu-people'
  if (dishCount < 1) return 'menu-dishes'
  return 'menu-build'
})
const activeConfig = computed(() => steps[activeStep.value === 'menu' ? menuStep.value : activeStep.value] ?? null)
const isVisible = computed(() => Boolean(userEmail.value && activeConfig.value) && !isOliverDemo.value && !props.blocked && !pageDialogOpen.value && !pausedForAction.value && !onboardingStore.menuCreating)

function updateTour(update) {
  if (!userEmail.value) return
  savedTours.value = {
    ...savedTours.value,
    [userEmail.value]: { ...tourState.value, ...update },
  }
  save(TOUR_KEY, savedTours.value)
}

function goToNextStep() {
  const stepIndex = TOUR_STEPS.indexOf(activeStep.value)
  const nextStep = TOUR_STEPS[stepIndex + 1]
  updateTour({ step: nextStep ?? 'done' })
}

function skipStep() {
  goToNextStep()
}

function reconcileProgress() {
  if (!userEmail.value || activeStep.value === 'done') return
  if (activeStep.value === 'family' && hasAddedFamily.value) goToNextStep()
  else if (activeStep.value === 'fridge' && hasIngredients.value) goToNextStep()
  else if (activeStep.value === 'menu' && (hasFirstMenu.value || onboardingStore.menuBuilt)) updateTour({ step: 'done' })
}

function clearTarget() {
  if (!targetElement) return
  targetElement.classList.remove('onboarding-target-highlight')
  targetElement.removeEventListener('click', pauseForTargetAction)
  targetElement = null
}

function updatePopoverPosition() {
  if (!targetElement) return
  const rect = targetElement.getBoundingClientRect()
  const panelWidth = Math.min(340, window.innerWidth - 32)
  const panelHeight = 224
  const gap = 18
  const left = Math.min(Math.max(16, rect.right - panelWidth), window.innerWidth - panelWidth - 16)
  const showAbove = rect.bottom + gap + panelHeight > window.innerHeight && rect.top > panelHeight + gap
  const top = showAbove ? Math.max(16, rect.top - panelHeight - gap) : Math.min(rect.bottom + gap, window.innerHeight - panelHeight - 16)
  const arrowLeft = Math.min(Math.max(28, rect.left + rect.width / 2 - left), panelWidth - 28)
  popoverStyle.value = {
    '--tour-arrow-left': `${arrowLeft}px`,
    '--tour-arrow-top': showAbove ? 'calc(100% - 9px)' : '-10px',
    left: `${left}px`,
    top: `${top}px`,
  }
}

function pauseForTargetAction() {
  pausedForAction.value = true
  window.clearInterval(resumeTimer)
  resumeTimer = window.setInterval(() => {
    if (document.querySelector('.dialog-overlay, .overlay')) return
    pausedForAction.value = false
    window.clearInterval(resumeTimer)
    resumeTimer = null
  }, 180)
}

function triggerAction() {
  if (activeConfig.value?.requiresInteraction) return
  targetElement?.click()
}

async function focusTarget() {
  clearTarget()
  if (!isVisible.value || !activeConfig.value) return

  if (route.path !== activeConfig.value.route) {
    await router.replace(activeConfig.value.route)
    return
  }

  await nextTick()
  targetElement = document.querySelector(`[data-onboarding-target="${activeConfig.value.target}"]`)
  if (!targetElement) return
  targetElement.classList.add('onboarding-target-highlight')
  targetElement.addEventListener('click', pauseForTargetAction)
  targetElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  updatePopoverPosition()
}

function refreshPageDialogState() {
  pageDialogOpen.value = Boolean(document.querySelector('.dialog-overlay, .overlay'))
}

watch([hasAddedFamily, hasIngredients, hasFirstMenu, () => onboardingStore.menuBuilt], reconcileProgress, { immediate: true })
watch([activeStep, menuStep, isVisible, () => route.path], focusTarget, { flush: 'post', immediate: true })
watch(userEmail, () => onboardingStore.resetMenuProgress(), { immediate: true })

onMounted(() => {
  window.addEventListener('resize', updatePopoverPosition)
  window.addEventListener('scroll', updatePopoverPosition, true)
  dialogObserver = new MutationObserver(refreshPageDialogState)
  dialogObserver.observe(document.body, { childList: true, subtree: true })
  refreshPageDialogState()
})

onBeforeUnmount(() => {
  clearTarget()
  window.removeEventListener('resize', updatePopoverPosition)
  window.removeEventListener('scroll', updatePopoverPosition, true)
  dialogObserver?.disconnect()
  window.clearInterval(resumeTimer)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="tour-fade">
      <div v-if="isVisible && activeConfig" class="onboarding-tour" aria-live="polite">
        <div class="onboarding-tour__backdrop" aria-hidden="true"></div>
        <section class="onboarding-tour__popover" role="dialog" aria-modal="true" aria-labelledby="tour-title" :style="popoverStyle">
          <header>
            <span>步驟 {{ TOUR_STEPS.indexOf(activeStep) + 1 }} / {{ TOUR_STEPS.length }}</span>
            <i aria-hidden="true"><b v-for="step in TOUR_STEPS" :key="step" :class="{ 'is-current': step === activeStep }"></b></i>
          </header>
          <h2 id="tour-title">{{ activeConfig.title }}</h2>
          <p>{{ activeConfig.description }}</p>
          <footer>
            <button type="button" @click="skipStep">{{ activeConfig.skip }}</button>
            <span v-if="activeConfig.requiresInteraction" class="onboarding-tour__hint">完成後會自動前往下一步</span>
            <button v-else type="button" class="onboarding-tour__action" @click="triggerAction">{{ activeConfig.action }}</button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
.onboarding-tour__backdrop {
  position: fixed;
  z-index: 80;
  inset: 0;
  background: rgb(42 35 29 / 0.48);
}

.onboarding-target-highlight {
  position: relative !important;
  z-index: 81 !important;
  box-shadow: 0 0 0 4px #fff, 0 8px 24px rgb(45 31 20 / 0.24) !important;
}

.onboarding-tour__popover {
  position: fixed;
  z-index: 82;
  box-sizing: border-box;
  width: min(340px, calc(100vw - 32px));
  padding: 18px 20px 16px;
  border: 1px solid var(--brand-secondary);
  border-radius: 12px 0 12px;
  background: var(--bg-surface);
  box-shadow: 0 18px 36px rgb(40 29 21 / 0.2);
}

.onboarding-tour__popover::before {
  position: absolute;
  top: var(--tour-arrow-top, -10px);
  left: var(--tour-arrow-left, calc(100% - 40px));
  width: 18px;
  height: 18px;
  border-top: 1px solid var(--brand-secondary);
  border-left: 1px solid var(--brand-secondary);
  background: var(--bg-surface);
  content: '';
  transform: rotate(45deg);
}

.onboarding-tour__popover header,
.onboarding-tour__popover footer,
.onboarding-tour__popover header i {
  display: flex;
  align-items: center;
}

.onboarding-tour__popover header {
  justify-content: space-between;
  gap: 16px;
  color: var(--text-placeholder);
  font-size: 11px;
}

.onboarding-tour__popover header i { gap: 5px; }
.onboarding-tour__popover header b { width: 7px; height: 7px; border-radius: 50%; background: var(--brand-secondary); }
.onboarding-tour__popover header b.is-current { background: var(--brand-primary); }
.onboarding-tour__popover h2 { margin-top: 10px; color: var(--text-title); font-size: 19px; font-weight: 400; line-height: 1.35; }
.onboarding-tour__popover p { min-height: 58px; margin-top: 9px; color: var(--text-secondary); font-size: 12px; line-height: 1.6; }

.onboarding-tour__popover footer {
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
}

.onboarding-tour__popover footer > button:first-child { color: var(--text-secondary); font-size: 12px; text-decoration: underline; text-underline-offset: 3px; }
.onboarding-tour__action { min-height: 36px; padding: 7px 13px; border-radius: 999px; background: var(--brand-primary); color: var(--text-on-primary); font-size: 13px; }
.onboarding-tour__hint { color: var(--text-secondary); font-size: 12px; }

.tour-fade-enter-active,
.tour-fade-leave-active { transition: opacity 0.18s ease; }
.tour-fade-enter-from,
.tour-fade-leave-to { opacity: 0; }

@media (max-width: 640px) {
  .onboarding-tour__popover {
    right: 16px !important;
    bottom: max(20px, env(safe-area-inset-bottom));
    left: 16px !important;
    top: auto !important;
    width: auto;
    padding: 16px;
  }

  .onboarding-tour__popover::before { display: none; }
  .onboarding-tour__popover h2 { font-size: 18px; }
  .onboarding-tour__popover p { min-height: 0; font-size: 11px; }
}
</style>
