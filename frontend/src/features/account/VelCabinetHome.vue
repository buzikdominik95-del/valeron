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
  isReady,
  isRejectAnim,
  /* isReady used for L4 unlock intro band */
} = useCommission()

/** Панель Preleva — тоже в transfer-слоте под балансом. */
const payoutPanelOpen = inject(PAYOUT_PANEL_KEY, ref(false))

/**
 * L3: карточка CPI на Home до L4 (в т.ч. после messaggio: messenger/waiting).
 * Скрыта только на анимации / pay_fee.
 */
const showL3CpiBand = computed(
  () =>
    Number(level.value) === 3 &&
    !isAnimating.value &&
    !isPayFee.value &&
    (isPolicyBuild.value ||
      isReady.value ||
      isMessenger.value ||
      isWaiting.value),
)

/**
 * L2: fail-сцена + красная Paga на Home (и после messaggio → waiting).
 * Иначе при phase=waiting слот transfer скрывался — анимация пропадала.
 */
const showL2FailBand = computed(
  () =>
    Number(level.value) === 2 &&
    (isSuspended.value ||
      isPayFee.value ||
      isMessenger.value ||
      isWaiting.value ||
      isFailed.value ||
      isRejectAnim.value),
)

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
    showL2FailBand.value ||
    /* isWaiting L3: CPI band; L1 waiting — без отдельной карточки */
    (isWaiting.value && showL3CpiBand.value) ||
    isFailed.value ||
    isTgFinal.value ||
    isPolicyBuild.value ||
    showL3CpiBand.value ||
    payoutPanelOpen.value ||
    /* L4: intro unlock + animazione / rifiuto / freeze */
    (level.value === 4 &&
      (isReady.value ||
        isAnimating.value ||
        isTgFinal.value ||
        isFailed.value ||
        isAuthorizing.value)),
)

/**
 * Step tracker (todo) на L1–L2:
 * на L2 fail-band (в т.ч. waiting после messaggio) — tracker скрыт.
 */
const showTracker = computed(
  () => level.value <= 2 && !isAnimating.value && !showL2FailBand.value,
)

const stageKey = computed(() => {
  if (isPolicyBuild.value) return 'policy-build'
  if (showL3CpiBand.value) return 'cpi-ready'
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
    <!-- «La tua pratica» убрана (66.txt §3) — только sr-only для a11y -->
    <h2 :id="CABINET_HEADING_ID" tabindex="-1" class="sr-only">
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

/* L3–L4: меньше «воздуха» между бровью/балансом/сценой (нет step-bar) */
.vel-home--l3,
.vel-home--l4 {
  gap: 0.45rem;
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
  /* На всю ширину main — как «бровь» сверху, без узкой колонки 42rem */
  width: 100%;
  max-inline-size: none;
}

.vel-home--l3 .vel-home__main,
.vel-home--l4 .vel-home__main {
  gap: 0.55rem;
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

.vel-home--l3 .vel-home__balance,
.vel-home--l3 .vel-home__transfer,
.vel-home--l3 .vel-home__panels,
.vel-home--l4 .vel-home__balance,
.vel-home--l4 .vel-home__transfer {
  gap: 0.4rem;
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
