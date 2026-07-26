<script setup lang="ts">
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { PAYOUT_METHODS } from '@/api/account.api'
import type { PayoutMethod } from '@/api/account.api'
import VelAccountSign from '@/features/account/VelAccountSign.vue'

/**
 * Выбор способа получения денег: банковский перевод или карта.
 *
 * РАДИОКНОПКИ, А НЕ ПАРА КНОПОК. Это выбор одного из двух, и нативные radio
 * дают его бесплатно: стрелки внутри группы, один Tab-стоп на всю группу,
 * объявление «выбрано, 1 из 2». Двумя <button> всё это пришлось бы изображать
 * руками через aria-pressed, и клавиатура работала бы иначе, чем везде.
 * Роль radiogroup на обёртке нужна только затем, чтобы дать группе имя.
 *
 * Сам input лежит под .sr-only, видимую часть рисует соседний блок — тот же
 * приём, что в переключателе способа подписи (VelSignaturePad).
 *
 * Выбранное состояние помечено не только цветом: слева стоит индикатор с
 * залитым ядром. Цвет один признак состояния нести не вправе (WCAG 1.4.1).
 */
const model = defineModel<PayoutMethod>({ default: 'iban' })

const { t } = useI18n()

/** Общее имя группы: без него две такие группы на странице склеились бы в одну. */
const groupName = `vel-payout-method-${useId()}`

/** Знак способа. Отдельная таблица: 'iban' — про банк, значок про фронтон. */
const METHOD_SIGN: Record<PayoutMethod, 'bank' | 'card'> = {
  iban: 'bank',
  card: 'card',
}
</script>

<template>
  <div class="vel-methods" role="radiogroup" :aria-label="t('account.payout.dialog.methodLabel')">
    <label v-for="option in PAYOUT_METHODS" :key="option" class="vel-methods__item">
      <input v-model="model" class="sr-only" type="radio" :name="groupName" :value="option" />

      <span class="vel-methods__face">
        <span class="vel-methods__dot" aria-hidden="true"></span>
        <VelAccountSign :sign="METHOD_SIGN[option]" class="vel-methods__sign" />
        <span class="vel-methods__label">{{ t(`account.payout.dialog.methods.${option}`) }}</span>
      </span>
    </label>
  </div>
</template>

<style scoped>
.vel-methods {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.vel-methods__item {
  cursor: pointer;
}

.vel-methods__face {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-control);
  background-color: var(--color-ground);
  color: var(--color-muted);
  transition:
    border-color 150ms ease,
    background-color 150ms ease,
    color 150ms ease;
}

.vel-methods__item:hover .vel-methods__face {
  border-color: var(--color-accent);
}

/* Индикатор выбора: единственная круглая форма здесь — значение из токена,
   произвольных радиусов в проекте нет. */
.vel-methods__dot {
  position: relative;
  flex: 0 0 auto;
  width: 1.125rem;
  height: 1.125rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-round);
  background-color: var(--color-surface);
}

.vel-methods__sign {
  color: inherit;
}

.vel-methods__label {
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1.25;
}

/* Выбранный способ */
.vel-methods__item input:checked + .vel-methods__face {
  border-color: var(--color-accent);
  background-color: var(--color-raised);
  color: var(--color-accent-deep);
}

.vel-methods__item input:checked + .vel-methods__face .vel-methods__dot {
  border-color: var(--color-accent);
}

/* Залитое ядро — второй признак выбора помимо цвета: его видно и при
   принудительных цветах системы, где фон и рамку подменяет ОС. */
.vel-methods__item input:checked + .vel-methods__face .vel-methods__dot::after {
  content: '';
  position: absolute;
  inset: 0.25rem;
  border-radius: var(--radius-round);
  background-color: var(--color-accent);
}

/* Кольцо фокуса рисуем на видимой части: сам input скрыт под .sr-only,
   и браузеру нечего обводить. */
.vel-methods__item input:focus-visible + .vel-methods__face {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  /* Сброс из main.css сжимает длительность, но правило остаётся вторым
     источником движения — снимаем его целиком. */
  .vel-methods__face {
    transition: none;
  }
}
</style>
