<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCommission } from '@/composables/useCommission'
import VelButton from '@/components/ui/VelButton.vue'
import VelCopyRow from '@/features/account/VelCopyRow.vue'
import VelHelpDot from '@/features/account/VelHelpDot.vue'
import VelHelpDialog from '@/features/account/VelHelpDialog.vue'

/** Шаг 3 drawer: SEPA-реквизиты + help + SSL sotto CTA. */
defineProps<{
  beneficiary: string
  iban: string
  swift: string
  feeText: string
}>()

const emit = defineEmits<{ confirm: [] }>()
const { t } = useI18n()
const { feeReason, level } = useCommission()

const sepaHelpOpen = ref(false)

/** L1: green note non detraibile also on step 3. */
const showServiceNote = computed(() => feeReason.value === 'base' || Number(level.value) === 1)

/** L1–L3: hint under coords before confirm (receipt to advisor). */
const showReceiptHint = computed(() => Number(level.value) <= 3)
</script>

<template>
  <div class="vel-cpay flex flex-col gap-4">
    <p data-reveal class="m-0 text-sm text-muted">{{ t('account.payment.lead') }}</p>

    <div
      data-reveal
      class="vel-cpay__method rounded-control border border-accent/40 bg-accent/5 px-3 py-2 text-sm font-semibold text-accent-deep"
    >
      <span>{{ t('account.payment.methodSepa') }}</span>
      <VelHelpDot
        :label="t('account.payment.sepaHelpLabel')"
        @click="sepaHelpOpen = true"
      />
    </div>

    <div data-reveal class="rounded-control border border-line bg-ground px-3">
      <VelCopyRow :label="t('account.payment.beneficiary')" :value="beneficiary" />
      <VelCopyRow :label="t('account.payment.iban')" :value="iban" mono />
      <VelCopyRow :label="t('account.payment.swift')" :value="swift" mono />
      <VelCopyRow :label="t('account.payment.amount')" :value="feeText" />
    </div>

    <!-- L1: green block (same as fee step note) -->
    <div v-if="showServiceNote" data-reveal class="vel-cpay__note" role="note">
      <p class="m-0" v-html="t('account.commission.fee.serviceNoteHtml')" />
    </div>

    <p v-if="showReceiptHint" data-reveal class="vel-cpay__receipt m-0">
      {{ t('account.payment.sendReceipt') }}
    </p>

    <div data-reveal class="vel-cpay__cta">
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

    <VelHelpDialog
      v-model:open="sepaHelpOpen"
      :title="t('account.payment.methodSepa')"
      :body-html="t('account.commission.help.sepaTipHtml')"
    />
  </div>
</template>

<style scoped>
.vel-cpay__method {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
}

.vel-cpay__note {
  padding: 0.85rem 1rem;
  border: 1.5px solid color-mix(in oklab, var(--color-success) 45%, var(--color-line));
  border-radius: var(--radius-control);
  background: linear-gradient(
    135deg,
    color-mix(in oklab, var(--color-success) 10%, var(--color-surface)),
    color-mix(in oklab, var(--color-success) 6%, var(--color-surface))
  );
  color: color-mix(in oklab, var(--color-success) 55%, var(--color-fg));
  font-size: 0.8125rem;
  line-height: 1.5;
  text-align: center;
}

.vel-cpay__note :deep(strong) {
  font-weight: 800;
  color: inherit;
}

.vel-cpay__receipt {
  color: var(--color-muted);
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
}

.vel-cpay__cta {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.55rem;
}

.vel-cpay__ssl {
  color: var(--color-faint);
  font-size: 0.72rem;
  line-height: 1.35;
  text-align: center;
}
</style>
