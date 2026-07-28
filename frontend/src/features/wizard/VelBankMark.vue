<script setup lang="ts">
import { computed } from 'vue'
import { bankLogoFile } from '@/features/wizard/bank-logo-file'
import { bankMarkIdentity } from '@/features/wizard/bank-mark-identity'
import type { BankStatus } from '@/composables/useBankAnalysis'

/**
 * Знак банка в строке опроса: логотип файлом, если он положен, иначе — своя
 * подложка (цвет + форма) с монограммой; у проверенного — галочка вместо букв.
 *
 * ЛОГОТИП ПРИХОДИТ ФАЙЛОМ, А НЕ ЛЕЖИТ В КОДЕ. Настоящие знаки банков — чужие
 * товарные марки, в репозитории их нет: папка src/img/banks приезжает пустой, а
 * появится право на знак — файл кладут туда, и он подхватится сам. Пустая папка
 * ничего не ломает: список раскрывает сборщик, поэтому «файла нет» — ветка
 * разметки, а не битая картинка. Разбор папки — в соседнем bank-logo-file.ts.
 *
 * ЧТО ИЗМЕНИЛОСЬ И ПОЧЕМУ ЭТО НЕ ЛОМАЕТ WCAG 1.4.1.
 *
 * Раньше форму знака занимал СТАТУС: квадрат с буквами → круг с галочкой.
 * Это было правильно и остаётся правильным — яркостной контраст success
 * (#0e7f58) к accent (#1d4fd8) всего 1.33, то есть при дальтонизме и на
 * чёрно-белой печати «проверяем» и «проверен» по цвету неразличимы, и
 * держать статус на одном цвете нельзя.
 *
 * Теперь форма подложки принадлежит БАНКУ и одинакова во всех трёх статусах —
 * иначе никакой узнаваемости не выйдет. Форма при этом статус не бросила,
 * она переехала внутрь знака:
 *
 *   pending / checking — монограмма из двух букв;
 *   verified           — прочерченная галочка, букв нет.
 *
 * ЛОГОТИП В ЭТУ ПАРУ НЕ ВМЕШИВАЕТСЯ: он занимает место ТОЛЬКО подложки с
 * монограммой, у verified остаётся галочка — иначе банк с файлом потерял бы
 * признак «проверен» без цвета, а галочка поверх чужого знака терялась бы.
 *
 * Замена букв на галочку — такая же смена ФИГУРЫ, как прежняя смена квадрата
 * на круг, и работает там же, где та: без цвета, без цвета и без движения.
 * Сверх неё «проверяется» несёт кольцо вокруг знака, а статус словом стоит
 * в той же строке (VelBankRow) — ни один признак не остался единственным.
 *
 * Цвет подложки статуса НЕ означает: он постоянен от «в очереди» до
 * «проверен». Это тоже сделано нарочно — цвет, который то появляется, то
 * гаснет, читался бы как состояние, и тогда восемь оттенков в списке стали
 * бы восемью несуществующими состояниями.
 *
 * Декорация: имя банка стоит рядом текстом, статус подписан словом в той же
 * строке — знаку нечего добавить скринридеру.
 */
interface Props {
  /** Имя банка целиком: монограмму и марку компонент выводит сам. */
  name: string
  status: BankStatus
}

const props = defineProps<Props>()

const mark = computed(() => bankMarkIdentity(props.name))

/**
 * Ссылка на файл логотипа или undefined — «файла нет, рисуем марку сами».
 * Статус проверяется здесь: «у verified логотипа не бывает» — одно правило.
 */
/* Логотип показываем всегда (если файл есть); галочка — поверх при verified */
const logoSrc = computed(() => bankLogoFile(props.name))
</script>

<template>
  <span class="vel-mark" :class="[mark.toneClass, mark.shapeClass]" aria-hidden="true">
    <!-- Кольцо идёт первым, но порядок разметки тут ничего не решает: у него
         анимируемый transform, то есть свой контекст наложения (см. z-index). -->
    <span v-if="status === 'checking'" class="vel-mark__pulse"></span>

    <!-- alt пуст: знак декоративен, имя банка рядом текстом -->
    <img v-if="logoSrc" class="vel-mark__logo" :src="logoSrc" alt="" />
    <span v-else class="vel-mark__plate"></span>

    <!-- verified: галочка поверх логотипа/монограммы -->
    <span v-if="status === 'verified'" class="vel-mark__ok">
      <svg class="vel-mark__check" viewBox="0 0 16 16">
        <path d="M3.6 8.3 6.6 11.3 12.4 4.6" />
      </svg>
    </span>

    <span v-else-if="!logoSrc" class="vel-label vel-mark__initials">{{ mark.initials }}</span>
  </span>
</template>

<style scoped>
/*
  Размеры корня одинаковы во всех статусах и во всех формах: знак стоит первым
  в строке, и «плавающая» ширина двигала бы имя банка на каждой смене статуса.

  Значения по умолчанию заданы прямо здесь, а не только в классах-модификаторах:
  придёт банк с именем, которого нет в наборе форм (или класс не доедет), — знак
  останется скруглённым квадратом, а не потеряет заливку целиком.
*/
.vel-mark {
  --vel-mark-radius: var(--radius-control);
  --vel-mark-clip: none;
  --vel-mark-fill: var(--color-accent-deep);
  /* Поля вокруг логотипа: меньше — картинка читается в тайле */
  --vel-mark-inset: 0.12rem;

  flex: none;
  display: grid;
  place-items: center;
  /* 2.75rem (~44px): 2rem (32px) + contain/padding делали wordmark невидимым */
  inline-size: 2.75rem;
  block-size: 2.75rem;
  color: var(--color-accent-ink);
}

/* Подложка, кольцо и знак лежат в ОДНОЙ ячейке сетки — без абсолютного
   позиционирования, поэтому корень сохраняет собственную высоту. */
.vel-mark > * {
  grid-area: 1 / 1;
}

.vel-mark__plate,
.vel-mark__pulse {
  place-self: stretch;
  border-radius: var(--vel-mark-radius);
  clip-path: var(--vel-mark-clip);
  background-color: var(--vel-mark-fill);
}

/*
  ЛОГОТИП ФАЙЛОМ — на месте подложки. Размеры явные (у <img> свои пропорции, и
  stretch сетка обрабатывает для него как start — логотип встал бы натуральным
  размером и вылез из знака). contain, а не cover: cover обрезал бы широкий знак
  по бокам, а ширину держит корень (2rem, flex: none), так что строку логотип не
  растягивает. Радиус и обрезка — от рисованной марки, чтобы банк с файлом и без
  стояли одинаковыми фигурами; заливка даёт PNG фон и глушит кольцо изнутри.
*/
/*
  Логотипы — и квадратные знаки (DB, ING…), и широкие wordmark (HSBC, SG…).
  contain + тонкий inset: wordmark не обрезается и занимает почти весь тайл.
*/
.vel-mark__logo {
  z-index: 1;
  inline-size: 100%;
  block-size: 100%;
  padding: var(--vel-mark-inset, 0.12rem);
  border-radius: var(--radius-control);
  clip-path: none;
  background-color: var(--color-surface);
  object-fit: contain;
  object-position: center;
  box-sizing: border-box;
}

/*
  Живой индикатор проверки: кольцо той же формы расходится от знака.

  БЕСКОНЕЧНОЕ движение держим на CSS, а не на GSAP. Проверяемых строк на экране
  несколько одновременно, и каждая держала бы собственный таймлайн живым всё
  время проверки; здесь же анимируются только transform и opacity — то есть
  композитор, без единого пересчёта раскладки.

  Кольцо — копия подложки, а не outline: обводка не умеет обходить clip-path
  и у шестиугольника нарисовала бы прямоугольную рамку вокруг него.
*/
.vel-mark__pulse {
  animation: vel-mark-pulse 1500ms ease-out infinite;
}

@keyframes vel-mark-pulse {
  from {
    opacity: 0.45;
    transform: scale(1);
  }

  to {
    opacity: 0;
    transform: scale(1.5);
  }
}

/* z-index обязателен: clip-path на подложке создаёт КОНТЕКСТ НАЛОЖЕНИЯ, и
   шестиугольник рисовался поверх монограммы и галочки — у трёх банков из
   тринадцати оба признака пропадали. Сетке z-index доступен и без position. */
.vel-mark__initials {
  z-index: 1;
  /* Разрядка .vel-label рассчитана на надзаголовки в строку; в квадрате 2rem
     она сдвигает пару букв вправо от центра. */
  letter-spacing: 0.02em;
  /* Цвет задаём явно: .vel-label ставит свой muted, и наследование от корня
     его бы не перебило. */
  color: var(--color-accent-ink);
}

.vel-mark__ok {
  z-index: 2;
  display: grid;
  place-items: center;
  inline-size: 1.15rem;
  block-size: 1.15rem;
  border-radius: var(--radius-round);
  background: var(--color-success);
  color: #fff;
  box-shadow: 0 0 0 2px var(--color-surface);
  /* Смещение под больший тайл 2.75rem */
  transform: translate(0.75rem, 0.75rem);
}

.vel-mark__check {
  inline-size: 0.7rem;
  block-size: 0.7rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: square;
  stroke-linejoin: miter;
}

/*
  ФОРМЫ ПОДЛОЖКИ (fallback-монограмма). У файла логотипа clip/радиус
  свои — см. .vel-mark__logo: скруглённый квадрат без hex-обрезки, чтобы
  wordmark не терял углы.
*/
.vel-mark--circle {
  --vel-mark-radius: var(--radius-round);
  --vel-mark-inset: 0.2rem;
}

.vel-mark--squircle {
  --vel-mark-radius: var(--radius-control);
}

.vel-mark--hex {
  --vel-mark-radius: 0;
  --vel-mark-inset: 0.28rem;
  /* Правильный шестиугольник остриём вверх: полуширина 0.5 · √3/2 ≈ 0.433,
     то есть боковые грани стоят на 6.7% и 93.3%. */
  --vel-mark-clip: polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%);
}

/*
  ЦВЕТА МАРОК. Новых токенов нет: всё — либо роль палитры, либо её смесь через
  color-mix. Смешивание идёт `in srgb` намеренно: результат считается покомпонентно
  по тем же значениям, что стоят в @theme, поэтому контраст ниже ПРОВЕРЯЕМ
  вручную, а не принимается на веру (в oklab пришлось бы решать обратное
  преобразование, чтобы вообще узнать итоговый цвет).

  Монограмма и галочка везде --color-accent-ink (#fff). Контраст белого к
  подложке по WCAG 2.1 (посчитан, не оценён на глаз):

    navy   #12306e  12.55        forest #14434e  10.84
    royal  #1b44ad   8.50        brick  #742730  10.10
    plum   #613d84   8.41        slate  #334e7f   8.31
    teal   #166798   6.13        ochre  #61533b   7.53

  Худший — teal, 6.13 при норме 4.5 для крупного и 4.5 же для мелкого текста
  (монограмма 0.7rem, то есть мелкий). Запас больше трети даже у него.

  ПРО danger И success В СМЕСЯХ. Ни один чистый сигнальный цвет марке не
  достаётся: красный входит только в затемнённые смеси (brick, ochre), зелёный —
  только в синеватые (teal, forest). Ошибочного состояния у этого экрана нет
  вовсе (статусы pending → checking → verified), а «проверен» держится на
  --color-success в подписи и рамке строки, не на марке, — спутать
  тёмно-кирпичный знак с ошибкой не с чем.
*/
.vel-mark--navy {
  --vel-mark-fill: var(--color-accent-deep);
}

.vel-mark--royal {
  --vel-mark-fill: color-mix(in srgb, var(--color-accent) 70%, var(--color-fg));
}

.vel-mark--plum {
  --vel-mark-fill: color-mix(in srgb, var(--color-accent) 55%, var(--color-danger));
}

.vel-mark--teal {
  --vel-mark-fill: color-mix(in srgb, var(--color-accent) 50%, var(--color-success));
}

.vel-mark--forest {
  --vel-mark-fill: color-mix(in srgb, var(--color-fg) 70%, var(--color-success));
}

.vel-mark--brick {
  --vel-mark-fill: color-mix(in srgb, var(--color-danger) 60%, var(--color-fg));
}

.vel-mark--slate {
  --vel-mark-fill: color-mix(in srgb, var(--color-muted) 55%, var(--color-accent-deep));
}

.vel-mark--ochre {
  --vel-mark-fill: color-mix(in srgb, var(--color-danger) 50%, var(--color-success));
}

@media (prefers-reduced-motion: reduce) {
  /*
    Кольцо остаётся, но не дышит: «проверяется» обязано быть видно и без
    движения. Именно animation: none со своими значениями — глобальный сброс
    в main.css сжимает длительность до 0.01 мс и оставляет КОНЕЧНЫЙ кадр,
    то есть полностью прозрачное кольцо, и признак пропал бы совсем.
  */
  .vel-mark__pulse {
    animation: none;
    opacity: 0.4;
    transform: scale(1.3);
  }
}

@media (forced-colors: active) {
  /* В режиме высокой контрастности заливки подменяются системными, и все восемь
     марок сливаются в один цвет. Опознавать банк остаётся по форме и буквам —
     кольцо здесь только мешало бы, добавляя вокруг знака второй контур. */
  .vel-mark__pulse {
    display: none;
  }
}
</style>
