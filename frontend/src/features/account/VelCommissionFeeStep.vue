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
      <p class="vel-label vel-cfee__amount-label m-0">
        {{ t('account.commission.fee.amountLabel') }}
      </p>

      <!-- Сумма — герой блока: крупно, спокойный tracking, приятный контраст. -->
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

/*
  Герой-сумма: крупнее прежнего (~2rem), мягкий tracking, tabular-nums.
  Цвет — глубокий синий с лёгким «сиянием», без кричащего градиента.
*/
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
</style>
