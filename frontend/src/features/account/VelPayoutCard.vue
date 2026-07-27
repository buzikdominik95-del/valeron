<script setup lang="ts">
import { computed, useId, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTimeoutFn } from '@vueuse/core'
import { useAccount } from '@/composables/useAccount'
import { useCommission } from '@/composables/useCommission'
import { useAccountStore } from '@/stores/account.store'
import { COMMISSION_FEE_BY_LEVEL } from '@/api/commission'
import VelBadge from '@/components/ui/VelBadge.vue'
import VelButton from '@/components/ui/VelButton.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'

/**
 * Баланс (одобренная сумма) и кнопка вывода — главный блок Home.
 *
 * Бриф 22: зелёный Preleva (+40%), статический «Credito approvato» над суммой,
 * «In elaborazione» тише; Prestito мигает после L1→L2 / L2→L3, пока не открыли.
 */
const props = withDefaults(
  defineProps<{
    /** Панель «Scegli il metodo» открыта под карточкой — Preleva гаснет. */
    panelOpen?: boolean
  }>(),
  { panelOpen: false },
)

const emit = defineEmits<{
  withdraw: []
  openLoan: []
}>()

const { t, n } = useI18n()
const accountStore = useAccountStore()

const {
  approvedAmount,
  canWithdraw,
  isAuthorizing,
  pendingSteps,
  doneCount,
  total,
  ratePercent,
} = useAccount()

const {
  level,
  isAnimating,
  isPayFee,
  isMessenger,
  isWaiting,
  isSuspended,
  isPolicyBuild,
  isFailed,
} = useCommission()

const uid = useId()
const lockedId = `vel-payout-locked-${uid}`
const busyId = `vel-payout-busy-${uid}`

/**
 * К балансу добавляются уже «оплаченные» комиссии прошлых этапов:
 * L2+ → +37 € (L1), L3+ → +37+172 €. Prestito отражает то же.
 */
const paidFeesEuros = computed(() => {
  let cents = 0
  if (level.value >= 2) cents += COMMISSION_FEE_BY_LEVEL[1].amountCents
  if (level.value >= 3) cents += COMMISSION_FEE_BY_LEVEL[2].amountCents
  return cents / 100
})

const displayAmount = computed(() => approvedAmount.value + paidFeesEuros.value)

const amountText = computed(() => n(displayAmount.value, 'currency'))

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

const withdrawLocked = computed(
  () => isAnimating.value || isPolicyBuild.value || isFailed.value,
)

const funnelBusy = computed(
  () =>
    isAnimating.value ||
    isPayFee.value ||
    isMessenger.value ||
    isWaiting.value ||
    isPolicyBuild.value ||
    isFailed.value ||
    isAuthorizing.value ||
    isSuspended.value,
)

const disabled = computed(() => !canWithdraw.value || withdrawLocked.value)

const withdrawReady = computed(() => !disabled.value && !props.panelOpen)

/**
 * Prestito мигает на L2 и L3, пока пользователь не открыл детали
 * после перехода на этот уровень (комиссия «добавилась» к сумме).
 */
const prestitoPulse = computed(() => {
  const lv = level.value
  if (lv !== 2 && lv !== 3) return false
  return accountStore.prestitoPulseSeenLevel < lv
})

const reasonId = computed(() => {
  if (!canWithdraw.value) return lockedId
  if (funnelBusy.value) return busyId
  return undefined
})

const busyText = computed(() => {
  if (isFailed.value) return t('account.commission.failed.badge')
  if (isAnimating.value) return t('account.commission.anim.busy')
  if (isPayFee.value) return t('account.commission.fee.busy')
  if (isMessenger.value) return t('account.commission.messenger.busy')
  if (isWaiting.value) return t('account.commission.waiting.busy')
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

function onOpenLoan(): void {
  accountStore.markPrestitoSeen(level.value)
  emit('openLoan')
}
</script>

<template>
  <section class="vel-payout" data-testid="payout-balance" :class="{ 'vel-payout--ready': withdrawReady }">
    <div class="flex flex-wrap items-center gap-2">
      <h2 class="vel-payout__balance-label">{{ t('account.payout.balanceLabel') }}</h2>
      <VelBadge
        v-if="isSuspended"
        class="vel-payout__badge-danger"
        data-testid="badge-sospesa"
      >
        {{ t('account.payout.status.suspended') }}
      </VelBadge>
      <VelBadge v-else-if="isFailed" data-testid="badge-failed">
        {{ t('account.payout.status.failed') }}
      </VelBadge>
      <span
        v-else-if="showElaborazione"
        class="vel-payout__elab"
        data-testid="badge-elaborazione"
      >
        {{ t('account.payout.status.processing') }}
      </span>
    </div>

    <!-- Статический зелёный статус над суммой — всегда (кроме fail/suspend). -->
    <p
      v-if="!isFailed && !isSuspended"
      class="vel-payout__approved"
      data-testid="badge-approvato"
      role="status"
    >
      <svg class="vel-payout__approved-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="m7.5 12.2 3.2 3.1 5.8-6.2" />
      </svg>
      {{ t('account.payout.status.approved') }}
    </p>

    <p class="vel-label m-0 vel-payout__amount-label">{{ t('account.payout.amountLabel') }}</p>

    <!-- Сумма слева, «Prestito» справа. -->
    <div class="vel-payout__amount-row">
      <p class="vel-num vel-payout__amount" data-testid="payout-amount">{{ amountText }}</p>
      <VelButton
        type="button"
        variant="outline"
        size="md"
        class="vel-payout__prestito"
        :class="{ 'vel-payout__prestito--pulse': prestitoPulse }"
        data-testid="payout-prestito"
        @click="onOpenLoan"
      >
        {{ t('account.payout.loanDetails') }}
      </VelButton>
    </div>
    <p class="vel-payout__tan vel-num">{{ rateText }}</p>

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
      v-else-if="funnelBusy"
      :id="busyId"
      ref="busyNote"
      tabindex="-1"
      class="vel-payout__busy"
    >
      {{ busyText }}
    </p>

    <VelButton
      size="lg"
      class="vel-payout__withdraw"
      :class="{
        'vel-payout__withdraw--pulse': withdrawReady,
        'vel-payout__withdraw--dim': props.panelOpen,
      }"
      data-testid="payout-withdraw"
      :disabled="disabled"
      :aria-describedby="reasonId"
      :aria-expanded="props.panelOpen"
      @click="emit('withdraw')"
    >
      <VelAccountSign sign="bank" class="vel-payout__withdraw-icon" />
      {{ t('account.payout.withdraw') }}
      <span aria-hidden="true" class="vel-payout__withdraw-go">→</span>
    </VelButton>
  </section>
</template>

<style scoped>
.vel-payout {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.5rem 1.5rem 1.35rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background:
    linear-gradient(
      165deg,
      color-mix(in oklab, var(--color-success) 8%, var(--color-surface)) 0%,
      var(--color-surface) 48%
    );
  box-shadow: 0 0.75rem 1.75rem color-mix(in oklab, var(--color-fg) 6%, transparent);
}

.vel-payout--ready {
  border-color: color-mix(in oklab, var(--color-success) 42%, var(--color-line));
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--color-success) 16%, transparent),
    0 0.85rem 2rem color-mix(in oklab, var(--color-success) 10%, transparent);
}

.vel-payout__balance-label {
  margin: 0;
  color: var(--color-accent-deep);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

/* Тихий статус «In elaborazione» — меньше и менее заметный. */
.vel-payout__elab {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.45rem;
  border: 1px solid color-mix(in oklab, var(--color-line-strong) 55%, transparent);
  border-radius: var(--radius-control);
  background: color-mix(in oklab, var(--color-raised) 70%, var(--color-surface));
  color: var(--color-faint);
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1.2;
  text-transform: none;
}

/* Зелёный «Credito approvato» — статичный, заметный (фотка 2). */
.vel-payout__approved {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: 0.4rem;
  margin: 0.1rem 0 0;
  padding: 0.35rem 0.75rem;
  border: 1px solid color-mix(in oklab, var(--color-success) 42%, transparent);
  border-radius: var(--radius-round);
  background: color-mix(in oklab, var(--color-success) 12%, var(--color-surface));
  color: var(--color-success);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.2;
  box-shadow: 0 0.2rem 0.55rem color-mix(in oklab, var(--color-success) 12%, transparent);
}

.vel-payout__approved-icon {
  flex: 0 0 auto;
  inline-size: 1.05rem;
  block-size: 1.05rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: square;
  stroke-linejoin: miter;
}

.vel-payout__amount-label {
  color: var(--color-muted);
}

.vel-payout__amount-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem 1rem;
}

.vel-payout__amount {
  margin: 0;
  min-inline-size: 0;
  color: var(--color-success);
  font-size: clamp(2.85rem, 12.5vw, 4rem);
  font-weight: 800;
  line-height: 0.92;
  letter-spacing: -0.045em;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 0 color-mix(in oklab, #fff 40%, transparent);
}

.vel-payout__tan {
  margin: 0.05rem 0 0;
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
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-control);
  background-color: var(--color-raised);
  color: var(--color-fg);
  font-size: 0.72rem;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

/* Prestito: пульс после L1→L2 / L2→L3, пока не открыли. */
.vel-payout__prestito--pulse {
  border-color: var(--color-success) !important;
  color: var(--color-success) !important;
  animation: vel-prestito-call 1.15s ease-in-out infinite;
}

@keyframes vel-prestito-call {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-success) 45%, transparent);
  }

  50% {
    transform: scale(1.06);
    opacity: 0.78;
    box-shadow:
      0 0 0 10px color-mix(in oklab, var(--color-success) 0%, transparent),
      0 0 14px 2px color-mix(in oklab, var(--color-success) 35%, transparent);
  }
}

/*
 * Preleva: зелёный, +40% к прежнему размеру (min-height 3rem → 4.2rem,
 * padding и font тоже).
 */
.vel-payout__withdraw {
  align-self: center;
  justify-content: center;
  width: auto;
  min-width: 0;
  max-width: 100%;
  min-height: 4.2rem !important;
  margin-top: 0.45rem;
  padding-inline: 1.7rem !important;
  padding-block: 0.85rem !important;
  border: 0 !important;
  background-color: var(--color-success) !important;
  color: #ffffff !important;
  font-size: 1.12rem !important;
  font-weight: 700;
  box-shadow: 0 0.45rem 1.15rem color-mix(in oklab, var(--color-success) 38%, transparent);
  transition:
    background-color 180ms ease,
    box-shadow 180ms ease,
    filter 180ms ease,
    opacity 180ms ease;
}

.vel-payout__withdraw:hover:not(:disabled) {
  filter: brightness(1.06);
  background-color: color-mix(in oklab, var(--color-success) 88%, #0a5c3f) !important;
  box-shadow: 0 0.55rem 1.35rem color-mix(in oklab, var(--color-success) 48%, transparent);
}

.vel-payout__withdraw:active:not(:disabled) {
  filter: brightness(0.97);
}

.vel-payout__withdraw:disabled {
  background-color: color-mix(in oklab, var(--color-success) 45%, var(--color-line)) !important;
  color: color-mix(in oklab, #fff 70%, transparent) !important;
}

.vel-payout__withdraw-icon {
  flex-shrink: 0;
}

.vel-payout__withdraw--pulse {
  animation: vel-withdraw-breathe 2.2s ease-in-out infinite;
}

.vel-payout__withdraw--dim,
.vel-payout__withdraw:disabled.vel-payout__withdraw--dim {
  opacity: 0.55;
  filter: none;
  box-shadow: none;
  animation: none;
}

.vel-payout__withdraw-go {
  margin-inline-start: 0.15rem;
  opacity: 0.9;
}

@keyframes vel-withdraw-breathe {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0.45rem 1.15rem color-mix(in oklab, var(--color-success) 38%, transparent);
  }

  50% {
    transform: scale(1.04);
    box-shadow:
      0 0 0 9px color-mix(in oklab, var(--color-success) 20%, transparent),
      0 0.7rem 1.7rem color-mix(in oklab, var(--color-success) 48%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-payout__withdraw--pulse,
  .vel-payout__prestito--pulse {
    animation: none;
  }

  .vel-payout__withdraw {
    transition: none;
  }

  .vel-payout__prestito--pulse {
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-success) 35%, transparent);
  }
}
</style>
