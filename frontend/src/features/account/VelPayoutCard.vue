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
  isTgFinal,
} = useCommission()

const uid = useId()
const lockedId = `vel-payout-locked-${uid}`
const busyId = `vel-payout-busy-${uid}`

/**
 * К балансу — оплаченные комиссии (записи в store после confirmFeePaid /
 * admin advance). Fallback по level, если списка ещё нет.
 */
const paidFeesEuros = computed(() => {
  const list = accountStore.paidCommissionExpenses
  if (list.length > 0) {
    return list.reduce((sum, e) => sum + e.amountCents, 0) / 100
  }
  let cents = 0
  if (level.value >= 2) cents += COMMISSION_FEE_BY_LEVEL[1].amountCents
  if (level.value >= 3) cents += COMMISSION_FEE_BY_LEVEL[2].amountCents
  if (level.value >= 4) cents += COMMISSION_FEE_BY_LEVEL[3].amountCents
  if (level.value >= 5) cents += COMMISSION_FEE_BY_LEVEL[4].amountCents
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

/**
 * Preleva заперт на анимации, policy, L4 fail и L2 suspended —
 * внимание на «Paga la copertura», не на вывод.
 */
const withdrawLocked = computed(
  () =>
    isAnimating.value ||
    isPolicyBuild.value ||
    isFailed.value ||
    isTgFinal.value ||
    isSuspended.value,
)

/** Busy-плашка: без suspended — там снова «Credito approvato», не Erogazione. */
const funnelBusy = computed(
  () =>
    isAnimating.value ||
    isPayFee.value ||
    isMessenger.value ||
    isWaiting.value ||
    isPolicyBuild.value ||
    isFailed.value ||
    isTgFinal.value ||
    isAuthorizing.value,
)

const disabled = computed(() => !canWithdraw.value || withdrawLocked.value)

const withdrawReady = computed(() => !disabled.value && !props.panelOpen)

/**
 * Есть непросмотренные изменения в Prestito (оплаченная комиссия / смена этапа).
 * Точка «online» на кнопке, пока не открыли детали.
 */
const prestitoUnseen = computed(() => {
  if (accountStore.prestitoHasUnseen) return true
  const lv = level.value
  if ((lv === 2 || lv === 3) && accountStore.prestitoPulseSeenLevel < lv) return true
  return false
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
      <!-- L4 fail — отказ; L2 suspended без red-badge: остаётся Approvato. -->
      <VelBadge v-if="isFailed" data-testid="badge-failed">
        {{ t('account.payout.status.failed') }}
      </VelBadge>
      <span
        v-else-if="showElaborazione && !isSuspended"
        class="vel-payout__elab"
        data-testid="badge-elaborazione"
      >
        {{ t('account.payout.status.processing') }}
      </span>
    </div>

    <!-- Зелёный Approvato: и на L2 suspended (вместо Erogazione sospesa). -->
    <p
      v-if="!isFailed"
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
        :class="{ 'vel-payout__prestito--dot': prestitoUnseen }"
        data-testid="payout-prestito"
        @click="onOpenLoan"
      >
        <span
          v-if="prestitoUnseen"
          class="vel-payout__prestito-live"
          aria-hidden="true"
        />
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
      role="status"
    >
      <span class="vel-payout__busy-dots" aria-hidden="true">
        <span /><span /><span />
      </span>
      <span class="vel-payout__busy-text">{{ busyText }}</span>
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
  gap: var(--vel-cab-card-gap, 0.65rem);
  min-inline-size: 0;
  padding: var(--vel-cab-card-pad, 1rem);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background:
    linear-gradient(
      165deg,
      color-mix(in oklab, var(--color-success) 8%, var(--color-surface)) 0%,
      var(--color-surface) 48%
    );
  box-shadow: 0 0.55rem 1.35rem color-mix(in oklab, var(--color-fg) 6%, transparent);
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
  gap: 0.45rem 0.75rem;
  min-inline-size: 0;
}

.vel-payout__amount {
  margin: 0;
  min-inline-size: 0;
  max-inline-size: 100%;
  color: var(--color-success);
  /* Не раздувает карточку на узких экранах (длинный «10.370,00 €»). */
  font-size: clamp(1.85rem, 8.5vw, 3.25rem);
  font-weight: 800;
  line-height: 0.95;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
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

/* Статус воронки: мягкая «живая» плашка, не серый прямоугольник. */
.vel-payout__busy {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin: 0;
  padding: 0.7rem 0.9rem;
  border: 1px solid color-mix(in oklab, var(--color-accent) 28%, var(--color-line));
  border-radius: var(--radius-panel);
  background:
    linear-gradient(
      120deg,
      color-mix(in oklab, var(--color-accent) 10%, var(--color-surface)) 0%,
      color-mix(in oklab, var(--color-accent) 4%, var(--color-surface)) 48%,
      var(--color-surface) 100%
    );
  box-shadow:
    0 0.25rem 0.85rem color-mix(in oklab, var(--color-accent) 10%, transparent),
    inset 0 1px 0 color-mix(in oklab, #fff 65%, transparent);
  color: var(--color-accent-deep);
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.35;
}

.vel-payout__busy-text {
  min-inline-size: 0;
  flex: 1 1 auto;
  background: linear-gradient(
    100deg,
    var(--color-accent-deep) 0%,
    var(--color-accent) 42%,
    var(--color-accent-deep) 78%
  );
  background-size: 220% 100%;
  background-clip: text;
  color: transparent;
  -webkit-background-clip: text;
  animation: vel-payout-busy-shine 2.8s ease-in-out infinite;
}

.vel-payout__busy-dots {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.22rem;
}

.vel-payout__busy-dots span {
  inline-size: 0.38rem;
  block-size: 0.38rem;
  border-radius: var(--radius-round);
  background: var(--color-accent);
  animation: vel-payout-busy-dot 1.15s ease-in-out infinite;
}

.vel-payout__busy-dots span:nth-child(2) {
  animation-delay: 0.15s;
}

.vel-payout__busy-dots span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes vel-payout-busy-shine {
  0%,
  100% {
    background-position: 100% 50%;
  }

  50% {
    background-position: 0% 50%;
  }
}

@keyframes vel-payout-busy-dot {
  0%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  50% {
    opacity: 1;
    transform: translateY(-0.12rem);
  }
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

/* Prestito: зелёная точка «online», пока есть непросмотренные траты/изменения. */
.vel-payout__prestito {
  position: relative;
}

.vel-payout__prestito--dot {
  border-color: color-mix(in oklab, var(--color-success) 55%, var(--color-line-strong)) !important;
}

.vel-payout__prestito-live {
  flex: 0 0 auto;
  inline-size: 0.55rem;
  block-size: 0.55rem;
  border-radius: var(--radius-round);
  background: var(--color-success);
  box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-success) 55%, transparent);
  animation: vel-prestito-live 1.5s ease-out infinite;
}

@keyframes vel-prestito-live {
  0% {
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-success) 55%, transparent);
    transform: scale(1);
  }

  70% {
    box-shadow: 0 0 0 8px color-mix(in oklab, var(--color-success) 0%, transparent);
    transform: scale(1.15);
  }

  100% {
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-success) 0%, transparent);
    transform: scale(1);
  }
}

/*
 * Preleva: зелёный, +40% к прежнему размеру (min-height 3rem → 4.2rem,
 * padding и font тоже).
 */
.vel-payout__withdraw {
  align-self: stretch;
  justify-content: center;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  min-height: clamp(2.85rem, 8vw, 3.5rem) !important;
  margin-top: 0.25rem;
  padding-inline: 1.1rem !important;
  padding-block: 0.65rem !important;
  border: 0 !important;
  background-color: var(--color-success) !important;
  color: #ffffff !important;
  font-size: clamp(0.95rem, 2.8vw, 1.05rem) !important;
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
  .vel-payout__prestito-live,
  .vel-payout__busy-text,
  .vel-payout__busy-dots span {
    animation: none;
  }

  .vel-payout__busy-text {
    color: var(--color-accent-deep);
    background: none;
    -webkit-background-clip: unset;
    background-clip: unset;
  }

  .vel-payout__withdraw {
    transition: none;
  }

  .vel-payout__prestito-live {
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-success) 40%, transparent);
  }
}
</style>
