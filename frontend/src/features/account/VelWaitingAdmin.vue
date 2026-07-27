<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useCommission } from '@/composables/useCommission'
import VelAccountSign from '@/features/account/VelAccountSign.vue'

/**
 * Ожидание флага админа / ответа API после сообщения менеджеру.
 * Этап 1: после оплаты 37 € и отправки шаблона — лоадер до stage 2.
 */
const { t } = useI18n()
const { level } = useCommission()
</script>

<template>
  <section
    class="flex flex-col gap-4 rounded-panel border border-line bg-surface p-5 sm:p-6"
    data-testid="waiting-admin"
    role="status"
    :aria-busy="true"
    :aria-label="t('account.commission.waiting.busy', { level })"
  >
    <div class="flex items-start gap-3">
      <span class="vel-wait-spin shrink-0" aria-hidden="true">
        <VelAccountSign sign="clock" size="lg" class="text-accent-deep" />
      </span>
      <div class="min-w-0">
        <p class="vel-label">{{ t('account.commission.waiting.overline') }}</p>
        <h2 class="m-0 text-xl font-semibold text-fg sm:text-2xl">
          {{ t('account.commission.waiting.title') }}
        </h2>
      </div>
    </div>

    <div class="flex items-center gap-3 rounded-control border border-line bg-ground px-3 py-3">
      <span class="vel-wait-ring" aria-hidden="true" />
      <p class="m-0 text-sm text-muted">
        {{ t('account.commission.waiting.body', { level }) }}
      </p>
    </div>

    <p class="m-0 text-xs text-faint">{{ t('account.commission.waiting.hint') }}</p>
  </section>
</template>

<style scoped>
.vel-wait-spin {
  display: inline-flex;
  animation: vel-wait-pulse 2s ease-in-out infinite;
}

.vel-wait-ring {
  display: inline-block;
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
  border: 2px solid color-mix(in oklab, var(--color-accent) 28%, transparent);
  border-top-color: var(--color-accent);
  border-radius: var(--radius-round);
  animation: vel-wait-spin 0.85s linear infinite;
}

@keyframes vel-wait-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes vel-wait-pulse {
  0%,
  100% {
    filter: drop-shadow(0 0 0 transparent);
  }

  50% {
    filter: drop-shadow(0 0 6px color-mix(in oklab, var(--color-accent) 40%, transparent));
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-wait-spin,
  .vel-wait-ring {
    animation: none;
  }
}
</style>
