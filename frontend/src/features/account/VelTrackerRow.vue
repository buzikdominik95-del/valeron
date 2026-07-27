<script setup lang="ts">
import type { TrackerStepItem } from '@/composables/useTrackerBar'
import type { AccountStep } from '@/stores/account.store'
import VelTrackerStep from '@/features/account/VelTrackerStep.vue'

/**
 * Ряд из пяти кружков с линией-соединителем — видимая часть полосы шагов.
 *
 * ВСЕ ПЯТЬ ШАГОВ ПОМЕЩАЮТСЯ В ЭКРАН — это главное требование, и всё
 * устройство ряда подчинено ему. Раньше здесь был ряд чипов с полными
 * подписями; в 320px он не помещался и прокручивался вбок, то есть путь к
 * деньгам был виден человеку не целиком, пока тот не догадается потянуть
 * полосу пальцем. Теперь ряд — сетка из пяти РАВНЫХ долей ширины
 * (repeat(5, 1fr)), подписи сокращены (short), и прокрутки нет ни на
 * одной ширине. Проверяется автоматически: scripts/audit-mobile.mjs.
 *
 * ЛИНИЯ-СОЕДИНИТЕЛЬ — ДВА ПСЕВДОЭЛЕМЕНТА СЕТКИ, а не отдельные отрезки между
 * ячейками. Отрезок в каждой ячейке пришлось бы гасить у крайних и считать
 * его длину от размера кружка; здесь дорожка и заливка — две линии от центра
 * первой ячейки до центра последней, то есть от 10% до 90% при пяти долях.
 * Формулы в CSS выведены из числа шагов, а не вписаны числами: шагов
 * однажды станет шесть.
 *
 * ОТДЕЛЬНЫМ ФАЙЛОМ, А НЕ КУСКОМ VelTrackerBar: ряд несёт собственную
 * геометрию (сетка долей, дорожка, луч) и больше половины всех правил полосы.
 * Классы при этом остались vel-track__… — это по-прежнему элементы блока
 * «полоса шагов», переезд чисто файловый, в DOM не поменялось ничего.
 *
 * ДОЛЮ ЗАЛИВКИ И ЧИСЛО ШАГОВ РЯД НЕ СЧИТАЕТ: --vel-track-progress и
 * --vel-track-count приходят наследованием с корня полосы (см. useTrackerBar).
 */
defineProps<{
  items: readonly TrackerStepItem[]
  /** Все шаги пройдены — луч по залитой дорожке гаснет, см. --beam ниже. */
  allDone: boolean
}>()

const emit = defineEmits<{
  activate: [event: MouseEvent, stepId: AccountStep, href: string | undefined]
}>()
</script>

<template>
  <ol class="vel-track__row" :class="{ 'vel-track__row--beam': !allDone }">
    <li
      v-for="item in items"
      :key="item.id"
      class="vel-track__cell"
      :data-current="item.status === 'current' ? 'true' : undefined"
    >
      <VelTrackerStep
        :index="item.index"
        :status="item.status"
        :short="item.short"
        :title="item.title"
        :status-label="item.statusLabel"
        :href="item.href"
        :go-label="item.goLabel"
        :can-open="item.canOpen"
        :call-to-action="item.callToAction"
        @activate="emit('activate', $event, item.id, item.href)"
      />
    </li>
  </ol>
</template>

<style scoped>
/*
  РЯД РАВНЫХ ДОЛЕЙ. Прокрутки нет и быть не должно: пять шагов обязаны
  помещаться целиком на любой ширине. minmax(0, 1fr) — не украшение: без
  нуля в минимуме доля не может стать уже своего содержимого, и длинная
  подпись снова распёрла бы ряд наружу.
*/
.vel-track__row {
  /* Центр кружка от верха ряда: половина его высоты. */
  --vel-track-line-y: 0.875rem;

  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--vel-track-count), minmax(0, 1fr));
  margin: 0;
  padding: 0;
  list-style: none;
}

/*
  Дорожка и заливка: две линии от центра первой доли до центра последней.
  При пяти долях это от 10% до 90%, то есть 80% ширины ряда — обе величины
  выведены из числа шагов, а не вписаны.
*/
.vel-track__row::before,
.vel-track__row::after {
  content: '';
  position: absolute;
  inset-block-start: var(--vel-track-line-y);
  inset-inline-start: calc(50% / var(--vel-track-count));
  block-size: 2px;
  border-radius: var(--radius-round);
}

.vel-track__row::before {
  inline-size: calc(100% - 100% / var(--vel-track-count));
  background-color: var(--color-track);
}

/*
  ЗАЛИТАЯ ЧАСТЬ ДОРОЖКИ И БЕГУЩИЙ ПО НЕЙ ЛУЧ.

  Луч — порт Magic UI Animated Beam на наш стек: там поверх пути кладут второй
  путь, закрашенный подвижным градиентом «прозрачный → цвет → прозрачный», и
  двигают его координаты. У нас отрезок прямой и горизонтальный, поэтому
  второго пути не нужно: тот же градиент едет фоном по уже залитой линии.
  Кривая времени взята оттуда же — easeOutExpo (0.16, 1, 0.3, 1): луч
  выстреливает и мягко гасит ход, а не ползёт равномерно.

  ЗАЧЕМ ОН ЗДЕСЬ. Полоса шагов висит в шапке постоянно и статична: цифры
  «3 / 5» меняются мгновенно и остаются незамеченными. Пробегающий по
  пройденному пути луч показывает, что дело движется, не требуя от человека
  ничего заметить.

  ПАУЗА МЕЖДУ ПРОБЕГАМИ ВТРОЕ ДЛИННЕЕ САМОГО ПРОБЕГА. Непрерывное движение в
  шапке превращается в мельтешение, от которого на длинной странице устают.

  ПОСЛЕ ПОСЛЕДНЕГО ШАГА ЛУЧ ГАСНЕТ (класс --beam снимается): двигаться
  больше некуда, и бесконечная анимация «всё готово» — это шум.
*/
.vel-track__row::after {
  inline-size: calc((100% - 100% / var(--vel-track-count)) * var(--vel-track-progress, 0));
  background-color: var(--color-accent);
  /* Линия дотягивается до нового кружка, когда шаг закрыт: это единственное
     место, где виден сам факт продвижения. */
  transition: inline-size 700ms cubic-bezier(0.22, 1, 0.36, 1);
}

.vel-track__row--beam::after {
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in oklab, var(--color-accent-ink) 85%, transparent) 32%,
    transparent 64%
  );
  background-repeat: no-repeat;
  /* Луч вдвое короче отрезка: так видно, что это блик, а не вторая заливка. */
  background-size: 50% 100%;
  animation: vel-track-beam 2.6s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}

@keyframes vel-track-beam {
  0% {
    background-position: -60% 0;
  }

  /* Треть периода — пробег, остальное пауза: конечная позиция удерживается
     до конца цикла, поэтому вторая ключевая точка совпадает с последней. */
  32%,
  100% {
    background-position: 160% 0;
  }
}

.vel-track__cell {
  min-inline-size: 0;
}

/*
  ==================== СЖАТЫЙ ВИД ====================

  Сжатие включает шапка (класс --tight на корне полосы, см. VelTrackerBar):
  кружки мельчают, подписи уходят, линия поднимается к их новым центрам.

  Селекторы начинаются с корня полосы и идут через сам ряд: у scoped-стилей
  метка достаётся ПОСЛЕДНЕМУ элементу цепочки, и «.vel-track--tight .vel-step»
  указывало бы на чужие узлы. Через .vel-track__row метка садится на корень
  этого файла, а :deep() дотягивается уже до внутренностей кружка.
*/
.vel-track--tight .vel-track__row {
  --vel-track-line-y: 0.6rem;
}

/* Кружки мельчают, подписи уходят: в просвете шапки на подпись места нет,
   а порядок и состояние кружок несёт сам. */
.vel-track--tight .vel-track__row :deep(.vel-step__mark) {
  --vel-icon-size: 0.7rem;

  inline-size: 1.2rem;
  block-size: 1.2rem;
  border-width: 1.5px;
}

.vel-track--tight .vel-track__row :deep(.vel-step__label) {
  display: none;
}

.vel-track--tight .vel-track__row :deep(.vel-step) {
  min-block-size: 1.5rem;
  gap: 0;
  padding-block: 0;
}

/* Пульс текущего шага в сжатом виде гасим: полоса теперь в одной строке с
   логотипом и аватаром, и дышащее кольцо там читается как неисправность. */
.vel-track--tight .vel-track__row :deep(.vel-step--current .vel-step__mark) {
  animation: none;
}

/*
  ТЕЛЕФОН, СЖАТЫЙ ВИД: ряд кружков схлопывается, а прогресс уходит тонкой
  линией под строку шапки (VelTrackerMini).

  На телефоне сжатая полоса ОСТАЁТСЯ В ПОТОКЕ и остаётся во всю ширину —
  просто становится тонкой линией под строкой шапки.

  Почему не absolute и не display: none, хотя так короче. Ни то, ни другое
  не анимируется: элемент либо есть, либо нет, и шапка схлопывалась рывком
  в один кадр. В потоке же высота — обычное число, её браузер переводит
  плавно, и вся шапка сжимается одним движением.

  Почему не кружки. Посчитано по замерам на 390px: логотип 87 + блок
  пользователя 190 + поля 28 + зазоры 16 оставляют в строке около 69px, а
  самому короткому виду полосы нужно 85. На 360 и 320 не хватает и близко.
*/
@media (max-width: 47.999rem) {
  .vel-track--tight .vel-track__row {
    overflow: hidden;
    block-size: 0;
    opacity: 0;
  }
}

@media (min-width: 48rem) {
  .vel-track__row {
    --vel-track-line-y: 1rem;
  }

  .vel-track--tight .vel-track__row {
    --vel-track-line-y: 0.65rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-track__row::after {
    transition: none;
  }

  /* Луч убираем целиком, а не замедляем: он декоративен, и человек,
     попросивший систему убрать движение, ничего от него не теряет. */
  .vel-track__row--beam::after {
    background-image: none;
    animation: none;
  }
}
</style>
