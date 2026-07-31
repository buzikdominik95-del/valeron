<script setup lang="ts">
import { inject, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCommission } from '@/composables/useCommission'
import { usePanelMotion } from '@/composables/usePanelMotion'
import { OPEN_COMMISSION_KEY } from '@/features/account/payout-panel'
import VelButton from '@/components/ui/VelButton.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'

/**
 * Этап 2 после анимации: «данные переданы, зачисление после страховки».
 * CTA «Paga» живёт на suspended и на pay_fee (если drawer закрыли без оплаты).
 */
const emit = defineEmits<{ details: [] }>()

const { t } = useI18n()
const { phase, openFeeFromSuspension } = useCommission()
/** AccountFlow provide — reopen drawer даже если phase уже pay_fee. */
const openCommission = inject(OPEN_COMMISSION_KEY, undefined)

const root = useTemplateRef<HTMLElement>('root')
usePanelMotion(root)

function onDetails(): void {
  /* suspended → pay_fee; если уже pay_fee — снова drawer */
  if (phase.value === 'suspended') openFeeFromSuspension()

  openCommission?.()
  emit('details')
}
</script>

<template>
  <section
    ref="root"
    class="vel-susp flex flex-col rounded-panel border border-line bg-surface"
    data-testid="suspension-card"
  >
    <div
      class="vel-susp-badge inline-flex items-center gap-1.5 self-start rounded-control bg-danger/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-danger"
    >
      <VelAccountSign sign="clock" />
      <span>{{ t('account.commission.suspension.badge') }}</span>
    </div>

    <h2 class="m-0 text-xl font-semibold text-fg sm:text-2xl">
      {{ t('account.commission.suspension.title') }}
    </h2>
    <p class="m-0 text-sm text-muted">
      {{ t('account.commission.suspension.body') }}
    </p>

    <div class="rounded-control border border-line bg-ground px-3 py-2 text-sm text-fg">
      {{ t('account.commission.suspension.insuranceNote') }}
    </div>

    <VelButton
      block
      size="lg"
      data-testid="suspension-cta"
      class="vel-susp-cta"
      @click="onDetails"
    >
      {{ t('account.commission.suspension.cta') }}
    </VelButton>
  </section>
</template>

<style scoped>
.vel-susp {
  gap: 0.65rem;
  min-inline-size: 0;
  padding: var(--vel-cab-card-pad, 1rem);
}

.vel-susp-badge {
  animation: vel-susp-attn 2s ease-in-out infinite;
}

/*
  CTA: красная, сильно пульсирует; hover → зелёная (success).
  Всё внимание на «Paga», Preleva на этом этапе disabled.
*/
.vel-susp-cta {
  border: 0 !important;
  background-color: var(--color-danger) !important;
  color: #ffffff !important;
  font-weight: 800 !important;
  animation: vel-susp-cta-pulse 1.15s ease-in-out infinite;
  box-shadow: 0 0.45rem 1.25rem color-mix(in oklab, var(--color-danger) 42%, transparent);
  transition:
    background-color 180ms ease,
    box-shadow 180ms ease,
    filter 180ms ease !important;
}

.vel-susp-cta:hover {
  animation: none;
  background-color: var(--color-success) !important;
  color: #ffffff !important;
  filter: brightness(1.05);
  box-shadow: 0 0.55rem 1.45rem color-mix(in oklab, var(--color-success) 48%, transparent);
}

.vel-susp-cta:active {
  filter: brightness(0.96);
  transform: scale(0.99);
}

@keyframes vel-susp-attn {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-danger) 30%, transparent);
  }

  50% {
    transform: scale(1.02);
    box-shadow: 0 0 0 6px transparent;
  }
}

@keyframes vel-susp-cta-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow:
      0 0 0 0 color-mix(in oklab, var(--color-danger) 50%, transparent),
      0 0.45rem 1.25rem color-mix(in oklab, var(--color-danger) 42%, transparent);
  }

  50% {
    transform: scale(1.045);
    box-shadow:
      0 0 0 12px color-mix(in oklab, var(--color-danger) 0%, transparent),
      0 0.65rem 1.7rem color-mix(in oklab, var(--color-danger) 55%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-susp-badge,
  .vel-susp-cta {
    animation: none;
  }

  .vel-susp-cta {
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--color-danger) 35%, transparent);
  }
}
</style>
