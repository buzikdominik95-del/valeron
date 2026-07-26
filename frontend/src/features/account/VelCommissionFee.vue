<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCommission } from '@/composables/useCommission'
import { usePanelMotion } from '@/composables/usePanelMotion'
import VelButton from '@/components/ui/VelButton.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'
import VelBorderBeam from '@/components/magic/VelBorderBeam.vue'

const emit = defineEmits<{ paid: [] }>()

const { t, n } = useI18n()
const { feeEuros, feeReason, level, confirmFeePaid } = useCommission()

const root = useTemplateRef<HTMLElement>('root')
usePanelMotion(root)

const amountText = computed(() => n(feeEuros.value, 'currency'))
const title = computed(() => t(`account.commission.fee.reasons.${feeReason.value}.title`))
const body = computed(() => t(`account.commission.fee.reasons.${feeReason.value}.body`))

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

    <form class="relative z-[1] flex flex-col gap-4" @submit.prevent="onSubmit">
      <div class="flex items-start gap-3">
        <span class="vel-fee-mark shrink-0 text-accent-deep">
          <VelAccountSign sign="card" size="lg" />
        </span>
        <div class="min-w-0">
          <p class="vel-label">{{ t('account.commission.fee.overline', { level }) }}</p>
          <h2 class="text-xl font-semibold text-fg sm:text-2xl">{{ title }}</h2>
        </div>
      </div>

      <p class="m-0 text-sm text-muted">{{ body }}</p>

      <div
        class="vel-fee-amount flex flex-col gap-1 rounded-control border border-line bg-ground px-4 py-3"
      >
        <span class="vel-label">{{ t('account.commission.fee.amountLabel') }}</span>
        <span class="vel-num text-2xl font-semibold text-accent-deep">{{ amountText }}</span>
      </div>

      <p class="m-0 text-xs text-faint">{{ t('account.commission.fee.note') }}</p>

      <VelButton type="submit" block size="lg">
        {{ t('account.commission.fee.cta') }}
      </VelButton>
    </form>
  </section>
</template>

<style scoped>
.vel-fee-mark {
  animation: vel-fee-glow 2.8s ease-in-out infinite;
}

.vel-fee-amount {
  transition:
    border-color 200ms ease,
    box-shadow 200ms ease;
}

.vel-fee-amount:hover {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-accent) 14%, transparent);
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
