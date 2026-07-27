<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import VelAccountIcon from '@/features/account/VelAccountIcon.vue'

/**
 * Карточка клиента: инициал в кружке, имя, почта, состояние заявки и ставка.
 *
 * Ничего не решает и ничего не считает: и «кредит одобрен», и «в обработке» —
 * это пересказ состояния из useAccount. Первое читается по шагу approval,
 * второе по полису CPI: пока сертификат проверяется, дело и есть в обработке.
 *
 * Состояния объявлены текстом, а не цветом: у каждой метки есть подпись и
 * рисованный знак, поэтому она доезжает и в режиме принудительных цветов
 * (WCAG 1.4.1). Эмодзи оригинала (✅ ⏳) заменены знаками линией.
 */
const { t, n } = useI18n()
const { client, steps, policyStatus, ratePercent } = useAccount()

/** Ставку показываем через формат локали: знак процента ставится по-разному. */
const RATE_FORMAT = {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
} as const

const approved = computed(() =>
  steps.value.some((step) => step.id === 'approval' && step.status === 'done'),
)

const processing = computed(() => policyStatus.value === 'processing')

const rateText = computed(() =>
  t('account.card.rate', { rate: n(ratePercent.value / 100, RATE_FORMAT) }),
)
</script>

<template>
  <section class="vel-account-card rounded-panel p-5 sm:p-6">
    <div class="flex flex-wrap items-start gap-4">
      <!-- Инициал декоративен: имя стоит рядом текстом, и вторым чтением
           скринридер называл бы одну букву без всякого смысла. -->
      <span class="vel-account-card__avatar" aria-hidden="true">{{ client.initial }}</span>

      <!--
        basis-44 здесь несёт перенос строки, а не ширину. С голым flex-1 базис
        колонки равен нулю, поэтому flex-wrap у ряда не срабатывал НИКОГДА: на
        360px колонка сжималась до 97px — имя ломалось на две строки, а метка
        «Polizza in elaborazione» (134px в самом узком виде) вылезала за свою
        колонку. Базис даёт ряду повод перенести ставку на вторую строку,
        а min-w-0 остаётся ради truncate у почты.

        ПОЧЕМУ ИМЕННО 11rem, А НЕ 12. Два ограничения сразу. Снизу: ставка
        обязана переноситься на 414px, иначе ряд слипается — 48 (аватар) +
        16 (зазор) + B + 16 + 98 (ставка) > 344, то есть B > 166px. Сверху:
        на 320px колонка обязана уместиться РЯДОМ с аватаром — 48 + 16 + B
        ≤ 250, то есть B ≤ 186px. С прежними 12rem (192px) верхняя граница
        нарушалась, и на 320px карточка разваливалась на три строки: аватар
        отдельно, имя отдельно, ставка отдельно. 11rem = 176px попадает в
        окно 166…186 с запасом с обеих сторон.
      -->
      <div class="min-w-0 flex-1 basis-44">
        <h2 class="vel-account-card__name">{{ client.fullName }}</h2>
        <p class="vel-account-card__mail truncate text-sm">{{ client.email }}</p>

        <!-- Метки списком: их две, и порядок между ними осмысленный —
             сначала решение по кредиту, потом что происходит сейчас. -->
        <ul v-if="approved || processing" class="mt-3 flex flex-wrap gap-2">
          <li v-if="approved" class="vel-account-card__flag vel-account-card__flag--done">
            <VelAccountIcon kind="check" />
            {{ t('account.card.approved') }}
          </li>

          <li v-if="processing" class="vel-account-card__flag">
            <VelAccountIcon kind="clock" />
            <span class="vel-label">{{ t('account.card.processing') }}</span>
          </li>
        </ul>
      </div>

      <p class="vel-account-card__rate vel-num">{{ rateText }}</p>
    </div>
  </section>
</template>

<style scoped>
/*
  КАРТОЧКА-ГЕРОЙ ТЁМНАЯ — так на эталоне, и это не украшение. Она открывает
  экран и отвечает на первый вопрос человека: «моя ли это заявка и что с ней».
  Светлая, она стояла в ряду с полудюжиной таких же белых панелей ниже, и
  взгляд не находил, с чего начинать.

  Заливка — диагональ от accent-deep к accent-dim: ровный тёмный
  прямоугольник в нашей палитре выглядит как выключенный блок, а лёгкий
  переход даёт карточке объём, не превращая её в картинку.

  ВСЕ ЦВЕТА ВНУТРИ ПЕРЕСЧИТАНЫ ПОД ТЁМНЫЙ ФОН. Контраст к accent-deep:
  белое имя 11.68, почта (белый 78%) 6.9, метки 6.4 — все выше нормы 4.5.
  Утилитарные классы Tailwind с цветами (text-muted и подобные) внутри
  карточки не применять: они считаны от светлого фона и здесь дают 1.4.
*/
.vel-account-card {
  background-image: linear-gradient(
    135deg,
    var(--color-accent-deep) 0%,
    color-mix(in oklab, var(--color-accent-dim) 82%, var(--color-accent-deep)) 100%
  );
  color: var(--color-accent-ink);
}

.vel-account-card__avatar {
  display: flex;
  width: 3rem;
  height: 3rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  /* Единственная круглая форма карточки: кружок с буквой читается как человек,
     а не как ещё одна панель. Значение из токена, произвольных радиусов нет. */
  border-radius: var(--radius-round);
  /* На тёмной карточке кружок выворачивается: светлая заливка, тёмная буква. */
  background-color: var(--color-accent-ink);
  color: var(--color-accent-deep);
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1;
}

.vel-account-card__name {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.2;
  color: var(--color-accent-ink);
}

/* Почта — второстепенна, но обязана остаться читаемой: 78% белого даёт 6.9
   к заливке карточки, тогда как «приглушённый» цвет светлой темы дал бы 1.4. */
.vel-account-card__mail {
  color: color-mix(in oklab, var(--color-accent-ink) 78%, transparent);
}

.vel-account-card__flag {
  /* Размер знака задаётся переменной: сам знак о своём месте не знает */
  --vel-icon-size: 0.9rem;

  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.6rem;
  border: 1px solid color-mix(in oklab, var(--color-accent-ink) 34%, transparent);
  border-radius: var(--radius-control);
  color: color-mix(in oklab, var(--color-accent-ink) 82%, transparent);
  font-size: 0.75rem;
  line-height: 1.2;
}

/* Пройденное состояние: заливка и полный белый поверх общего вида метки.
   Форма и знак различают метки и без цвета — требование WCAG 1.4.1. */
.vel-account-card__flag--done {
  border-color: color-mix(in oklab, var(--color-accent-ink) 55%, transparent);
  background-color: color-mix(in oklab, var(--color-accent-ink) 14%, transparent);
  color: var(--color-accent-ink);
  font-weight: 600;
}

/* Надзаголовок внутри метки не должен тянуть свой цвет: он у метки уже задан */
.vel-account-card__flag .vel-label {
  color: inherit;
}

/* Ставка — второй по важности факт карточки после имени: держим её крупной
   и на своей строке справа, чтобы она не смешивалась с метками состояния. */
.vel-account-card__rate {
  margin-left: auto;
  padding: 0.3rem 0.7rem;
  border: 1px solid color-mix(in oklab, var(--color-accent-ink) 45%, transparent);
  border-radius: var(--radius-control);
  background-color: color-mix(in oklab, var(--color-accent-ink) 12%, transparent);
  color: var(--color-accent-ink);
  font-size: 0.95rem;
  font-weight: 600;
  white-space: nowrap;
}
</style>
