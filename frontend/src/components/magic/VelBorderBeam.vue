<script setup lang="ts">
import { ref, watchEffect } from 'vue'

/**
 * Порт Magic UI Border Beam без motion: луч бежит по рамке родителя.
 *
 * Ставится ВНУТРЬ элемента с position: relative — компонент растягивается
 * по inset: 0 и наследует скругление родителя через border-radius: inherit.
 * Клики не перехватывает, для скринридера скрыт: это чистая декорация.
 */
interface Props {
  durationMs?: number
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  durationMs: 6000,
  size: 60,
})

const root = ref<HTMLElement | null>(null)

// Размер луча и период задаются переменными на корне: динамика в CSS,
// а не в атрибуте style разметки.
watchEffect(
  () => {
    const element = root.value
    if (!element) return
    const size = Number.isFinite(props.size) && props.size > 0 ? props.size : 60
    const duration = Number.isFinite(props.durationMs) && props.durationMs > 0 ? props.durationMs : 6000
    element.style.setProperty('--vel-beam-size', `${size}px`)
    element.style.setProperty('--vel-beam-duration', `${duration}ms`)
  },
  { flush: 'post' },
)
</script>

<template>
  <span ref="root" class="vel-border-beam" aria-hidden="true">
    <span class="vel-border-beam__spark" />
  </span>
</template>

<style scoped>
.vel-border-beam {
  --vel-beam-size: 60px;
  --vel-beam-duration: 6000ms;
  --vel-beam-width: 1px;

  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
  border: var(--vel-beam-width) solid transparent;
  border-radius: inherit;

  /*
    Маска обязана быть ДВУМЯ НЕПРОЗРАЧНЫМИ слоями с mask-composite: exclude.
    Слой 1 обрезан по padding-box (внутренний прямоугольник), слой 2 — по
    border-box (внешний); exclude оставляет их несовпадающую часть, то есть
    ровно кольцо рамки.

    Оригинал Magic UI делает transparent-слой + intersect: до кольца это НЕ
    обрезает, и луч выезжает поверх содержимого карточки. Проверено.

    black здесь не цвет из палитры, а трафарет: маску читают по альфе,
    и оба слоя обязаны быть непрозрачными, иначе exclude вычитать нечего.
  */
  -webkit-mask-image: linear-gradient(black, black), linear-gradient(black, black);
  mask-image: linear-gradient(black, black), linear-gradient(black, black);
  -webkit-mask-clip: padding-box, border-box;
  mask-clip: padding-box, border-box;
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

.vel-border-beam__spark {
  position: absolute;
  display: block;
  inline-size: var(--vel-beam-size);
  aspect-ratio: 1;
  /* Хвост гаснет в прозрачность — сырых цветов нет, только роль accent. */
  background: linear-gradient(to left, var(--color-accent), transparent);
  /*
    Трасса обязана совпадать с МАСКОЙ, а маска сидит на border-radius: inherit
    выше — то есть на скруглении родителя, каким бы оно ни было.

    В оригинале Magic UI радиусом трассы стоял размер луча (60px): путь
    превращался в «таблетку», маска оставалась почти прямоугольной, и на каждом
    углу луч уезжал из-под неё. Замена на var(--radius-panel) чинила это ровно
    для панелей — но компонент зовут и со шкурой контрола: в
    @/features/wizard/VelBankRow.vue строка банка скруглена var(--radius-control).
    Маска там шла по 6px, трасса — по 10px, и центр луча срезал каждый угол
    внутрь на 1,66px (замер: 28 точек из 1200 по всем четырём углам).
    Разъезд токенов делал это неизбежным: одно значение на два разных контейнера
    не подходит по определению.

    border-box — это <coord-box>: путь берётся от border-box САМОГО элемента
    вместе с его border-radius. Раз радиус пришёл наследованием, трасса и маска
    считаются от одного и того же числа и разъехаться больше не могут — ни при
    смене токенов, ни у нового вызывающего. Первая строка — запас для движков
    без <coord-box>: они отбросят вторую и останутся на прежнем поведении.
  */
  offset-path: rect(0 auto auto 0 round var(--radius-panel));
  offset-path: border-box;
  offset-distance: 0%;
  animation: vel-border-beam-run var(--vel-beam-duration) linear infinite;
}

@keyframes vel-border-beam-run {
  from {
    offset-distance: 0%;
  }

  to {
    offset-distance: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  /*
    Именно display: none, а не animation: none. Глобальный сброс в main.css
    сжимает длительность до 0.01ms и оставляет одну итерацию — луч мгновенно
    доезжает до конца и намертво замирает светящейся кляксой в углу.
  */
  .vel-border-beam__spark {
    display: none;
  }
}
</style>
