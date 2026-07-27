<script setup lang="ts">
import { inject, ref, watchEffect } from 'vue'
import { VEL_FIELD_KEY } from '@/components/ui/vel-field'

/**
 * Нативный input[type=range] — клавиатура и скринридеры работают из коробки.
 * Заполненная часть дорожки красится через CSS-переменную на обёртке,
 * поэтому в разметке нет инлайн-стилей.
 *
 * Здесь намеренно НЕ используется useCssVar из VueUse: он рассчитан на чтение
 * и синхронизацию существующей переменной. Внутри у него updateCssVar(), который
 * при появлении элемента читает вычисленное значение и перезаписывает им ref,
 * затирая нашу запись; до монтирования он к тому же пишет в documentElement.
 * Для переменной, которую мы только пишем, достаточно одного post-эффекта.
 */
interface Props {
  min: number
  max: number
  step: number
  /** Доля заполнения 0…1 */
  progress: number
  /** Подпись для скринридера. Не называть ariaLabel — Vue примет это за нативный атрибут. */
  label: string
  /** Человекочитаемое значение для скринридера, например «10.000 €» */
  valueText: string
}

const props = defineProps<Props>()

const model = defineModel<number>({ required: true })

const field = inject(VEL_FIELD_KEY, null)
const root = ref<HTMLElement | null>(null)

watchEffect(
  () => {
    const element = root.value
    if (!element) return
    element.style.setProperty('--vel-fill', `${Math.round(props.progress * 1000) / 10}%`)
  },
  { flush: 'post' },
)

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement
  model.value = Number(target.value)
}
</script>

<template>
  <div ref="root" class="vel-range-wrap">
    <input
      :id="field?.controlId"
      class="vel-range"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="model"
      :aria-label="label"
      :aria-valuetext="valueText"
      @input="onInput"
    />
  </div>
</template>

<style scoped>
.vel-range-wrap {
  --vel-fill: 0%;
  display: block;
}

/*
  Высота 2.75rem вместо прежних 1.5rem. Сама дорожка по-прежнему в два
  пикселя — растёт только площадь, которую ловит палец. Замер до правки:
  366×24 на 1280 и 285×24 на 375, то есть ровно по нижней границе 24×24
  (WCAG 2.5.8). Ползунок суммы и срока — основное действие своих экранов,
  а им положено 44×44. Дорожку браузер центрирует по высоте поля сам,
  поэтому отрицательное поле бегунка ниже осталось прежним.
*/
.vel-range {
  display: block;
  width: 100%;
  height: 2.75rem;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

.vel-range::-webkit-slider-runnable-track {
  height: 2px;
  background: linear-gradient(
    to right,
    var(--color-accent) 0 var(--vel-fill),
    var(--color-track) var(--vel-fill) 100%
  );
}

.vel-range::-webkit-slider-thumb {
  appearance: none;
  width: 0.85rem;
  height: 1.15rem;
  margin-top: -0.575rem;
  border: 0;
  border-radius: var(--radius-control);
  background-color: var(--color-accent);
}

.vel-range:hover::-webkit-slider-thumb {
  background-color: var(--color-accent-dim);
}

.vel-range::-moz-range-track {
  height: 2px;
  background-color: var(--color-track);
}

.vel-range::-moz-range-progress {
  height: 2px;
  background-color: var(--color-accent);
}

.vel-range::-moz-range-thumb {
  width: 0.85rem;
  height: 1.15rem;
  border: 0;
  border-radius: var(--radius-control);
  background-color: var(--color-accent);
}

/*
  Пять состояний бегунка. Покой и наведение были, блокировка была; фокуса
  и нажатия у бегунка не было вовсе.

  Кольцо фокуса переносим с поля на бегунок. Правило из @layer base рисует
  гало вокруг всего контрола, а контрол — это вся ширина строки: по такому
  пятну не видно, где стоит бегунок и что именно поедет от стрелки. Гасим
  только тень, бокс обводки не трогаем — он нужен режиму высокой
  контрастности, которому тени не видны (страховка ниже).

  Правила вебкита и Firefox разнесены намеренно: браузер, не знающий чужого
  псевдоэлемента, выбрасывает всё правило целиком, и объединённый селектор
  не сработал бы ни там, ни там.
*/
.vel-range:focus-visible {
  box-shadow: none;
}

.vel-range:focus-visible::-webkit-slider-thumb {
  outline: 2px solid var(--color-accent-deep);
  outline-offset: 2px;
}

.vel-range:focus-visible::-moz-range-thumb {
  outline: 2px solid var(--color-accent-deep);
  outline-offset: 2px;
}

/* Нажатие: бегунок темнеет под пальцем, пока идёт перетаскивание. */
.vel-range:active::-webkit-slider-thumb {
  background-color: var(--color-accent-deep);
}

.vel-range:active::-moz-range-thumb {
  background-color: var(--color-accent-deep);
}

@media (forced-colors: active) {
  /* Тени в этом режиме отбрасываются, обводка бегунка тоже может не дойти —
     возвращаем видимую рамку самому полю. */
  .vel-range:focus-visible {
    outline: 2px solid Highlight;
    outline-offset: 2px;
  }
}

.vel-range:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
</style>
