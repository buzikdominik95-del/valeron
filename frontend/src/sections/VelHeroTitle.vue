<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { gsap } from 'gsap'
import { splitWords, WORD_DURATION, WORD_EASE, WORD_SHIFT, WORD_STEP } from '@/lib/split-words'

/**
 * Заголовок первого экрана: три строки, слова выходят лесенкой при загрузке.
 *
 * Разбор, шаг лесенки и правило доступности — общие с заголовками секций
 * (@/components/ui/VelSplitHeading.vue) и живут в @/lib/split-words.ts.
 * Коротко: разобранная разметка целиком помечена aria-hidden, а <h1> получает
 * aria-label с полным текстом, поэтому скринридер читает «заголовок 1-го
 * уровня, Льготный кредит по ставке 3,8% для всех граждан Италии» одной
 * строкой, а лесенку видят только глаза.
 *
 * Своим файлом, а не вызовом VelSplitHeading: этот заголовок появляется при
 * загрузке, а не по въезду в кадр, — он и есть первый экран, ждать его нечему.
 *
 * Строку заголовка держим отдельным <span>: три ключа локали — это три строки,
 * и <br> между ними попал бы внутрь разбора. Средняя выделена акцентом.
 */
const { t } = useI18n()

interface TitleLine {
  words: string[]
  accent: boolean
}

const lines = computed<TitleLine[]>(() => [
  { words: splitWords(t('hero.titleLead')), accent: false },
  { words: splitWords(t('hero.titleRate')), accent: true },
  { words: splitWords(t('hero.titleTail')), accent: false },
])

/** Полный текст для доступного имени: строки соединяются пробелом. */
const plainTitle = computed(() =>
  [t('hero.titleLead'), t('hero.titleRate'), t('hero.titleTail')].join(' '),
)

const root = ref<HTMLElement | null>(null)
let ctx: gsap.Context | undefined

onMounted(() => {
  const element = root.value
  if (!element) return

  // Контекст со ссылкой на <h1>: селектор слова не уйдёт в соседние секции.
  ctx = gsap.context(() => {
    /* Штатный механизм GSAP под prefers-reduced-motion. При 'reduce' коллбек
       не выполняется вовсе — заголовок просто виден, никакого скрытого
       состояния в CSS для этого не заводится. */
    const media = gsap.matchMedia()

    media.add('(prefers-reduced-motion: no-preference)', () => {
      /* from, а не to: невидимое состояние ставит сама анимация в момент
         монтирования (до первой отрисовки), поэтому не бывает кадра, когда
         разметка есть, а скрипт до неё не дошёл — заголовок в этом случае
         остаётся просто видимым.
         autoAlpha = opacity + visibility: скрытое слово выпадает и из
         последовательности фокуса, пока не появится. */
      gsap.from('.vel-hero-title__word', {
        y: WORD_SHIFT,
        autoAlpha: 0,
        duration: WORD_DURATION,
        ease: WORD_EASE,
        stagger: WORD_STEP,
      })
    })
  }, element)
})

// Без revert() твины остались бы на отсоединённых узлах.
onUnmounted(() => ctx?.revert())
</script>

<template>
  <h1 ref="root" :aria-label="plainTitle" class="text-4xl sm:text-5xl lg:text-6xl">
    <!-- Разобранный текст читает только глаз: доступное имя даёт aria-label -->
    <span
      v-for="(line, lineIndex) in lines"
      :key="lineIndex"
      class="vel-hero-title__line"
      :class="{ 'text-accent': line.accent }"
      aria-hidden="true"
    >
      <!-- Пробел между словами выводится отдельным узлом: у inline-block
           хвостовой пробел внутри блока обрезается, и слова слиплись бы.
           Интерполяция, а не пробел в разметке: компилятор Vue схлопывает
           пробельные узлы между тегами. -->
      <template v-for="(word, wordIndex) in line.words" :key="wordIndex"
        ><span class="vel-hero-title__word">{{ word }}</span
        >{{ ' ' }}</template
      >
    </span>
  </h1>
</template>

<style scoped>
/* Строка — блок: она заменяет <br> и не даёт словам разных строк смешаться */
.vel-hero-title__line {
  display: block;
}

/* Трансформации не действуют на строчные элементы, поэтому слово — inline-block.
   Перенос по словам при этом сохраняется: между ними обычные пробелы. */
.vel-hero-title__word {
  display: inline-block;
}
</style>
