<script setup lang="ts">
import { computed, useId } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import { useCreditSimulator } from '@/composables/useCreditSimulator'
import { useSimulatorStore } from '@/stores/simulator.store'

/**
 * «Dati personali» — список определений: подпись поля и его значение.
 *
 * ИМЕННО dl, а не таблица и не пара абзацев: это шесть пар «название —
 * значение», и в разметке это описано ровно одним элементом. Скринридер
 * объявляет список из шести пунктов и читает пары связанно, тогда как из
 * <p>Cognome</p><p>Rossi</p> связь между строками не следует никак.
 *
 * ОТКУДА ЗНАЧЕНИЯ. Ничего своего компонент не придумывает и не считает:
 *   имя, фамилия и почта — useAccount().client: там же лежит правило
 *     подстановки (что человек ввёл сам, что пришло из профиля), и второй
 *     раз описывать его здесь нельзя — разъедется с карточкой клиента;
 *   сумма — useCreditSimulator(): он нормализует значение из localStorage,
 *     поэтому в кабинете не всплывёт «NaN €» после правки хранилища руками;
 *   тип и номер документа — simulator.store: их спрашивает шаг «личные данные»
 *     мастера, и кабинет показывает ровно то, что человек там ввёл.
 *
 * Пустое поле показывается прочерком. Прочерк — не текст, а типографика,
 * поэтому в словаре его нет; для скринридера рядом лежит настоящая строка
 * «не указано», иначе он либо промолчит, либо прочитает «тире».
 */
const { t, n, te } = useI18n()

const { client } = useAccount()
const { amount } = useCreditSimulator()
const { docType, docNumber } = storeToRefs(useSimulatorStore())

const titleId = `vel-personal-data-${useId()}`

/** Знак пустого значения. Одинаков в любой локали — это не перевод. */
const EMPTY_DASH = '—'

interface DataRow {
  key: string
  label: string
  /** Пустая строка означает «нет значения» — на её месте встанет прочерк. */
  value: string
  /** Значение из цифр: ведём табличными, чтобы столбец не дрожал. */
  numeric?: boolean
}

/**
 * Подпись типа документа берётся из словаря мастера — там она уже есть, и
 * второй набор названий документов означал бы два разных «Passaporto».
 *
 * te() страхует от ключа, которого нет: в localStorage лежит значение с прошлой
 * выкладки (мастер переносит такие на шаге личных данных, но до него человек
 * мог и не дойти), а t() напечатал бы на экране сам ключ.
 */
const docTypeLabel = computed(() => {
  const stored = docType.value.trim()
  if (stored === '') return ''

  const key = `wizard.identity.docTypes.${stored}`
  return te(key) ? t(key) : ''
})

const rows = computed<DataRow[]>(() => [
  {
    key: 'surname',
    label: t('account.personalData.surname'),
    value: client.value.lastName,
  },
  {
    key: 'name',
    label: t('account.personalData.name'),
    value: client.value.firstName,
  },
  {
    key: 'email',
    label: t('account.personalData.email'),
    value: client.value.email,
  },
  {
    key: 'amount',
    label: t('account.personalData.amount'),
    value: n(amount.value, 'currency'),
    numeric: true,
  },
  {
    key: 'docType',
    label: t('account.personalData.docType'),
    value: docTypeLabel.value,
  },
  {
    key: 'docNumber',
    label: t('account.personalData.docNumber'),
    value: docNumber.value.trim(),
    numeric: true,
  },
])
</script>

<template>
  <section
    class="vel-personal rounded-panel border border-line bg-surface p-5 sm:p-6"
    :aria-labelledby="titleId"
  >
    <h2 :id="titleId" class="text-lg sm:text-xl">{{ t('account.personalData.title') }}</h2>

    <dl class="vel-data">
      <!-- Пара обёрнута в div: по HTML это законный потомок dl, и без обёртки
           границу между парами пришлось бы рисовать то на dt, то на dd. -->
      <div v-for="row in rows" :key="row.key" class="vel-data__row">
        <dt class="vel-label">{{ row.label }}</dt>

        <dd v-if="row.value !== ''" class="vel-data__value" :class="{ 'vel-num': row.numeric }">
          {{ row.value }}
        </dd>

        <dd v-else class="vel-data__value vel-data__value--empty">
          <span aria-hidden="true">{{ EMPTY_DASH }}</span>
          <span class="sr-only">{{ t('account.personalData.notProvided') }}</span>
        </dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.vel-data {
  margin: 1.25rem 0 0;
}

.vel-data__row {
  display: grid;
  gap: 0.2rem 1.5rem;
  padding-block: 0.7rem;
}

/* Границу ставит вторая и каждая следующая пара: у первой её быть не должно —
   над ней и так заголовок раздела. */
.vel-data__row + .vel-data__row {
  border-block-start: 1px solid var(--color-line);
}

.vel-data__value {
  margin: 0;
  color: var(--color-fg);
  font-size: 0.95rem;
  /* Длинная почта на узком экране обязана переноситься, а не расширять
     страницу: пробелов внутри адреса нет, и обычный перенос по словам его
     не тронет. */
  overflow-wrap: anywhere;
}

.vel-data__value--empty {
  color: var(--color-faint);
}

/*
  Две колонки — по ширине САМОГО БЛОКА, а не окна: @container, а не @media.
  Список живёт в боковой колонке кабинета (336px на большом экране), и запрос
  к окну развернул бы его там в две колонки как раз тогда, когда места нет:
  замерено — подписи 176px против 110px на значение, «ЗАПРОШЕННАЯ СУММА»
  в три строки. Теперь решает то, что важно на самом деле: сколько места
  досталось списку.
*/
.vel-personal {
  container: vel-personal / inline-size;
}

@container vel-personal (min-width: 26rem) {
  .vel-data__row {
    grid-template-columns: minmax(0, 11rem) minmax(0, 1fr);
    align-items: baseline;
  }
}
</style>
