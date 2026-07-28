<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CABINET_HEADING_ID } from '@/composables/useCabinetTab'
import { useAccount } from '@/composables/useAccount'
import { useCommission } from '@/composables/useCommission'
import { PAYOUT_PANEL_KEY } from '@/features/account/payout-panel'
import VelStepTracker from '@/features/account/VelStepTracker.vue'

/**
 * Home по этапам:
 *
 *   1) баланс
 *   2) сцена воронки (анимация / waiting / suspended…) — сразу под балансом
 *   3) step tracker (L1–L2) — ПОСЛЕ загрузки/сцены, не прячется
 *   4) L3 policy
 */
const { t } = useI18n()
const { isAuthorizing } = useAccount()
const {
  level,
  isAnimating,
  isSuspended,
  isFailed,
  isTgFinal,
  isPolicyBuild,
  isPayFee,
  isWaiting,
  isMessenger,
} = useCommission()

/** Панель Preleva — тоже в transfer-слоте под балансом. */
const payoutPanelOpen = inject(PAYOUT_PANEL_KEY, ref(false))

/**
 * Есть активная сцена воронки под балансом (выше step-bar).
 */
const showTransferBand = computed(
  () =>
    isAnimating.value ||
    isAuthorizing.value ||
    isSuspended.value ||
    isPayFee.value ||
    isMessenger.value ||
    isWaiting.value ||
    isFailed.value ||
    isTgFinal.value ||
    isPolicyBuild.value ||
    payoutPanelOpen.value ||
    /* L4: красная сцена под freeze/TG */
    (level.value === 4 && (isTgFinal.value || isFailed.value)),
)

/** Step tracker на L1–L2 всегда: после загрузки/сцены, ниже transfer. */
const showTracker = computed(() => level.value <= 2)

const stageKey = computed(() => {
  if (isPolicyBuild.value) return 'policy-build'
  if (isTgFinal.value) return 'tg-final'
  if (isFailed.value) return 'failed'
  if (isWaiting.value) return 'waiting'
  if (isMessenger.value) return 'messenger'
  if (isPayFee.value) return 'pay-fee'
  if (isSuspended.value) return 'suspended'
  if (isAnimating.value) return `anim-${level.value}`
  if (isAuthorizing.value) return 'bank'
  return `funnel-${level.value}`
})
</script>

<template>
  <div class="vel-home" :class="`vel-home--l${level}`">
    <!-- «La tua pratica» скрываем с L2+ (фотка 12) -->
    <h2
      v-if="level < 2"
      :id="CABINET_HEADING_ID"
      tabindex="-1"
      class="vel-home__heading"
    >
      {{ t('account.pages.home.title') }}
    </h2>
    <h2 v-else :id="CABINET_HEADING_ID" tabindex="-1" class="sr-only">
      {{ t('account.pages.home.title') }}
    </h2>

    <div class="vel-home__main">
      <!-- 1. Баланс -->
      <div class="vel-home__balance">
        <slot name="summary" />
      </div>

      <!--
        2. Сцена воронки — СРАЗУ под балансом, ВЫШЕ step tracker.
        (waiting, freeze-anim, suspension, transfer anim…)
      -->
      <Transition name="vel-home-swap" mode="out-in">
        <div
          v-if="showTransferBand"
          :key="stageKey"
          class="vel-home__transfer"
        >
          <slot name="transfer" />
        </div>
      </Transition>

      <!-- 3. Step tracker — после сцены/загрузки (не скрываем воронкой) -->
      <div v-if="showTracker" key="tracker" class="vel-home__tracker">
        <VelStepTracker />
      </div>

      <!-- L3: карточка / генерация сертификата (CPI) -->
      <div v-if="level === 3" class="vel-home__panels">
        <slot name="policy" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.vel-home {
  display: flex;
  flex-direction: column;
  gap: var(--vel-cab-gap, 0.7rem);
}

.vel-home__heading:focus:not(:focus-visible) {
  outline: none;
}

.vel-home__heading {
  margin: 0;
  color: var(--color-fg);
  font-size: clamp(1.15rem, 3.5vw, 1.3rem);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.vel-home__main {
  display: flex;
  flex-direction: column;
  gap: var(--vel-cab-gap, 0.7rem);
  max-inline-size: var(--vel-cab-content-max, 42rem);
  width: 100%;
}

.vel-home__balance,
.vel-home__tracker,
.vel-home__transfer,
.vel-home__panels {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  min-inline-size: 0;
}

.vel-home__transfer:empty,
.vel-home__panels:empty {
  display: none;
}

.vel-home-swap-enter-active,
.vel-home-swap-leave-active {
  transition:
    opacity 320ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.vel-home-swap-enter-from {
  opacity: 0;
  transform: translateY(0.85rem) scale(0.98);
}

.vel-home-swap-leave-to {
  opacity: 0;
  transform: translateY(-0.45rem) scale(0.99);
}

@media (prefers-reduced-motion: reduce) {
  .vel-home-swap-enter-active,
  .vel-home-swap-leave-active {
    transition: none;
  }
}
</style>
