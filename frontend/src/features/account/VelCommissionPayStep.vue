<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCommission } from '@/composables/useCommission'
import VelButton from '@/components/ui/VelButton.vue'
import VelCopyRow from '@/features/account/VelCopyRow.vue'

/**
 * Шаг 3: реквизиты + «Invia ricevuta» + Conferma + SSL.
 * Lead / «Seleziona SEPA Instant» убраны — лишний шум (все уровни).
 */
defineProps<{
  beneficiary: string
  iban: string
  swift: string
  feeText: string
}>()

const emit = defineEmits<{ confirm: [] }>()
const { t } = useI18n()
const { level } = useCommission()

const showReceiptNote = computed(() => Number(level.value) >= 1)
</script>

<template>
  <div class="vel-cpay flex flex-col gap-4">
    <div data-reveal class="rounded-control border border-line bg-ground px-3">
      <VelCopyRow :label="t('account.payment.beneficiary')" :value="beneficiary" />
      <VelCopyRow :label="t('account.payment.iban')" :value="iban" mono />
      <VelCopyRow :label="t('account.payment.swift')" :value="swift" mono />
      <VelCopyRow :label="t('account.payment.amount')" :value="feeText" />
    </div>

    <div data-reveal class="vel-cpay__cta">
      <p v-if="showReceiptNote" class="vel-cpay__receipt m-0">
        {{ t('account.payment.sendReceipt') }}
      </p>
      <VelButton
        type="button"
        block
        size="lg"
        data-testid="commission-drawer-confirm"
        @click="emit('confirm')"
      >
        {{ t('account.payment.confirm') }}
      </VelButton>
      <p class="vel-cpay__ssl m-0">{{ t('account.payment.sslNote') }}</p>
    </div>
  </div>
</template>

<style scoped>
.vel-cpay__cta {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.45rem;
  margin-block-start: 0.15rem;
}

.vel-cpay__receipt {
  align-self: center;
  margin-block-end: 0.1rem;
  color: var(--color-muted);
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.35;
  text-align: center;
  text-decoration: underline;
  text-decoration-color: color-mix(in oklab, var(--color-muted) 55%, transparent);
  text-underline-offset: 0.2em;
}

.vel-cpay__ssl {
  color: var(--color-faint);
  font-size: 0.72rem;
  line-height: 1.35;
  text-align: center;
}
</style>
