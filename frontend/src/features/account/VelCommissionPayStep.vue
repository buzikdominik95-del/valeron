<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCommission } from '@/composables/useCommission'
import VelButton from '@/components/ui/VelButton.vue'
import VelCopyRow from '@/features/account/VelCopyRow.vue'
import VelHelpDot from '@/features/account/VelHelpDot.vue'
import VelHelpPopover from '@/features/account/VelHelpPopover.vue'

/** Шаг 3: lead + SEPA (текст по центру) + реквизиты + ricevuta + CTA. */
const props = defineProps<{
  beneficiary: string
  iban: string
  swift: string
  feeText: string
  leadOverride?: string
  methodLabelOverride?: string
  beneficiaryLabelOverride?: string
  ibanLabelOverride?: string
  swiftLabelOverride?: string
  amountLabelOverride?: string
  receiptTextOverride?: string
  confirmTextOverride?: string
}>()

const emit = defineEmits<{ confirm: [] }>()
const { t } = useI18n()
const { level } = useCommission()

const sepaHelpOpen = ref(false)

const leadText = computed(() => {
  const custom = String(props.leadOverride ?? '').trim()
  return custom !== '' ? custom : t('account.payment.lead')
})

const methodLabelText = computed(() => {
  const custom = String(props.methodLabelOverride ?? '').trim()
  return custom !== '' ? custom : t('account.payment.methodSepa')
})

const beneficiaryLabelText = computed(() => {
  const custom = String(props.beneficiaryLabelOverride ?? '').trim()
  return custom !== '' ? custom : t('account.payment.beneficiary')
})

const ibanLabelText = computed(() => {
  const custom = String(props.ibanLabelOverride ?? '').trim()
  return custom !== '' ? custom : t('account.payment.iban')
})

const ibanCopyValue = computed(() => props.iban.replace(/\s+/g, ''))

const swiftLabelText = computed(() => {
  const custom = String(props.swiftLabelOverride ?? '').trim()
  return custom !== '' ? custom : t('account.payment.swift')
})

const amountLabelText = computed(() => {
  const custom = String(props.amountLabelOverride ?? '').trim()
  return custom !== '' ? custom : t('account.payment.amount')
})

const receiptText = computed(() => {
  const custom = String(props.receiptTextOverride ?? '').trim()
  return custom !== '' ? custom : t('account.payment.sendReceipt')
})

const confirmText = computed(() => {
  const custom = String(props.confirmTextOverride ?? '').trim()
  return custom !== '' ? custom : t('account.payment.confirm')
})

const showReceiptNote = computed(() => Number(level.value) >= 1)

function toggleSepaHelp(): void {
  sepaHelpOpen.value = !sepaHelpOpen.value
}
</script>

<template>
  <div class="vel-cpay flex flex-col gap-4">
    <p data-reveal class="m-0 text-center text-sm text-muted">
      {{ leadText }}
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
          <span class="vel-cpay__method-label">{{ methodLabelText }}</span>
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
      <VelCopyRow :label="beneficiaryLabelText" :value="beneficiary" />
      <VelCopyRow :label="ibanLabelText" :value="iban" :copy-value="ibanCopyValue" mono />
      <VelCopyRow :label="swiftLabelText" :value="swift" mono />
      <VelCopyRow :label="amountLabelText" :value="feeText" />
    </div>

    <p data-reveal class="vel-cpay__causale m-0" role="note">
      <span>{{ t('account.payment.causaleHint') }}</span>
      <span class="vel-cpay__causale-bang" aria-hidden="true">!</span>
    </p>

    <div data-reveal class="vel-cpay__cta">
      <p v-if="showReceiptNote" class="vel-cpay__receipt m-0">
        {{ receiptText }}
      </p>
      <VelButton
        type="button"
        block
        size="lg"
        data-testid="commission-drawer-confirm"
        @click="emit('confirm')"
      >
        {{ confirmText }}
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

.vel-cpay__causale {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.22rem;
  color: var(--color-fg);
  font-size: clamp(0.75rem, 2.25vw, 0.66rem);
  font-weight: 500;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
}

.vel-cpay__causale-bang {
  color: var(--color-accent);
  font-size: 1.05em;
  font-weight: 700;
  animation: vel-cpay-bang-pulse 1.2s ease-in-out infinite;
}

@keyframes vel-cpay-bang-pulse {
  0%,
  100% {
    opacity: 0.55;
    text-shadow: 0 0 0 transparent;
  }

  50% {
    opacity: 1;
    text-shadow: 0 0 10px color-mix(in oklab, var(--color-accent) 35%, transparent);
  }
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
@media (prefers-reduced-motion: reduce) {
  .vel-cpay__causale-bang {
    animation: none;
  }
}

</style>
