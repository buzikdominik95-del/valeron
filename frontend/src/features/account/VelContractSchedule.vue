<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ContractScheduleRow } from '@/features/account/contract-data'

/**
 * Таблица плана погашения внутри листа договора.
 *
 * ПРОКРУТКА ЖИВЁТ ВНУТРИ СВОЕЙ РАМКИ. Шесть денежных колонок в 320 пикселей
 * не помещаются и помещаться не должны — таблица ездит вбок в собственном
 * контейнере, а страница при этом стоит на месте.
 *
 * Это место в проекте уже обходилось дорого (см. шапку VelTrackerBar.vue): ряд
 * с прокруткой распирал предка и утаскивал за собой весь документ, потому что
 * гибкий элемент по умолчанию не может стать уже своего содержимого. Отсюда
 * три условия, и все три обязательны:
 *   1. на скролл-контейнере — overflow-x: auto и position: relative
 *      (относительное позиционирование делает его точкой отсчёта и не даёт
 *      абсолютным потомкам «протечь» шириной в предка);
 *   2. min-inline-size: 0 на нём и на корне компонента — иначе минимальная
 *      ширина считается по содержимому и наружу выдавливается таблица целиком;
 *   3. собственная минимальная ширина стоит на ТАБЛИЦЕ, а не на контейнере:
 *      это ей нужно место под колонки, контейнер обязан оставаться по ширине
 *      родителя.
 * Проверяется автоматически: node scripts/audit-mobile.mjs, правило
 * horizontal-scroll.
 *
 * КОНТЕЙНЕР ФОКУСИРУЕМ (tabindex="0" + role="group"). Область, которую можно
 * прокрутить только мышью или пальцем, недоступна с клавиатуры: без фокуса
 * стрелки её не двигают. Роль и подпись нужны, чтобы скринридер объявил, что
 * область прокручивается, а не молча прочитал первые три колонки.
 */
interface Props {
  rows: ContractScheduleRow[]
  /** Строка итога: в поле date лежит готовая подпись «Totale (36 rate)». */
  totals: ContractScheduleRow
}

defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <section class="vel-cschedule">
    <h3 class="vel-cschedule__title">{{ t('contract.sheet.scheduleTitle') }}</h3>

    <div
      class="vel-cschedule__scroll"
      tabindex="0"
      role="group"
      :aria-label="t('contract.sheet.scrollHint')"
    >
      <table class="vel-cschedule__table">
        <thead>
          <tr>
            <th scope="col">{{ t('contract.sheet.columns.index') }}</th>
            <th scope="col">{{ t('contract.sheet.columns.date') }}</th>
            <th scope="col">{{ t('contract.sheet.columns.payment') }}</th>
            <th scope="col">{{ t('contract.sheet.columns.principal') }}</th>
            <th scope="col">{{ t('contract.sheet.columns.interest') }}</th>
            <th scope="col">{{ t('contract.sheet.columns.residual') }}</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="row in rows" :key="row.index">
            <td class="vel-num">{{ row.index }}</td>
            <td class="vel-num">{{ row.date }}</td>
            <td class="vel-num">{{ row.payment }}</td>
            <td class="vel-num">{{ row.principal }}</td>
            <td class="vel-num">{{ row.interest }}</td>
            <td class="vel-num">{{ row.residual }}</td>
          </tr>
        </tbody>

        <!-- Итог — именно tfoot: это сводка столбцов, и скринридер объявит её
             как подвал таблицы, а не как ещё один платёж. -->
        <tfoot>
          <tr>
            <th scope="row" colspan="2">{{ totals.date }}</th>
            <td class="vel-num">{{ totals.payment }}</td>
            <td class="vel-num">{{ totals.principal }}</td>
            <td class="vel-num">{{ totals.interest }}</td>
            <td class="vel-num">{{ totals.residual }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </section>
</template>

<style scoped>
.vel-cschedule {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  /* Ноль в минимуме — условие того, чтобы блок мог стать уже таблицы. */
  min-inline-size: 0;
}

.vel-cschedule__title {
  margin: 0;
  color: var(--color-accent-deep);
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.vel-cschedule__scroll {
  position: relative;
  overflow-x: auto;
  min-inline-size: 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  /* Прокрутка таблицы не должна доезжать до края и утягивать за собой всю
     страницу — жест останавливается на границе области. */
  overscroll-behavior-x: contain;
}

.vel-cschedule__table {
  /*
    Колонкам нужно место: минимум стоит на таблице, контейнер выше остаётся
    по ширине родителя и берёт разницу на себя прокруткой.

    34rem — не «на глаз»: замерено, что естественная ширина шести колонок на
    настольном экране укладывается в лист (584px при 584px внутри страницы),
    и завышенный минимум вешал бы прокрутку там, где всё и так помещается.
    На телефоне тот же минимум оставляет колонки читаемыми, а разницу
    честно берёт на себя прокрутка контейнера.
  */
  min-inline-size: 34rem;
  inline-size: 100%;
  border-collapse: collapse;
  font-size: 0.7rem;
}

.vel-cschedule__table th,
.vel-cschedule__table td {
  padding: 0.4rem 0.55rem;
  text-align: start;
  white-space: nowrap;
}

.vel-cschedule__table thead th {
  border-block-end: 1px solid var(--color-line-strong);
  background-color: var(--color-ground);
  color: var(--color-muted);
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.vel-cschedule__table tbody tr + tr td {
  border-block-start: 1px solid var(--color-line);
}

.vel-cschedule__table tbody td {
  color: var(--color-fg);
}

.vel-cschedule__table tfoot th,
.vel-cschedule__table tfoot td {
  border-block-start: 1px solid var(--color-line-strong);
  background-color: var(--color-ground);
  color: var(--color-accent-deep);
  font-weight: 600;
}
</style>
