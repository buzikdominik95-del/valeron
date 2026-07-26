<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import VelArtEnvelope from '@/components/art/VelArtEnvelope.vue'
import VelLottie from '@/components/art/VelLottie.vue'

/**
 * Кадр текущей фазы экрана регистрации. Три фазы — три РАЗНЫХ рисунка, а не
 * один и тот же со сменой подписи:
 *
 *   sending  — письмо уходит: конверт поворачивается вокруг своей оси;
 *   checking — проверка личности: по карточке с портретом идёт луч сканера,
 *              рамка захвата сжимается, поля отмечаются одно за другим;
 *   ready    — подтверждение по отпечатку: дуги отпечатка прочерчиваются,
 *              сверху проходит луч, в конце ложится галочка.
 *
 * ОТКУДА СЮЖЕТЫ. Заказчик прислал две ссылки на LottieFiles — «verification id
 * card face scan» и «fingerprint verification». Сами файлы в проект не
 * попадают: плеера Lottie в зависимостях нет, а тянуть его (плюс сотни
 * килобайт JSON) ради двух заставок на экране, который живёт шесть секунд, —
 * плохой размен. Сюжет и характер движения повторены здесь своим SVG, как и
 * вся остальная графика проекта (VelArtEnvelope, VelAccountSign, VelDocVerified).
 * Понадобятся именно те файлы — нужен lottie-web и два .json рядом; разметка
 * этого компонента тогда сведётся к одному контейнеру на фазу.
 *
 * ВСЁ ДВИЖЕНИЕ — CSS. Здесь нет ни одной временной шкалы, которую надо
 * согласовывать: каждая сцена живёт ровно столько, сколько её показывают, и
 * начинается заново при появлении, потому что узел монтируется заново (за это
 * отвечает :key на вызове в VelEmailSent).
 *
 * ЗНАКИ ДЕКОРАТИВНЫ: что происходит, сказано словами в строке фазы рядом
 * (WCAG 1.4.1), поэтому здесь aria-hidden и ни одной подписи.
 */
interface Props {
  phase: 'sending' | 'checking' | 'ready'
}

const props = defineProps<Props>()

/** Вертикальные положения полей карточки в координатах viewBox. */
const ROWS = [40, 50, 60] as const

/**
 * Дуги отпечатка: пары «радиус по X, радиус по Y». Рисуются одним и тем же
 * эллиптическим сегментом, поэтому держатся списком, а не пятью путями в
 * разметке — правится кривая в одном месте.
 */
const RIDGES = [
  { rx: 8, ry: 10 },
  { rx: 14, ry: 17 },
  { rx: 20, ry: 24 },
  { rx: 26, ry: 31 },
] as const

/**
 * НАСТОЯЩИЕ АНИМАЦИИ LOTTIE, ЕСЛИ ИХ ПОЛОЖИЛИ.
 *
 * Заказчик просил две конкретные анимации с LottieFiles «один в один». Скачать
 * их из кода нельзя — сайт отдаёт автоматическим запросам 403, — поэтому файлы
 * кладутся руками в src/lottie (инструкция там же в README). Здесь остаётся
 * поиск: нашёлся файл — играет он, не нашёлся — своя svg-сцена ниже.
 *
 * import.meta.glob БЕЗ eager: пустая папка не должна ничего стоить, а файл
 * анимации на сотни килобайт не должен попадать в общий кусок сборки. Тот же
 * приём и та же причина, что у подстановки логотипов банков в bank-logo-file.
 *
 * Имена фиксированы: они же перечислены в README рядом с файлами.
 */
const LOTTIE_FILES = import.meta.glob<{ default: unknown }>('@/lottie/*.json')

const LOTTIE_BY_PHASE: Record<string, string> = {
  checking: 'id-card-scan.json',
  ready: 'fingerprint.json',
}

/** Разобранный JSON текущей фазы. null — файла нет, играет запасная сцена. */
const animation = ref<unknown>(null)

/** Путь в glob приходит от корня проекта, поэтому ищем по concу имени. */
function loaderFor(phase: string): (() => Promise<{ default: unknown }>) | null {
  const name = LOTTIE_BY_PHASE[phase]
  if (name === undefined) return null

  const key = Object.keys(LOTTIE_FILES).find((path) => path.endsWith(`/${name}`))
  return key === undefined ? null : (LOTTIE_FILES[key] ?? null)
}

watch(
  () => props.phase,
  (phase) => {
    animation.value = null

    const load = loaderFor(phase)
    if (load === null) return

    void load().then((module) => {
      /* Фаза могла смениться, пока ехал файл: чужую анимацию не показываем. */
      if (props.phase === phase) animation.value = module.default
    })
  },
  { immediate: true },
)

const hasLottie = computed(() => animation.value !== null)
</script>

<template>
  <div class="vel-stage" aria-hidden="true">
    <!-- НАСТОЯЩАЯ АНИМАЦИЯ, если файл лежит в src/lottie. Она перекрывает всё
         остальное: свои сцены ниже — запасной вариант на случай пустой папки,
         а не украшение поверх. loop выключен на последней фазе: знак «готово»
         должен остаться собранным, а не собираться заново по кругу. -->
    <VelLottie
      v-if="hasLottie"
      :data="animation"
      :loop="phase !== 'ready'"
      class="vel-stage__lottie"
    />

    <!-- ФАЗА 1. Конверт поворачивается вокруг вертикальной оси — «письмо
         уходит». Поворот с возвратом, а не полный оборот: полный читался бы
         как бесконечная загрузка. -->
    <VelArtEnvelope v-else-if="phase === 'sending'" class="vel-stage__mail" />

    <!-- ФАЗА 2. Скан удостоверения: портрет, поля, рамка захвата и луч. -->
    <svg v-else-if="phase === 'checking'" class="vel-stage__svg" viewBox="0 0 96 96">
      <rect class="vel-stage__card" x="12" y="26" width="72" height="44" rx="5" />

      <!-- Портрет: голова и плечи. Обычные фигуры, а не фотография — карточка
           здесь знак, а не документ конкретного человека. -->
      <circle class="vel-stage__head" cx="32" cy="42" r="6" />
      <path class="vel-stage__body" d="M23 60a9 9 0 0 1 18 0" />

      <rect
        v-for="row in ROWS"
        :key="row"
        class="vel-stage__field"
        x="50"
        :y="row - 2"
        width="24"
        height="4"
        rx="2"
      />

      <!-- Рамка захвата: четыре уголка, которые сжимаются к портрету. -->
      <g class="vel-stage__frame">
        <path d="M20 34v-4h4" />
        <path d="M44 30h4v4" />
        <path d="M48 62v4h-4" />
        <path d="M24 66h-4v-4" />
      </g>

      <rect class="vel-stage__beam" x="12" y="26" width="72" height="9" />
    </svg>

    <!-- ФАЗА 3. Отпечаток: дуги прочерчиваются, проходит луч, ложится галочка. -->
    <svg v-else class="vel-stage__svg" viewBox="0 0 96 96">
      <g class="vel-stage__ridges">
        <path
          v-for="ridge in RIDGES"
          :key="ridge.rx"
          :d="`M${48 - ridge.rx} ${52} a${ridge.rx} ${ridge.ry} 0 0 1 ${ridge.rx * 2} 0`"
        />
      </g>

      <!-- Сердцевина отпечатка: короткая дуга под самой вершиной. -->
      <path class="vel-stage__core" d="M44 56a4 5 0 0 1 8 0" />

      <rect class="vel-stage__beam vel-stage__beam--print" x="14" y="18" width="68" height="8" />

      <circle class="vel-stage__halo" cx="70" cy="66" r="13" />
      <path class="vel-stage__check" d="M64 66.5 68.5 71 76 62" />
    </svg>
  </div>
</template>

<style scoped>
/* Общая площадка: все три кадра одного размера, иначе карточка прыгала бы
   по высоте на каждой смене фазы. */
.vel-stage {
  display: flex;
  block-size: 8.5rem;
  align-items: center;
  justify-content: center;
}

/* Площадка под настоящую анимацию — того же размера, что и запасные сцены:
   при смене фазы карточка не должна прыгать по высоте. */
.vel-stage__lottie {
  inline-size: 8.5rem;
  block-size: 8.5rem;
}

.vel-stage__svg {
  inline-size: 8.5rem;
  block-size: 8.5rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.vel-stage__mail {
  inline-size: 10rem;
  transform-origin: center;
  animation: vel-stage-turn 2.2s ease-in-out infinite;
}

/* Контур документа спокойный: он держит сцену, а не привлекает взгляд */
.vel-stage__card {
  stroke: color-mix(in oklab, currentColor 55%, transparent);
}

.vel-stage__head,
.vel-stage__body {
  stroke: color-mix(in oklab, currentColor 75%, transparent);
}

.vel-stage__field {
  stroke: none;
  fill: color-mix(in oklab, currentColor 22%, transparent);
  animation: vel-stage-field 0.45s ease-out both;
}

/* Поля загораются по очереди: проверка идёт по порядку, а не вспыхивает разом */
.vel-stage__field:nth-of-type(1) {
  animation-delay: 0.35s;
}

.vel-stage__field:nth-of-type(2) {
  animation-delay: 0.75s;
}

.vel-stage__field:nth-of-type(3) {
  animation-delay: 1.15s;
}

/* Рамка захвата сжимается к портрету — жест «навёл и держу» */
.vel-stage__frame {
  stroke: var(--color-accent);
  stroke-width: 2.6;
  transform-origin: 34px 48px;
  animation: vel-stage-lock 2s ease-in-out infinite;
}

/*
  Луч сканера. Полоса идёт сверху вниз и уходит; на отпечатке ход другой,
  поэтому длина хода вынесена в переменную, а сами кадры общие.
*/
.vel-stage__beam {
  --vel-beam-travel: 44px;

  stroke: none;
  fill: color-mix(in oklab, var(--color-accent) 30%, transparent);
  animation: vel-stage-beam 1.7s ease-in-out infinite;
}

.vel-stage__beam--print {
  --vel-beam-travel: 56px;
}

/*
  Дуги отпечатка прочерчиваются штрихом, а не проявляются прозрачностью:
  штрих читается как «считывается», прозрачность — как «подгружается».
  Длина 90 взята с запасом над самой длинной дугой (полупериметр эллипса
  26×31 ≈ 90): недочерченная дуга заметна, лишний запас — нет.
*/
.vel-stage__ridges path,
.vel-stage__core {
  stroke: color-mix(in oklab, currentColor 80%, transparent);
  stroke-dasharray: 90;
  animation: vel-stage-ridge 0.7s ease-out both;
}

.vel-stage__ridges path:nth-of-type(1) {
  animation-delay: 0.05s;
}

.vel-stage__ridges path:nth-of-type(2) {
  animation-delay: 0.2s;
}

.vel-stage__ridges path:nth-of-type(3) {
  animation-delay: 0.35s;
}

.vel-stage__ridges path:nth-of-type(4) {
  animation-delay: 0.5s;
}

.vel-stage__core {
  animation-delay: 0s;
}

/* transform-origin ОБЯЗАТЕЛЕН: у svg-фигуры собственного центра для transform
   нет, и без него круг рос бы из левого верхнего угла холста, а не из своего
   места. Тот же подводный камень, что у svgOrigin в VelDocVerified. */
.vel-stage__halo {
  stroke: none;
  fill: color-mix(in oklab, var(--color-success) 18%, transparent);
  transform-origin: 70px 66px;
  animation: vel-stage-halo 0.45s ease-out 0.75s both;
}

/* Длина 18 посчитана по пути: 4.5·√2 + 7.5·√2 ≈ 17 плюс запас на скругления */
.vel-stage__check {
  stroke: var(--color-success);
  stroke-width: 3.2;
  stroke-dasharray: 18;
  animation: vel-stage-draw 0.4s ease-out 0.9s both;
}

@keyframes vel-stage-turn {
  0%,
  100% {
    transform: rotateY(0deg);
  }

  50% {
    transform: rotateY(180deg);
  }
}

@keyframes vel-stage-beam {
  0% {
    transform: translateY(0);
    opacity: 0;
  }

  15%,
  70% {
    opacity: 1;
  }

  100% {
    transform: translateY(var(--vel-beam-travel));
    opacity: 0;
  }
}

@keyframes vel-stage-lock {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.55;
  }

  50% {
    transform: scale(0.86);
    opacity: 1;
  }
}

@keyframes vel-stage-field {
  from {
    opacity: 0;
    transform: translateX(-4px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes vel-stage-ridge {
  from {
    stroke-dashoffset: 90;
  }

  to {
    stroke-dashoffset: 0;
  }
}

@keyframes vel-stage-draw {
  from {
    stroke-dashoffset: 18;
  }

  to {
    stroke-dashoffset: 0;
  }
}

@keyframes vel-stage-halo {
  from {
    opacity: 0;
    transform: scale(0.4);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  /*
    Сброс из main.css правит длительность, но оставляет бесконечное повторение:
    конверт, рамка и луч продолжали бы дёргаться, просто мгновенно. Гасим их
    целиком, а всему прочерченному оставляем конечное состояние — сцена
    остаётся нарисованной, а не застывшей на полпути.
  */
  .vel-stage__mail,
  .vel-stage__frame,
  .vel-stage__beam {
    animation: none;
  }

  .vel-stage__beam {
    opacity: 0;
  }

  .vel-stage__field,
  .vel-stage__ridges path,
  .vel-stage__core,
  .vel-stage__check,
  .vel-stage__halo {
    opacity: 1;
    transform: none;
    animation: none;
    stroke-dashoffset: 0;
  }
}
</style>
