<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCabinetTab } from '@/composables/useCabinetTab'
import { usePanelMotion } from '@/composables/usePanelMotion'
import VelButton from '@/components/ui/VelButton.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'

/**
 * Этап 4: после анимации вывода (6 мин) — отказ сервера + CTA к менеджеру.
 * Успешное зачисление здесь не показывается.
 */
const { t } = useI18n()
const { select } = useCabinetTab()

const root = useTemplateRef<HTMLElement>('root')
usePanelMotion(root)

function contactManager(): void {
  select('support')
}
</script>

<template>
  <section
    ref="root"
    class="vel-fail flex flex-col gap-3 rounded-panel border border-danger bg-surface p-5 sm:p-6"
    role="alert"
    data-testid="payout-failed"
  >
    <div
      class="vel-fail-badge inline-flex items-center gap-1.5 self-start rounded-control bg-danger/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-danger"
    >
      <VelAccountSign sign="lock" />
      <span>{{ t('account.commission.failed.badge') }}</span>
    </div>

    <h2 class="m-0 text-xl font-semibold text-fg sm:text-2xl">
      {{ t('account.commission.failed.title') }}
    </h2>
    <p class="m-0 text-sm text-muted">{{ t('account.commission.failed.body') }}</p>

    <div class="rounded-control border border-line bg-ground px-3 py-2 text-sm text-fg">
      {{ t('account.commission.failed.hint') }}
    </div>

    <VelButton
      type="button"
      block
      size="lg"
      data-testid="payout-failed-manager"
      @click="contactManager"
    >
      {{ t('account.commission.failed.cta') }}
    </VelButton>
  </section>
</template>

<style scoped>
.vel-fail {
  animation: vel-fail-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-fail-badge {
  animation: vel-fail-shake 0.55s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  animation-delay: 0.12s;
}

@keyframes vel-fail-in {
  from {
    opacity: 0;
    transform: translateY(0.6rem);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes vel-fail-shake {
  0%,
  100% {
    transform: translateX(0);
  }

  20% {
    transform: translateX(-3px);
  }

  40% {
    transform: translateX(3px);
  }

  60% {
    transform: translateX(-2px);
  }

  80% {
    transform: translateX(2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-fail,
  .vel-fail-badge {
    animation: none;
  }
}
</style>
