<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * Мелкий шрифт листа договора: пункты условий и юридическая сноска под ними.
 *
 * Отдельным файлом от VelContractSheet: каркас листа отвечает за шапку,
 * заголовок, дату с номером и рамку страницы, а здесь лежит текст, который
 * правят словарём, а не разметкой. Порог тот же, что у остальных частей листа:
 * файл, который не читают целиком, начинают править вслепую.
 *
 * Классы остались с приставкой vel-csheet__: это по-прежнему части одного
 * листа, и переименование их развело бы разметку с тем, что видно на экране.
 */
const props = defineProps<{
  /** Срок в месяцах — подстановка {count} в первый пункт. */
  months: number
}>()

const { t } = useI18n()

/*
 * Порядок пунктов договора. Списком, а не четырьмя повторами разметки: пятый
 * пункт добавляется одной строкой здесь и одной в словаре.
 *
 * Подстановка {count} нужна только первому пункту; остальным она безвредна —
 * vue-i18n молча игнорирует лишние параметры.
 */
const CLAUSE_KEYS = ['repayment', 'early', 'withdrawal', 'data'] as const
</script>

<template>
  <section class="vel-csheet__clauses">
    <h3 class="vel-csheet__section-title">{{ t('contract.sheet.clausesTitle') }}</h3>
    <p v-for="key in CLAUSE_KEYS" :key="key" class="vel-csheet__clause">
      {{ t(`contract.sheet.clauses.${key}`, { count: props.months }) }}
    </p>
  </section>

  <!--
    ЮРИДИЧЕСКАЯ СНОСКА. Первая строка — ЗАГЛУШКА: настоящие
    регистрационные данные (наименование, адрес, номер в реестре, орган
    надзора) вписывает ВЛАДЕЛЕЦ ПРОДУКТА перед выкладкой. В образце
    владельца продукта здесь стояли надзор Банка Италии и номер в реестре
    финансовых посредников — переносить их нельзя: выдуманный номер
    лицензии в договоре недопустим. Развёрнутое объяснение лежит рядом
    с ключом в locales/sections/contract.ts.
  -->
  <div class="vel-csheet__legal">
    <p class="vel-csheet__legal-line">{{ t('contract.sheet.legalNote') }}</p>
    <p class="vel-csheet__legal-line">{{ t('contract.sheet.previewNote') }}</p>
  </div>
</template>

<style scoped>
.vel-csheet__clauses {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.vel-csheet__section-title {
  margin: 0;
  color: var(--color-accent-deep);
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.vel-csheet__clause {
  margin: 0;
  color: var(--color-fg);
  font-size: 0.74rem;
  line-height: 1.6;
}

.vel-csheet__legal {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.6rem 0.75rem;
  border-inline-start: 2px solid var(--color-line-strong);
  background-color: var(--color-ground);
}

.vel-csheet__legal-line {
  margin: 0;
  color: var(--color-faint);
  font-size: 0.65rem;
  line-height: 1.5;
}
</style>
