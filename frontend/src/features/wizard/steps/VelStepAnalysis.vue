<script setup lang="ts">
import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTimeoutFn } from '@vueuse/core'
import { useBankAnalysis } from '@/composables/useBankAnalysis'
import { useTweenedNumber } from '@/composables/useTweenedNumber'
import { ANALYSIS_HANDOFF_MS } from '@/features/wizard/analysis-motion'
import VelProgressRing from '@/components/magic/VelProgressRing.vue'
import VelBankList from '@/features/wizard/VelBankList.vue'

/**
 * Шаг «опрос банков». Вся логика последовательности — в useBankAnalysis,
 * здесь только разметка, переводы и подача состояния.
 */
const emit = defineEmits<{ done: [] }>()

const { t } = useI18n()
// progress (проценты) больше не нужен: VelProgressRing считает долю сам
// из value/max, а озвучивает её как «проверено N из M». Догонять новое
// значение он тоже умеет сам — покадрово, через useTweenedNumber, поэтому
// сюда приходит честное целое, а не сглаженное число.
const { banks, checkedCount, isDone, start } = useBankAnalysis()

/**
 * Этапы общего хода. Заявка уже отправлена предыдущими шагами, поэтому она
 * закрыта всегда; скоринг закрывается вместе с опросом банков.
 */
const stages = computed(() => [
  { key: 'request', label: t('wizard.analysis.stageRequest'), done: true },
  { key: 'scoring', label: t('wizard.analysis.stageScoring'), done: isDone.value },
])

/**
 * Одна вежливая живая область на весь список: сообщение собирает локаль
 * (analysis.liveMessage с подстановками checked/total), а не конкатенация
 * в скрипте — порядок слов и падежи в разных языках свои.
 * Живая область на каждой строке залила бы скринридер тринадцатью объявлениями.
 */
const liveMessage = computed(() =>
  isDone.value
    ? t('wizard.analysis.done')
    : t('wizard.analysis.liveMessage', {
        checked: checkedCount.value,
        total: banks.value.length,
      }),
)

/**
 * Ключи analysis.done и analysis.waiting не удалены, а применены: waiting —
 * видимая подсказка про ожидание, пока опрос идёт, done — финальное состояние
 * (оно же уходит в живую область). Удалять их значило бы оставить экран
 * ожидания вовсе без словесного статуса.
 */
const statusText = computed(() =>
  isDone.value ? t('wizard.analysis.done') : t('wizard.analysis.waiting'),
)

/**
 * СЧЁТЧИК И ПОЛОСА ДОГОНЯЮТ СОСТОЯНИЕ, а не прыгают вслед за ним.
 *
 * Банки проверяются в несколько полос, и галочки приходят пачками: без
 * сглаживания «3 / 13» становилось бы «5 / 13» в один кадр, и понять, что
 * прибавилось два, а не пять, было бы нельзя. Покадровый счёт показывает
 * сам факт прибавления, а не только его итог.
 *
 * Тем же числом питается и полоса — одно значение на цифру и на заливку,
 * поэтому они не могут разъехаться. Отдельного CSS-перехода у полосы нет
 * ровно по этой причине: второй механизм сглаживания дал бы догоняющую
 * цифру и отстающую от неё заливку.
 *
 * 520 мс — заметно короче самой быстрой проверки (2 с), значит полоса
 * успевает встать до следующей галочки и не догоняет вечно.
 */
const COUNTER_TRAVEL_MS = 520

const shownChecked = useTweenedNumber(() => checkedCount.value, COUNTER_TRAVEL_MS)

/** Видимая цифра. В живую область она НЕ идёт — там истинное значение. */
const counter = computed(() => Math.round(shownChecked.value))

const panel = ref<HTMLElement | null>(null)

/*
 * Доля заполнения уезжает в CSS-переменную на панели: инлайн-стилей в шаблоне
 * быть не должно, а сама заливка едет масштабом (см. стили), поэтому здесь
 * доля 0…1, а не проценты.
 *
 * flush: 'post' — переменная пишется в узел, которого до отрисовки ещё нет.
 */
watchEffect(
  () => {
    const element = panel.value
    if (!element) return

    const total = banks.value.length
    const share = total === 0 ? 1 : shownChecked.value / total
    element.style.setProperty('--vel-analysis-fill', String(Math.round(share * 1000) / 1000))
  },
  { flush: 'post' },
)

/*
 * Короткая пауза перед переходом: без неё последняя галочка исчезает в том же
 * кадре, в котором появилась, и шаг выглядит оборванным. В эту же паузу
 * укладывается финальная волна по списку — длительность у них общая
 * (ANALYSIS_HANDOFF_MS), поэтому волна не может ни оборваться сменой шага,
 * ни задержать её сверх бюджета.
 *
 * Переход висит на таймере, а не на onComplete волны: при
 * prefers-reduced-motion волны нет вовсе, а скрытая вкладка не получает кадров.
 */
const { start: scheduleDone } = useTimeoutFn(() => emit('done'), ANALYSIS_HANDOFF_MS, {
  immediate: false,
})

watch(isDone, (done) => {
  if (done) scheduleDone()
})

onMounted(start)
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- Заголовок + подзаголовок: по одной строке каждый (бриф, фотка 3). -->
    <div class="vel-analysis-head flex flex-col gap-2">
      <p class="vel-label">{{ t('wizard.analysis.lead') }}</p>
      <h1 class="vel-analysis-head__title">{{ t('wizard.analysis.title') }}</h1>
      <p class="vel-analysis-head__sub">{{ t('wizard.analysis.subtitle') }}</p>
    </div>

    <div
      ref="panel"
      class="vel-analysis flex flex-col gap-3 rounded-panel border border-line bg-surface p-4"
    >
      <ol class="flex flex-col gap-2">
        <li
          v-for="stage in stages"
          :key="stage.key"
          class="flex items-baseline justify-between gap-4 text-sm"
        >
          <span :class="stage.done ? 'text-fg' : 'text-muted'">{{ stage.label }}</span>
          <span class="vel-label" :class="stage.done ? 'text-accent-deep' : 'text-faint'">
            {{ stage.done ? t('wizard.analysis.verified') : t('wizard.analysis.pending') }}
          </span>
        </li>
      </ol>

      <!-- Прогресс объявляется скринридеру кольцом: role="progressbar" с именем
           из заголовка шага и значениями checkedCount / banks.length.
           Счётчик рядом — та же пара чисел глазами, поэтому он aria-hidden. -->
      <div class="flex items-center gap-3 border-t border-line pt-3">
        <VelProgressRing
          :label="t('wizard.analysis.title')"
          :value="checkedCount"
          :max="banks.length"
        />

        <div class="flex min-w-0 grow flex-col gap-1">
          <p class="vel-num text-sm text-fg" aria-hidden="true">
            {{ counter }} / {{ banks.length }}
          </p>

          <!-- Полоса — та же пара чисел, что уже объявлена кольцом
               (role="progressbar"), поэтому для скринридера она скрыта:
               второй индикатор того же значения читался бы как второй процесс. -->
          <span class="vel-analysis__bar" aria-hidden="true">
            <span class="vel-analysis__fill"></span>
          </span>

          <p class="text-xs text-muted">{{ statusText }}</p>
        </div>
      </div>
    </div>

    <!-- Список вместе с его собственным движением (волна по всем строкам,
         когда проверен последний) живёт отдельным файлом: шаг не должен знать,
         как выбираются тринадцать узлов. -->
    <VelBankList :banks="banks" :finished="isDone" />

    <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">{{ liveMessage }}</p>
  </div>
</template>

<style scoped>
.vel-analysis-head__title {
  margin: 0;
  color: var(--color-fg);
  font-size: clamp(1.25rem, 4.2vw, 1.75rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vel-analysis-head__sub {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.875rem;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vel-analysis {
  /* Доля заполнения полосы 0…1. Пишется из скрипта; значение по умолчанию
     нужно на первый кадр, пока watchEffect ещё не отработал. */
  --vel-analysis-fill: 0;
}

/*
  Полоса прогресса. block-size, а не height: у полосы нет «верха» и «низа» —
  есть направление письма, и в вертикальном режиме она обязана лечь вдоль него.
*/
.vel-analysis__bar {
  display: block;
  inline-size: 100%;
  block-size: 3px;
  border-radius: var(--radius-round);
  background-color: var(--color-track);
  overflow: hidden;
}

/*
  Заливка едет МАСШТАБОМ, а не шириной. Значение меняется каждый кадр
  (см. useTweenedNumber в скрипте), и анимация inline-size пересчитывала бы
  раскладку панели по тридцать раз в секунду; scaleX отдаёт это композитору.

  Точка отсчёта — левый край: логического ключевого слова у transform-origin
  нет вовсе, а обе локали проекта (it, ru) пишутся слева направо. Появится
  локаль с письмом справа налево — здесь понадобится 100% вместо 0.
*/
.vel-analysis__fill {
  display: block;
  block-size: 100%;
  inline-size: 100%;
  border-radius: inherit;
  background-color: var(--color-accent);
  transform: scaleX(var(--vel-analysis-fill));
  transform-origin: 0 50%;
}
</style>
