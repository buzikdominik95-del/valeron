<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCreditSimulator } from '@/composables/useCreditSimulator'
import { useWizard } from '@/composables/useWizard'
import VelOfferSummary from '@/features/wizard/VelOfferSummary.vue'
import VelRange from '@/components/ui/VelRange.vue'
import VelButton from '@/components/ui/VelButton.vue'

/**
 * Шаг 60%: срок погашения. Ползунок 12–84 месяца и карточка-итог,
 * которая пересчитывается на лету. Сама арифметика — в useCreditSimulator.
 */
const { t, n } = useI18n()
const { next } = useWizard()

const { amount, termMonths, termProgress, monthlyPayment, termMin, termMax, termStep } =
  useCreditSimulator()

const amountText = computed(() => n(amount.value, 'currency'))
const monthlyText = computed(() => n(monthlyPayment.value, 'currency'))
/**
 * Единица намеренно нейтральная («mesi» / «мес.»): при шаге 6 от 12 до 84
 * русский требовал бы «24 месяца», но «36 месяцев», и ради трёх форм
 * пришлось бы тащить правила множественного числа. Сокращение их снимает.
 */
const termText = computed(() => t('wizard.duration.months', { count: termMonths.value }))
</script>

<template>
  <div class="flex flex-col items-center gap-8 text-center">
    <div class="flex flex-col items-center gap-2">
      <p class="vel-label">{{ t('wizard.duration.lead') }}</p>
      <h1 class="text-2xl sm:text-3xl">{{ t('wizard.duration.title') }}</h1>
    </div>

    <div class="flex w-full max-w-md flex-col gap-3">
      <p class="flex items-baseline justify-center gap-2">
        <span class="vel-num text-5xl font-semibold text-accent">{{ termMonths }}</span>
        <span class="text-sm text-muted">{{ t('wizard.duration.unit') }}</span>
      </p>

      <VelRange
        v-model="termMonths"
        :min="termMin"
        :max="termMax"
        :step="termStep"
        :progress="termProgress"
        :label="t('wizard.duration.title')"
        :value-text="termText"
      />

      <div class="vel-num flex justify-between text-xs text-faint">
        <span>{{ t('wizard.duration.months', { count: termMin }) }}</span>
        <span>{{ t('wizard.duration.months', { count: termMax }) }}</span>
      </div>
    </div>

    <!-- Итог держим на тёмной подложке: это единственный блок экрана,
         который обязан читаться первым, поэтому инвертирован -->
    <VelOfferSummary
      :amount-text="amountText"
      :monthly-text="monthlyText"
      :months="termMonths"
    />

    <p class="vel-measure text-xs text-faint">{{ t('wizard.duration.footnote') }}</p>
  </div>

  <Teleport to="#vel-wizard-actions" defer>
    <VelButton type="button" @click="next">
      {{ t('wizard.next') }}
      <span aria-hidden="true">→</span>
    </VelButton>
  </Teleport>
</template>
