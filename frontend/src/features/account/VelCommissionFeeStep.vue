<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCommission } from '@/composables/useCommission'
import {
  commissionBreakdown,
  breakdownLabelSet,
} from '@/lib/commission-breakdown'
import VelButton from '@/components/ui/VelButton.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'

/**
 * Шаг 2 drawer: сумма + breakdown как на Calipso (фотка 9 / prod cabinet).
 * Справа от суммы: IVA / servizi / firma — формула _updateCommBreakdown.
 */
const props = defineProps<{
  reasonTitle: string
  reasonBody: string
  feeText: string
}>()

const emit = defineEmits<{ next: [] }>()
const { t, n } = useI18n()
const { feeReason, feeEuros } = useCommission()

const parts = computed(() => commissionBreakdown(feeEuros.value, feeReason.value))
const labelSet = computed(() => breakdownLabelSet(feeReason.value))

function lineLabel(key: 'tax' | 'service' | 'sign'): string {
  return t(`account.commission.fee.lines.${labelSet.value}.${key}`)
}

/** Короткие суммы в breakdown: «7 €», «18 €» — одна колонка, без «кривых» .00. */
function lineAmount(euros: number): string {
  const whole = Number.isInteger(euros) || Math.abs(euros - Math.round(euros)) < 0.005
  return n(euros, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })
}

/** Зелёная плашка L1: «non è detraibile» — 1:1 Calipso comm-l1-info-block. */
const showServiceNote = computed(() => feeReason.value === 'base')
</script>

<template>
  <div class="vel-cfee flex flex-col gap-4">
    <!--
      Сумма + breakdown: ровная структура (не «кривые» столбцы).
      Итог слева, строки label|amount справа — grid, tabular-nums.
    -->
    <div data-reveal class="vel-cfee__amount-box">
      <p class="vel-label m-0">{{ t('account.commission.fee.amountLabel') }}</p>

      <div class="vel-cfee__amount-row">
        <p class="vel-cfee__total vel-num m-0">{{ feeText }}</p>

        <ul v-if="parts.visible" class="vel-cfee__lines" :aria-label="t('account.commission.fee.amountLabel')">
          <li v-for="line in parts.lines" :key="line.key" class="vel-cfee__line">
            <span class="vel-cfee__line-label">{{ lineLabel(line.key) }}</span>
            <span class="vel-cfee__line-sum vel-num">{{ lineAmount(line.amountEuros) }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- L1: note non detraibile (prod) -->
    <div v-if="showServiceNote" data-reveal class="vel-cfee__note" role="note">
      <p class="m-0" v-html="t('account.commission.fee.serviceNoteHtml')" />
    </div>

    <!-- Motivo -->
    <div data-reveal class="flex items-start gap-3">
      <VelAccountSign sign="card" size="lg" class="shrink-0 text-accent-deep" />
      <div class="min-w-0">
        <h3 class="m-0 text-lg font-semibold text-fg">{{ reasonTitle }}</h3>
        <p class="m-0 mt-1 text-sm text-muted">{{ reasonBody }}</p>
      </div>
    </div>

    <div data-reveal>
      <VelButton type="button" block size="lg" data-testid="commission-drawer-next" @click="emit('next')">
        {{ t('account.commissionDrawer.next') }}
      </VelButton>
    </div>
  </div>
</template>

<style scoped>
.vel-cfee__amount-box {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 1rem 1.1rem;
  border: 1px solid color-mix(in oklab, var(--color-accent) 35%, var(--color-line));
  border-radius: var(--radius-control);
  background: color-mix(in oklab, var(--color-accent) 6%, var(--color-surface));
}

/* Две колонки: итог | breakdown. На узком — столбиком. */
.vel-cfee__amount-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(10.5rem, auto);
  align-items: center;
  gap: 0.85rem 1.5rem;
}

.vel-cfee__total {
  font-size: clamp(1.85rem, 6.5vw, 2.35rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--color-accent-deep);
  font-variant-numeric: tabular-nums;
}

.vel-cfee__lines {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin: 0;
  padding: 0.15rem 0 0.15rem 1rem;
  border-inline-start: 1px solid color-mix(in oklab, var(--color-accent) 22%, var(--color-line));
  list-style: none;
}

.vel-cfee__line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 3.75rem;
  align-items: baseline;
  gap: 0.65rem;
  min-block-size: 1.15rem;
}

.vel-cfee__line-label {
  min-inline-size: 0;
  color: var(--color-muted);
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vel-cfee__line-sum {
  color: var(--color-fg);
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.25;
  text-align: end;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Узкий drawer: итог сверху, строки на всю ширину под ним */
@media (max-width: 22.5rem) {
  .vel-cfee__amount-row {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .vel-cfee__lines {
    padding-inline-start: 0;
    padding-block-start: 0.65rem;
    border-inline-start: none;
    border-block-start: 1px solid color-mix(in oklab, var(--color-accent) 22%, var(--color-line));
  }

  .vel-cfee__line {
    grid-template-columns: minmax(0, 1fr) 4rem;
  }
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
</style>
