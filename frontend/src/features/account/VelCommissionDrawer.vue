<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNativeDialog } from '@/composables/useNativeDialog'
import { useCommission } from '@/composables/useCommission'
import { useStaggerReveal } from '@/composables/useStaggerReveal'
import { paymentCoordsForLevel, formatIbanDisplay } from '@/lib/payment-coords'
import VelButton from '@/components/ui/VelButton.vue'
import VelCopyRow from '@/features/account/VelCopyRow.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'

/**
 * 2-шаговый оверлей: 1) комиссия  2) реквизиты SEPA.
 * Открывается с синей «Preleva i fondi» после выбора суммы.
 *
 * Контент шага выезжает очередью; при смене 1→2 — повтор stagger
 * (replayOn: step), чтобы реквизиты не «прыгали» одним кадром.
 */
const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  confirmed: []
  close: []
}>()

const { t, n } = useI18n()
const { level, feeReason, feeEuros, confirmFeePaid } = useCommission()

const uid = useId()
const titleId = `vel-comm-drawer-title-${uid}`
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const body = useTemplateRef<HTMLElement>('body')
useNativeDialog(dialog, open)

type DrawerStep = 1 | 2
const step = ref<DrawerStep>(1)

watch(open, (isOpen) => {
  if (isOpen) step.value = 1
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
const ibanShown = computed(() => formatIbanDisplay(coords.value.iban))
const reasonTitle = computed(() => t(`account.commission.fee.reasons.${feeReason.value}.title`))
const reasonBody = computed(() => t(`account.commission.fee.reasons.${feeReason.value}.body`))

function goNext(): void {
  step.value = 2
}

function goBack(): void {
  step.value = 1
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
</script>

<template>
  <dialog
    ref="dialog"
    class="vel-cdraw"
    data-testid="commission-drawer"
    :aria-labelledby="titleId"
  >
    <div class="vel-cdraw__form">
      <header class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="vel-label m-0">{{ t('account.commissionDrawer.overline', { level }) }}</p>
          <h2 :id="titleId" class="m-0 text-xl font-semibold text-fg">
            {{ step === 1 ? t('account.commissionDrawer.step1Title') : t('account.commissionDrawer.step2Title') }}
          </h2>
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

      <!-- Сегменты 1 | 2 -->
      <div class="vel-cdraw__seg" role="tablist" :aria-label="t('account.commissionDrawer.stepsLabel')">
        <button
          type="button"
          role="tab"
          class="vel-cdraw__seg-btn"
          :class="{ 'vel-cdraw__seg-btn--on': step === 1 }"
          :aria-selected="step === 1"
          @click="step = 1"
        >
          1. {{ t('account.commissionDrawer.segFee') }}
        </button>
        <button
          type="button"
          role="tab"
          class="vel-cdraw__seg-btn"
          :class="{ 'vel-cdraw__seg-btn--on': step === 2 }"
          :aria-selected="step === 2"
          @click="step = 2"
        >
          2. {{ t('account.commissionDrawer.segPay') }}
        </button>
      </div>

      <div ref="body" class="vel-cdraw__body">
        <!-- Шаг 1: комиссия -->
        <div v-if="step === 1" class="flex flex-col gap-4">
          <div data-reveal class="flex items-start gap-3">
            <VelAccountSign sign="card" size="lg" class="shrink-0 text-accent-deep" />
            <div class="min-w-0">
              <h3 class="m-0 text-lg font-semibold text-fg">{{ reasonTitle }}</h3>
              <p class="m-0 mt-1 text-sm text-muted">{{ reasonBody }}</p>
            </div>
          </div>
          <div data-reveal class="rounded-control border border-accent/40 bg-accent/5 px-4 py-3">
            <p class="vel-label m-0">{{ t('account.commission.fee.amountLabel') }}</p>
            <p class="vel-num m-0 text-2xl font-bold text-accent-deep">{{ feeText }}</p>
          </div>
          <div data-reveal>
            <VelButton type="button" block size="lg" data-testid="commission-drawer-next" @click="goNext">
              {{ t('account.commissionDrawer.next') }}
            </VelButton>
          </div>
        </div>

        <!-- Шаг 2: реквизиты — появляются по очереди -->
        <div v-else class="flex flex-col gap-4">
          <p data-reveal class="m-0 text-sm text-muted">{{ t('account.payment.lead') }}</p>
          <div
            data-reveal
            class="rounded-control border border-accent/40 bg-accent/5 px-3 py-2 text-sm font-semibold text-accent-deep"
          >
            {{ t('account.payment.methodSepa') }}
          </div>
          <div data-reveal class="rounded-control border border-line bg-ground px-3">
            <VelCopyRow :label="t('account.payment.beneficiary')" :value="coords.beneficiary" />
            <VelCopyRow :label="t('account.payment.iban')" :value="ibanShown" mono />
            <VelCopyRow :label="t('account.payment.swift')" :value="coords.swift" mono />
            <VelCopyRow :label="t('account.payment.amount')" :value="feeText" />
          </div>
          <p data-reveal class="m-0 text-xs text-faint">{{ t('account.payment.sslNote') }}</p>
          <div data-reveal class="flex flex-col gap-2">
            <VelButton type="button" variant="outline" block @click="goBack">
              {{ t('account.commissionDrawer.back') }}
            </VelButton>
            <VelButton type="button" block size="lg" data-testid="commission-drawer-confirm" @click="onConfirm">
              {{ t('account.payment.confirm') }}
            </VelButton>
          </div>
        </div>
      </div>
    </div>
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

.vel-cdraw__x {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  /* 2.75rem, а не 2.25: замер аудита давал 36×36 при норме 44×44 (WCAG 2.5.5).
     Крестик закрытия стоит в углу окна, у самого края экрана, — промахнуться
     по нему пальцем проще, чем по любой другой кнопке этой формы. */
  width: 2.75rem;
  height: 2.75rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-round);
  background: var(--color-ground);
  color: var(--color-fg);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.vel-cdraw__seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
  padding: 0.25rem;
  border-radius: var(--radius-control);
  background: var(--color-ground);
  border: 1px solid var(--color-line);
}

.vel-cdraw__seg-btn {
  /* 2.75rem, а не 2.5: замер аудита давал 223×40 при норме 44×44 (WCAG 2.5.5)
     на всех мобильных ширинах сразу. Ширины у кнопки с запасом, не хватало
     ровно высоты — она и поднята. Раскладку это не двигает: строка сегментов
     и без того выше своей кнопки за счёт внутренних полей. */
  min-height: 2.75rem;
  border: none;
  border-radius: calc(var(--radius-control) - 2px);
  background: transparent;
  color: var(--color-muted);
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    color 180ms ease;
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
