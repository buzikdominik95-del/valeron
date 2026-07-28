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

      <!-- Сумма — герой: крупно + breakdown под ней -->
      <div data-reveal class="vel-fee-amount">
        <span class="vel-label vel-fee-amount__cap">{{ t('account.commission.fee.amountLabel') }}</span>
        <span class="vel-fee-amount__total vel-num">{{ amountText }}</span>
        <ul class="vel-fee-amount__lines" :aria-label="t('account.commission.fee.amountLabel')">
          <li v-for="line in parts.lines" :key="line.key" class="vel-fee-amount__line">
            <span class="vel-fee-amount__label">{{ lineLabel(line.key) }}</span>
            <span class="vel-fee-amount__sum vel-num">{{ lineAmount(line.amountEuros) }}</span>
          </li>
        </ul>
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
  gap: 0.75rem;
  padding: 1.2rem 1.25rem 1.1rem;
  border: 1px solid color-mix(in oklab, var(--color-accent) 28%, var(--color-line));
  border-radius: var(--radius-panel);
  background:
    linear-gradient(
      160deg,
      color-mix(in oklab, var(--color-accent) 10%, var(--color-surface)) 0%,
      color-mix(in oklab, var(--color-accent) 3%, var(--color-surface)) 55%,
      var(--color-surface) 100%
    );
  box-shadow:
    0 0.35rem 1.1rem color-mix(in oklab, var(--color-accent-deep) 6%, transparent),
    inset 0 1px 0 color-mix(in oklab, #fff 70%, transparent);
  transition:
    border-color 200ms ease,
    box-shadow 200ms ease;
}

.vel-fee-amount:hover {
  border-color: color-mix(in oklab, var(--color-accent) 55%, var(--color-line));
  box-shadow:
    0 0.45rem 1.25rem color-mix(in oklab, var(--color-accent) 12%, transparent),
    inset 0 1px 0 color-mix(in oklab, #fff 70%, transparent);
}

.vel-fee-amount__cap {
  color: var(--color-accent);
  font-weight: 700;
}

.vel-fee-amount__total {
  font-size: clamp(2.75rem, 12vw, 3.65rem);
  font-weight: 800;
  letter-spacing: -0.045em;
  line-height: 0.95;
  color: var(--color-accent-deep);
  font-variant-numeric: tabular-nums;
  text-wrap: nowrap;
  text-shadow: 0 1px 0 color-mix(in oklab, #fff 55%, transparent);
}

.vel-fee-amount__lines {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin: 0.1rem 0 0;
  padding: 0.75rem 0 0;
  border-block-start: 1px solid color-mix(in oklab, var(--color-accent) 18%, var(--color-line));
  list-style: none;
}

.vel-fee-amount__line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 0.75rem 1rem;
}

.vel-fee-amount__label {
  min-inline-size: 0;
  color: var(--color-muted);
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vel-fee-amount__sum {
  color: var(--color-accent-deep);
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.3;
  text-align: end;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
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
