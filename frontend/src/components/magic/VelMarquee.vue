<script setup lang="ts">
import { ref } from 'vue'
import VelMarqueePause from '@/components/magic/VelMarqueePause.vue'
import { useMarquee } from '@/composables/useMarquee'

/**
 * Порт Magic UI Marquee на Vue без motion и без Tailwind-утилит animate-marquee:
 * в проекте таких утилит нет, поэтому лента едет нативным @keyframes отсюда.
 *
 * Устройство ровно как в оригинале: копии слота лежат в одном flex-ряду с общим
 * зазором, и каждая копия непрерывно уезжает на свою ширину плюс этот зазор.
 * За период копия N встаёт ровно туда, где была копия N-1, — шва не видно.
 *
 * Что добавлено против оригинала:
 * · копии, кроме первой, скрыты от скринридера (aria-hidden) и выключены из
 *   обхода клавиатурой (inert) — иначе содержимое читалось бы repeat раз подряд;
 * · края гасит маска — лента втекает и вытекает, а не обрубается по границе;
 * · при prefers-reduced-motion движения нет вовсе, копий тоже: остаётся один
 *   статичный ряд, который переносится по строкам (см. .vel-marquee--static);
 * · кнопка паузы для клавиатуры — WCAG 2.2.2, подробности у VelMarqueePause.
 *
 * Сколько копий рисовать, какие модификаторы висят на корне и с каким периодом
 * едет трек, решает @/composables/useMarquee — здесь остались разметка и стиль.
 *
 * Публичный контракт стиля: переменная --vel-marquee-gap задаёт расстояние между
 * копиями. Содержимое слота может взять её же для своих внутренних промежутков,
 * тогда шаг на стыке лент совпадёт с шагом внутри копии.
 */
interface Props {
  /** Период одного оборота ленты. Скорость зависит от ширины содержимого. */
  durationMs?: number
  /** Ехать вправо, а не влево */
  reverse?: boolean
  /** Останавливать ленту под курсором */
  pauseOnHover?: boolean
  /** Сколько раз повторить слот. Копий должно хватать, чтобы перекрыть экран. */
  repeat?: number
}

const props = withDefaults(defineProps<Props>(), {
  durationMs: 40000,
  reverse: false,
  pauseOnHover: true,
  repeat: 4,
})

const root = ref<HTMLElement | null>(null)

const { animated, paused, copies, rootClass } = useMarquee(root, props)
</script>

<template>
  <div ref="root" class="vel-marquee" :class="rootClass">
    <!--
      Движущийся текст обязан иметь механизм остановки (WCAG 2.2.2): наведение
      закрывает только мышь, а системная настройка — только тех, кто её включил.
      Кнопка скрыта, пока в неё не пришли с клавиатуры, — тот же приём, что у
      ссылки «к содержимому» в App.vue: для глаза ничего не меняется, у Tab
      появляется управление. Без анимации останавливать нечего, и кнопки нет.
    -->
    <VelMarqueePause v-if="animated" :paused="paused" @toggle="paused = !paused" />

    <div class="vel-marquee__viewport">
      <!--
        inert рядом с aria-hidden не дублирует его, а закрывает дыру: aria-hidden
        убирает копию из дерева доступности, но её ссылки и кнопки остались бы
        в обходе Tab, и фокус уходил бы в невидимый для скринридера узел.
      -->
      <div
        v-for="copy in copies"
        :key="copy"
        class="vel-marquee__track"
        :aria-hidden="copy > 1 ? 'true' : undefined"
        :inert="copy > 1"
      >
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
  Колонка, а не относительный бокс с абсолютной кнопкой поверх ленты.

  Замер на 375: кнопка занимала 20…157 по горизонтали и 4515…4545 по
  вертикали, а сам ряд имён — 20…1896 и 4516…4544. То есть кнопка лежала
  ровно на именах: растушёвка края съедает 9% ширины (около 30px), а кнопка
  шириной 137px — под ней проходил читаемый текст. На 1280 то же самое,
  просто заметно меньше.

  Теперь кнопка стоит своей строкой над лентой и ничего не перекрывает
  ни на какой ширине. align-items: flex-start держит её по содержимому,
  иначе flex растянул бы её на всю строку.
*/
.vel-marquee {
  /* Публичная переменная — см. шапку компонента */
  --vel-marquee-gap: 3rem;
  --vel-marquee-duration: 40000ms;
  /* Ширина растушёвки на каждом краю */
  --vel-marquee-fade: 9%;

  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  position: relative;
}

.vel-marquee__viewport {
  /* Лента обязана занимать всю ширину: колонка выше прижала бы её
     к содержимому вслед за кнопкой. */
  align-self: stretch;
  display: flex;
  gap: var(--vel-marquee-gap);
  overflow: hidden;
  /* Воздух сверху и снизу: обрезка по overflow иначе съедала бы выносные
     элементы букв и кольцо фокуса у содержимого слота. */
  padding-block: 0.5rem;
}

/* Маска отдельным правилом и только на едущей ленте: у статичного ряда
   гасить нечего, а на многострочном переносе градиент срезал бы края строк.
   black здесь не цвет из палитры, а трафарет — маску читают по альфе,
   и слой обязан быть непрозрачным (тот же приём в VelBorderBeam.vue). */
.vel-marquee--run .vel-marquee__viewport {
  -webkit-mask-image: linear-gradient(
    to right,
    transparent,
    black var(--vel-marquee-fade),
    black calc(100% - var(--vel-marquee-fade)),
    transparent
  );
  mask-image: linear-gradient(
    to right,
    transparent,
    black var(--vel-marquee-fade),
    black calc(100% - var(--vel-marquee-fade)),
    transparent
  );
}

.vel-marquee__track {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-around;
  gap: var(--vel-marquee-gap);
}

.vel-marquee--run .vel-marquee__track {
  animation: vel-marquee-run var(--vel-marquee-duration) linear infinite;
}

/*
  Сдвиг ровно на ширину копии ПЛЮС зазор между копиями: 100% здесь — своя
  ширина трека, а зазор добавляет flex-gap контейнера. Без слагаемого с gap
  лента на каждом обороте дёргалась бы назад на величину этого зазора.
*/
@keyframes vel-marquee-run {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(calc(-100% - var(--vel-marquee-gap)));
  }
}

.vel-marquee--reverse .vel-marquee__track {
  animation-direction: reverse;
}

/* Пауза по кнопке и при фокусе внутри ленты. Фокус ловим на viewport, а не на
   корне: иначе лента вставала бы от фокуса на самой кнопке паузы и «залипала»
   при обычном проходе Tab. */
.vel-marquee--paused .vel-marquee__track,
.vel-marquee__viewport:focus-within .vel-marquee__track {
  animation-play-state: paused;
}

/* Только там, где курсор настоящий: на тач-экранах :hover прилипает после
   тапа, и лента осталась бы стоять до перезагрузки страницы. */
@media (hover: hover) {
  .vel-marquee--hover:hover .vel-marquee__track {
    animation-play-state: paused;
  }
}

/*
  Статичный режим. Ряд обязан не только замереть, но и уместиться: одна копия
  шире экрана, и при overflow: hidden часть содержимого стала бы недоступна
  вовсе — ни глазами, ни прокруткой. Поэтому трек занимает всю ширину и
  переносится по строкам, а перенос внутри самой копии обеспечивает слот.
*/
.vel-marquee--static .vel-marquee__track {
  flex: 1 1 100%;
  flex-wrap: wrap;
  justify-content: center;
  animation: none;
}

@media (prefers-reduced-motion: reduce) {
  /*
    Дубль страховки на случай, если разметка уже отрисована как едущая, а
    настройка изменилась в этот же кадр. Глобального сброса из main.css мало:
    он правит длительность, но оставляет бесконечное повторение.
  */
  .vel-marquee__track {
    animation: none;
  }
}

@media print {
  /* На бумаге лента не едет: печатаем один ряд, дубликаты не нужны */
  .vel-marquee__track {
    animation: none;
  }

  .vel-marquee__track[inert] {
    display: none;
  }
}
</style>
