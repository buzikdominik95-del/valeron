<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import { accountStepHref } from '@/features/account/account-anchors'
import VelStepRow from '@/features/account/VelStepRow.vue'
import VelStepMeter from '@/features/account/VelStepMeter.vue'

/**
 * Единственный на Home список шагов заявки: строка состояния, пять шагов по
 * одной строке каждый и полоса пройденного под ними.
 *
 * ПОЧЕМУ ОДИН БЛОК, А НЕ ДВА. Раньше рядом стоял «Prossimi passi» с теми же
 * пятью шагами и абзацем-пояснением под каждым.
 * Два списка одного и того же — это не «подробнее», а один и тот же экран
 * дважды: пять строк здесь, пять строк там и ещё пять кружков в полосе шапки.
 * Пояснения («Decisione positiva dai nostri partner bancari» и подобные)
 * ничего не добавляли к названию шага и к его состоянию, поэтому с экрана
 * ушли, а вслед за ними — и второй компонент, и ключи account.steps.*.text.
 * Строку-пояснение вернуть можно, но заводить её придётся заново и осознанно:
 * молча лежащий в локали текст, который никто не показывает, — это обещание
 * экрана, которого нет.
 *
 * НОМЕРА КРУЖКОВ УБРАНЫ: порядок несёт сам <ol>, а цифры 1…5 уже нарисованы
 * полосой шагов в шапке. На их месте знак шага — он отвечает на вопрос,
 * которого номер не закрывал вовсе: что это за шаг.
 *
 * СТРОКИ СОБИРАЮТСЯ ЗДЕСЬ и уходят в VelStepRow уже переведёнными: ключи
 * i18n знает список, а строка — только свою разметку.
 *
 * ПОЛОСА ВЫНЕСЕНА В VelStepMeter: у неё своя роль в дереве доступности и своя
 * анимация появления. Значение полоса объявляет сама (aria-valuetext), поэтому
 * та же строка счётчика на экране помечена aria-hidden.
 */
const { t } = useI18n()
const { steps, total, doneCount, allDone } = useAccount()

const counterText = computed(() =>
  t('account.progress.counter', { done: doneCount.value, total }),
)

const items = computed(() =>
  steps.value.map((step) => {
    const title = t(`account.steps.${step.id}.title`)

    return {
      ...step,
      title,
      /** Ссылка есть только у шага, который закрывает сам пользователь. */
      href: step.needsAction ? accountStepHref(step.id) : undefined,
      goLabel: t('account.progress.goStep', { step: title }),
      statusLabel: t(`account.tracker.status.${step.status}`),
    }
  }),
)

const root = ref<HTMLElement | null>(null)

/*
 * Число шагов уезжает в CSS-переменную: из неё считается ширина одного отрезка
 * полосы. Инлайн-стилей в шаблонах нет, а :style в шаблоне — это они и есть;
 * приём и причина те же, что в VelRange и VelTrackerBar. Вписать «5» прямо в
 * стили нельзя: шагов однажды станет шесть, и полоса обязана поехать за
 * списком сама.
 */
watchEffect(
  () => {
    const element = root.value
    if (element === null) return
    element.style.setProperty('--vel-steps-total', String(total))
  },
  { flush: 'post' },
)
</script>

<template>
  <section ref="root" class="vel-steps rounded-panel border border-line bg-surface p-5 sm:p-6">
    <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <!-- Строка уведомления панели. На эталоне она меняется вместе с
           состоянием: пока шаги не закрыты — «Per il prelievo dei fondi,
           completa tutti gli step», когда закрыты все — «Fondi pronti per il
           prelievo — procedi ora!». -->
      <p class="text-sm font-semibold text-fg">
        {{ allDone ? t('account.progress.ready') : t('account.progress.lead') }}
      </p>

      <!-- То же самое полоса объявляет через aria-valuetext. Надзаголовочный
           .vel-label здесь не берём: он поднимает строку в верхний регистр,
           а счётчик в оригинале написан обычными буквами. -->
      <p class="vel-num text-xs font-semibold text-muted" aria-hidden="true">{{ counterText }}</p>
    </div>

    <ol class="vel-steps__list" :aria-label="t('account.tracker.label')">
      <VelStepRow
        v-for="item in items"
        :key="item.id"
        :kind="item.id"
        :status="item.status"
        :title="item.title"
        :status-label="item.statusLabel"
        :go-text="item.href === undefined ? undefined : t('account.progress.go')"
        :href="item.href"
        :go-label="item.goLabel"
      />
    </ol>

    <VelStepMeter
      class="vel-steps__meter"
      :done="doneCount"
      :total="total"
      :value-text="counterText"
      :label="t('account.progress.meterLabel')"
    />
  </section>
</template>

<style scoped>
.vel-steps {
  /* Запасное число шагов: пока post-эффект не отработал, полоса стоит без
     разрезов — это честнее, чем нарисовать не то количество отрезков. */
  --vel-steps-total: 1;
}

.vel-steps__list {
  margin: 1.1rem 0 0;
  padding: 0;
  list-style: none;
}

/* Полоса стоит ПОД списком, как на эталоне: сначала перечень шагов, потом
   итог по ним. Отступ задаёт блок, а не сама полоса: расстояние — свойство
   раскладки, а не индикатора. */
.vel-steps__meter {
  margin-top: 1.1rem;
}

/*
  Пять отрезков по числу шагов: доля читается как «три шага из пяти», а не как
  проценты на глаз. Разрезы — цветом панели, то есть это зазоры, а не линии
  поверх заливки; ширина отрезка выведена из --vel-steps-total, поэтому
  шестой шаг ничего здесь подпиливать не заставит.

  Последний разрез приходится ровно на 100% ширины и уходит в скруглённый
  правый край полосы (overflow: hidden у неё уже стоит) — на экране его нет.
*/
.vel-steps__meter::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    90deg,
    transparent 0,
    transparent calc(100% / var(--vel-steps-total) - 2px),
    var(--color-surface) calc(100% / var(--vel-steps-total) - 2px),
    var(--color-surface) calc(100% / var(--vel-steps-total))
  );
}
</style>
