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

/** L2/L3: крупный «?» на бордере callout. */
const calloutHelpLg = computed(() => {
  const lv = Number(level.value)
  return lv === 2 || lv === 3
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
  <div class="vel-cfee flex flex-col gap-3" style="overflow: visible">
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

    <!-- L2/L3: green = title + body; ? на бордере (крупнее + stronger pulse) -->
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
.vel-cfee {
  overflow: visible;
}

.vel-cfee__amount-box {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.55rem;
  padding: 0.95rem 1rem 0.9rem;
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
  margin: 0.05rem 0 0.1rem;
  font-size: clamp(2rem, 9vw, 3.2rem);
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
  gap: 0.35rem;
  margin: 0.1rem 0 0;
  padding: 0.55rem 0 0;
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
  --callout-bw: 1.5px;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 1rem 1.4rem 0.95rem 1rem;
  border: var(--callout-bw) solid color-mix(in oklab, var(--color-success) 48%, var(--color-line));
  border-radius: var(--radius-control);
  background: linear-gradient(
    135deg,
    color-mix(in oklab, var(--color-success) 11%, var(--color-surface)),
    color-mix(in oklab, var(--color-success) 5%, var(--color-surface))
  );
  color: color-mix(in oklab, var(--color-success) 42%, var(--color-fg));
  line-height: 1.5;
  overflow: visible;
}

.vel-cfee__callout-title {
  color: color-mix(in oklab, var(--color-success) 28%, var(--color-fg));
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.3;
  padding-inline-end: 0.85rem;
}

.vel-cfee__callout-body {
  font-size: 0.875rem;
  line-height: 1.5;
  padding-inline-end: 0.35rem;
}

/*
 * «?»-круг: центр ровно на верхнем-правом угле зелёного блока.
 * Явный круг (border + bg) — не полагаемся только на component defaults.
 */
.vel-cfee__callout-help {
  --help-d: 1.45rem;
  position: absolute;
  z-index: 4;
  /* центр = угол border-box: top/right - half size + half border */
  top: calc(-0.5 * var(--help-d));
  right: calc(-0.5 * var(--help-d));
  width: var(--help-d);
  height: var(--help-d);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  pointer-events: auto;
}

.vel-cfee__callout--help-lg .vel-cfee__callout-help {
  --help-d: 1.85rem;
}

.vel-cfee__callout-help :deep(.vel-help-dot),
.vel-cfee__callout-help :deep(.vel-help-dot--lg),
.vel-cfee__callout-help :deep(.vel-help-dot--strong) {
  position: relative;
  top: auto;
  left: auto;
  display: inline-flex !important;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--help-d) !important;
  height: var(--help-d) !important;
  min-width: var(--help-d);
  min-height: var(--help-d);
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  border: 2px solid #5aaf8f !important;
  border-radius: 999px !important;
  background: #eef8f3 !important;
  color: #1a6b52 !important;
  box-shadow:
    0 0 0 2.5px #fff,
    0 1px 3px rgba(15, 23, 42, 0.1);
  transform: none;
  opacity: 1;
  animation: vel-cfee-help-pulse 1.15s ease-in-out infinite;
}

.vel-cfee__callout-help :deep(.vel-help-dot__mark) {
  font-size: 0.8rem;
  font-weight: 800;
  line-height: 1;
  color: inherit;
}

.vel-cfee__callout--help-lg .vel-cfee__callout-help :deep(.vel-help-dot__mark) {
  font-size: 0.95rem;
}

@keyframes vel-cfee-help-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow:
      0 0 0 2.5px #fff,
      0 0 0 0 rgba(90, 175, 143, 0.45);
  }
  50% {
    transform: scale(1.1);
    box-shadow:
      0 0 0 2.5px #fff,
      0 0 0 0.45rem rgba(90, 175, 143, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-cfee__callout-help :deep(.vel-help-dot),
  .vel-cfee__callout-help :deep(.vel-help-dot--lg),
  .vel-cfee__callout-help :deep(.vel-help-dot--strong) {
    animation: none;
  }
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
