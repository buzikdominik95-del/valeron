<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCommission } from '@/composables/useCommission'
import { usePanelMotion } from '@/composables/usePanelMotion'
import VelButton from '@/components/ui/VelButton.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'

/**
 * Этап 2 после анимации: ответ «данные переданы, зачисление после страховки».
 * CTA открывает экран покрытия / погашения страховки (pay_fee).
 */
const emit = defineEmits<{ details: [] }>()

const { t } = useI18n()
const { level, openFeeFromSuspension } = useCommission()

const root = useTemplateRef<HTMLElement>('root')
usePanelMotion(root)

function onDetails(): void {
  openFeeFromSuspension()
  emit('details')
}
</script>

<template>
  <section
    ref="root"
    class="flex flex-col gap-3 rounded-panel border border-line bg-surface p-5 sm:p-6"
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
      {{ t('account.commission.suspension.body', { level }) }}
    </p>

    <div class="rounded-control border border-line bg-ground px-3 py-2 text-sm text-fg">
      {{ t('account.commission.suspension.insuranceNote') }}
    </div>

    <VelButton
      block
      size="lg"
      data-testid="suspension-cta"
      class="bg-danger text-accent-ink hover:bg-danger/90"
      @click="onDetails"
    >
      {{ t('account.commission.suspension.cta') }}
    </VelButton>
  </section>
</template>

<style scoped>
.vel-susp-badge {
  animation: vel-susp-attn 2s ease-in-out infinite;
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

@media (prefers-reduced-motion: reduce) {
  .vel-susp-badge {
    animation: none;
  }
}
</style>
