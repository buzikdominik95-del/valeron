<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ContractField } from '@/features/account/contract-data'

/**
 * Середина листа договора: реквизиты сторон и денежные условия.
 *
 * ПОЧЕМУ ОТДЕЛЬНЫМ КОМПОНЕНТОМ. Каркас листа (VelContractSheet) и без того
 * держит шапку, заголовок, оговорки и подписи; вместе с этим блоком он вышел
 * бы далеко за предел в 300 строк, после которого файл перестают читать
 * целиком и начинают править вслепую.
 *
 * ПОЛЯ — СПИСОК ОПРЕДЕЛЕНИЙ, а не абзацы: это пары «название — значение», и в
 * разметке они описываются ровно одним элементом. Из <p>Email</p><p>…</p> связь
 * между строками не следует никак.
 *
 * ПУСТОЕ ЗНАЧЕНИЕ ОСТАЁТСЯ ПУСТОЙ ЛИНИЕЙ. Подставить вместо не введённого
 * номера документа что-нибудь правдоподобное нельзя: это договор, а не макет.
 * Линия при этом сохраняет высоту строки (неразрывный пробел), иначе ряд
 * схлопывается и лист выглядит сломанным; для скринридера рядом лежит
 * настоящая строка «da completare».
 */
interface Props {
  fields: ContractField[]
  amountText: string
  monthlyText: string
  durationText: string
  rateText: string
  purposeText: string
}

defineProps<Props>()

const { t } = useI18n()

/** Держит высоту пустой линии. Не текст, а типографика — в словаре его нет. */
const BLANK = ' '
</script>

<template>
  <div class="vel-cterms">
    <h3 class="vel-cterms__title">{{ t('contract.sheet.partiesTitle') }}</h3>
    <p class="vel-cterms__body">{{ t('contract.sheet.partiesBody') }}</p>

    <dl class="vel-cterms__fields">
      <div v-for="field in fields" :key="field.key" class="vel-cterms__row">
        <dt class="vel-cterms__label">{{ field.label }}</dt>

        <dd v-if="field.value !== ''" class="vel-cterms__value">{{ field.value }}</dd>

        <dd v-else class="vel-cterms__value vel-cterms__value--empty">
          <span aria-hidden="true">{{ BLANK }}</span>
          <span class="sr-only">{{ t('contract.sheet.empty') }}</span>
        </dd>
      </div>
    </dl>

    <section class="vel-cterms__box">
      <h3 class="vel-cterms__title vel-cterms__title--box">
        {{ t('contract.sheet.termsTitle') }}
      </h3>

      <dl class="vel-cterms__grid">
        <div class="vel-cterms__cell">
          <dt class="vel-cterms__cell-label">{{ t('contract.sheet.terms.amount') }}</dt>
          <dd class="vel-num vel-cterms__cell-value">{{ amountText }}</dd>
        </div>

        <div class="vel-cterms__cell">
          <dt class="vel-cterms__cell-label">{{ t('contract.sheet.terms.monthly') }}</dt>
          <dd class="vel-num vel-cterms__cell-value">{{ monthlyText }}</dd>
        </div>

        <div class="vel-cterms__cell">
          <dt class="vel-cterms__cell-label">{{ t('contract.sheet.terms.duration') }}</dt>
          <dd class="vel-num vel-cterms__cell-value">{{ durationText }}</dd>
        </div>
      </dl>

      <p class="vel-cterms__rate">{{ t('contract.sheet.rateNote', { rate: rateText }) }}</p>
    </section>

    <p class="vel-cterms__purpose">
      {{ t('contract.sheet.purposeLine', { purpose: purposeText }) }}
    </p>
  </div>
</template>

<style scoped>
.vel-cterms {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-inline-size: 0;
}

.vel-cterms__title {
  margin: 0;
  color: var(--color-accent-deep);
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.vel-cterms__body {
  margin: 0;
  color: var(--color-fg);
  font-size: 0.78rem;
  line-height: 1.55;
}

.vel-cterms__fields {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin: 0.25rem 0 0;
}

.vel-cterms__row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.75rem;
  min-inline-size: 0;
}

.vel-cterms__label {
  flex: 0 0 auto;
  color: var(--color-muted);
  font-size: 0.72rem;
  line-height: 1.4;
}

/*
  Значение стоит на линии — так поле договора и выглядит на бумаге.
  flex: 1 1 8rem, а не auto: линия обязана дотягиваться до правого края,
  но на узком листе иметь право уехать под подпись, а не рвать ряд.
*/
.vel-cterms__value {
  flex: 1 1 8rem;
  margin: 0;
  min-inline-size: 0;
  border-block-end: 1px solid var(--color-line-strong);
  color: var(--color-fg);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.5;
  /* Длинная почта и IBAN обязаны переноситься, а не расширять лист. */
  overflow-wrap: anywhere;
}

.vel-cterms__value--empty {
  font-weight: 400;
}

.vel-cterms__box {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-block-start: 0.35rem;
  padding: 0.9rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-control);
  background-color: var(--color-ground);
}

.vel-cterms__title--box {
  font-size: 0.82rem;
}

/*
  Три колонки, пока они помещаются. auto-fit с минимумом в 8rem — не
  украшение: на 320px три денежные ячейки встали бы в столбик из обрывков,
  и лист поехал бы вбок. Здесь они сами складываются в одну колонку.
*/
.vel-cterms__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: 0.75rem;
  margin: 0;
}

.vel-cterms__cell {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-inline-size: 0;
}

.vel-cterms__cell-label {
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.vel-cterms__cell-value {
  margin: 0;
  color: var(--color-accent-deep);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.vel-cterms__rate {
  margin: 0;
  padding-block-start: 0.6rem;
  border-block-start: 1px solid var(--color-line);
  color: var(--color-muted);
  font-size: 0.72rem;
  line-height: 1.45;
}

.vel-cterms__purpose {
  margin: 0;
  color: var(--color-fg);
  font-size: 0.78rem;
  line-height: 1.5;
}
</style>
