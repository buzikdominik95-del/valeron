<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useElementVisibility, usePreferredReducedMotion, useRafFn } from '@vueuse/core'

/**
 * Порт Magic UI Number Ticker без motion: счёт от 0 до value на requestAnimationFrame.
 *
 * Формат берёт Intl.NumberFormat с активной локалью. Это не украшательство:
 * итальянская локаль разделяет разряды точкой, русская — неразрывным пробелом,
 * и склеить их руками нельзя.
 *
 * СЧЁТ НАЧИНАЕТСЯ ПРИ ВЪЕЗДЕ В КАДР, а не при монтировании: показатели лендинга
 * стоят вторым экраном, и отсчёт, отработавший до того, как до них долистали,
 * — это просто число на странице. Наблюдателя даёт useElementVisibility
 * из VueUse: свой IntersectionObserver здесь заводить незачем, а снимать его
 * при размонтировании VueUse умеет сам.
 */
interface Props {
  value: number
  durationMs?: number
  decimals?: number
  /**
   * Хвост, который приклеен к числу: «+», «%», « €», « min».
   *
   * Он часть значения, а не соседний узел разметки: показатель «50» без плюса
   * и «22.000» без евро — это другие утверждения. Поэтому суффикс попадает
   * и в бегущий текст, и в строку для скринридера — теряться ему негде.
   */
  suffix?: string
}

const props = withDefaults(defineProps<Props>(), {
  durationMs: 1200,
  decimals: 0,
  suffix: '',
})

const { locale } = useI18n()

// 'reduce' — пользователь на уровне ОС попросил не двигать интерфейс.
const reducedMotion = usePreferredReducedMotion()
const isReduced = computed(() => reducedMotion.value === 'reduce')

// value приходит снаружи и однажды придёт NaN из недосчитанной ставки:
// без страховки счётчик залипнет на «NaN» до перемонтирования.
const target = computed(() => (Number.isFinite(props.value) ? props.value : 0))

// Intl бросает RangeError на дробной части вне 0…20, а decimals задаёт вызывающий.
const digits = computed(() => Math.min(20, Math.max(0, Math.trunc(props.decimals))))

const formatter = computed(
  () =>
    new Intl.NumberFormat(locale.value, {
      minimumFractionDigits: digits.value,
      maximumFractionDigits: digits.value,
    }),
)

const shown = ref(0)
const isRunning = ref(false)
let elapsed = 0

const displayText = computed(() => `${formatter.value.format(shown.value)}${props.suffix}`)
const finalText = computed(() => `${formatter.value.format(target.value)}${props.suffix}`)

/** Кубический ease-out: резкий старт, мягкая посадка на финальное число. */
function easeOut(ratio: number): number {
  return 1 - (1 - ratio) ** 3
}

const { pause, resume } = useRafFn(
  ({ delta }) => {
    elapsed += delta
    const ratio = Math.min(1, elapsed / props.durationMs)
    shown.value = target.value * easeOut(ratio)
    if (ratio >= 1) finish()
  },
  { immediate: false },
)

function finish(): void {
  pause()
  shown.value = target.value
  isRunning.value = false
}

function start(): void {
  if (isReduced.value || props.durationMs <= 0) {
    finish()
    return
  }
  elapsed = 0
  shown.value = 0
  isRunning.value = true
  resume()
}

const root = ref<HTMLElement | null>(null)

/**
 * Дошёл ли счётчик до кадра хотя бы раз.
 *
 * Защёлка, а не текущее состояние видимости: пролистав секцию вниз и вернувшись,
 * пользователь увидел бы отсчёт заново — на витрине это читается как сброс
 * данных, а не как украшение. Считается один раз, дальше перезапуск возможен
 * только по смене самого значения (так работает экран результата в мастере:
 * там цель подменяется, когда дорисуется галочка).
 */
const visible = useElementVisibility(root)
const entered = ref(false)
watch(visible, (isVisible) => {
  if (isVisible) entered.value = true
})

/*
 * Локаль в зависимостях не нужна: она меняет формат, а не сам счёт,
 * и перезапуск анимации при смене языка выглядел бы сбоем.
 *
 * Ветка «ещё не в кадре» ставит итог сразу, а не оставляет ноль. Ноль означал
 * бы «страница, до которой отсчёт не доехал, утверждает: банков-партнёров 0».
 * А не доехать он может и вовсе: печать разворачивает документ целиком, но
 * пересечения с окном у нижних секций при этом не происходит — на бумаге
 * осталось бы «0+». Обнуляет счётчик тот, кто его запускает (см. start),
 * и к этому моменту блок уже в кадре, так что ноль виден по делу.
 */
watch(
  [entered, target, () => props.durationMs, isReduced],
  () => {
    if (entered.value) start()
    else shown.value = target.value
  },
  { immediate: true },
)
</script>

<template>
  <span ref="root" class="vel-num" :aria-busy="isRunning">
    <!-- Бегущие цифры — чистая анимация, читать их вслух незачем. -->
    <span aria-hidden="true">{{ displayText }}</span>

    <!--
      Финальное число доступно скринридеру целиком с первого кадра.
      aria-label на корне не годится: у <span> роль generic, а ARIA запрещает
      именовать generic — часть движков такое имя просто не отдаёт.
      aria-busy на корне придерживает объявление, пока идёт счёт.
    -->
    <span class="sr-only" aria-live="polite">{{ finalText }}</span>
  </span>
</template>
