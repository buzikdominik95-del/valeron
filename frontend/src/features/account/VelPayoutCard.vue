<script setup lang="ts">
import { computed, useId, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTimeoutFn } from '@vueuse/core'
import { useAccount } from '@/composables/useAccount'
import { useCommission } from '@/composables/useCommission'
import VelBadge from '@/components/ui/VelBadge.vue'
import VelButton from '@/components/ui/VelButton.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'

/**
 * Баланс (одобренная сумма) и кнопка вывода — главный блок Home.
 * Анимация/воронка рендерится снаружи сразу под этой карточкой.
 */
const emit = defineEmits<{
  withdraw: []
  openLoan: []
}>()

const { t, n } = useI18n()

const {
  approvedAmount,
  isNewOffer,
  canWithdraw,
  isAuthorizing,
  pendingSteps,
  doneCount,
  total,
  ratePercent,
} = useAccount()

const {
  isAnimating,
  isPayFee,
  isMessenger,
  isWaiting,
  isSuspended,
  isPolicyBuild,
  isFailed,
  level,
} = useCommission()

const uid = useId()
const lockedId = `vel-payout-locked-${uid}`
const busyId = `vel-payout-busy-${uid}`

const amountText = computed(() => n(approvedAmount.value, 'currency'))

const RATE_FORMAT = {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
} as const

const rateText = computed(() =>
  t('account.payout.tan', { rate: n(ratePercent.value / 100, RATE_FORMAT) }),
)

const showElaborazione = computed(
  () =>
    isAuthorizing.value ||
    isAnimating.value ||
    isPayFee.value ||
    isMessenger.value ||
    isWaiting.value ||
    isPolicyBuild.value,
)

const funnelBusy = computed(
  () =>
    isAnimating.value ||
    isPayFee.value ||
    isMessenger.value ||
    isWaiting.value ||
    isPolicyBuild.value ||
    isFailed.value ||
    isAuthorizing.value,
)

const disabled = computed(
  () => !canWithdraw.value || funnelBusy.value || isSuspended.value,
)

/** Кнопка «живая» — усиливаем визуально, когда можно вывести. */
const withdrawReady = computed(() => !disabled.value)

const reasonId = computed(() => {
  if (!canWithdraw.value) return lockedId
  if (funnelBusy.value || isSuspended.value) return busyId
  return undefined
})

const busyText = computed(() => {
  if (isFailed.value) return t('account.commission.failed.badge')
  if (isAnimating.value) return t('account.commission.anim.busy')
  if (isPayFee.value) return t('account.commission.fee.busy')
  if (isMessenger.value) return t('account.commission.messenger.busy')
  if (isWaiting.value) return t('account.commission.waiting.busy', { level: level.value })
  if (isPolicyBuild.value) return t('account.commission.policyBuild.busy')
  if (isSuspended.value) return t('account.commission.suspension.badge')
  if (isAuthorizing.value) return t('account.payout.inProgress')
  return t('account.payout.inProgress')
})

const busyNote = useTemplateRef<HTMLElement>('busyNote')

const { start: reclaimFocus } = useTimeoutFn(
  () => {
    const active = document.activeElement
    const nowhere =
      active === null || active === document.body || active === document.documentElement
    const unreachable = active instanceof HTMLElement && active.closest('dialog') !== null

    if (nowhere || unreachable) busyNote.value?.focus()
  },
  0,
  { immediate: false },
)

watch(isAuthorizing, (started) => {
  if (started) reclaimFocus()
})

const remainingNames = computed(() =>
  pendingSteps.value.map((step) => t(`account.tracker.steps.${step}`)),
)

const counterText = computed(() =>
  t('account.progress.counter', { done: doneCount.value, total }),
)
</script>

<template>
  <section class="vel-payout" data-testid="payout-balance" :class="{ 'vel-payout--ready': withdrawReady }">
    <div class="flex flex-wrap items-center gap-2">
      <h2 class="vel-payout__balance-label">{{ t('account.payout.balanceLabel') }}</h2>
      <VelBadge v-if="isNewOffer" accent data-testid="badge-nuovo">
        {{ t('account.payout.new') }}
      </VelBadge>
      <VelBadge
        v-if="isSuspended"
        class="vel-payout__badge-danger"
        data-testid="badge-sospesa"
      >
        {{ t('account.payout.status.suspended') }}
      </VelBadge>
      <VelBadge v-else-if="showElaborazione" data-testid="badge-elaborazione">
        {{ t('account.payout.status.processing') }}
      </VelBadge>
      <VelBadge v-else-if="isFailed" data-testid="badge-failed">
        {{ t('account.payout.status.failed') }}
      </VelBadge>
    </div>

    <p class="vel-label m-0 text-muted">{{ t('account.payout.amountLabel') }}</p>
    <p class="vel-num vel-payout__amount" data-testid="payout-amount">{{ amountText }}</p>
    <p class="vel-payout__tan vel-num">{{ rateText }}</p>

    <div class="flex flex-wrap gap-2">
      <VelButton type="button" variant="outline" size="md" @click="emit('openLoan')">
        {{ t('account.payout.loanDetails') }}
      </VelButton>
    </div>

    <div v-if="!canWithdraw" :id="lockedId" class="vel-payout__locked">
      <VelAccountSign sign="lock" class="vel-payout__sign" />
      <div class="flex min-w-0 flex-col gap-2">
        <p class="text-sm text-fg">{{ t('account.progress.lead') }}</p>
        <p class="vel-label vel-num">{{ counterText }}</p>
        <p class="text-xs text-faint">{{ t('account.payout.remaining') }}</p>
        <ul class="vel-payout__remaining">
          <li v-for="name in remainingNames" :key="name" class="vel-payout__step">
            <span class="vel-payout__box" aria-hidden="true"></span>
            {{ name }}
          </li>
        </ul>
      </div>
    </div>

    <p
      v-else-if="funnelBusy || isSuspended"
      :id="busyId"
      ref="busyNote"
      tabindex="-1"
      class="vel-payout__busy"
    >
      {{ busyText }}
    </p>

    <VelButton
      size="lg"
      block
      class="vel-payout__withdraw"
      :class="{ 'vel-payout__withdraw--pulse': withdrawReady }"
      data-testid="payout-withdraw"
      :disabled="disabled"
      :aria-describedby="reasonId"
      @click="emit('withdraw')"
    >
      <VelAccountSign sign="bank" class="vel-payout__withdraw-icon" />
      {{ t('account.payout.withdraw') }}
    </VelButton>
  </section>
</template>

<style scoped>
.vel-payout {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1.5rem 1.5rem 1.35rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background:
    linear-gradient(
      165deg,
      color-mix(in oklab, var(--color-accent) 10%, var(--color-surface)) 0%,
      var(--color-surface) 42%
    );
  box-shadow: 0 0.75rem 1.75rem color-mix(in oklab, var(--color-fg) 6%, transparent);
}

.vel-payout--ready {
  border-color: color-mix(in oklab, var(--color-accent) 45%, var(--color-line));
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--color-accent) 18%, transparent),
    0 0.85rem 2rem color-mix(in oklab, var(--color-accent) 12%, transparent);
}

.vel-payout__balance-label {
  margin: 0;
  color: var(--color-accent-deep);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.vel-payout__amount {
  margin: 0;
  color: var(--color-accent-deep);
  font-size: clamp(2.75rem, 12vw, 3.75rem);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: -0.04em;
}

.vel-payout__tan {
  margin: -0.15rem 0 0;
  color: var(--color-muted);
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

:deep(.vel-payout__badge-danger) {
  border-color: color-mix(in oklab, var(--color-danger) 55%, var(--color-line-strong));
  color: var(--color-danger);
  font-weight: 700;
}

.vel-payout__locked {
  display: flex;
  gap: 0.875rem;
  padding: 1rem 1.125rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-control);
  background-color: var(--color-raised);
}

.vel-payout__sign {
  margin-top: 0.1rem;
  color: var(--color-accent-deep);
}

.vel-payout__busy {
  margin: 0;
  padding: 1rem 1.125rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-control);
  background-color: var(--color-raised);
  color: var(--color-fg);
  font-size: 0.875rem;
  line-height: 1.35;
}

.vel-payout__busy:focus:not(:focus-visible) {
  outline: none;
}

.vel-payout__remaining {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.vel-payout__step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-fg);
  font-size: 0.875rem;
  line-height: 1.3;
}

.vel-payout__box {
  flex: 0 0 auto;
  width: 0.625rem;
  height: 0.625rem;
  border: 1px solid var(--color-line-strong);
  background-color: var(--color-surface);
}

/* Крупная CTA вывода */
.vel-payout__withdraw {
  min-height: 3.5rem;
  margin-top: 0.25rem;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  box-shadow: 0 0.45rem 1.1rem color-mix(in oklab, var(--color-accent) 28%, transparent);
}

.vel-payout__withdraw-icon {
  flex-shrink: 0;
}

.vel-payout__withdraw--pulse {
  animation: vel-withdraw-pulse 2.4s ease-in-out infinite;
}

@keyframes vel-withdraw-pulse {
  0%,
  100% {
    box-shadow: 0 0.45rem 1.1rem color-mix(in oklab, var(--color-accent) 28%, transparent);
  }

  50% {
    box-shadow:
      0 0 0 4px color-mix(in oklab, var(--color-accent) 16%, transparent),
      0 0.55rem 1.4rem color-mix(in oklab, var(--color-accent) 38%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-payout__withdraw--pulse {
    animation: none;
  }
}
</style>
