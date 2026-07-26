<script setup lang="ts">
import { computed } from 'vue'
import { gsap } from 'gsap'
import { useGsapContext } from '@/composables/useGsapContext'
import {
  splitWords,
  WORD_DURATION,
  WORD_EASE,
  WORD_SHIFT,
  WORD_STEP,
} from '@/lib/split-words'
import { REVEAL_MOTION_OK, REVEAL_START } from '@/composables/useRevealStage'

/**
 * Заголовок секции: слова выезжают лесенкой, когда секция входит в кадр.
 *
 * ДОСТУПНОЕ ИМЯ НЕ РАССЫПАЕТСЯ. Разбитый текст лежит внутри одного
 * aria-hidden-контейнера, а на самом заголовке висит aria-label с полной
 * строкой. Скринридер читает «заголовок 2-го уровня, <вся строка>» — одной
 * фразой, без пауз между словами и без «списка из N элементов», который
 * некоторые движки объявляют, увидев цепочку inline-block. Полное правило
 * и причины — в шапке @/lib/split-words.ts, там же живёт сам разбор.
 * Скрытой копии текста нет намеренно: лишний узел попал бы и в поиск по
 * странице, и в машинный перевод.
 *
 * ПОЧЕМУ НЕ ЧЕРЕЗ VelReveal. Обёртка появления вела бы прозрачность всего
 * заголовка, а слова — свою: две анимации на одни и те же пиксели
 * перемножаются, и заголовок доезжает заметно позже соседей. Поэтому
 * компонент не помечает себя data-vel-reveal и не попадает в пачку сцены —
 * он появляется сам, но по ТОЙ ЖЕ черте REVEAL_START, что и всё вокруг.
 *
 * Тег корня задаётся через `as`: почти всегда это h2, но перелинковка внизу
 * страницы держит на заголовке ещё и id для aria-labelledby секции — атрибуты
 * приходят снаружи и попадают на корень сквозным наследованием.
 */
/* Без export: <script setup> не принимает ES-экспорты, а наружу тип и не нужен —
   строки заголовка описываются прямо в разметке зовущей секции. */
interface SplitLine {
  text: string
  /** Приглушённая или акцентная строка — вторая половина составного заголовка */
  tone?: 'muted' | 'accent'
}

interface Props {
  /**
   * Строки заголовка. Каждая — свой блок, то есть перенос между ними жёсткий.
   * Одна строка в массиве — обычный случай; две нужны там, где вторая половина
   * заголовка звучит тише первой и красится ролью.
   */
  lines: readonly SplitLine[]
  /** Тег корня: h2 у секций, h3 у подразделов */
  as?: string
}

const props = withDefaults(defineProps<Props>(), {
  as: 'h2',
})

/** Полный текст для доступного имени: строки соединяются пробелом. */
const plainText = computed(() => props.lines.map((line) => line.text).join(' '))

const splitLines = computed(() =>
  props.lines.map((line) => ({ words: splitWords(line.text), tone: line.tone })),
)

const root = useGsapContext(() => {
  const element = root.value
  if (!element) return

  /*
   * prefers-reduced-motion — штатным механизмом GSAP. При 'reduce' внутри
   * условия не создаётся ничего: ни скрытого состояния, ни ScrollTrigger, —
   * заголовок просто стоит на месте видимым. Смену настройки на ходу
   * matchMedia отследит сам, а уедет он по ctx.revert() вместе с контекстом.
   */
  gsap.matchMedia().add(REVEAL_MOTION_OK, () => {
    const words = element.querySelectorAll('.vel-split__word')
    if (words.length === 0) return

    /*
     * fromTo, а не from: у from со ScrollTrigger стартовые значения
     * перечитываются на каждом refresh() — а refresh здесь дёргает смена языка
     * (см. VelStage). Перечитав уже скрытое состояние, заголовок остался бы
     * невидимым навсегда. У fromTo обе точки записаны явно.
     *
     * immediateRender у fromTo включён по умолчанию, поэтому слова спрятаны
     * с первого кадра, а не мигают до срабатывания триггера.
     */
    gsap.fromTo(
      words,
      { opacity: 0, y: WORD_SHIFT },
      {
        opacity: 1,
        y: 0,
        duration: WORD_DURATION,
        ease: WORD_EASE,
        stagger: WORD_STEP,
        scrollTrigger: {
          trigger: element,
          start: REVEAL_START,
          toggleActions: 'play none none none',
        },
      },
    )
  })
})
</script>

<template>
  <component :is="as" ref="root" :aria-label="plainText">
    <!-- Разобранный текст читает только глаз: доступное имя даёт aria-label -->
    <span
      v-for="(line, lineIndex) in splitLines"
      :key="lineIndex"
      class="vel-split__line"
      :class="{ 'text-muted': line.tone === 'muted', 'text-accent': line.tone === 'accent' }"
      aria-hidden="true"
    >
      <!-- Пробел между словами выводится отдельным узлом: у inline-block
           хвостовой пробел внутри блока обрезается, и слова слиплись бы.
           Интерполяция, а не пробел в разметке: компилятор Vue схлопывает
           пробельные узлы между тегами. -->
      <template v-for="(word, wordIndex) in line.words" :key="wordIndex"
        ><span class="vel-split__word">{{ word }}</span
        >{{ ' ' }}</template
      >
    </span>
  </component>
</template>

<style scoped>
/* Строка — блок: она заменяет <br> и не даёт словам разных строк смешаться */
.vel-split__line {
  display: block;
}

/* Трансформации не действуют на строчные элементы, поэтому слово — inline-block.
   Перенос по словам при этом сохраняется: между ними обычные пробелы. */
.vel-split__word {
  display: inline-block;
}

@media print {
  /* На бумаге важен текст, а не очередь появления. Перебить инлайновые стили
     GSAP таблица стилей больше ничем не может — тот же приём в VelReveal. */
  .vel-split__word {
    opacity: 1 !important;
    transform: none !important;
  }
}
</style>
