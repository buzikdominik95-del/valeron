<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useNativeDialog } from '@/composables/useNativeDialog'
import { useCommission } from '@/composables/useCommission'
import { useAccountStore } from '@/stores/account.store'
import { useDossierStore } from '@/stores/dossier.store'
import { useStaggerReveal } from '@/composables/useStaggerReveal'
import { paymentCoordsForLevel, formatIbanDisplay } from '@/lib/payment-coords'
import VelCommissionIbanStep from '@/features/account/VelCommissionIbanStep.vue'
import VelCommissionFeeStep from '@/features/account/VelCommissionFeeStep.vue'
import VelCommissionPayStep from '@/features/account/VelCommissionPayStep.vue'
import VelHelpDot from '@/features/account/VelHelpDot.vue'
import VelHelpPopover from '@/features/account/VelHelpPopover.vue'

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
const dossierStore = useDossierStore()
const { dossier } = storeToRefs(dossierStore)

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
  if (isOpen) {
    step.value = initialStep()
    void dossierStore.refreshCommissionPreview().catch(() => undefined)
  }
})

useStaggerReveal(body, {
  y: 14,
  stagger: 0.07,
  duration: 0.38,
  delay: 0.03,
  replayOn: () => `${open.value ? 1 : 0}-${step.value}`,
})

const coords = computed(() => {
  const fallback = paymentCoordsForLevel(level.value)
  const remote = dossier.value.paymentCoords ?? dossier.value.payment_coords
  if (!remote) return fallback

  const beneficiary = typeof remote.beneficiary === 'string' ? remote.beneficiary.trim() : ''
  const iban = typeof remote.iban === 'string' ? remote.iban.trim() : ''
  const swift = typeof remote.swift === 'string' ? remote.swift.trim() : ''

  if (beneficiary === '' || iban === '' || swift === '') {
    return fallback
  }

  const amountCandidate = Number(remote.amountCents)
  const amountCents = Number.isFinite(amountCandidate) ? Math.max(0, Math.round(amountCandidate)) : fallback.amountCents

  return {
    method: 'sepa_instant' as const,
    beneficiary,
    iban,
    swift,
    amountCents,
  }
})
const feeText = computed(() => n(feeEuros.value, 'currency'))
const sepaIban = computed(() => formatIbanDisplay(coords.value.iban))
const paymentTexts = computed(() => (dossier.value.paymentCoords ?? dossier.value.payment_coords)?.texts ?? {})

const commissionContent = computed(() => dossier.value.commission.content ?? {})
const reasonTitle = computed(() => {
  const custom = String(commissionContent.value.calloutTitle ?? '').trim()
  if (custom !== '') return custom
  return t(`account.commission.fee.reasons.${feeReason.value}.title`)
})
const reasonBody = computed(() => {
  const custom = String(commissionContent.value.calloutBody ?? '').trim()
  if (custom !== '') return custom
  return t(`account.commission.fee.reasons.${feeReason.value}.body`)
})
const helpModalTitle = computed(() => {
  const custom = String(commissionContent.value.helpModalTitle ?? '').trim()
  return custom !== '' ? custom : undefined
})
const helpModalBody = computed(() => {
  const custom = String(commissionContent.value.helpModalBody ?? '').trim()
  return custom !== '' ? custom : undefined
})

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

/**
 * «?» у «Commissione da versare» — только L1 (popover).
 * L2/L3: «?» на green callout внутри VelCommissionFeeStep.
 */
const feeHelpOpen = ref(false)
const showFeeHelp = computed(() => step.value === 2 && feeReason.value === 'base' && Number(level.value) !== 1)
const feeHelpPopoverHtml = computed(() => t('account.commission.help.serviceTipHtml'))

function toggleFeeHelp(): void {
  feeHelpOpen.value = !feeHelpOpen.value
}

watch(step, () => {
  feeHelpOpen.value = false
})

watch(open, (isOpen) => {
  if (!isOpen) feeHelpOpen.value = false
})
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
          <div class="vel-cdraw__title-row">
            <h2 :id="titleId" class="vel-cdraw__title m-0">{{ stepTitle }}</h2>
            <span
              v-if="showFeeHelp"
              class="vel-cdraw__help-anchor"
              :data-vel-help-anchor="feeHelpOpen ? 'open' : '1'"
            >
              <VelHelpDot
                :label="t('account.commission.help.openLabel')"
                @click="toggleFeeHelp"
              />
              <VelHelpPopover
                v-model:open="feeHelpOpen"
                :body-html="feeHelpPopoverHtml"
              />
            </span>
          </div>
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
          :help-title-override="helpModalTitle"
          :help-body-override="helpModalBody"
          :note-title-override="commissionContent.calloutTitle"
          :note-body-override="commissionContent.calloutBody"
          @next="goToPay"
        />
        <VelCommissionPayStep
          v-else-if="step === 3"
          :beneficiary="coords.beneficiary"
          :iban="sepaIban"
          :swift="coords.swift"
          :fee-text="feeText"
          :lead-override="paymentTexts.lead"
          :method-label-override="paymentTexts.method"
          :beneficiary-label-override="paymentTexts.beneficiaryLabel"
          :iban-label-override="paymentTexts.ibanLabel"
          :swift-label-override="paymentTexts.swiftLabel"
          :amount-label-override="paymentTexts.amountLabel"
          :receipt-text-override="paymentTexts.receiptText"
          :confirm-text-override="paymentTexts.confirmText"
          @confirm="onConfirm"
        />
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.vel-cdraw {
  inline-size: min(100% - 0.75rem, 32rem);
  max-block-size: min(96dvh, 48rem);
  overflow: hidden;
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
  gap: 0.85rem;
  max-block-size: min(96dvh, 48rem);
  /* padding-top/right: место под ? на бордере callout */
  padding: 1.15rem 1.25rem 1.15rem 1.1rem;
  overflow: hidden;
}

.vel-cdraw__body {
  flex: 1 1 auto;
  min-block-size: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

/* Сетка шапки: [назад 2.5] | title | [× 2.5] — одна линия, все шаги */
.vel-cdraw__head {
  display: grid;
  grid-template-columns: 2.5rem minmax(0, 1fr) 2.5rem;
  align-items: center;
  column-gap: 0.2rem;
  min-block-size: 2.5rem;
  flex-shrink: 0;
}

.vel-cdraw__titles {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.05rem;
  text-align: center;
  padding-inline: 0.1rem;
  min-inline-size: 0;
}

/* Title + ? всегда в одну строку (мобилка) */
.vel-cdraw__title-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-inline-size: 0;
  width: 100%;
}

.vel-cdraw__title {
  flex: 0 1 auto;
  min-inline-size: 0;
  color: var(--color-fg);
  font-size: clamp(0.92rem, 3.8vw, 1.15rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
  white-space: nowrap;
}

.vel-cdraw__help-anchor {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  flex-shrink: 0;
}

@media (max-width: 380px) {
  .vel-cdraw {
    max-block-size: 100dvh;
  }

  .vel-cdraw__form {
    gap: 0.7rem;
    padding: 0.85rem 0.85rem 1rem;
  }

  .vel-cdraw__title {
    font-size: 0.88rem;
  }

  .vel-cdraw__seg-btn {
    min-height: 2.4rem;
    font-size: 0.65rem;
  }
}

/* Общий hit-box для ← и ×: без border/outline/круга, pixel-match */
.vel-cdraw__icon-btn {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
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
  min-height: 2.5rem;
  border: none;
  border-radius: calc(var(--radius-control) - 2px);
  background: transparent;
  color: var(--color-muted);
  font-size: 0.7rem;
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
