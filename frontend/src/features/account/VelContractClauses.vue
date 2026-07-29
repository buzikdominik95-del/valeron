<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * Текст договора под таблицей ammortamento (из 22.txt):
 * oggetto → obblighi → procedura → clausole principali.
 * Правки — в locales/sections/contract.ts (sheet.clauses.*).
 *
 * props.months оставлен для совместимости с VelContractSheet; в новом тексте
 * подстановки {count} больше нет.
 */
defineProps<{
  months: number
}>()

const { t } = useI18n()

/**
 * Блоки в порядке 22.txt. items — ключи пунктов; lead — подзаголовок
 * («Obblighi del Mutuatario» / «Obblighi della Banca»).
 */
const CLAUSE_BLOCKS = [
  {
    titleKey: 'objectTitle',
    leadKey: null as string | null,
    items: ['object1'] as const,
  },
  {
    titleKey: 'rightsTitle',
    leadKey: 'borrowerLead',
    items: [
      'borrower1',
      'borrower2',
      'borrower3',
      'borrower4',
      'borrower5',
      'borrower6',
    ] as const,
  },
  {
    titleKey: null as string | null,
    leadKey: 'lenderLead',
    items: [
      'lender1',
      'lender2',
      'lender3',
      'lender4',
      'lender5',
      'lender6',
    ] as const,
  },
  {
    titleKey: 'procedureTitle',
    leadKey: null as string | null,
    items: ['procedure1', 'procedure2', 'procedure3', 'procedure4'] as const,
  },
  {
    titleKey: 'mainTitle',
    leadKey: null as string | null,
    items: ['main1', 'main2'] as const,
  },
] as const
</script>

<template>
  <section class="vel-csheet__clauses">
    <div
      v-for="(block, bi) in CLAUSE_BLOCKS"
      :key="bi"
      class="vel-csheet__clause-block"
    >
      <h3 v-if="block.titleKey" class="vel-csheet__section-title">
        {{ t(`contract.sheet.clauses.${block.titleKey}`) }}
      </h3>
      <p v-if="block.leadKey" class="vel-csheet__clause-lead">
        {{ t(`contract.sheet.clauses.${block.leadKey}`) }}
      </p>
      <p
        v-for="key in block.items"
        :key="key"
        class="vel-csheet__clause"
      >
        {{ t(`contract.sheet.clauses.${key}`) }}
      </p>
    </div>
  </section>

  <!--
    ЮРИДИЧЕСКАЯ СНОСКА. Первая строка — ЗАГЛУШКА: настоящие
    регистрационные данные вписывает ВЛАДЕЛЕЦ ПРОДУКТА перед выкладкой.
  -->
  <div class="vel-csheet__legal">

  </div>
</template>

<style scoped>
.vel-csheet__clauses {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.vel-csheet__clause-block {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.vel-csheet__section-title {
  margin: 0;
  color: var(--color-accent-deep);
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  text-transform: none;
}

.vel-csheet__clause-lead {
  margin: 0.15rem 0 0;
  color: var(--color-fg);
  font-size: 0.76rem;
  font-weight: 650;
  line-height: 1.45;
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
