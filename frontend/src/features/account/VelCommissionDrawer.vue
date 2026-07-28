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
      <!--
        Шапка: назад и × — одинаковый hit-box 2.75rem, без обводки,
        в одной линии (items-center) на всех 3 шагах.
      -->
      <header class="vel-cdraw__head">
        <button
          v-if="showBack"
          type="button"
          class="vel-cdraw__icon-btn vel-cdraw__back"
          :aria-label="t('account.commissionDrawer.back')"
          @click="goBack"
        >
          <svg class="vel-cdraw__back-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6 9 12l6 6" />
          </svg>
        </button>
        <!-- Спейсер, если назад скрыт — × остаётся справа на том же уровне -->
        <span v-else class="vel-cdraw__icon-btn vel-cdraw__icon-btn--ghost" aria-hidden="true" />

        <div class="vel-cdraw__titles min-w-0">
          <p class="vel-label m-0">{{ t('account.commissionDrawer.overlinePlain') }}</p>
          <h2 :id="titleId" class="vel-cdraw__title m-0">{{ stepTitle }}</h2>
        </div>

        <button
          type="button"
          class="vel-cdraw__icon-btn vel-cdraw__x"
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

/* Сетка шапки: [назад 2.75] | title | [× 2.75] — одна линия, все шаги */
.vel-cdraw__head {
  display: grid;
  grid-template-columns: 2.75rem minmax(0, 1fr) 2.75rem;
  align-items: center;
  column-gap: 0.35rem;
  min-block-size: 2.75rem;
}

.vel-cdraw__titles {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.1rem;
  text-align: center;
  padding-inline: 0.15rem;
}

.vel-cdraw__title {
  color: var(--color-fg);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

/* Общий hit-box для ← и ×: без border/outline/круга, pixel-match */
.vel-cdraw__icon-btn {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: var(--radius-round);
  background: transparent;
  box-shadow: none;
  color: var(--color-muted);
  cursor: pointer;
  transition:
    color 140ms ease,
    background-color 140ms ease;
}

.vel-cdraw__icon-btn:hover {
  background: var(--color-raised);
  color: var(--color-fg);
}

.vel-cdraw__icon-btn:focus,
.vel-cdraw__icon-btn:focus-visible {
  outline: none;
  border: 0;
  box-shadow: none;
}

.vel-cdraw__icon-btn--ghost {
  visibility: hidden;
  pointer-events: none;
  cursor: default;
}

.vel-cdraw__back-ico {
  width: 1.2rem;
  height: 1.2rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.1;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.vel-cdraw__x {
  font-size: 1.4rem;
  line-height: 1;
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
