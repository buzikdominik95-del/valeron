<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCommission } from '@/composables/useCommission'
import { usePanelMotion } from '@/composables/usePanelMotion'
import { useStaggerReveal } from '@/composables/useStaggerReveal'
import {
  commissionBreakdown,
  breakdownLabelSet,
} from '@/lib/commission-breakdown'
import VelButton from '@/components/ui/VelButton.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'
import VelBorderBeam from '@/components/magic/VelBorderBeam.vue'

const emit = defineEmits<{ paid: [] }>()

const { t, n } = useI18n()
const { feeEuros, feeReason, confirmFeePaid } = useCommission()

const root = useTemplateRef<HTMLElement>('root')
const formRoot = useTemplateRef<HTMLElement>('formRoot')
usePanelMotion(root)
useStaggerReveal(formRoot, { y: 14, stagger: 0.075, duration: 0.4, delay: 0.08 })

const amountText = computed(() => n(feeEuros.value, 'currency'))
const title = computed(() => t(`account.commission.fee.reasons.${feeReason.value}.title`))
const body = computed(() => t(`account.commission.fee.reasons.${feeReason.value}.body`))

const parts = computed(() => commissionBreakdown(feeEuros.value, feeReason.value))
const labelSet = computed(() => breakdownLabelSet(feeReason.value))

function lineLabel(key: 'tax' | 'service' | 'sign'): string {
  return t(`account.commission.fee.lines.${labelSet.value}.${key}`)
}

function lineAmount(euros: number): string {
  const whole = Number.isInteger(euros) || Math.abs(euros - Math.round(euros)) < 0.005
  return n(euros, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })
}

function onSubmit(): void {
  confirmFeePaid()
  emit('paid')
}
</script>

<template>
  <section
    ref="root"
    class="relative overflow-hidden rounded-panel border border-line bg-surface p-5 sm:p-6"
  >
    <VelBorderBeam :duration-ms="7000" :size="48" />

    <form
      ref="formRoot"
      class="relative z-[1] flex flex-col gap-4"
      @submit.prevent="onSubmit"
    >
      <div data-reveal class="flex items-start gap-3">
        <span class="vel-fee-mark shrink-0 text-accent-deep">
          <VelAccountSign sign="card" size="lg" />
        </span>
        <div class="min-w-0">
          <p class="vel-label">{{ t('account.commission.fee.overline') }}</p>
          <h2 class="text-xl font-semibold text-fg sm:text-2xl">{{ title }}</h2>
        </div>
      </div>

      <p data-reveal class="m-0 text-sm text-muted">{{ body }}</p>

      <!-- Сумма + breakdown: ровная сетка label | amount -->
      <div data-reveal class="vel-fee-amount rounded-control border border-line bg-ground px-4 py-3">
        <span class="vel-label">{{ t('account.commission.fee.amountLabel') }}</span>
        <div class="vel-fee-amount__row">
          <span class="vel-fee-amount__total vel-num">{{ amountText }}</span>
          <ul class="vel-fee-amount__lines" :aria-label="t('account.commission.fee.amountLabel')">
            <li v-for="line in parts.lines" :key="line.key" class="vel-fee-amount__line">
              <span class="vel-fee-amount__label">{{ lineLabel(line.key) }}</span>
              <span class="vel-fee-amount__sum vel-num">{{ lineAmount(line.amountEuros) }}</span>
            </li>
          </ul>
        </div>
      </div>

      <p data-reveal class="m-0 text-xs text-faint">{{ t('account.commission.fee.note') }}</p>

      <div data-reveal>
        <VelButton type="submit" block size="lg">
          {{ t('account.commission.fee.cta') }}
        </VelButton>
      </div>
    </form>
  </section>
</template>

<style scoped>
.vel-fee-mark {
  animation: vel-fee-glow 2.8s ease-in-out infinite;
}

.vel-fee-amount {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  transition:
    border-color 200ms ease,
    box-shadow 200ms ease;
}

.vel-fee-amount:hover {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-accent) 14%, transparent);
}

.vel-fee-amount__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(10.5rem, auto);
  align-items: center;
  gap: 0.75rem 1.35rem;
}

.vel-fee-amount__total {
  font-size: clamp(1.5rem, 5vw, 1.85rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1;
  color: var(--color-accent-deep);
  font-variant-numeric: tabular-nums;
}

.vel-fee-amount__lines {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin: 0;
  padding: 0.1rem 0 0.1rem 0.9rem;
  border-inline-start: 1px solid var(--color-line);
  list-style: none;
}

.vel-fee-amount__line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 3.75rem;
  align-items: baseline;
  gap: 0.55rem;
}

.vel-fee-amount__label {
  min-inline-size: 0;
  color: var(--color-muted);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vel-fee-amount__sum {
  color: var(--color-fg);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.25;
  text-align: end;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

@media (max-width: 22.5rem) {
  .vel-fee-amount__row {
    grid-template-columns: 1fr;
  }

  .vel-fee-amount__lines {
    padding-inline-start: 0;
    padding-block-start: 0.55rem;
    border-inline-start: none;
    border-block-start: 1px solid var(--color-line);
  }

  .vel-fee-amount__line {
    grid-template-columns: minmax(0, 1fr) 4rem;
  }
}

@keyframes vel-fee-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 0 transparent);
  }

  50% {
    filter: drop-shadow(0 0 6px color-mix(in oklab, var(--color-accent) 45%, transparent));
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-fee-mark {
    animation: none;
  }

  .vel-fee-amount {
    transition: none;
  }
}
</style>
