<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWizard } from '@/composables/useWizard'
import { useTweenedNumber } from '@/composables/useTweenedNumber'
import VelButton from '@/components/ui/VelButton.vue'
import VelLogo from '@/components/ui/VelLogo.vue'

/**
 * Оболочка мастера: полоса прогресса, шапка, содержимое и панель навигации.
 *
 * Монтируется ОДИН раз в VelWizardFlow и переживает смену шагов. Это не
 * косметика: пока каждый шаг рендерил собственную копию оболочки, полоса
 * прогресса пересоздавалась вместе с ним и не могла проехать от прошлого
 * значения к новому, а фокус при смене шага уходить было некуда.
 *
 * Шаг кладёт разметку в <slot />, а свою кнопку «дальше» телепортирует
 * в #vel-wizard-actions.
 */
const { t, n } = useI18n()
const { step, progress, canGoBack, back } = useWizard()

const track = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)

/**
 * Сколько едет полоса между шагами.
 *
 * Заметно дольше обычного перехода интерфейса, и это намеренно: полоса тут
 * не украшение, а единственное место, где видно счёт 20 → 21 → 22 … На 420 мс
 * два десятка чисел пролетали слитно, и «росла» только заливка. При 1100 мс
 * на число приходится около 55 мс — глаз успевает прочитать движение,
 * а не просто заметить, что край уехал.
 */
const PROGRESS_TRAVEL_MS = 1100

/**
 * Показываемый процент догоняет целевой покадрово: 20 → 21 → 22 …
 * Из этого же значения питается и положение полосы, поэтому число и полоса
 * идут строго вместе. Двумя независимыми анимациями они бы разъезжались.
 */
const shownPercent = useTweenedNumber(() => progress.value, PROGRESS_TRAVEL_MS)

/**
 * Доля 0…1 уезжает в CSS-переменную на дорожке: из неё в <style scoped>
 * считаются и ширина заливки, и позиция бейджа. Инлайн-стили запрещены,
 * а :style в шаблоне — это они и есть. Образец приёма — VelRange.
 */
watchEffect(
  () => {
    const element = track.value
    if (!element) return
    element.style.setProperty('--vel-progress', String(shownPercent.value / 100))
  },
  { flush: 'post' },
)

/*
 * Смена шага уводит фокус на область содержимого. Иначе после нажатия «дальше»
 * фокус остаётся внизу страницы — а на новом шаге кнопки под ним может уже не
 * быть, и клавиатурный пользователь оказывается в пустоте, не услышав заголовок.
 * flush: 'post' — ждём, пока новый шаг отрисуется.
 */
watch(step, () => content.value?.focus(), { flush: 'post' })

/**
 * Заполнение доехало до края. Половины процента хватает: покадровый счёт
 * подходит к цели асимптотически и в последних кадрах даёт 99.7, 99.9 —
 * ждать точного равенства значило бы ждать лишний кадр с бликом на месте.
 */
const isFull = computed(() => shownPercent.value >= 99.5)

/** Проценты форматируем локалью: в разных языках знак ставится по-разному. */
const percentText = computed(() =>
  n(Math.round(shownPercent.value) / 100, { style: 'percent', maximumFractionDigits: 0 }),
)

const progressLabel = computed(() => t('wizard.progressLabel', { percent: progress.value }))
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-ground">
    <header class="border-b border-line bg-surface">
      <!-- .vel-measure вместо max-w-6xl: предупреждение мелким кеглем шло во всю
           ширину шапки и давало 94 знака в строке на 640 (замер). Мера ставится
           не ради красоты — эту строку читают невнимательно, и потерять начало
           следующей здесь проще всего. -->
      <p class="vel-measure mx-auto w-full px-5 pt-2.5 text-center text-xs text-faint">
        {{ t('wizard.disclaimer') }}
      </p>

      <!-- Полоса декоративна: тот же процент объявляется текстом в панели навигации,
           дублировать его для скринридера значит читать одно и то же дважды.
           Класс на 100% снимает бегущий блик: двигаться уже нечему. -->
      <div ref="track" class="vel-track" :class="{ 'vel-track--full': isFull }" aria-hidden="true">
        <span class="vel-track__rail"></span>
        <span class="vel-track__fill"></span>
        <span class="vel-track__badge vel-num">{{ percentText }}</span>
      </div>

      <div class="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-5">
        <VelLogo />

        <!-- .vel-link: строчная ссылка высотой 20px не дотягивала до цели
             нажатия 24×24 (WCAG 2.5.8) — класс поднимает её до 24px и несёт
             состояния наведения и нажатия. -->
        <a href="#" class="vel-link ml-auto text-sm">{{ t('wizard.help') }}</a>
      </div>
    </header>

    <!-- Ориентир страницы: мастер занимает весь экран, и у его содержимого
         обязан быть <main>. Второго <main> не появится — App.vue рендерит либо
         мастер, либо лендинг, а VelWizardFlow держит на экране ровно один шаг.
         tabindex=-1: цель для программного перевода фокуса при смене шага. -->
    <main
      ref="content"
      tabindex="-1"
      class="vel-content mx-auto w-full max-w-3xl flex-1 px-5 py-10 lg:py-14"
    >
      <slot />
    </main>

    <div class="border-t border-line bg-surface">
      <!--
        Три колонки только с 640px. Ниже панель не помещалась: на 375 «Назад»
        (111px), строка прогресса (104px) и «Начать проверку» (161px) требуют
        376px при 335px доступных, и кнопка наезжала на строку прогресса на
        45 пикселей — замер getBoundingClientRect на шаге identity.
        Поэтому на узком экране прогресс уезжает отдельной строкой сверху
        (order-first + col-span-2), а кнопки остаются парой слева и справа.
        Порядок в разметке не тронут: «назад» по-прежнему стоит до «дальше»,
        то есть обход Tab совпадает с картинкой на любой ширине.
      -->
      <div
        class="mx-auto grid w-full max-w-3xl grid-cols-2 items-center gap-3 px-5 py-4 sm:grid-cols-3"
      >
        <div class="justify-self-start">
          <VelButton v-if="canGoBack" variant="outline" @click="back">
            <span aria-hidden="true">←</span>
            {{ t('wizard.back') }}
          </VelButton>
        </div>

        <p
          class="vel-num order-first col-span-2 text-center text-xs text-muted sm:order-none sm:col-span-1"
          role="status"
        >
          {{ progressLabel }}
        </p>

        <!-- Кнопку «дальше» сюда телепортирует активный шаг: подпись и условие
             блокировки у каждого свои, а оболочка обязана остаться единой,
             иначе полоса прогресса пересоздаётся и ей нечего анимировать. -->
        <div id="vel-wizard-actions" class="justify-self-end"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vel-track {
  --vel-progress: 0;
  --vel-badge: 2.25rem;

  position: relative;
  height: 2.75rem;
}

.vel-track__rail,
.vel-track__fill {
  position: absolute;
  top: 50%;
  left: 0;
  height: 2px;
  transform: translateY(-50%);
}

.vel-track__rail {
  right: 0;
  background-color: var(--color-track);
}

.vel-track__fill {
  width: calc(var(--vel-progress) * 100%);
  /* Градиент от глубокого к яркому: полоса набирает силу к бегунку,
     а не лежит однотонной чертой. */
  background-image: linear-gradient(90deg, var(--color-accent-deep), var(--color-accent));
  /* Блик ходит внутри заполненной части и не имеет права выйти за бегунок:
     пройденное — единственное, о чём полоса вправе говорить. */
  overflow: hidden;
  /* Перехода нет намеренно: ширину покадрово ведёт useTweenedNumber,
     и CSS-переход боролся бы с ним за одно и то же свойство. */
}

/*
  Бегущий блик: работа идёт. GSAP здесь не нужен — это бесконечный цикл
  без состояния и без единого кадра на главном потоке, композитор возит
  один transform.

  Ширина в процентах от заливки: на коротком отрезке блик короткий,
  на длинном — длинный, и скорость читается одинаково на любом шаге.
*/
.vel-track__fill::after {
  content: '';
  position: absolute;
  inset-block: 0;
  inline-size: 38%;
  min-inline-size: 2.5rem;
  /* Светлая полоса из цвета текста на акценте — в системе это самый
     светлый токен, сырых значений здесь нет. */
  background-image: linear-gradient(
    90deg,
    transparent,
    color-mix(in oklab, var(--color-accent-ink) 62%, transparent),
    transparent
  );
  animation: vel-track-shine 3.2s ease-in-out infinite;
}

/*
  Проход занимает чуть больше половины цикла, остальное — пауза за правым
  краем. Непрерывная карусель на кредитном экране мельтешит; здесь блик
  проходит и даёт на себя посмотреть.
*/
@keyframes vel-track-shine {
  0% {
    transform: translateX(-100%);
  }

  55%,
  100% {
    transform: translateX(263%);
  }
}

/* 100% — процесс закончен, бежать нечему и некуда. */
.vel-track--full .vel-track__fill::after {
  display: none;
}

.vel-track__badge {
  position: absolute;
  top: 50%;
  /* Кружок остаётся внутри полосы: на 0% и 100% он упирается краем, а не половиной */
  left: calc(var(--vel-badge) / 2 + var(--vel-progress) * (100% - var(--vel-badge)));
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--vel-badge);
  height: var(--vel-badge);
  transform: translate(-50%, -50%);
  /* Единственная круглая форма в системе: только так бейдж читается как
     бегунок, едущий по линии, а не как ещё одна прямоугольная панель.
     Значение взято из токена, произвольных радиусов в проекте нет. */
  border-radius: var(--radius-round);
  background-color: var(--color-accent);
  color: var(--color-accent-ink);
  font-size: 0.7rem;
  font-weight: 600;
  /* Мягкое кольцо вокруг бегунка: отрывает его от полосы и не даёт слиться
     с заливкой. Цвет собирается из токена, сырых значений нет. */
  box-shadow: 0 0 0 5px color-mix(in oklab, var(--color-accent) 16%, transparent);
  /* Позицию тоже ведёт useTweenedNumber — перехода здесь быть не должно. */
}

@media (prefers-reduced-motion: reduce) {
  /*
    Движением самой полосы управляет useTweenedNumber, и он при 'reduce'
    ставит значение сразу — гасить там нечего. А блик убираем полностью:
    сброс из main.css оставил бы его одним кадром стоять у левого края,
    то есть светлым пятном посреди заливки.
  */
  .vel-track__fill::after {
    display: none;
  }
}

/* Фокус сюда приходит программно при смене шага, рамка была бы шумом.
   Правило снимает только рамку браузера: :focus-visible из base остаётся,
   и клавиатурный фокус по-прежнему видно. */
.vel-content:focus:not(:focus-visible) {
  outline: none;
}
</style>
