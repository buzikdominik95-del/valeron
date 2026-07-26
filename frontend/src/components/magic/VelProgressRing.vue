<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useTweenedNumber } from '@/composables/useTweenedNumber'

/**
 * Кольцевой индикатор: серая дорожка + дуга акцентом.
 *
 * Доступное имя обязательно: role="progressbar" без имени скринридер объявляет
 * безымянным индикатором. Строку компонент себе не выдумывает — её передаёт
 * вызывающая сторона уже переведённой через t().
 *
 * ДВИЖЕНИЕ ДУГИ ведёт useTweenedNumber, и механизм этот ЕДИНСТВЕННЫЙ. Раньше
 * дугу тянул CSS-переход по stroke-dasharray; вместе с покадровым счётом он дал
 * бы два независимых сглаживания одного значения — цифра в центре приезжала бы
 * раньше дуги. Композабл заодно закрывает два случая, о которых переход не
 * знает: prefers-reduced-motion (значение встаёт мгновенно) и скрытая вкладка
 * (кадров нет, и дуга зависла бы на старом значении до возвращения).
 */
interface Props {
  /** Доступное имя индикатора. Не называть ariaLabel — Vue примет это за нативный атрибут. */
  label: string
  value: number
  max?: number
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  max: 100,
  size: 40,
})

const root = ref<HTMLElement | null>(null)

// Нулевой или отрицательный max превратил бы долю в Infinity/NaN.
const safeMax = computed(() => (Number.isFinite(props.max) && props.max > 0 ? props.max : 100))

const clamped = computed(() => {
  const raw = Number.isFinite(props.value) ? props.value : 0
  return Math.min(safeMax.value, Math.max(0, raw))
})

/**
 * Сколько дуга едет до нового значения. Короче самой быстрой проверки банка
 * (2 с, см. useBankAnalysis) намеренно: кольцо обязано успеть встать до
 * следующего шага счётчика, иначе оно вечно догоняет и никогда не показывает
 * достигнутое. Запас взят с большим избытком не зря — банки проверяются
 * в несколько полос, и две галочки подряд могут прийти почти вплотную.
 */
const VALUE_TRAVEL_MS = 420

/** Цель в процентах. Дробь берём как есть: округление — дело дуги и цифры. */
const target = computed(() => (clamped.value / safeMax.value) * 100)

/**
 * Показываемая доля догоняет целевую покадрово: 15 → 16 → 17 … вместо скачка.
 * В aria-valuenow это число НЕ идёт: вслух объявляется истинное значение
 * (clamped), иначе один шаг счётчика превратился бы в поток объявлений
 * «3,2 … 3,6 … 4».
 */
const shown = useTweenedNumber(() => target.value, VALUE_TRAVEL_MS)

/** Доля заполнения в сотых долях — ложится прямо в stroke-dasharray. */
const fill = computed(() => Math.round(shown.value * 100) / 100)

/** Цифры внутри кольца округляем, дугу — нет: иначе 99.6 % рисуется как 100 %. */
const percent = computed(() => Math.round(fill.value))

const size = computed(() => (Number.isFinite(props.size) && props.size > 0 ? props.size : 40))

// Размер и заполнение уезжают в CSS-переменные на корне: в разметке
// инлайн-стилей быть не должно.
watchEffect(
  () => {
    const element = root.value
    if (!element) return
    element.style.setProperty('--vel-ring-size', `${size.value}px`)
    element.style.setProperty('--vel-ring-fill', String(fill.value))
  },
  { flush: 'post' },
)
</script>

<template>
  <div
    ref="root"
    class="vel-ring"
    role="progressbar"
    :aria-label="label"
    :aria-valuenow="clamped"
    aria-valuemin="0"
    :aria-valuemax="safeMax"
  >
    <!--
      pathLength="100" переводит dasharray в проценты независимо от радиуса:
      без него пришлось бы считать 2πr в скрипте и держать его синхронно с CSS.
    -->
    <svg class="vel-ring-svg" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <circle class="vel-ring-track" cx="20" cy="20" r="17" pathLength="100" />
      <circle class="vel-ring-arc" cx="20" cy="20" r="17" pathLength="100" />
    </svg>

    <!-- Значение уже отдано через aria-valuenow, дублировать его вслух не нужно. -->
    <span class="vel-ring-value vel-num" aria-hidden="true">{{ percent }}</span>
  </div>
</template>

<style scoped>
.vel-ring {
  --vel-ring-size: 40px;
  --vel-ring-fill: 0;

  display: inline-grid;
  place-items: center;
  inline-size: var(--vel-ring-size);
  block-size: var(--vel-ring-size);
}

/* Кольцо и цифры кладём в одну ячейку сетки — без абсолютного позиционирования. */
.vel-ring > * {
  grid-area: 1 / 1;
}

.vel-ring-svg {
  inline-size: 100%;
  block-size: 100%;
  /* Старт дуги — сверху, а не справа. */
  transform: rotate(-90deg);
}

.vel-ring-track,
.vel-ring-arc {
  fill: none;
  stroke-width: 3;
}

.vel-ring-track {
  stroke: var(--color-track);
}

/* Перехода нет намеренно: длину дуги покадрово ведёт useTweenedNumber (см.
   скрипт), и второй механизм сглаживания здесь только мешал бы. */
.vel-ring-arc {
  stroke: var(--color-accent);
  stroke-linecap: butt;
  stroke-dasharray: var(--vel-ring-fill) 100;
}

.vel-ring-value {
  font-size: calc(var(--vel-ring-size) * 0.3);
  font-weight: 600;
  line-height: 1;
  color: var(--color-accent-deep);
}

/* Блока @media для дуги здесь больше нет и не должно быть: «уменьшить движение»
   разбирает useTweenedNumber — при 'reduce' он ставит значение сразу, без кадров. */
</style>
