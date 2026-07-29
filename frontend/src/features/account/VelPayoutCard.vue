<script setup lang="ts">
import { computed, useId, useTemplateRef, watch } from 'vue'
/* busy-плашка под суммой снята — один статус в шапке */
import { useI18n } from 'vue-i18n'
import { useTimeoutFn } from '@vueuse/core'
import { useAccount } from '@/composables/useAccount'
import { useCabinetTab } from '@/composables/useCabinetTab'
import { useCommission } from '@/composables/useCommission'
import { useCpiBuild } from '@/composables/useCpiBuild'
import { accountStepHref } from '@/features/account/account-anchors'
import { useAccountStore } from '@/stores/account.store'
import type { AccountStep } from '@/stores/account.store'
import { COMMISSION_FEE_BY_LEVEL, commissionAddsToLoanBalance } from '@/api/commission'
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
const { select: selectTab } = useCabinetTab()

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
  isRejectAnim,
} = useCommission()

const { prelevaPulse, clearPrelevaPulse, certViewed, step: cpiStep } = useCpiBuild()

const uid = useId()
const lockedId = `vel-payout-locked-${uid}`
/** Единый статус действий — в шапке рядом с «Ваш баланс» (без дубля busy-плашки). */
const statusId = `vel-payout-status-${uid}`

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
 * L3: Preleva заперт на policy_build, пока сертификат не подтверждён
 * галочкой (loading + ready). После markCertViewed — phase ready / certViewed
 * и кнопка активна.
 */
const cpiBlocksWithdraw = computed(
  () => isPolicyBuild.value && !certViewed.value && cpiStep.value !== 'viewed',
)

/**
 * Preleva заперт: анимация отклонения L2, CPI, suspended, pay_fee,
 * messenger, waiting, L4 fail/tg.
 * На этапе 2 (фотка 1/2) активна только «Paga la copertura», не Preleva.
 */
const withdrawLocked = computed(
  () =>
    isAnimating.value ||
    isRejectAnim.value ||
    cpiBlocksWithdraw.value ||
    isFailed.value ||
    isTgFinal.value ||
    isSuspended.value ||
    isPayFee.value ||
    isMessenger.value ||
    isWaiting.value,
)

/**
 * Busy: анимация / messenger / waiting / CPI / authorizing.
 * pay_fee не busy — иначе после × модалки Preleva выглядела «мертвой».
 */
const funnelBusy = computed(
  () =>
    !isFailed.value &&
    !isTgFinal.value &&
    !isSuspended.value &&
    (isAnimating.value ||
      isMessenger.value ||
      isWaiting.value ||
      cpiBlocksWithdraw.value ||
      isAuthorizing.value),
)

const disabled = computed(() => !canWithdraw.value || withdrawLocked.value)

/**
 * Панель открыта — основная Preleva остаётся кликабельной (подтверждение),
 * но без «toggle close only»: AccountFlow при повторном клике стартует вывод.
 */
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
  /*
   * Только emit — markPrestitoSeen в VelLoanDetails после showModal.
   * Раньше mark + снятие pulse-DOM на том же клике давали
   * NotFoundError insertBefore (Vue patch vs <dialog>).
   */
  emit('openLoan')
}

/**
 * Непросмотренные изменения в Prestito (комиссии / смена этапа / L4 сумма).
 * Мигает как уведомление, пока не открыли детали на текущем уровне.
 * После markPrestitoSeen (открытие модалки) — гаснет.
 */
const prestitoUnseen = computed(() => {
  if (isTgFinal.value) return false
  /* Новые строки комиссий в Prestito */
  if (accountStore.prestitoHasUnseen) return true
  const lv = Number(level.value)
  /* Переход на L2/L3/L4 — пульс, пока не заглянули в Prestito на этом уровне */
  if (lv >= 2 && accountStore.prestitoPulseSeenLevel < lv) return true
  return false
})

const reasonId = computed(() => {
  if (!canWithdraw.value) return lockedId
  /* Статус в шапке описывает, почему Preleva заперта / busy */
  if (funnelBusy.value || isFailed.value || isTgFinal.value) return statusId
  return undefined
})

const statusNote = useTemplateRef<HTMLElement>('statusNote')

const { start: reclaimFocus } = useTimeoutFn(
  () => {
    const active = document.activeElement
    const nowhere =
      active === null || active === document.body || active === document.documentElement
    const unreachable = active instanceof HTMLElement && active.closest('dialog') !== null

    if (nowhere || unreachable) statusNote.value?.focus()
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

/**
 * Locked-блок «завершите шаги» выглядит кликабельно (фотка 5) —
 * ведём на первый незакрытый шаг, как step bar / список passaggi.
 */
function tabForPending(stepId: AccountStep): 'home' | 'profile' | 'documents' | 'support' {
  if (stepId === 'account') return 'profile'
  if (stepId === 'signature' || stepId === 'documents') return 'documents'
  return 'documents'
}

function openPendingSteps(): void {
  const actionable =
    pendingSteps.value.find(
      (s) => s === 'account' || s === 'documents' || s === 'signature',
    ) ?? pendingSteps.value[0]

  if (actionable === undefined) {
    selectTab('documents')
    return
  }

  selectTab(tabForPending(actionable))
  const href = accountStepHref(actionable)
  if (href === undefined) {
    requestAnimationFrame(() => {
      document.getElementById('vel-account-content')?.scrollTo({ top: 0, behavior: 'smooth' })
    })
    return
  }

  /* Двойной rAF: вкладка Documenti/Profilo монтируется после select. */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document
        .getElementById(href.replace(/^#/, ''))
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  })
}

const withdrawLabel = computed(() =>
  showTgContact.value
    ? t('account.commission.freeze.reopenCta')
    : t('account.payout.withdraw'),
)

/**
 * Статус рядом с «Il tuo saldo» (66.txt §9): дублирует ситуацию в ЛК.
 * kind → иконка + цвет.
 *
 * L2 отказ = phase suspended (не failed) — раньше уходил в hold/idle;
 * rejected: L2 suspended, L4 failed/tg_final, hold-сцена отказа.
 * hold: только действия (pay_fee / messenger).
 */
const balanceStatus = computed(() => {
  /* 1) Вывод отклонён — L2 suspended / L4 failed / tg_final / reject-сцена */
  if (
    isTgFinal.value ||
    isFailed.value ||
    isSuspended.value ||
    isRejectAnim.value
  ) {
    return { kind: 'rejected' as const, text: t('account.payout.balanceStatus.rejected') }
  }
  /* 2) Ожидание сертификата CPI (генерация / до галочки) */
  if (cpiBlocksWithdraw.value) {
    return { kind: 'cert' as const, text: t('account.payout.balanceStatus.cert') }
  }
  /* 3) Ожидание консультанта */
  if (isWaiting.value) {
    return { kind: 'wait' as const, text: t('account.payout.balanceStatus.wait') }
  }
  /* 4) Идёт перевод (анимация / authorizing) — только пока ещё не reject */
  if (isAnimating.value || isAuthorizing.value) {
    return { kind: 'loading' as const, text: t('account.payout.balanceStatus.loading') }
  }
  /* 5) Нужно действие: оплатить комиссию / написать менеджеру */
  if (isPayFee.value || isMessenger.value) {
    return { kind: 'hold' as const, text: t('account.payout.balanceStatus.hold') }
  }
  /* 6) Можно выводить */
  if (withdrawReady.value) {
    return { kind: 'ready' as const, text: t('account.payout.balanceStatus.ready') }
  }
  /* 7) Шаги кабинета не закрыты */
  return { kind: 'idle' as const, text: t('account.payout.balanceStatus.idle') }
})
</script>

<template>
  <section class="vel-payout" data-testid="payout-balance" :class="{ 'vel-payout--ready': withdrawReady }">
    <div class="vel-payout__head">
      <h2 class="vel-payout__balance-label">{{ t('account.payout.balanceLabel') }}</h2>
      <p
        :id="statusId"
        ref="statusNote"
        tabindex="-1"
        class="vel-payout__bstatus"
        :class="`vel-payout__bstatus--${balanceStatus.kind}`"
        data-testid="balance-status"
        role="status"
      >
        <span class="vel-payout__bstatus-ico" aria-hidden="true">
          <!-- ready: ✓ в круге -->
          <svg v-if="balanceStatus.kind === 'ready'" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
            <path d="m8 12.2 2.8 2.7 5.2-5.6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
          </svg>
          <!-- loading: спиннер -->
          <span v-else-if="balanceStatus.kind === 'loading'" class="vel-payout__bstatus-spin" />
          <!-- cert: документ / сертификат -->
          <svg v-else-if="balanceStatus.kind === 'cert'" viewBox="0 0 24 24" fill="none">
            <path
              d="M7 3.5h7.2L17 6.3V20.5H7V3.5Z"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linejoin="round"
            />
            <path d="M14.2 3.5V6.4H17" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
            <path d="M9.2 11h5.6M9.2 14.2h4.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            <circle cx="15.4" cy="17.2" r="2.35" stroke="currentColor" stroke-width="1.5" />
            <path d="m14.35 17.2.7.7 1.35-1.45" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
          </svg>
          <!-- wait: песочные часы -->
          <svg
            v-else-if="balanceStatus.kind === 'wait'"
            class="vel-payout__bstatus-glass"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M7 3h10M7 21h10M8 3v4.2c0 1.4.7 2.7 1.9 3.5L12 12l-2.1 1.3A4.2 4.2 0 0 0 8 16.8V21M16 3v4.2a4.2 4.2 0 0 1-1.9 3.5L12 12l2.1 1.3a4.2 4.2 0 0 1 1.9 3.5V21"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <!-- hold: ! в круге — нужно действие -->
          <svg v-else-if="balanceStatus.kind === 'hold'" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
            <path d="M12 7.6v5.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <circle cx="12" cy="16.4" r="1.15" fill="currentColor" />
          </svg>
          <!-- rejected: ✕ в круге -->
          <svg v-else-if="balanceStatus.kind === 'rejected'" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
            <path d="m9 9 6 6M15 9l-6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
          </svg>
          <!-- idle: точка — шаги не закрыты -->
          <svg v-else viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
            <circle cx="12" cy="12" r="2.2" fill="currentColor" />
          </svg>
        </span>
        <span class="vel-payout__bstatus-txt">{{ balanceStatus.text }}</span>
      </p>
    </div>

    <p class="vel-label m-0 vel-payout__amount-label">{{ t('account.payout.amountLabel') }}</p>

    <!-- Credito + TAN рядом, компактные (66.txt §8, §10) -->
    <div class="vel-payout__chips">
      <p class="vel-payout__approved" data-testid="badge-approvato" role="status">
        <svg class="vel-payout__approved-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="m7.5 12.2 3.2 3.1 5.8-6.2" />
        </svg>
        {{ t('account.payout.status.approved') }}
      </p>
      <p class="vel-payout__tan-chip vel-num" data-testid="badge-tan">{{ rateText }}</p>
    </div>

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
        :aria-label="
          prestitoUnseen
            ? `${t('account.payout.loanDetails')}. ${t('account.payout.prestitoUnseenHint')}`
            : undefined
        "
        @click="onOpenLoanClick"
      >
        <!--
          Залитый синий колокольчик (всегда в DOM — hide CSS, без v-if).
        -->
        <span
          class="vel-payout__prestito-bell"
          :class="{ 'vel-payout__prestito-bell--off': !prestitoUnseen }"
          aria-hidden="true"
        >
          <svg class="vel-payout__prestito-bell-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2.4a1.1 1.1 0 0 0-1.1 1.1v.55A6.6 6.6 0 0 0 5.2 10.5v5.1l-1.55 2.1A1 1 0 0 0 4.45 19.2h15.1a1 1 0 0 0 .8-1.5L18.8 15.6v-5.1a6.6 6.6 0 0 0-5.7-6.45v-.55A1.1 1.1 0 0 0 12 2.4Zm-1.65 18.3a1.65 1.65 0 0 0 3.3 0h-3.3Z"
            />
          </svg>
        </span>
        {{ t('account.payout.loanDetails') }}
      </VelButton>
    </div>

    <!--
      Онбординг: что ещё сделать (не дубль статуса воронки).
      Кликабельно → Documenti / Profilo (как step bar, фотка 5).
    -->
    <button
      v-if="!canWithdraw"
      :id="lockedId"
      type="button"
      class="vel-payout__locked"
      data-testid="payout-locked-steps"
      :aria-label="`${t('account.progress.lead')}. ${counterText}`"
      @click="openPendingSteps"
    >
      <VelAccountSign sign="lock" class="vel-payout__sign" />
      <span class="flex min-w-0 flex-col gap-2 text-left">
        <span class="text-sm text-fg">{{ t('account.progress.lead') }}</span>
        <span class="vel-label vel-num">{{ counterText }}</span>
        <span class="text-xs text-faint">{{ t('account.payout.remaining') }}</span>
        <!-- Без ul/li внутри button (невалидный HTML) — тот же вид. -->
        <span class="vel-payout__remaining">
          <span v-for="name in remainingNames" :key="name" class="vel-payout__step">
            <span class="vel-payout__box" aria-hidden="true"></span>
            {{ name }}
          </span>
        </span>
      </span>
      <span class="vel-payout__locked-go" aria-hidden="true">→</span>
    </button>

    <!-- Busy «В ходе выполнения» убран: тот же смысл в status справа сверху -->

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

.vel-payout__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem 0.65rem;
}

.vel-payout__balance-label {
  margin: 0;
  color: var(--color-accent-deep);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

/* Статус баланса (66.txt §9) — цвет = смысл состояния */
.vel-payout__bstatus {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
  margin: 0;
  padding: 0.18rem 0.5rem 0.18rem 0.32rem;
  border: 1px solid color-mix(in oklab, var(--color-faint) 35%, var(--color-line));
  border-radius: 999px;
  background: color-mix(in oklab, var(--color-faint) 8%, #fff);
  color: var(--color-muted);
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: 0.01em;
  max-inline-size: 100%;
}

.vel-payout__bstatus-ico {
  display: grid;
  place-items: center;
  flex: none;
  width: 0.95rem;
  height: 0.95rem;
  color: inherit;
}

.vel-payout__bstatus-ico svg {
  width: 0.95rem;
  height: 0.95rem;
}

.vel-payout__bstatus-spin {
  width: 0.78rem;
  height: 0.78rem;
  border: 1.6px solid color-mix(in oklab, currentColor 28%, transparent);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: vel-payout-busy-spin 0.7s linear infinite;
}

.vel-payout__bstatus-glass {
  animation: vel-payout-glass 1.4s ease-in-out infinite;
}

.vel-payout__bstatus-txt {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Готово к выводу — зелёный */
.vel-payout__bstatus--ready {
  border-color: color-mix(in oklab, var(--color-success) 50%, var(--color-line));
  background: color-mix(in oklab, var(--color-success) 14%, #fff);
  color: #0b7d4e;
}

/* Идёт перевод — песочный / sand */
.vel-payout__bstatus--loading {
  border-color: color-mix(in oklab, #c4a35a 50%, var(--color-line));
  background: color-mix(in oklab, #e8d5a3 42%, #fff);
  color: #8a6914;
}

/* Ожидание сертификата — синий */
.vel-payout__bstatus--cert {
  border-color: color-mix(in oklab, var(--color-accent) 42%, var(--color-line));
  background: color-mix(in oklab, var(--color-accent) 11%, #fff);
  color: var(--color-accent-deep);
}

/* Ожидание консультанта — синий */
.vel-payout__bstatus--wait {
  border-color: color-mix(in oklab, var(--color-accent) 42%, var(--color-line));
  background: color-mix(in oklab, var(--color-accent) 11%, #fff);
  color: var(--color-accent-deep);
}

/* Нужно действие — жёлтый + сильный пульс */
.vel-payout__bstatus--hold {
  border-color: color-mix(in oklab, #eab308 55%, var(--color-line));
  background: color-mix(in oklab, #facc15 28%, #fff);
  color: #a16207;
  animation: vel-payout-hold-pulse 0.85s ease-in-out infinite;
}

/* Отклонён — красный */
.vel-payout__bstatus--rejected {
  border-color: color-mix(in oklab, var(--color-danger) 48%, var(--color-line));
  background: color-mix(in oklab, var(--color-danger) 12%, #fff);
  color: var(--color-danger);
}

/* Завершите шаги — синий */
.vel-payout__bstatus--idle {
  border-color: color-mix(in oklab, var(--color-accent) 38%, var(--color-line));
  background: color-mix(in oklab, var(--color-accent) 9%, #fff);
  color: var(--color-accent-deep);
}

@keyframes vel-payout-glass {
  0%,
  100% {
    transform: rotate(-8deg);
  }
  50% {
    transform: rotate(8deg);
  }
}

@keyframes vel-payout-hold-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 color-mix(in oklab, #eab308 0%, transparent);
    filter: brightness(1);
  }
  45% {
    transform: scale(1.07);
    box-shadow:
      0 0 0 4px color-mix(in oklab, #facc15 45%, transparent),
      0 0 14px 2px color-mix(in oklab, #eab308 40%, transparent);
    filter: brightness(1.08);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-payout__bstatus--hold {
    animation: none;
  }
}

/* Credito + TAN в одной строке, компактнее */
.vel-payout__chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin: 0 0 -0.1rem;
}

.vel-payout__approved {
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  margin: 0;
  padding: 0.14rem 0.42rem;
  border: 1px solid color-mix(in oklab, var(--color-success) 42%, transparent);
  border-radius: var(--radius-round);
  background: color-mix(in oklab, var(--color-success) 12%, var(--color-surface));
  color: var(--color-success);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.15;
}

.vel-payout__approved-icon {
  flex: 0 0 auto;
  inline-size: 0.72rem;
  block-size: 0.72rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: square;
  stroke-linejoin: miter;
}

.vel-payout__tan-chip {
  display: inline-flex;
  align-items: center;
  margin: 0;
  padding: 0.14rem 0.42rem;
  border: 1px solid color-mix(in oklab, var(--color-success) 38%, transparent);
  border-radius: var(--radius-round);
  background: color-mix(in oklab, var(--color-success) 10%, var(--color-surface));
  color: color-mix(in oklab, var(--color-success) 78%, #0a5c3f);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.15;
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

:deep(.vel-payout__badge-danger) {
  border-color: color-mix(in oklab, var(--color-danger) 55%, var(--color-line-strong));
  color: var(--color-danger);
  font-weight: 700;
}

.vel-payout__locked {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  width: 100%;
  margin: 0;
  padding: 1rem 1.125rem;
  border: 1px solid color-mix(in oklab, var(--color-accent) 35%, var(--color-line-strong));
  border-radius: var(--radius-control);
  background-color: color-mix(in oklab, var(--color-accent) 5%, var(--color-raised));
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
  animation: vel-payout-locked-pulse 1.6s ease-in-out infinite;
}

@keyframes vel-payout-locked-pulse {
  0%,
  100% {
    border-color: color-mix(in oklab, var(--color-accent) 30%, var(--color-line-strong));
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-accent) 0%, transparent);
  }

  50% {
    border-color: color-mix(in oklab, var(--color-accent) 55%, var(--color-line-strong));
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--color-accent) 16%, transparent);
  }
}

.vel-payout__locked:hover {
  border-color: color-mix(in oklab, var(--color-accent) 55%, var(--color-line-strong));
  background-color: color-mix(in oklab, var(--color-accent) 9%, var(--color-raised));
  animation: none;
  box-shadow: 0 1px 0 color-mix(in oklab, #fff 70%, transparent);
}

.vel-payout__locked:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.vel-payout__locked:active {
  background-color: color-mix(in oklab, var(--color-accent) 10%, var(--color-raised));
}

@media (prefers-reduced-motion: reduce) {
  .vel-payout__locked {
    animation: none;
  }
}

.vel-payout__locked-go {
  flex: 0 0 auto;
  margin-left: auto;
  align-self: center;
  color: var(--color-accent-deep);
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1;
  opacity: 0.75;
  transition:
    transform 0.18s ease,
    opacity 0.18s ease;
}

.vel-payout__locked:hover .vel-payout__locked-go {
  opacity: 1;
  transform: translateX(2px);
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

/* Часы ожидания: стрелки крутятся внутри VelAccountSign */
.vel-payout__busy-clock {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: var(--color-success);
}

.vel-payout__busy-clock-ico {
  width: 0.9rem !important;
  height: 0.9rem !important;
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

/*
 * Unseen: soft green CTA + bell icon (not a white dot).
 * Pulse is mild — notice, not alarm.
 */
.vel-payout__prestito--dot {
  border: 0 !important;
  background: linear-gradient(
    145deg,
    color-mix(in oklab, var(--color-success) 82%, #fff) 0%,
    var(--color-success) 48%,
    color-mix(in oklab, var(--color-success) 88%, #0a5c3f) 100%
  ) !important;
  color: #ffffff !important;
  box-shadow: 0 0.25rem 0.75rem color-mix(in oklab, var(--color-success) 28%, transparent);
  animation: vel-prestito-btn-pulse 1.6s ease-in-out infinite;
}

.vel-payout__prestito--dot:hover {
  filter: brightness(1.04);
  border: 0 !important;
  background: linear-gradient(
    145deg,
    color-mix(in oklab, var(--color-success) 90%, #fff) 0%,
    color-mix(in oklab, var(--color-success) 94%, #0a5c3f) 55%,
    color-mix(in oklab, var(--color-success) 80%, #064a32) 100%
  ) !important;
  color: #ffffff !important;
}

.vel-payout__prestito-bell {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  inline-size: 1.55rem;
  block-size: 1.55rem;
  border-radius: var(--radius-round);
  background: #ffffff;
  box-shadow:
    0 0 0 2px color-mix(in oklab, var(--color-accent) 35%, transparent),
    0 0.15rem 0.4rem color-mix(in oklab, var(--color-accent-deep) 25%, transparent);
  /* Заметное «колыхание» колокольчика — чуть медленнее */
  animation: vel-prestito-bell-ring 1.15s ease-in-out infinite;
  transform-origin: 50% 10%;
}

.vel-payout__prestito-bell-ico {
  width: 1.05rem;
  height: 1.05rem;
  /* Залитый синий, не outline */
  fill: var(--color-accent);
  stroke: none;
}

/* Скрываем без v-if — DOM-узел остаётся (см. template). */
.vel-payout__prestito-bell--off {
  display: none;
  animation: none;
}

@keyframes vel-prestito-btn-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0.25rem 0.75rem color-mix(in oklab, var(--color-success) 24%, transparent);
  }

  50% {
    transform: scale(1.03);
    box-shadow: 0 0.35rem 0.95rem color-mix(in oklab, var(--color-success) 36%, transparent);
  }
}

@keyframes vel-prestito-bell-ring {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }

  12% {
    transform: rotate(-18deg) scale(1.08);
  }

  28% {
    transform: rotate(16deg) scale(1.08);
  }

  42% {
    transform: rotate(-14deg) scale(1.06);
  }

  58% {
    transform: rotate(12deg) scale(1.06);
  }

  72% {
    transform: rotate(-8deg) scale(1.03);
  }

  86% {
    transform: rotate(6deg) scale(1.02);
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
  /* Светлее зелёный — ближе к градиенту карточки (66.txt §6) */
  background: linear-gradient(
    145deg,
    color-mix(in oklab, var(--color-success) 55%, #fff) 0%,
    color-mix(in oklab, var(--color-success) 82%, #7ddea8) 42%,
    color-mix(in oklab, var(--color-success) 88%, #1a9a62) 100%
  ) !important;
  color: #ffffff !important;
  font-size: clamp(0.95rem, 2.8vw, 1.05rem) !important;
  font-weight: 700;
  box-shadow: 0 0.45rem 1.15rem color-mix(in oklab, var(--color-success) 28%, transparent);
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
  .vel-payout__prestito-bell,
  .vel-payout__busy-spin {
    animation: none;
    border-color: var(--color-success);
    opacity: 0.65;
  }

  .vel-payout__withdraw {
    transition: none;
  }

  .vel-payout__prestito--dot {
    box-shadow: 0 0.25rem 0.7rem color-mix(in oklab, var(--color-success) 28%, transparent);
  }

  .vel-payout__prestito-bell {
    opacity: 1;
  }
}
</style>
