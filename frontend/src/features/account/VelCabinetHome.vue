<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CABINET_HEADING_ID } from '@/composables/useCabinetTab'
import { useAccount } from '@/composables/useAccount'
import { useCommission } from '@/composables/useCommission'
import VelStepTracker from '@/features/account/VelStepTracker.vue'

/**
 * Home по этапам (состав блоков, как на референс-видео):
 *
 * L1: баланс + todo. После старта вывода todo → анимация (out-in).
 * L2: то же; верхний step-bar уже скрыт.
 * L3: только баланс + сертификат/полис (без todo).
 * L4: только баланс + анимация вывода.
 *
 * Dati personali / docs — только Profilo / Documenti, не Home.
 */
const { t } = useI18n()
const { isAuthorizing } = useAccount()
const {
  level,
  isAnimating,
  isSuspended,
  isFailed,
  isPolicyBuild,
} = useCommission()

/** Воронка «забрала» место todo-листа. */
const transferTakesOver = computed(
  () =>
    isAnimating.value ||
    isAuthorizing.value ||
    isSuspended.value ||
    isFailed.value ||
    isPolicyBuild.value,
)

/** Todo только L1–L2, пока нет анимации/обработки. */
const showTracker = computed(() => level.value <= 2 && !transferTakesOver.value)

const stageKey = computed(() => {
  if (showTracker.value) return 'tracker'
  if (isPolicyBuild.value) return 'policy-build'
  if (isFailed.value) return 'failed'
  if (isSuspended.value) return 'suspended'
  if (isAnimating.value) return `anim-${level.value}`
  if (isAuthorizing.value) return 'bank'
  return `funnel-${level.value}`
})
</script>

<template>
  <div class="vel-home" :class="`vel-home--l${level}`">
    <h2 :id="CABINET_HEADING_ID" tabindex="-1" class="vel-home__heading">
      {{ t('account.pages.home.title') }}
    </h2>

    <div class="vel-home__main">
      <div class="vel-home__balance">
        <slot name="summary" />
      </div>

      <!--
        Todo ↔ сцена вывода/сертификата.
        mode out-in: список уезжает, на месте — анимация (как на видео).
      -->
      <Transition name="vel-home-swap" mode="out-in">
        <div v-if="showTracker" key="tracker" class="vel-home__tracker">
          <VelStepTracker />
          <!-- Loan details / пустой transfer, пока todo на экране -->
          <div class="vel-home__transfer-idle">
            <slot name="transfer" />
          </div>
        </div>
        <div v-else-if="transferTakesOver" :key="stageKey" class="vel-home__transfer">
          <slot name="transfer" />
        </div>
        <div v-else key="idle-transfer" class="vel-home__transfer-idle">
          <slot name="transfer" />
        </div>
      </Transition>

      <!-- L3: карточка / генерация сертификата (CPI), если не policy_build в transfer -->
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
  gap: 1.25rem;
}

.vel-home__heading:focus:not(:focus-visible) {
  outline: none;
}

.vel-home__heading {
  margin: 0;
  color: var(--color-fg);
  font-size: 1.35rem;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.vel-home__main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-inline-size: 40rem;
}

.vel-home__balance,
.vel-home__tracker,
.vel-home__transfer,
.vel-home__panels {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.vel-home__transfer-idle:empty,
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
