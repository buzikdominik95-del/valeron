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

function lineAmount(euros: number): string {
  return n(euros, 'currency')
}

/** Зелёная плашка L1: «non è detraibile» — 1:1 Calipso comm-l1-info-block. */
const showServiceNote = computed(() => feeReason.value === 'base')
</script>

<template>
  <div class="vel-cfee flex flex-col gap-4">
    <!-- Somma + breakdown (layout prod: сумма слева, строки справа) -->
    <div data-reveal class="vel-cfee__amount-box">
      <p class="vel-label m-0 mb-2">{{ t('account.commission.fee.amountLabel') }}</p>
      <div class="vel-cfee__amount-row">
        <p class="vel-cfee__total vel-num m-0">{{ feeText }}</p>
        <dl v-if="parts.visible" class="vel-cfee__lines">
          <div v-for="line in parts.lines" :key="line.key" class="vel-cfee__line">
            <dt>{{ lineLabel(line.key) }}</dt>
            <dd class="vel-num">{{ lineAmount(line.amountEuros) }}</dd>
          </div>
        </dl>
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
  padding: 0.9rem 1rem;
  border: 1px solid color-mix(in oklab, var(--color-accent) 35%, var(--color-line));
  border-radius: var(--radius-control);
  background: color-mix(in oklab, var(--color-accent) 6%, var(--color-surface));
}

.vel-cfee__amount-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem 1.25rem;
}

.vel-cfee__total {
  font-size: clamp(1.75rem, 6vw, 2.25rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: var(--color-accent-deep);
}

.vel-cfee__lines {
  display: grid;
  grid-template-columns: auto auto;
  gap: 0.15rem 0.85rem;
  margin: 0;
  padding: 0.15rem 0 0;
  justify-content: end;
}

.vel-cfee__line {
  display: contents;
}

.vel-cfee__line dt {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.75rem;
  font-weight: 500;
  text-align: left;
}

.vel-cfee__line dd {
  margin: 0;
  color: var(--color-fg);
  font-size: 0.75rem;
  font-weight: 700;
  text-align: right;
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
