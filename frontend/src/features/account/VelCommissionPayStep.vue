<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import VelButton from '@/components/ui/VelButton.vue'
import VelCopyRow from '@/features/account/VelCopyRow.vue'

/** Шаг 3 drawer: SEPA-реквизиты. Без Indietro. */
defineProps<{
  beneficiary: string
  iban: string
  swift: string
  feeText: string
}>()

const emit = defineEmits<{ confirm: [] }>()
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-4">
    <p data-reveal class="m-0 text-sm text-muted">{{ t('account.payment.lead') }}</p>
    <div
      data-reveal
      class="rounded-control border border-accent/40 bg-accent/5 px-3 py-2 text-sm font-semibold text-accent-deep"
    >
      {{ t('account.payment.methodSepa') }}
    </div>
    <div data-reveal class="rounded-control border border-line bg-ground px-3">
      <VelCopyRow :label="t('account.payment.beneficiary')" :value="beneficiary" />
      <VelCopyRow :label="t('account.payment.iban')" :value="iban" mono />
      <VelCopyRow :label="t('account.payment.swift')" :value="swift" mono />
      <VelCopyRow :label="t('account.payment.amount')" :value="feeText" />
    </div>
    <p data-reveal class="m-0 text-xs text-faint">{{ t('account.payment.sslNote') }}</p>
    <div data-reveal>
      <VelButton
        type="button"
        block
        size="lg"
        data-testid="commission-drawer-confirm"
        @click="emit('confirm')"
      >
        {{ t('account.payment.confirm') }}
      </VelButton>
    </div>
  </div>
</template>
