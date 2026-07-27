<script setup lang="ts">
import { computed } from 'vue'
import { ACCOUNT_STEPS } from '@/stores/account.store'
import type { AccountStep, AccountStepStatus } from '@/stores/account.store'
import VelAccountIcon from '@/features/account/VelAccountIcon.vue'

/**
 * Один шаг в полосе: кружок и подпись под ним.
 *
 * ПОЧЕМУ КРУЖОК, А НЕ ЧИП С РАМКОЙ. Чипы с полной подписью в ряд из пяти
 * штук не помещаются в телефон никогда — их приходилось прокручивать вбок,
 * и часть пути человек не видел, пока не догадается потянуть полосу.
 * Кружок с сокращённой подписью занимает пятую часть ширины на любом экране.
 *
 * ПОДПИСЬ СОКРАЩЕНА ТОЛЬКО ДЛЯ ГЛАЗ. Полное название уходит в aria-label
 * ссылки, поэтому скринридер читает «Simulazione», а не «Симул точка».
 *
 * В КРУЖКЕ ЗНАК ШАГА, А НЕ ЕГО НОМЕР. На вопрос «который по счёту» и без
 * цифры отвечают положение кружка в ряду и строка «Passo 4 di 5» прямо над
 * полосой. А на вопрос «что там будет» не отвечало ничто: подпись урезана до
 * «Docum.», и узнать шаг можно было, только помня его номер наизусть.
 * Столбцы, щит, человек, стрелка загрузки и перо говорят это сразу.
 *
 * ЗНАК ВЫБИРАЕТ ПОРЯДКОВЫЙ НОМЕР, а не отдельный проп с идентификатором.
 * Порядок шагов задаёт ACCOUNT_STEPS, index — позиция в этом же списке, так
 * что второй источник тут не нужен: разойдясь, он показал бы под цифрой «4»
 * чужой знак, и полоса врала бы молча.
 *
 * НОМЕР ОСТАЛСЯ ГОЛОСОМ. Кружок целиком декоративен (aria-hidden), и цифра
 * из него не читалась вслух никогда — порядок скринридеру давал <ol> ряда.
 * Теперь номер назван прямо, строкой перед названием: позицию в списке
 * объявляет не всякий режим чтения, а «шаг 4» — единственное, чем кружок
 * связан со счётчиком над полосой. У шагов, которые можно открыть, имя
 * задаёт aria-label ссылки и перебивает содержимое — там порядок
 * по-прежнему несёт <ol>, и это верно: ссылка обязана называть цель.
 *
 * ТРИ СОСТОЯНИЯ РАЗЛИЧАЮТСЯ НЕ ТОЛЬКО ЦВЕТОМ. Пройденный — заливка и
 * галочка вместо знака, текущий — кольцо, пульс и жирная подпись,
 * предстоящий — тонкий контур и приглушённый знак. Иначе при дальтонизме
 * ряд превращается в пять одинаковых кружков (WCAG 1.4.1).
 *
 * ГАЛОЧКА ПРОЧЕРЧИВАЕТСЯ ПРИ ПОЯВЛЕНИИ и потому нарисована здесь, а не взята
 * из VelAccountIcon: анимация живёт на самом path, а до внутренностей
 * дочернего компонента scoped-стили не достают. Элемент монтируется ровно в
 * тот момент, когда шаг стал пройденным, — значит анимации достаточно
 * однократной, на CSS, без таймлайна, который пришлось бы держать живым.
 */
const props = defineProps<{
  index: number
  status: AccountStepStatus
  /** Короткая подпись под кружком — то, что видно. */
  short: string
  /** Полное название — то, что читает скринридер. */
  title: string
  statusLabel: string
  href: string | undefined
  goLabel: string
  canOpen: boolean
}>()

const emit = defineEmits<{ activate: [event: MouseEvent] }>()

/* Запасной вариант нужен из-за noUncheckedIndexedAccess: индекс приходит
   числом, и на пустой знак ряд бы не рассыпался, но первый шаг честнее. */
const stepId = computed<AccountStep>(() => ACCOUNT_STEPS[props.index] ?? ACCOUNT_STEPS[0])
</script>

<template>
  <component
    :is="canOpen ? 'a' : 'span'"
    class="vel-step"
    :class="`vel-step--${status}`"
    :href="canOpen ? (href ?? '?view=cabinet&tab=home') : undefined"
    :aria-current="status === 'current' ? 'step' : undefined"
    :aria-label="canOpen ? goLabel : undefined"
    @click="canOpen && emit('activate', $event)"
  >
    <span class="vel-step__mark" aria-hidden="true">
      <svg v-if="status === 'done'" class="vel-step__check" viewBox="0 0 24 24" fill="none">
        <path d="m6 12.5 4 4 8-9" stroke="currentColor" stroke-width="2.6" stroke-linecap="square" />
      </svg>
      <VelAccountIcon v-else :kind="stepId" />
    </span>

    <span class="vel-step__label" aria-hidden="true">{{ short }}</span>

    <!-- Номер, полное название и состояние — голосом: на экране их место
         занимают положение в ряду, сокращение и вид кружка -->
    <span class="sr-only">{{ index + 1 }}. {{ title }}. {{ statusLabel }}</span>
  </component>
</template>

<style scoped>
.vel-step {
  display: flex;
  /* Цель нажатия: кружок маленький, а попадают по всей ячейке. */
  min-block-size: 2.75rem;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding-block: 0.15rem;
  color: var(--color-muted);
  text-decoration: none;
}

a.vel-step {
  cursor: pointer;
}

/*
  Z-INDEX ЗДЕСЬ ОБЯЗАТЕЛЕН. Линия-соединитель нарисована псевдоэлементом
  ::after у ряда, а ::after — последний ребёнок в порядке отрисовки, то есть
  ложится ПОВЕРХ кружков. У пройденных шагов линия и заливка кружка одного
  цвета, поэтому подмену было видно только по результату: синяя полоса
  проходила ровно через середину белой галочки и стирала её — на экране
  оставалась «птичка» с оторванным хвостом. Кружок обязан быть выше линии.
*/
.vel-step__mark {
  /* Размер знака переменной, как во всех местах кабинета со знаками
     (VelStepRow в трекере заявки). Число одно на галочку и на знак шага:
     разъехавшись, они дали бы ряд кружков с разным весом рисунка. */
  --vel-icon-size: 0.95rem;

  position: relative;
  z-index: 1;
  display: inline-flex;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--color-line-strong);
  border-radius: var(--radius-round);
  /* Заливка непрозрачная: линия-соединитель проходит под кружками и без
     фона просвечивала бы сквозь них. */
  background-color: var(--color-surface);
  transition:
    border-color 200ms ease,
    background-color 200ms ease,
    color 200ms ease;
}

.vel-step__check {
  inline-size: var(--vel-icon-size);
  block-size: var(--vel-icon-size);
}

.vel-step__label {
  overflow: hidden;
  max-inline-size: 100%;
  font-size: 0.63rem;
  font-weight: 600;
  line-height: 1.15;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Пройденный: заливка и галочка. */
.vel-step--done {
  color: var(--color-accent-deep);
}

.vel-step--done .vel-step__mark {
  border-color: var(--color-accent);
  background-color: var(--color-accent);
  color: var(--color-accent-ink);
}

/*
  Галочка прочерчивается один раз — в кадре, когда шаг стал пройденным.
  Длина 30 взята с запасом: путь короче, лишний пунктир просто не виден.
*/
.vel-step--done .vel-step__check path {
  stroke-dasharray: 30;
  animation: vel-step-draw 420ms cubic-bezier(0.65, 0, 0.35, 1) both;
}

@keyframes vel-step-draw {
  from {
    stroke-dashoffset: 30;
  }

  to {
    stroke-dashoffset: 0;
  }
}

/* Текущий: кольцо вокруг кружка и жирная подпись. */
.vel-step--current {
  color: var(--color-accent-deep);
}

.vel-step--current .vel-step__mark {
  border-width: 2px;
  border-color: var(--color-accent);
  color: var(--color-accent-deep);
  /* Кольцо дышит: это единственный шаг, который сейчас чего-то ждёт от
     человека, и в ряду одинаковых кружков движение находит его быстрее
     цвета. Амплитуда мала намеренно — полоса висит в шапке постоянно. */
  animation: vel-step-pulse 2.4s ease-in-out infinite;
}

.vel-step--current .vel-step__label {
  font-weight: 700;
}

@keyframes vel-step-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-accent) 30%, transparent);
  }

  50% {
    box-shadow: 0 0 0 5px color-mix(in oklab, var(--color-accent) 0%, transparent);
  }
}

/* Предстоящий: приглушён, но знак читается — контраст faint к подложке 5.05
   при пороге 3:1 для смысловой графики (WCAG 1.4.11). */
.vel-step--upcoming .vel-step__mark {
  border-color: var(--color-line);
  color: var(--color-faint);
}

a.vel-step:hover .vel-step__mark {
  border-color: var(--color-accent);
}

a.vel-step:hover {
  color: var(--color-accent-deep);
}

.vel-step:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
  border-radius: var(--radius-control);
}

@media (min-width: 48rem) {
  .vel-step__mark {
    /* Кружок вырос — знак растёт вместе с ним в той же доле. */
    --vel-icon-size: 1.1rem;

    inline-size: 2rem;
    block-size: 2rem;
  }

  .vel-step__label {
    font-size: 0.72rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-step__mark {
    transition: none;
    animation: none;
  }

  .vel-step--done .vel-step__check path {
    animation: none;
  }
}
</style>
