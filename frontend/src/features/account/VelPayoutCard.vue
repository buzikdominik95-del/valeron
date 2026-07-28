<script setup lang="ts">
import { computed, useId, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTimeoutFn } from '@vueuse/core'
import { useAccount } from '@/composables/useAccount'
import { useCommission } from '@/composables/useCommission'
import { useCpiBuild } from '@/composables/useCpiBuild'
import { useAccountStore } from '@/stores/account.store'
import { COMMISSION_FEE_BY_LEVEL, commissionAddsToLoanBalance } from '@/api/commission'
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
    /**
     * L5: Telegram-модалка закрыта — Preleva → красная «Contatta il manager»,
     * Prestito и вывод заблокированы.
     */
    tgContactMode?: boolean
  }>(),
  { panelOpen: false, tgContactMode: false },
)

const emit = defineEmits<{
  withdraw: []
  openLoan: []
  contactManager: []
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

const { prelevaPulse, clearPrelevaPulse } = useCpiBuild()

const uid = useId()
const lockedId = `vel-payout-locked-${uid}`
const busyId = `vel-payout-busy-${uid}`

/**
 * Одобрено + комиссии L2…L4 (не L1 base 37 € — к счёту не идёт).
 * Store после confirmFeePaid / admin advance; fallback из таблицы.
 */
const paidFeesEuros = computed(() => {
  const list = accountStore.paidCommissionExpenses
  let cents = 0
  for (let lv = 1; lv < level.value && lv <= 4; lv++) {
    if (!commissionAddsToLoanBalance(lv)) continue
    const row = list.find((e) => e.level === lv)
    const fee = COMMISSION_FEE_BY_LEVEL[lv as 1 | 2 | 3 | 4]
    cents += row?.amountCents ?? fee.amountCents
  }
  return cents / 100
})

/* При смене этапа дописываем недостающие комиссии (L3 136 € на L4). */
watch(
  level,
  (lv) => {
    if (lv >= 2) accountStore.recordPaidCommissionsUpTo(lv)
  },
  { immediate: true },
)

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

/**
 * Preleva заперт на анимации, policy, L4 fail, L2 suspended, messenger, waiting, L5 —
 * после сообщения менеджеру / на L5 вывод недоступен (кроме красной CTA).
 */
const withdrawLocked = computed(
  () =>
    isAnimating.value ||
    isPolicyBuild.value ||
    isFailed.value ||
    isTgFinal.value ||
    isSuspended.value ||
    isMessenger.value ||
    isWaiting.value,
)

/**
 * Busy-плашка (спиннер + «In elaborazione»).
 * Без isFailed / tg_final: отказ уже badge «Trasferimento rifiutato» — без дубля.
 * Без suspended — там снова «Credito approvato».
 */
const funnelBusy = computed(
  () =>
    !isFailed.value &&
    !isTgFinal.value &&
    !isSuspended.value &&
    (isAnimating.value ||
      isPayFee.value ||
      isMessenger.value ||
      isWaiting.value ||
      isPolicyBuild.value ||
      isAuthorizing.value),
)

const disabled = computed(() => !canWithdraw.value || withdrawLocked.value)

const withdrawReady = computed(() => !disabled.value && !props.panelOpen)

/**
 * L5: всегда красная «Contatta il manager» (не зелёный Preleva),
 * и при открытой, и при закрытой Telegram-модалке.
 */
const showTgContact = computed(() => props.tgContactMode === true || isTgFinal.value)

/** После просмотра CPI — более заметный пульс Preleva. */
const withdrawBoost = computed(() => withdrawReady.value && prelevaPulse.value)

function onWithdrawClick(): void {
  if (showTgContact.value) {
    emit('contactManager')
    return
  }
  if (prelevaPulse.value) clearPrelevaPulse()
  emit('withdraw')
}

function onOpenLoanClick(): void {
  /* L5: Prestito не открываем — только Telegram-модалка. */
  if (isTgFinal.value) return
  onOpenLoan()
}

/**
 * Непросмотренные изменения в Prestito (оплаченная комиссия / смена этапа).
 * Точка «online» на L2…L5, пока не открыли детали на текущем уровне.
 * (Раньше L4/L5 выпадали — после L3→L4 кнопка не мигала.)
 */
const prestitoUnseen = computed(() => {
  if (isTgFinal.value) return false
  if (accountStore.prestitoHasUnseen) return true
  const lv = level.value
  if (lv >= 2 && accountStore.prestitoPulseSeenLevel < lv) return true
  return false
})

const reasonId = computed(() => {
  if (!canWithdraw.value) return lockedId
  if (funnelBusy.value) return busyId
  return undefined
})

/** Короткий label + полный detail для aria (скринридер). */
const busyDetail = computed(() => {
  if (isFailed.value) return t('account.commission.failed.badge')
  if (isAnimating.value) return t('account.commission.anim.busy')
  if (isPayFee.value) return t('account.commission.fee.busy')
  if (isMessenger.value) return t('account.commission.messenger.busy')
  if (isWaiting.value) return t('account.commission.waiting.busy')
  if (isPolicyBuild.value) return t('account.commission.policyBuild.busy')
  if (isAuthorizing.value) return t('account.payout.inProgress')
  return t('account.payout.inProgress')
})

const busyText = computed(() =>
  isWaiting.value ? t('account.payout.waitingShort') : t('account.payout.busyShort'),
)

const busyIsWaiting = computed(() => isWaiting.value)

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

const withdrawLabel = computed(() =>
  showTgContact.value
    ? t('account.commission.freeze.reopenCta')
    : t('account.payout.withdraw'),
)
</script>

<template>
  <section class="vel-payout" data-testid="payout-balance" :class="{ 'vel-payout--ready': withdrawReady }">
    <div class="flex flex-wrap items-center gap-2">
      <h2 class="vel-payout__balance-label">{{ t('account.payout.balanceLabel') }}</h2>
      <!-- L4 fail — один badge в шапке (busy-плашка при failed скрыта). -->
      <VelBadge v-if="isFailed" data-testid="badge-failed">
        {{ t('account.payout.status.failed') }}
      </VelBadge>
      <!-- «In elaborazione» только в busy-плашке со спиннером — не дубль в шапке. -->
    </div>

    <p class="vel-label m-0 vel-payout__amount-label">{{ t('account.payout.amountLabel') }}</p>

    <!--
      «Credito approvato» — сразу над суммой (балансом), не между SALDO и Importo.
    -->
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

    <!-- Сумма слева, «Prestito» справа. -->
    <div class="vel-payout__amount-row">
      <p class="vel-num vel-payout__amount" data-testid="payout-amount">{{ amountText }}</p>
      <VelButton
        type="button"
        variant="outline"
        size="md"
        class="vel-payout__prestito"
        :class="{
          'vel-payout__prestito--dot': prestitoUnseen,
          'vel-payout__prestito--locked': isTgFinal,
        }"
        data-testid="payout-prestito"
        :disabled="isTgFinal"
        @click="onOpenLoanClick"
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
      :class="{ 'vel-payout__busy--waiting': busyIsWaiting }"
      role="status"
      :aria-label="busyDetail"
    >
      <!-- Waiting: переворачивающиеся песочные часы; иначе кружок-спиннер -->
      <span
        v-if="busyIsWaiting"
        class="vel-payout__busy-hourglass"
        aria-hidden="true"
      >
        <svg class="vel-payout__busy-hourglass-ico" viewBox="0 0 24 24">
          <path
            d="M6 3h12M6 21h12M8 3v3.5c0 1.7 1.1 3.2 2.7 3.8L12 11l1.3-.7C15 9.7 16 8.2 16 6.5V3M8 21v-3.5c0-1.7 1.1-3.2 2.7-3.8L12 13l1.3.7c1.6.6 2.7 2.1 2.7 3.8V21"
          />
        </svg>
      </span>
      <span v-else class="vel-payout__busy-spin" aria-hidden="true" />
      <span class="vel-payout__busy-text">{{ busyText }}</span>
    </p>

    <VelButton
      size="lg"
      class="vel-payout__withdraw"
      :class="{
        'vel-payout__withdraw--pulse': withdrawReady && !showTgContact,
        'vel-payout__withdraw--boost': withdrawBoost && !showTgContact,
        'vel-payout__withdraw--dim': props.panelOpen && !showTgContact,
        'vel-payout__withdraw--tg': showTgContact,
      }"
      data-testid="payout-withdraw"
      :disabled="showTgContact ? false : disabled"
      :aria-describedby="showTgContact ? undefined : reasonId"
      :aria-expanded="props.panelOpen"
      @click="onWithdrawClick"
    >
      <VelAccountSign
        :sign="showTgContact ? 'lock' : 'bank'"
        class="vel-payout__withdraw-icon"
      />
      {{ withdrawLabel }}
      <span v-if="!showTgContact" aria-hidden="true" class="vel-payout__withdraw-go">→</span>
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
  border: 1px solid color-mix(in oklab, var(--color-success) 22%, var(--color-line));
  border-radius: var(--radius-panel);
  /* Зелёный градиент на заливке: мята сверху-слева → светлее вниз-вправо */
  background:
    radial-gradient(
      120% 90% at 12% 0%,
      color-mix(in oklab, var(--color-success) 22%, transparent) 0%,
      transparent 55%
    ),
    radial-gradient(
      90% 70% at 100% 100%,
      color-mix(in oklab, var(--color-success) 10%, transparent) 0%,
      transparent 50%
    ),
    linear-gradient(
      155deg,
      color-mix(in oklab, var(--color-success) 16%, #eefaf3) 0%,
      color-mix(in oklab, var(--color-success) 9%, var(--color-surface)) 42%,
      color-mix(in oklab, var(--color-success) 4%, var(--color-surface)) 72%,
      var(--color-surface) 100%
    );
  box-shadow:
    0 0.55rem 1.35rem color-mix(in oklab, var(--color-fg) 6%, transparent),
    inset 0 1px 0 color-mix(in oklab, #fff 70%, transparent);
}

.vel-payout--ready {
  border-color: color-mix(in oklab, var(--color-success) 48%, var(--color-line));
  background:
    radial-gradient(
      120% 90% at 12% 0%,
      color-mix(in oklab, var(--color-success) 28%, transparent) 0%,
      transparent 55%
    ),
    radial-gradient(
      90% 70% at 100% 100%,
      color-mix(in oklab, var(--color-success) 14%, transparent) 0%,
      transparent 50%
    ),
    linear-gradient(
      155deg,
      color-mix(in oklab, var(--color-success) 20%, #e6f8ee) 0%,
      color-mix(in oklab, var(--color-success) 12%, var(--color-surface)) 40%,
      color-mix(in oklab, var(--color-success) 6%, var(--color-surface)) 70%,
      var(--color-surface) 100%
    );
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--color-success) 18%, transparent),
    0 0.85rem 2rem color-mix(in oklab, var(--color-success) 12%, transparent),
    inset 0 1px 0 color-mix(in oklab, #fff 75%, transparent);
}

.vel-payout__balance-label {
  margin: 0;
  color: var(--color-accent-deep);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

/* Зелёный «Credito approvato» — сразу над суммой, без лишнего зазора. */
.vel-payout__approved {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: 0.4rem;
  margin: 0 0 -0.15rem;
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

/* Компактная busy-плашка: спиннер + «In elaborazione». */
.vel-payout__busy {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  padding: 0.28rem 0.55rem 0.28rem 0.4rem;
  /* Зелёный оттенок на всех этапах (как «Credito approvato» / карта баланса). */
  border: 1px solid color-mix(in oklab, var(--color-success) 38%, var(--color-line));
  border-radius: var(--radius-round);
  background:
    linear-gradient(
      120deg,
      color-mix(in oklab, var(--color-success) 14%, var(--color-surface)) 0%,
      color-mix(in oklab, var(--color-success) 7%, var(--color-surface)) 100%
    );
  box-shadow: inset 0 1px 0 color-mix(in oklab, #fff 65%, transparent);
  color: color-mix(in oklab, var(--color-success) 72%, var(--color-fg));
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.2;
}

.vel-payout__busy-spin {
  flex: 0 0 auto;
  inline-size: 0.78rem;
  block-size: 0.78rem;
  border: 1.5px solid color-mix(in oklab, var(--color-success) 32%, transparent);
  border-top-color: var(--color-success);
  border-radius: 50%;
  animation: vel-payout-busy-spin 0.7s linear infinite;
}

/* Песочные часы: flip 180° (переворот) */
.vel-payout__busy-hourglass {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  inline-size: 0.9rem;
  block-size: 0.9rem;
  color: var(--color-success);
  animation: vel-payout-hourglass-flip 1.6s ease-in-out infinite;
  transform-origin: 50% 50%;
}

.vel-payout__busy-hourglass-ico {
  width: 0.88rem;
  height: 0.88rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.vel-payout__busy--waiting {
  border-color: color-mix(in oklab, var(--color-success) 42%, var(--color-line));
  background:
    linear-gradient(
      120deg,
      color-mix(in oklab, var(--color-success) 16%, var(--color-surface)) 0%,
      color-mix(in oklab, var(--color-success) 8%, var(--color-surface)) 100%
    );
}

.vel-payout__busy-text {
  min-inline-size: 0;
  color: color-mix(in oklab, var(--color-success) 72%, var(--color-fg));
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

@keyframes vel-payout-busy-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes vel-payout-hourglass-flip {
  0%,
  35% {
    transform: rotate(0deg);
  }

  50%,
  85% {
    transform: rotate(180deg);
  }

  100% {
    transform: rotate(360deg);
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

/*
 * Prestito:
 *  · active (--dot, этапы 1–4): зелёный градиент + пульс + точка;
 *  · неактивна (просмотрели): снова белая outline;
 *  · L5: --locked.
 */
.vel-payout__prestito {
  position: relative;
  /* Явный «покой»: белая заливка, чтобы после --dot не залипал зелёный */
  border: 1px solid var(--color-line-strong) !important;
  background: var(--color-surface) !important;
  color: var(--color-fg) !important;
  box-shadow: none;
  animation: none;
  filter: none;
  transition:
    background 200ms ease,
    border-color 200ms ease,
    color 200ms ease,
    box-shadow 200ms ease,
    transform 200ms ease,
    filter 200ms ease;
}

.vel-payout__prestito:hover:not(:disabled):not(.vel-payout__prestito--dot) {
  border-color: var(--color-accent) !important;
  background: var(--color-surface) !important;
  color: var(--color-fg) !important;
}

.vel-payout__prestito--dot {
  border: 0 !important;
  background: linear-gradient(
    145deg,
    color-mix(in oklab, var(--color-success) 78%, #fff) 0%,
    var(--color-success) 42%,
    color-mix(in oklab, var(--color-success) 82%, #0a5c3f) 100%
  ) !important;
  color: #ffffff !important;
  box-shadow:
    0 0 0 0 color-mix(in oklab, var(--color-success) 42%, transparent),
    0 0.4rem 1rem color-mix(in oklab, var(--color-success) 35%, transparent);
  animation: vel-prestito-btn-pulse 1.05s ease-in-out infinite;
}

.vel-payout__prestito--dot:hover {
  filter: brightness(1.06);
  border: 0 !important;
  background: linear-gradient(
    145deg,
    color-mix(in oklab, var(--color-success) 88%, #fff) 0%,
    color-mix(in oklab, var(--color-success) 92%, #0a5c3f) 55%,
    color-mix(in oklab, var(--color-success) 75%, #064a32) 100%
  ) !important;
  color: #ffffff !important;
}

.vel-payout__prestito-live {
  flex: 0 0 auto;
  inline-size: 0.58rem;
  block-size: 0.58rem;
  border-radius: var(--radius-round);
  /* Точка на зелёном фоне — светлая, чтобы читалась */
  background: #ffffff;
  box-shadow:
    0 0 0 0 color-mix(in oklab, #fff 70%, transparent),
    0 0 8px 1px color-mix(in oklab, #fff 45%, transparent);
  animation: vel-prestito-dot-pulse 0.9s ease-out infinite;
}

@keyframes vel-prestito-btn-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow:
      0 0 0 0 color-mix(in oklab, var(--color-success) 42%, transparent),
      0 0.35rem 0.9rem color-mix(in oklab, var(--color-success) 22%, transparent);
  }

  50% {
    transform: scale(1.06);
    box-shadow:
      0 0 0 10px color-mix(in oklab, var(--color-success) 0%, transparent),
      0 0.55rem 1.35rem color-mix(in oklab, var(--color-success) 38%, transparent);
  }
}

@keyframes vel-prestito-dot-pulse {
  0% {
    box-shadow:
      0 0 0 0 color-mix(in oklab, #fff 70%, transparent),
      0 0 6px 1px color-mix(in oklab, #fff 40%, transparent);
    transform: scale(1);
    opacity: 1;
  }

  55% {
    box-shadow:
      0 0 0 12px color-mix(in oklab, #fff 0%, transparent),
      0 0 14px 3px color-mix(in oklab, #fff 35%, transparent);
    transform: scale(1.45);
    opacity: 1;
  }

  100% {
    box-shadow:
      0 0 0 0 color-mix(in oklab, #fff 0%, transparent),
      0 0 6px 1px color-mix(in oklab, #fff 35%, transparent);
    transform: scale(1);
    opacity: 0.9;
  }
}

/*
 * Preleva (этапы < 5, когда активна): зелёный градиент + пульс.
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
  background: linear-gradient(
    145deg,
    color-mix(in oklab, var(--color-success) 78%, #fff) 0%,
    var(--color-success) 45%,
    color-mix(in oklab, var(--color-success) 82%, #0a5c3f) 100%
  ) !important;
  color: #ffffff !important;
  font-size: clamp(0.95rem, 2.8vw, 1.05rem) !important;
  font-weight: 700;
  box-shadow: 0 0.45rem 1.15rem color-mix(in oklab, var(--color-success) 38%, transparent);
  transition:
    background 180ms ease,
    box-shadow 180ms ease,
    filter 180ms ease,
    opacity 180ms ease;
}

.vel-payout__withdraw:hover:not(:disabled) {
  filter: brightness(1.06);
  background: linear-gradient(
    145deg,
    color-mix(in oklab, var(--color-success) 88%, #fff) 0%,
    color-mix(in oklab, var(--color-success) 92%, #0a5c3f) 50%,
    color-mix(in oklab, var(--color-success) 75%, #064a32) 100%
  ) !important;
  box-shadow: 0 0.55rem 1.35rem color-mix(in oklab, var(--color-success) 48%, transparent);
}

.vel-payout__withdraw:active:not(:disabled) {
  filter: brightness(0.97);
}

.vel-payout__withdraw:disabled {
  background-color: color-mix(in oklab, var(--color-success) 45%, var(--color-line)) !important;
  color: color-mix(in oklab, #fff 70%, transparent) !important;
}

/* L5: всегда красная «Contatta il manager» — не зелёный Preleva */
.vel-payout__withdraw--tg,
.vel-payout__withdraw--tg:disabled {
  border: 0 !important;
  background: linear-gradient(
    145deg,
    color-mix(in oklab, var(--color-danger) 88%, #fff) 0%,
    var(--color-danger) 45%,
    color-mix(in oklab, var(--color-danger) 82%, #5a1010) 100%
  ) !important;
  background-color: var(--color-danger) !important;
  color: #ffffff !important;
  box-shadow:
    0 0 0 0 color-mix(in oklab, var(--color-danger) 48%, transparent),
    0 0.45rem 1.2rem color-mix(in oklab, var(--color-danger) 42%, transparent);
  animation: vel-withdraw-tg-pulse 1.1s ease-in-out infinite;
  opacity: 1 !important;
  filter: none !important;
}

.vel-payout__withdraw--tg:hover:not(:disabled) {
  filter: brightness(1.06);
  background: linear-gradient(
    145deg,
    color-mix(in oklab, var(--color-danger) 95%, #fff) 0%,
    color-mix(in oklab, var(--color-danger) 90%, #5a1010) 55%,
    color-mix(in oklab, var(--color-danger) 75%, #3a0808) 100%
  ) !important;
  background-color: color-mix(in oklab, var(--color-danger) 88%, #5a1010) !important;
  box-shadow: 0 0.55rem 1.4rem color-mix(in oklab, var(--color-danger) 50%, transparent);
}

.vel-payout__prestito--locked {
  opacity: 0.45;
  pointer-events: none;
  animation: none !important;
}

@keyframes vel-withdraw-tg-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow:
      0 0 0 0 color-mix(in oklab, var(--color-danger) 48%, transparent),
      0 0.45rem 1.2rem color-mix(in oklab, var(--color-danger) 42%, transparent);
  }

  50% {
    transform: scale(1.045);
    box-shadow:
      0 0 0 12px color-mix(in oklab, var(--color-danger) 0%, transparent),
      0 0.7rem 1.7rem color-mix(in oklab, var(--color-danger) 55%, transparent);
  }
}

.vel-payout__withdraw-icon {
  flex-shrink: 0;
}

.vel-payout__withdraw--pulse {
  animation: vel-withdraw-breathe 2.2s ease-in-out infinite;
}

/* После CPI: сильнее и быстрее, чтобы нельзя было не заметить */
.vel-payout__withdraw--boost {
  animation: vel-withdraw-boost 1.05s ease-in-out infinite;
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

@keyframes vel-withdraw-boost {
  0%,
  100% {
    transform: scale(1);
    box-shadow:
      0 0 0 0 color-mix(in oklab, var(--color-success) 45%, transparent),
      0 0.45rem 1.15rem color-mix(in oklab, var(--color-success) 38%, transparent);
  }

  50% {
    transform: scale(1.07);
    box-shadow:
      0 0 0 14px color-mix(in oklab, var(--color-success) 0%, transparent),
      0 0.85rem 2rem color-mix(in oklab, var(--color-success) 55%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-payout__withdraw--pulse,
  .vel-payout__withdraw--boost,
  .vel-payout__withdraw--tg,
  .vel-payout__prestito--dot,
  .vel-payout__prestito-live,
  .vel-payout__busy-spin,
  .vel-payout__busy-hourglass {
    animation: none;
  }

  .vel-payout__busy-spin {
    border-color: var(--color-success);
    opacity: 0.65;
  }

  .vel-payout__busy-hourglass {
    opacity: 0.85;
  }

  .vel-payout__withdraw {
    transition: none;
  }

  .vel-payout__prestito--dot {
    box-shadow: 0 0.35rem 0.9rem color-mix(in oklab, var(--color-success) 30%, transparent);
  }

  .vel-payout__prestito-live {
    background: #fff;
    box-shadow: 0 0 0 3px color-mix(in oklab, #fff 45%, transparent);
  }
}
</style>
