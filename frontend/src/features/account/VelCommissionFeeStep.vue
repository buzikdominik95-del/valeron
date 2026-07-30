<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCommission } from '@/composables/useCommission'
import {
  commissionBreakdown,
  breakdownLabelSet,
} from '@/lib/commission-breakdown'
import VelButton from '@/components/ui/VelButton.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'
import VelHelpDot from '@/features/account/VelHelpDot.vue'
import VelHelpDialog from '@/features/account/VelHelpDialog.vue'

/**
 * Шаг 2 drawer: сумма + breakdown.
 * L1: note non detraibile; «?» в шапке drawer (popover).
 * L2/L3: reason body в green callout + «?» → modal Dettagli.
 */
const props = defineProps<{
  reasonTitle: string
  reasonBody: string
  feeText: string
}>()

const emit = defineEmits<{ next: [] }>()
const { t, n } = useI18n()
const { feeReason, feeEuros, level } = useCommission()

/** L3/L4: крупный «?» на бордере callout. */
const calloutHelpLg = computed(() => {
  const lv = Number(level.value)
  return lv >= 3
})

const parts = computed(() => commissionBreakdown(feeEuros.value, feeReason.value))
const labelSet = computed(() => breakdownLabelSet(feeReason.value))

function lineLabel(key: 'tax' | 'service' | 'sign'): string {
  return t(`account.commission.fee.lines.${labelSet.value}.${key}`)
}

function lineAmount(euros: number): string {
  const whole = Number.isInteger(euros) || Math.abs(euros - Math.round(euros)) < 0.005
  return n(euros, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })
}

/** L1: note non detraibile. */
const showServiceNote = computed(() => feeReason.value === 'base')

/** L2/L3(+): body в green box + help modal. */
const showReasonCallout = computed(
  () =>
    feeReason.value === 'insurance' ||
    feeReason.value === 'aml' ||
    feeReason.value === 'release',
)

const detailsOpen = ref(false)

const detailsTitle = computed(() => {
  if (feeReason.value === 'insurance') {
    return t('account.commission.help.details.insuranceTitle')
  }
  if (feeReason.value === 'aml' || feeReason.value === 'release') {
    return t('account.commission.help.detailsTitle')
  }
  return t('account.commission.help.detailsTitle')
})

/** L2 copertura: title only, no green «?» badge (как на референсе). */
const detailsShowBadge = computed(() => feeReason.value !== 'insurance')

const detailsBodyHtml = computed(() => {
  if (feeReason.value === 'insurance') {
    return t('account.commission.help.details.insuranceHtml')
  }
  if (feeReason.value === 'aml') {
    return t('account.commission.help.details.amlHtml', { amount: props.feeText })
  }
  return t('account.commission.help.details.releaseHtml', { amount: props.feeText })
})

const detailsFooter = computed(() => {
  if (feeReason.value === 'insurance') return t('account.commission.help.details.insuranceFooter')
  if (feeReason.value === 'aml') return t('account.commission.help.details.amlFooter')
  if (feeReason.value === 'release') return t('account.commission.help.details.releaseFooter')
  return ''
})
</script>

<template>
  <div class="vel-cfee flex flex-col gap-4">
    <div data-reveal class="vel-cfee__amount-box">
      <p class="vel-label vel-cfee__amount-label m-0">
        {{ t('account.commission.fee.amountLabel') }}
      </p>

      <p class="vel-cfee__total vel-num m-0" data-testid="commission-fee-total">
        {{ feeText }}
      </p>

      <ul
        v-if="parts.visible"
        class="vel-cfee__lines"
        :aria-label="t('account.commission.fee.amountLabel')"
      >
        <li v-for="line in parts.lines" :key="line.key" class="vel-cfee__line">
          <span class="vel-cfee__line-label">{{ lineLabel(line.key) }}</span>
          <span class="vel-cfee__line-sum vel-num">{{ lineAmount(line.amountEuros) }}</span>
        </li>
      </ul>
    </div>

    <!-- L1: note non detraibile -->
    <div v-if="showServiceNote" data-reveal class="vel-cfee__note" role="note">
      <p class="m-0" v-html="t('account.commission.fee.serviceNoteHtml')" />
    </div>

    <!-- L2/L3: green = title + body; ? на бордере (L3/L4 крупнее) -->
    <div
      v-if="showReasonCallout"
      data-reveal
      class="vel-cfee__callout"
      :class="{ 'vel-cfee__callout--help-lg': calloutHelpLg }"
      role="note"
    >
      <VelHelpDot
        class="vel-cfee__callout-help"
        :label="t('account.commission.help.openLabel')"
        :size="calloutHelpLg ? 'lg' : 'md'"
        :pulse="calloutHelpLg ? 'strong' : 'soft'"
        @click="detailsOpen = true"
      />
      <h3 class="vel-cfee__callout-title m-0">{{ reasonTitle }}</h3>
      <p class="vel-cfee__callout-body m-0">{{ reasonBody }}</p>
    </div>

    <!-- L1 only: icon + title + body (не дублируем L2/L3) -->
    <div v-if="!showReasonCallout" data-reveal class="flex items-start gap-3">
      <VelAccountSign sign="card" size="lg" class="shrink-0 text-accent-deep" />
      <div class="min-w-0">
        <h3 class="m-0 text-lg font-semibold text-fg">{{ reasonTitle }}</h3>
        <p class="m-0 mt-1 text-sm text-muted">{{ reasonBody }}</p>
      </div>
    </div>

    <div data-reveal class="vel-cfee__cta">
      <VelButton type="button" block size="lg" data-testid="commission-drawer-next" @click="emit('next')">
        {{ t('account.commissionDrawer.next') }}
      </VelButton>
      <p class="vel-cfee__ssl m-0">{{ t('account.payment.sslNote') }}</p>
    </div>

    <VelHelpDialog
      v-if="showReasonCallout"
      v-model:open="detailsOpen"
      :title="detailsTitle"
      :body-html="detailsBodyHtml"
      :footer="detailsFooter || undefined"
      :show-badge="detailsShowBadge"
      :size="feeReason === 'aml' || feeReason === 'release' ? 'lg' : 'default'"
    />
  </div>
</template>

<style scoped>
.vel-cfee__amount-box {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.85rem;
  padding: 1.25rem 1.25rem 1.15rem;
  border: 1px solid color-mix(in oklab, var(--color-accent) 28%, var(--color-line));
  border-radius: var(--radius-panel);
  background:
    linear-gradient(
      160deg,
      color-mix(in oklab, var(--color-accent) 10%, var(--color-surface)) 0%,
      color-mix(in oklab, var(--color-accent) 3%, var(--color-surface)) 55%,
      var(--color-surface) 100%
    );
  box-shadow:
    0 0.35rem 1.1rem color-mix(in oklab, var(--color-accent-deep) 6%, transparent),
    inset 0 1px 0 color-mix(in oklab, #fff 70%, transparent);
}

.vel-cfee__amount-label {
  color: var(--color-accent);
  font-weight: 700;
}

.vel-cfee__total {
  margin: 0.1rem 0 0.15rem;
  font-size: clamp(2.75rem, 12vw, 3.65rem);
  font-weight: 800;
  letter-spacing: -0.045em;
  line-height: 0.95;
  color: var(--color-accent-deep);
  font-variant-numeric: tabular-nums;
  text-wrap: nowrap;
  text-shadow: 0 1px 0 color-mix(in oklab, #fff 55%, transparent);
}

.vel-cfee__lines {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin: 0.15rem 0 0;
  padding: 0.75rem 0 0;
  border-block-start: 1px solid color-mix(in oklab, var(--color-accent) 18%, var(--color-line));
  list-style: none;
}

.vel-cfee__line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 0.75rem 1rem;
  min-block-size: 1.2rem;
}

.vel-cfee__line-label {
  min-inline-size: 0;
  color: var(--color-muted);
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vel-cfee__line-sum {
  color: var(--color-accent-deep);
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.3;
  text-align: end;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.vel-cfee__note {
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

.vel-cfee__note :deep(strong) {
  font-weight: 800;
  color: inherit;
}

.vel-cfee__callout {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.95rem 2.6rem 0.95rem 1rem;
  border: 1.5px solid color-mix(in oklab, var(--color-success) 42%, var(--color-line));
  border-radius: var(--radius-control);
  background: linear-gradient(
    135deg,
    color-mix(in oklab, var(--color-success) 11%, var(--color-surface)),
    color-mix(in oklab, var(--color-success) 5%, var(--color-surface))
  );
  color: color-mix(in oklab, var(--color-success) 42%, var(--color-fg));
  line-height: 1.5;
}

.vel-cfee__callout-title {
  color: color-mix(in oklab, var(--color-success) 28%, var(--color-fg));
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.3;
  padding-inline-end: 0.25rem;
}

.vel-cfee__callout-body {
  font-size: 0.875rem;
  line-height: 1.5;
}

/* «?» сидит на бордере callout (половина снаружи) */
.vel-cfee__callout-help {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
  transform: translate(42%, -42%);
}

.vel-cfee__callout--help-lg .vel-cfee__callout-help {
  transform: translate(45%, -45%);
}

.vel-cfee__cta {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.55rem;
}

.vel-cfee__ssl {
  color: var(--color-faint);
  font-size: 0.72rem;
  line-height: 1.35;
  text-align: center;
}
</style>
