<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEventListener } from '@vueuse/core'
import { useCreditSimulator } from '@/composables/useCreditSimulator'
import { useWizard } from '@/composables/useWizard'
import { prefetchWizard } from '@/features/wizard/lazy-wizard'
import { CREDIT_PURPOSES } from '@/types/velora'
import type { VelSelectOption, CreditPurpose } from '@/types/velora'
import VelField from '@/components/ui/VelField.vue'
import VelSelect from '@/components/ui/VelSelect.vue'
import VelStepper from '@/components/ui/VelStepper.vue'
import VelRange from '@/components/ui/VelRange.vue'
import VelButton from '@/components/ui/VelButton.vue'

/**
 * Калькулятор кредита. Арифметика и нормализация — в useCreditSimulator,
 * здесь только разметка, переводы и показ ошибки.
 */
const { t, n } = useI18n()
const { open: openWizard } = useWizard()

const {
  amount,
  purpose,
  progress,
  canDecrease,
  canIncrease,
  canSubmit,
  calculated,
  decrease,
  increase,
  calculate,
  min,
  max,
  step,
} = useCreditSimulator()

/** Ошибку показываем только после попытки отправки, а не сразу при загрузке. */
const attempted = ref(false)

const purposeOptions = computed<VelSelectOption[]>(() =>
  CREDIT_PURPOSES.map((value) => ({
    value,
    label: t(`simulator.purposes.${value}`),
  })),
)

/** Мост между строковой моделью селекта и типизированной целью кредита. */
const purposeValue = computed<string>({
  get: () => purpose.value,
  set: (value) => {
    purpose.value = value as CreditPurpose | ''
  },
})

const amountText = computed(() => n(amount.value, 'currency'))
const minText = computed(() => n(min, 'currency'))
const maxText = computed(() => n(max, 'currency'))

const purposeError = computed(() =>
  attempted.value && !canSubmit.value ? t('simulator.needPurpose') : undefined,
)

const readyDetail = computed(() =>
  purpose.value === ''
    ? ''
    : t('simulator.readyDetail', {
        purpose: t(`simulator.purposes.${purpose.value}`),
        amount: amountText.value,
      }),
)

/*
 * ПРОГРЕВ МАСТЕРА. Мастер лежит отдельным куском (см. lazy-wizard.ts), и
 * единственная цена такого разделения — ожидание сети на нажатии «Calcola».
 * Убираем её, начиная загрузку по первому признаку намерения: указатель зашёл
 * на форму или фокус попал внутрь неё с клавиатуры. Между этим моментом и
 * нажатием человек выбирает цель и сумму — этого времени куску хватает с
 * запасом, и к нажатию он уже в кеше модулей.
 *
 * Оба события — через useEventListener: слушатель снимается вместе с областью
 * видимости компонента. Сам prefetchWizard идемпотентен, поэтому повторные
 * наведения сеть не трогают.
 */
const form = useTemplateRef<HTMLFormElement>('form')
useEventListener(form, 'pointerenter', prefetchWizard)
useEventListener(form, 'focusin', prefetchWizard)

function onSubmit(): void {
  attempted.value = true
  // Сумма и цель уже лежат в сторе, поэтому мастер подхватит их сам —
  // и шаг выбора цели пропускаем, её только что спросили здесь.
  if (calculate()) openWizard('amount')
}
</script>

<template>
  <form
    ref="form"
    class="vel-sim-card flex flex-col gap-6 rounded-panel border border-line p-6"
    @submit.prevent="onSubmit"
  >
    <VelField :label="t('simulator.purposeLabel')" :error="purposeError">
      <VelSelect
        v-model="purposeValue"
        :options="purposeOptions"
        :placeholder="t('simulator.purposePlaceholder')"
      />
    </VelField>

    <VelField :label="t('simulator.amountLabel')">
      <VelStepper
        :display="amountText"
        :can-decrease="canDecrease"
        :can-increase="canIncrease"
        :decrease-label="t('simulator.decrease')"
        :increase-label="t('simulator.increase')"
        @decrease="decrease"
        @increase="increase"
      />

      <VelRange
        v-model="amount"
        :min="min"
        :max="max"
        :step="step"
        :progress="progress"
        :label="t('simulator.amountLabel')"
        :value-text="amountText"
      />

      <div class="vel-num flex justify-between text-xs text-muted">
        <span>{{ minText }}</span>
        <span>{{ maxText }}</span>
      </div>
    </VelField>

    <div class="flex flex-col gap-3">
      <VelButton
        type="submit"
        size="lg"
        block
        onclick="trackMetaOnce('loan_step_1', 'ViewContent', { content_name: 'LoanAmountAndPurposeSelected', step: 1 });"
      >
        {{ t('simulator.submit') }}
        <span aria-hidden="true">→</span>
      </VelButton>

      <p
        v-if="calculated"
        class="rounded-control border border-accent bg-surface px-3 py-2.5 text-center text-xs"
        role="status"
      >
        <b class="font-semibold text-accent">{{ t('simulator.ready') }}</b>
        <span class="block text-muted">{{ readyDetail }}</span>
      </p>

      <p v-else class="text-center text-xs text-muted">{{ t('simulator.note') }}</p>
    </div>
  </form>
</template>

<style scoped>
/*
  Карточка прозрачная, чтобы сквозь неё читался каркас знака Velora, который
  рисует фоновый канвас первого экрана. На узком экране карточка занимает
  почти всю ширину и без этого закрывала бы знак целиком.

  ХУДШИЙ ФОН ВЗЯТ ИЗ САМОЙ СЦЕНЫ, А НЕ ПРИДУМАН. По hero-canvas-scene.ts канвас
  кладёт ровно два слоя обычным (не аддитивным) смешиванием поверх
  --color-ground #f4f7fc:

      сетка точек   --color-accent      #1d4fd8  opacity 0.42
      каркас знака  --color-accent-deep #12306e  opacity 0.55

  Отсюда два разных «худших фона», и разница между ними принципиальна:

      A  одиночное ребро каркаса по фону                     rgb(120,138,174)
         0.55·(18,48,110) + 0.45·(244,247,252)
      B  пересечение двух рёбер, сверху точка сетки          rgb( 49, 84,171)
         второе ребро → (64,88,139), затем 0.42·(29,79,216)

  A — протяжённое пятно: размытие подложки его сдвигает, но не убирает, и
  считать надо по нему. B — точечное совпадение в одном месте экрана, и
  размытие размазывает его сильнее всего именно потому, что оно точечное.

  ДОЛЯ И РАЗМЫТИЕ ПОДНЯТЫ ПО ПРЯМОЙ ПРОСЬБЕ: «прозрачнее и замыленнее». Путь
  значений стоит помнить целиком, потому что он ходил в обе стороны:
  0.84/10px → 0.55/18px → 0.40/10px → 0.35/16px.

  ЧТО ДАЁТ РАЗМЫТИЕ, А ЧТО ОТНИМАЕТ. Рёбра каркаса тонкие, 1–2px. На 18px они
  размазывались до полной ровности, и под карточкой оставался равномерный
  светлый фон без следа знака — ради этого шаг назад к 10px и делался. На 16px
  знак снова становится мягче, чем был; это ровно то, о чём просили, и цена
  известна: форма читается слабее. Доля 0.35 частично отыгрывает её обратно —
  чем прозрачнее подложка, тем больше знака проходит сквозь размытие.

  Контраст при 0.35 с вариантами «по стеклу» (заведены ниже):

      текст                      фон A       фон B
      --color-fg   #16294a        6.86        4.72
      muted        #2d4066        4.88        3.36
      faint        #2d4066        4.88        3.36
      danger       #7d1611        4.99        3.43

  ЧЕСТНО ПРО ЗАПАС. По фону A норму 4.5 проходит всё, но запас продолжает
  таять от шага к шагу: 4.96 → 4.72 → 4.88 у приглушённого текста, и держится
  он теперь только потому, что палитра по стеклу темнеет вместе с подложкой.
  Темнеть ей осталось недолго: следующий шаг прозрачности упрётся в основной
  цвет текста, и ступень «приглушённый» исчезнет совсем — faint с muted уже
  слились в одно значение.

  По фону B норму не проходит ничего, кроме основного текста, и там всё держит
  размытие. Это осознанный размен, а не недосмотр: фон B — точечное совпадение
  (пересечение двух рёбер плюс точка сетки), и шестнадцать пикселей размытия
  стирают именно точечные совпадения. В таблицу размытие не заложено — оно идёт
  в запас, а не в обоснование доли.
*/
.vel-sim-card {
  /*
    ПАЛИТРА ПО СТЕКЛУ. На полупрозрачной подложке цвет под текстом темнее, чем
    на карточке-листе, и штатные приглушённые цвета норму 4.5 здесь уже не
    проходят: muted #4e668c по фону A даёт всего 3.55, по фону B — 2.75.

    Переопределяются ПЕРЕМЕННЫЕ, а не правила: подписи внутри (vel-label,
    строка «от … до …», сноска, текст ошибки поля) и вложенные контролы —
    селект, степпер, ползунок — берут цвет из них же и подхватывают поправку
    сами. Отдельных классов под это заводить не нужно.

    Иерархия сохраняется: fg #16294a → muted #2d4066 → faint #334769.
  */
  --color-muted: #2d4066;
  /* faint сравнялся с muted, и это не копипаста. По фону A он давал 4.43 при
     норме 4.5 — на такой прозрачной подложке ступень между ними уже не
     помещается: место, где приглушённый текст ещё читается, одно на двоих. */
  --color-faint: #2d4066;
  --color-danger: #7d1611;

  background-color: color-mix(in oklab, var(--color-surface) 35%, transparent);
  border-color: color-mix(in oklab, var(--color-line) 65%, transparent);
  backdrop-filter: blur(16px) saturate(1.14);
  box-shadow: 0 0.75rem 2rem color-mix(in oklab, var(--color-fg) 8%, transparent);
}

/*
  Плашка «заявка готова» держит собственный сплошной фон (bg-surface), то есть
  стеклом не является. Возвращаем ей штатную палитру: на белом поправка не
  нужна, а приглушённый текст в ней стал бы темнее соседнего без причины.
*/
.vel-sim-card :where([role='status']) {
  --color-muted: #4e668c;
  --color-faint: #587094;
}

/*
  Три случая, когда подложка становится СПЛОШНОЙ. Прозрачность без размытия —
  это линии каркаса под текстом, то есть потеря читаемости ради украшения;
  просьбу системы убрать прозрачность выполняем буквально (у части людей
  полупрозрачные слои вызывают трудности с фокусировкой и укачивание); в режиме
  высокой контрастности подложка обязана быть системной.

  Вместе со сплошным фоном возвращается и штатная палитра: стекла больше нет,
  и затемнять текст не от чего.
*/
@supports not (backdrop-filter: blur(1px)) {
  .vel-sim-card {
    --color-muted: #4e668c;
    --color-faint: #587094;
    --color-danger: #b3261e;

    background-color: var(--color-surface);
  }
}

/*
  СИСТЕМНАЯ ПРОСЬБА «МЕНЬШЕ ПРОЗРАЧНОСТИ» — УМЕНЬШАЕМ, А НЕ ОТКЛЮЧАЕМ.

  Здесь стояло background-color: var(--color-surface), то есть карточка
  становилась сплошной. Практический итог оказался неожиданным: в Windows
  флажок «Эффекты прозрачности» выключают сплошь и рядом ради
  производительности, а не по нужде, и Chrome докладывает это как
  prefers-reduced-transparency: reduce. Владелец продукта дважды просил
  карточку прозрачнее, менял долю — и не видел НИКАКОЙ разницы: до экрана
  доходила эта ветка, а не 0.35 из правила выше. Замер: computed
  background-color = rgb(255,255,255) при заданном alpha 0.35.

  Медиапризнак называется reduce, а не disable, и 0.35 → 0.80 — это честное
  уменьшение больше чем вдвое. Что действительно убирается целиком, так это
  РАЗМЫТИЕ: именно оно даёт эффект «плывущего» слоя, от которого у части людей
  трудности с фокусировкой, и именно оно дороже всего для слабой видеокарты.

  Палитра остаётся «по стеклу», а не возвращается к штатной: подложка всё ещё
  не сплошная. По худшему фону B тёмный приглушённый цвет даёт здесь 7.57 при
  норме 4.5 — запас втрое больше, чем в основном режиме.
*/
@media (prefers-reduced-transparency: reduce) {
  .vel-sim-card {
    background-color: color-mix(in oklab, var(--color-surface) 80%, transparent);
    backdrop-filter: none;
  }
}

@media (forced-colors: active) {
  .vel-sim-card {
    background-color: Canvas;
    backdrop-filter: none;
  }
}
</style>
