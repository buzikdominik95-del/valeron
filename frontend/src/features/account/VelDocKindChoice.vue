<script setup lang="ts">
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { DOC_KINDS, docShotsKey } from '@/features/account/doc-kinds'
import type { DocKind } from '@/features/account/doc-kinds'
import VelDocIcon from '@/features/account/VelDocIcon.vue'

/**
 * Выбор вида удостоверения: паспорт, карта, права.
 *
 * РАДИОКНОПКИ, А НЕ ТРИ КНОПКИ. Это выбор одного из трёх, и нативные radio
 * дают его бесплатно: стрелки внутри группы, один Tab-стоп на всю группу,
 * объявление «выбрано, 2 из 3». Тремя <button> всё это пришлось бы изображать
 * руками через aria-checked, и клавиатура работала бы иначе, чем везде.
 * Обёртка — <fieldset> с <legend>: имя группы приходит из разметки, а не из
 * aria-label, и не разъезжается с видимой подписью.
 *
 * Сам input лежит под .sr-only — именно так, а НЕ display:none: скрытый
 * display-ом контрол выпадает из порядка табуляции целиком, и группа
 * перестаёт существовать для клавиатуры. Видимое состояние строки рисует
 * :has(:checked) по тому же input, поэтому источник состояния ровно один —
 * сам контрол, а не класс, который кто-то забудет поставить.
 *
 * Строки внутри <div>, а не прямо во flex-фильдсете: у <legend> собственный
 * режим отрисовки внутри fieldset, и во flex-контейнере браузеры кладут его
 * по-разному. Обёртка снимает вопрос целиком.
 */
const model = defineModel<DocKind | null>({ default: null })

const { t } = useI18n()

/** Общее имя группы: без него две такие карточки на странице склеились бы
    в одну группу и выбор в одной снимал бы выбор в другой. */
const groupName = `vel-doc-kind-${useId()}`
</script>

<template>
  <fieldset class="vel-dockind">
    <legend class="vel-label vel-dockind__legend">{{ t('account.docs.kindLegend') }}</legend>

    <div class="vel-dockind__rows">
      <label v-for="option in DOC_KINDS" :key="option" class="vel-dockind__row">
        <input v-model="model" class="sr-only" type="radio" :name="groupName" :value="option" />

        <span class="vel-dockind__mark" aria-hidden="true">
          <VelDocIcon :sign="option" />
        </span>

        <span class="vel-dockind__text">
          <span class="vel-dockind__name">{{ t(`account.docs.kinds.${option}`) }}</span>
          <span class="vel-dockind__shots">{{ t(`account.docs.${docShotsKey(option)}`) }}</span>
        </span>

        <!-- Кружок-галочка. Декор: состояние выбора уже несёт сам input, и
             объявлять его скринридеру второй раз незачем. -->
        <svg class="vel-dockind__tick" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="vel-dockind__tick-ring" cx="12" cy="12" r="9" />
          <path class="vel-dockind__tick-sign" d="M7.8 12.3 10.8 15.2 16.2 9" />
        </svg>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.vel-dockind {
  display: block;
  border: 0;
  margin: 0;
  padding: 0;
  min-inline-size: 0;
}

.vel-dockind__legend {
  padding: 0;
  margin-block-end: 0.5rem;
}

.vel-dockind__rows {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Цель нажатия — вся строка целиком, поэтому минимум 2.75rem задан ей,
   а не значку внутри. */
.vel-dockind__row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-block-size: 2.75rem;
  padding-inline: 0.75rem;
  padding-block: 0.625rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background-color: var(--color-surface);
  cursor: pointer;
  transition:
    border-color 150ms ease,
    background-color 150ms ease;
}

.vel-dockind__row:hover {
  border-color: var(--color-accent);
}

/* Круглая подложка знака. Круг здесь по прямой просьбе владельца продукта — значение
   берём из токена --radius-round, чтобы «круглое» не расползалось по файлам
   произвольными числами. */
.vel-dockind__mark {
  --vel-icon-size: 1.15rem;

  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  inline-size: 2.25rem;
  block-size: 2.25rem;
  border-radius: var(--radius-round);
  background-color: var(--color-raised);
  color: var(--color-accent-deep);
}

.vel-dockind__text {
  display: flex;
  min-inline-size: 0;
  flex: 1 1 auto;
  flex-direction: column;
}

.vel-dockind__name {
  color: var(--color-fg);
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.25;
}

.vel-dockind__shots {
  color: var(--color-muted);
  font-size: 0.75rem;
  line-height: 1.35;
}

.vel-dockind__tick {
  flex: 0 0 auto;
  inline-size: 1.375rem;
  block-size: 1.375rem;
  fill: none;
  stroke-width: 2;
  stroke-linecap: butt;
  stroke-linejoin: miter;
}

.vel-dockind__tick-ring {
  stroke: var(--color-line-strong);
}

/* Невыбранная строка: пустой контур, знака внутри нет. */
.vel-dockind__tick-sign {
  stroke: transparent;
}

/*
  Выбранная строка. Состояние читается по самому контролу через :has(:checked),
  а не по классу из скрипта: класс пришлось бы держать в согласии с input
  руками, и рассинхрон был бы виден только скринридеру.
*/
.vel-dockind__row:has(input:checked) {
  border-color: var(--color-accent);
  background-color: var(--color-raised);
}

.vel-dockind__row:has(input:checked) .vel-dockind__mark {
  background-color: var(--color-accent);
  color: var(--color-accent-ink);
}

/* Залитый кружок с галочкой — второй признак выбора помимо цвета рамки:
   форма видна и там, где синий от серого не отличают. */
.vel-dockind__row:has(input:checked) .vel-dockind__tick-ring {
  fill: var(--color-accent);
  stroke: var(--color-accent);
}

.vel-dockind__row:has(input:checked) .vel-dockind__tick-sign {
  stroke: var(--color-accent-ink);
}

/* Кольцо фокуса рисуем на видимой части: сам input скрыт под .sr-only,
   и браузеру нечего обводить. */
.vel-dockind__row:has(input:focus-visible) {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  /* Сброс из main.css сжимает длительность, но переход остаётся вторым
     источником движения — снимаем его целиком. */
  .vel-dockind__row {
    transition: none;
  }
}
</style>
