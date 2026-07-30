<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCommission } from '@/composables/useCommission'
import VelButton from '@/components/ui/VelButton.vue'
import VelCopyRow from '@/features/account/VelCopyRow.vue'
import VelHelpDot from '@/features/account/VelHelpDot.vue'
import VelHelpPopover from '@/features/account/VelHelpPopover.vue'

/** Шаг 3: lead + SEPA (текст по центру) + реквизиты + ricevuta + CTA. */
defineProps<{
  beneficiary: string
  iban: string
  swift: string
  feeText: string
}>()

const emit = defineEmits<{ confirm: [] }>()
const { t } = useI18n()
const { level } = useCommission()

const sepaHelpOpen = ref(false)

const showReceiptNote = computed(() => Number(level.value) >= 1)

function toggleSepaHelp(): void {
  sepaHelpOpen.value = !sepaHelpOpen.value
}
</script>

<template>
  <div class="vel-cpay flex flex-col gap-4">
    <p data-reveal class="m-0 text-center text-sm text-muted">
      {{ t('account.payment.lead') }}
    </p>

    <div
      data-reveal
      class="vel-cpay__method-wrap"
      :data-vel-help-anchor="sepaHelpOpen ? 'open' : '1'"
    >
      <div
        class="vel-cpay__method rounded-control border border-accent/40 bg-accent/5 px-3 py-2"
      >
        <!-- текст + ? вместе по центру поля -->
        <span class="vel-cpay__method-inner">
          <span class="vel-cpay__method-label">{{ t('account.payment.methodSepa') }}</span>
          <VelHelpDot
            :label="t('account.payment.sepaHelpLabel')"
            @click="toggleSepaHelp"
          />
        </span>
      </div>
      <VelHelpPopover
        v-model:open="sepaHelpOpen"
        :body-html="t('account.commission.help.sepaTipHtml')"
      />
    </div>

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
.vel-cpay__method-wrap {
  position: relative;
}

/* Текст + ? — одна группа по центру поля */
.vel-cpay__method {
  display: flex;
  align-items: center;
  justify-content: center;
  min-block-size: 2.5rem;
}

.vel-cpay__method-inner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  max-inline-size: 100%;
}

.vel-cpay__method-label {
  color: var(--color-accent-deep);
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.3;
  text-align: center;
}

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
