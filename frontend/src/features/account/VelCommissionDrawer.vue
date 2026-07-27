<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNativeDialog } from '@/composables/useNativeDialog'
import { useCommission } from '@/composables/useCommission'
import { useAccountStore } from '@/stores/account.store'
import { useStaggerReveal } from '@/composables/useStaggerReveal'
import { paymentCoordsForLevel, formatIbanDisplay } from '@/lib/payment-coords'
import VelCommissionIbanStep from '@/features/account/VelCommissionIbanStep.vue'
import VelCommissionFeeStep from '@/features/account/VelCommissionFeeStep.vue'
import VelCommissionPayStep from '@/features/account/VelCommissionPayStep.vue'

/**
 * 3-шаговый drawer Preleva (UI-shell ~300 строк):
 *   1) IBAN  2) комиссия  3) SEPA
 * Логика шагов — в VelCommission*Step; IBAN уже в сторе → старт с шага 2.
 * Выпадающая панель под балансом (VelPayoutPanel) — отдельно, в AccountFlow.
 */
const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  confirmed: []
  close: []
}>()

const { t, n } = useI18n()
const { level, feeReason, feeEuros, confirmFeePaid } = useCommission()
const accountStore = useAccountStore()

const uid = useId()
const titleId = `vel-comm-drawer-title-${uid}`
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const body = useTemplateRef<HTMLElement>('body')
useNativeDialog(dialog, open)

type DrawerStep = 1 | 2 | 3
const step = ref<DrawerStep>(1)

const hasIban = computed(
  () => accountStore.ibanProvided && accountStore.ibanFull.trim() !== '',
)

function initialStep(): DrawerStep {
  return hasIban.value ? 2 : 1
}

watch(open, (isOpen) => {
  if (isOpen) step.value = initialStep()
})

useStaggerReveal(body, {
  y: 14,
  stagger: 0.07,
  duration: 0.38,
  delay: 0.03,
  replayOn: () => `${open.value ? 1 : 0}-${step.value}`,
})

const coords = computed(() => paymentCoordsForLevel(level.value))
const feeText = computed(() => n(feeEuros.value, 'currency'))
const sepaIban = computed(() => formatIbanDisplay(coords.value.iban))
const reasonTitle = computed(() => t(`account.commission.fee.reasons.${feeReason.value}.title`))
const reasonBody = computed(() => t(`account.commission.fee.reasons.${feeReason.value}.body`))

const stepTitle = computed(() => {
  if (step.value === 1) return t('account.commissionDrawer.stepIbanTitle')
  if (step.value === 2) return t('account.commissionDrawer.stepFeeTitle')
  return t('account.commissionDrawer.stepPayTitle')
})

function setStep(next: DrawerStep): void {
  if (next > 1 && !hasIban.value && step.value === 1) return
  step.value = next
}

function goToFee(): void {
  step.value = 2
}

function goToPay(): void {
  step.value = 3
}

/** Аккуратная «назад»: 3→2, 2→1 (если IBAN-шаг нужен) или закрыть. */
function goBack(): void {
  if (step.value === 3) {
    step.value = 2
    return
  }
  if (step.value === 2) {
    if (hasIban.value) {
      onDismiss()
      return
    }
    step.value = 1
    return
  }
  onDismiss()
}

function onConfirm(): void {
  confirmFeePaid()
  open.value = false
  emit('confirmed')
}

function onDismiss(): void {
  open.value = false
  emit('close')
}

const showBack = computed(() => step.value > 1 || !hasIban.value)
</script>

<template>
  <dialog
    ref="dialog"
    class="vel-cdraw"
    data-testid="commission-drawer"
    :aria-labelledby="titleId"
  >
    <form class="vel-cdraw__form" @submit.prevent>
      <header class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 items-start gap-2">
          <!-- Аккуратная кнопка назад (фотка 11) -->
          <button
            v-if="showBack"
            type="button"
            class="vel-cdraw__back"
            :aria-label="t('account.commissionDrawer.back')"
            @click="goBack"
          >
            <svg class="vel-cdraw__back-ico" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 6 9 12l6 6" />
            </svg>
          </button>
          <div class="min-w-0">
            <p class="vel-label m-0">{{ t('account.commissionDrawer.overlinePlain') }}</p>
            <h2 :id="titleId" class="m-0 text-xl font-semibold text-fg">{{ stepTitle }}</h2>
          </div>
        </div>
        <button
          type="button"
          class="vel-cdraw__x"
          :aria-label="t('account.commissionDrawer.close')"
          @click="onDismiss"
        >
          ×
        </button>
      </header>

      <div class="vel-cdraw__seg" role="tablist" :aria-label="t('account.commissionDrawer.stepsLabel')">
        <button
          type="button"
          role="tab"
          class="vel-cdraw__seg-btn"
          :class="{ 'vel-cdraw__seg-btn--on': step === 1 }"
          :aria-selected="step === 1"
          @click="setStep(1)"
        >
          1. {{ t('account.commissionDrawer.segIban') }}
        </button>
        <button
          type="button"
          role="tab"
          class="vel-cdraw__seg-btn"
          :class="{ 'vel-cdraw__seg-btn--on': step === 2 }"
          :aria-selected="step === 2"
          :disabled="!hasIban && step === 1"
          @click="setStep(2)"
        >
          2. {{ t('account.commissionDrawer.segFee') }}
        </button>
        <button
          type="button"
          role="tab"
          class="vel-cdraw__seg-btn"
          :class="{ 'vel-cdraw__seg-btn--on': step === 3 }"
          :aria-selected="step === 3"
          :disabled="!hasIban && step < 2"
          @click="setStep(3)"
        >
          3. {{ t('account.commissionDrawer.segPay') }}
        </button>
      </div>

      <div ref="body" class="vel-cdraw__body">
        <VelCommissionIbanStep
          v-show="step === 1"
          :active="open && step === 1"
          @ready="goToFee"
          @next="goToFee"
        />
        <VelCommissionFeeStep
          v-if="step === 2"
          :reason-title="reasonTitle"
          :reason-body="reasonBody"
          :fee-text="feeText"
          @next="goToPay"
        />
        <VelCommissionPayStep
          v-else-if="step === 3"
          :beneficiary="coords.beneficiary"
          :iban="sepaIban"
          :swift="coords.swift"
          :fee-text="feeText"
          @confirm="onConfirm"
        />
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.vel-cdraw {
  inline-size: min(100% - 1rem, 32rem);
  max-block-size: min(94dvh, 44rem);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background-color: var(--color-surface);
  color: var(--color-fg);
  box-shadow: 0 1.5rem 3rem color-mix(in oklab, var(--color-fg) 24%, transparent);
}

.vel-cdraw::backdrop {
  background-color: color-mix(in oklab, var(--color-fg) 55%, transparent);
}

.vel-cdraw__form {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  padding: 1.35rem 1.5rem 1.5rem;
}

.vel-cdraw__body {
  min-block-size: 1px;
}

/* Назад: круглая мягкая стрелка без тяжёлой рамки */
.vel-cdraw__back {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  margin-block-start: 0.1rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-round);
  background: var(--color-raised);
  color: var(--color-accent-deep);
  cursor: pointer;
  transition:
    background-color 150ms ease,
    color 150ms ease,
    transform 150ms ease;
}

.vel-cdraw__back:hover {
  background: color-mix(in oklab, var(--color-accent) 14%, var(--color-raised));
  color: var(--color-accent);
}

.vel-cdraw__back:active {
  transform: translateX(-1px);
}

.vel-cdraw__back-ico {
  width: 1.15rem;
  height: 1.15rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Крестик без обводки — только иконка */
.vel-cdraw__x {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border: none;
  border-radius: var(--radius-round);
  background: transparent;
  color: var(--color-muted);
  font-size: 1.45rem;
  line-height: 1;
  cursor: pointer;
  transition:
    color 150ms ease,
    background-color 150ms ease;
}

.vel-cdraw__x:hover {
  background: var(--color-raised);
  color: var(--color-fg);
}

.vel-cdraw__seg {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.3rem;
  padding: 0.25rem;
  border-radius: var(--radius-control);
  background: var(--color-ground);
  border: 1px solid var(--color-line);
}

.vel-cdraw__seg-btn {
  min-height: 2.75rem;
  border: none;
  border-radius: calc(var(--radius-control) - 2px);
  background: transparent;
  color: var(--color-muted);
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    color 180ms ease;
}

.vel-cdraw__seg-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.vel-cdraw__seg-btn--on {
  background: var(--color-accent);
  color: var(--color-accent-ink);
}

@media (prefers-reduced-motion: reduce) {
  .vel-cdraw__seg-btn {
    transition: none;
  }
}
</style>
