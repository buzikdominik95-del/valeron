<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * Карточка-итог предложения: сумма, расчётный платёж и срок в трёх колонках.
 *
 * Числа приходят снаружи уже отформатированными строками — компонент не знает
 * ни про локаль денег, ни про арифметику кредита, и потому одинаково годится
 * и запрошенной сумме мастера, и любым другим условиям.
 * Срок — число: рядом с ним живёт своя подпись-единица, не часть значения.
 *
 * Подписи колонок компонент берёт сам: они описывают его собственные
 * колонки, и вызывающему шагу незачем их пересказывать.
 */
interface Props {
  /** Сумма, уже прогнанная через денежный формат локали. */
  amountText: string
  /** Ежемесячный платёж в том же формате; «/мес.» дорисовывает компонент. */
  monthlyText: string
  /** Срок в месяцах — печатается как есть, единица идёт подписью. */
  months: number
}

const props = defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <dl
    class="grid w-full grid-cols-1 gap-px overflow-hidden rounded-panel bg-accent-deep text-accent-ink sm:grid-cols-3"
  >
    <div class="flex flex-col gap-1 bg-accent-deep px-5 py-5">
      <dd class="vel-num text-xl font-semibold">{{ props.amountText }}</dd>
      <dt class="text-xs opacity-70">{{ t('wizard.duration.summaryAmount') }}</dt>
    </div>

    <div class="flex flex-col gap-1 bg-accent-deep px-5 py-5 sm:border-x sm:border-accent">
      <dd class="vel-num text-xl font-semibold">
        {{ props.monthlyText }}<span class="text-sm font-normal opacity-70">{{
          t('wizard.duration.perMonth')
        }}</span>
      </dd>
      <dt class="text-xs opacity-70">{{ t('wizard.duration.summaryMonthly') }}</dt>
    </div>

    <div class="flex flex-col gap-1 bg-accent-deep px-5 py-5">
      <dd class="vel-num text-xl font-semibold">{{ props.months }}</dd>
      <dt class="text-xs opacity-70">{{ t('wizard.duration.unit') }}</dt>
    </div>
  </dl>
</template>
