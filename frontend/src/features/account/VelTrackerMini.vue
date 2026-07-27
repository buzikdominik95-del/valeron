<script setup lang="ts">
/**
 * Короткая полоса со счётом — сжатый вид полосы шагов на телефоне.
 *
 * Пять кружков в просвет между логотипом и аватаром при 390px не помещаются —
 * там остаётся около 110px, и кружки слиплись бы с блоком пользователя.
 * Вместо них короткая полоса и счёт: «докуда дошли» она отвечает так же,
 * а места просит вчетверо меньше. Для скринридера это дубль полосы выше,
 * поэтому aria-hidden.
 *
 * ОТДЕЛЬНЫМ ФАЙЛОМ, потому что весь её смысл — в собственных стилях: разметка
 * из трёх узлов и почти сотня строк правил про маску, деления и поведение на
 * узком экране. В общем файле полосы они тонули между правилами ряда кружков.
 * Классы остались vel-track__… — переезд чисто файловый, в DOM не поменялось
 * ничего.
 *
 * Долю заливки и число шагов полоса не считает: --vel-track-progress и
 * --vel-track-count приходят наследованием с корня полосы (см. useTrackerBar).
 */
defineProps<{
  /** Сколько шагов пройдено — левое число счёта. */
  done: number
  /** Всего шагов — правое число счёта. */
  total: number
}>()
</script>

<template>
  <p class="vel-track__mini vel-num" aria-hidden="true">
    <span class="vel-track__mini-rail"><span class="vel-track__mini-fill"></span></span>
    <span class="vel-track__mini-count">{{ done }}/{{ total }}</span>
  </p>
</template>

<style scoped>
/*
  Короткая полоса со счётом — только в сжатом виде и только на узком экране.
  По умолчанию её нет вовсе: на широком экране в просвет шапки помещаются
  сами кружки, и дублировать их числом незачем.
*/
.vel-track__mini {
  display: none;
}

/*
  ТЕЛЕФОН, СЖАТЫЙ ВИД: прогресс уходит тонкой линией на нижний край шапки.

  Почему не кружки и даже не «полоска со счётом» в строке — посчитано по
  замерам на 390px: логотип 87 + блок пользователя 190 + поля 28 + зазоры 16
  оставляют полосе около 69px, а самому короткому её виду (полоска плюс
  «3/5») нужно 85. На 360 и 320 не хватает и близко. Втискивать нечего:
  строка занята, и любое «ужать ещё немного» кончится слипшимися контролами.

  Линия по нижнему краю не просит горизонтального места вовсе и работает на
  любой ширине.
*/
@media (max-width: 47.999rem) {
  .vel-track--tight .vel-track__mini {
    display: block;
    margin: 0;
  }

  /* Счёт словами тут не нужен: он есть в развёрнутом виде, а на линии в
     3px его негде поставить. Скринридеру он и так не читался (aria-hidden). */
  .vel-track--tight .vel-track__mini-count {
    display: none;
  }

  /*
    РАЗМЕТКА ПО ЭТАПАМ. Линия без делений отвечает только «примерно докуда»;
    с четырьмя просветами она отвечает «три из пяти» — ровно то же, что ряд
    кружков, только в 3px высоты. Просветы считаются из числа шагов, а не
    вписаны: шагов однажды станет шесть.

    Первый просвет отстоит на один шаг, дальше через шаг — отсюда сдвиг
    фона на минус половину просвета, иначе первое деление садится на самый
    край линии.
  */
  .vel-track--tight .vel-track__mini-rail {
    --vel-track-notch: 2px;

    display: block;
    overflow: hidden;
    inline-size: 100%;
    block-size: 3px;
    background-color: var(--color-track);
    -webkit-mask-image: repeating-linear-gradient(
      to right,
      #000 0,
      #000 calc(100% / var(--vel-track-count) - var(--vel-track-notch)),
      transparent calc(100% / var(--vel-track-count) - var(--vel-track-notch)),
      transparent calc(100% / var(--vel-track-count))
    );
    mask-image: repeating-linear-gradient(
      to right,
      #000 0,
      #000 calc(100% / var(--vel-track-count) - var(--vel-track-notch)),
      transparent calc(100% / var(--vel-track-count) - var(--vel-track-notch)),
      transparent calc(100% / var(--vel-track-count))
    );
  }

  .vel-track--tight .vel-track__mini-fill {
    display: block;
    inline-size: calc(100% * var(--vel-track-progress, 0));
    block-size: 100%;
    background-color: var(--color-accent);
    transition: inline-size 400ms ease;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-track__mini-fill {
    transition: none;
  }
}
</style>
