<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { gsap } from 'gsap'
import { useTimeoutFn } from '@vueuse/core'
import { useGsapContext } from '@/composables/useGsapContext'
import VelFinalizingOrbit from '@/features/wizard/VelFinalizingOrbit.vue'
import {
  FINALIZING_CAPTION_MS,
  FINALIZING_MOTION_OK,
  FINALIZING_STEP_KEYS,
  FINALIZING_TOTAL_MS,
} from '@/features/wizard/finalizing'

/**
 * Шаг «финализация»: пауза между опросом банков и результатом.
 *
 * Экран ничего не спрашивает — он держит внимание, пока заявка «дозревает»,
 * и честно показывает, сколько ждать. Поэтому кнопки «дальше» у него нет:
 * готовность он сообщает сам через done, а куда идти — решает VelWizardFlow.
 *
 * Три вещи говорят об одном и том же разными средствами: механизм из дуг —
 * что работа идёт, строка подписей — что именно делается прямо сейчас,
 * полоса внизу — сколько осталось.
 */
const emit = defineEmits<{ done: [] }>()

const { t } = useI18n()

/**
 * Какая стадия оформления сейчас на экране. Индекс, а не строка: подпись
 * обязана пересчитаться при смене языка, а сохранённый текст остался бы
 * на прежнем.
 */
const stepIndex = ref(0)

/**
 * Подписи — стадии ОФОРМЛЕНИЯ, а не отчёт о проверках: «сверяем», «готовим».
 * Экран не вправе сообщать, что банк что-то одобрил, — он про это ничего
 * не знает, а пользователь читает такую строку как решение по своей заявке.
 */
const captionText = computed(() =>
  t(`wizard.finalizing.steps.${FINALIZING_STEP_KEYS[stepIndex.value]}`),
)

/*
 * Таймер из VueUse, а не setTimeout: useTimeoutFn снимает его сам при
 * размонтировании (tryOnScopeDispose). Голый setTimeout пережил бы уход
 * со шага — например, по кнопке «назад» — и дёрнул бы done уже мёртвого
 * компонента, утащив пользователя вперёд из совсем другого места мастера.
 *
 * Переход намеренно висит на таймере, а не на onComplete полосы прогресса:
 * при prefers-reduced-motion часть анимаций не создаётся вовсе, а вкладка
 * в фоне не получает кадров — обещание «анимация когда-нибудь закончится»
 * не выполняется, и пользователь остался бы на этом экране навсегда.
 * Обе длительности приходят из FINALIZING_TOTAL_MS, поэтому разъехаться
 * им негде.
 */
useTimeoutFn(() => emit('done'), FINALIZING_TOTAL_MS)

/** Длительность одного перетекания подписи, с. Половина — на уход, половина — на приход. */
const CAPTION_FADE_S = 0.16

const root = useGsapContext(() => {
  // Выборка от корня шага — та самая причина, по которой контексту передаётся
  // scopeElement: селектор внутри контекста без области видимости прошёлся бы
  // по всему документу.
  const scope = root.value
  const fill = scope?.querySelector<HTMLElement>('.vel-fin__fill')
  const line = scope?.querySelector<HTMLElement>('.vel-fin__text')
  if (!fill || !line) return

  /*
   * Полоса заполняется ВНЕ matchMedia — намеренно.
   *
   * Отключают не движение вообще, а движение, которое не несёт сведений:
   * вращение, пульсацию, перелистывание. Определённый прогресс — это
   * содержание, и при 'reduce' он остаётся единственным ответом на вопрос
   * «долго ещё». Само движение здесь предельно скромное: один линейный
   * transform без колебаний, разворотов и повторов.
   *
   * scaleX, а не width: ширина считается раскладкой на каждом кадре,
   * а трансформ отдаётся композитору. transformOrigin передан твину, потому
   * что GSAP пишет своё значение инлайном и перебил бы объявление из CSS.
   */
  gsap.fromTo(
    fill,
    { scaleX: 0 },
    {
      scaleX: 1,
      duration: FINALIZING_TOTAL_MS / 1000,
      ease: 'none',
      transformOrigin: 'left center',
    },
  )

  gsap.matchMedia().add(FINALIZING_MOTION_OK, () => {
    const tl = gsap.timeline()

    FINALIZING_STEP_KEYS.forEach((_, index) => {
      // Первая подпись уже на экране с первого кадра — перетекать не во что.
      if (index === 0) return

      /*
       * Позиция КАЖДОГО твина задана явно, от начала таймлайна. Складывать
       * их встык было бы короче, но тогда момент показа третьей подписи
       * зависел бы от длительности перетекания второй, и правка CAPTION_FADE_S
       * тихо развалила бы всё расписание.
       */
      const at = (index * FINALIZING_CAPTION_MS) / 1000

      tl.to(
        line,
        { opacity: 0, yPercent: -40, duration: CAPTION_FADE_S, ease: 'power1.in' },
        at - CAPTION_FADE_S,
      )

      /*
       * immediateRender: false ОБЯЗАТЕЛЕН. По умолчанию fromTo применяет
       * начальные значения сразу при создании твина, а не в свою позицию
       * на таймлайне: все три перетекания выставили бы подписи opacity: 0
       * ещё до первого кадра, и строка начала бы шаг невидимой.
       *
       * Текст подменяется в onStart, то есть в кадре, где подпись уже
       * полностью прозрачна: Vue успевает пропатчить DOM до того, как
       * прозрачность поползёт вверх, и подмены на экране не видно.
       */
      tl.fromTo(
        line,
        { opacity: 0, yPercent: 40 },
        {
          opacity: 1,
          yPercent: 0,
          duration: CAPTION_FADE_S,
          ease: 'power1.out',
          immediateRender: false,
          onStart: () => {
            stepIndex.value = index
          },
        },
        at,
      )
    })

    /*
     * Пользователь может включить «уменьшить движение» прямо во время шага.
     * Тогда matchMedia откатит твины — но не индекс: подпись замерла бы
     * на той стадии, до которой успела дойти. Возвращаем её к первой,
     * как и требует режим.
     */
    return () => {
      stepIndex.value = 0
    }
  })
})
</script>

<template>
  <section
    ref="root"
    class="flex flex-col items-center gap-8 rounded-panel border border-line bg-surface px-6 py-12 text-center sm:px-10 sm:py-16"
  >
    <VelFinalizingOrbit />

    <div class="flex flex-col items-center gap-3">
      <h1 class="text-2xl sm:text-3xl">{{ t('wizard.finalizing.title') }}</h1>
      <p class="text-sm text-muted">{{ t('wizard.finalizing.subtitle') }}</p>
    </div>

    <div class="flex w-full flex-col items-center gap-5">
      <!--
        Подпись НЕ живая область, и это осознанно.

        Здесь стоял role="status", но на этом шаге он оказался вреден. Подписи
        сменяются каждые FINALIZING_CAPTION_MS, весь шаг живёт
        FINALIZING_TOTAL_MS — то есть вежливая область получала четыре
        сообщения подряд и исчезала вместе с шагом раньше, чем очередь
        дочитывалась. Скринридер озвучивал обрывок, а с учётом второй живой
        области в VelWizard («Avanzamento: 97%») две очереди ещё и налезали
        друг на друга.

        Поэтому объявление на шаге ровно одно — прогресс из VelWizard, он
        общий для всех шагов и меняется предсказуемо. Подписи остаются тем,
        чем они и являются на самом деле: ритмом ожидания для глаза.
        Смысл шага озвучке доступен — VelWizard переводит фокус на <main>,
        и заголовок читается вместе с содержимым.
      -->
      <p class="vel-fin__caption">
        <span class="vel-fin__text vel-label text-accent-deep">{{ captionText }}</span>
      </p>

      <!-- Полоса декоративна: сколько осталось, словами не сообщают — это
           не обязательство, а ритм ожидания. Дублировать её в озвучку
           значило бы перебивать подписи цифрами. -->
      <span class="vel-fin__bar" aria-hidden="true">
        <span class="vel-fin__fill"></span>
      </span>
    </div>
  </section>
</template>

<style scoped>
/*
  Высота строки закреплена запасом под две строки: подписи разной длины,
  и на узком экране одна из них переносится. Без запаса полоса прогресса
  под ней прыгала бы вверх-вниз на каждой смене стадии.

  Сама подпись двигается трансформом, а он раскладку не трогает, — дёргать
  соседей перетеканию нечем.
*/
.vel-fin__caption {
  display: flex;
  align-items: center;
  justify-content: center;
  min-block-size: 2.5rem;
}

.vel-fin__bar {
  inline-size: 100%;
  max-inline-size: 18rem;
  block-size: 2px;
  background-color: var(--color-track);
}

/*
  Заливка градиентом от глубокого к яркому — та же логика, что у полосы
  прогресса мастера: линия набирает силу к своему краю, а не лежит
  однотонной чертой.

  Пустое состояние объявлено здесь, а не только в твине: между вставкой
  разметки и первым кадром GSAP полоса иначе успела бы показаться полной.
  transform-origin GSAP всё равно перепишет своим — см. комментарий в скрипте.
*/
.vel-fin__fill {
  display: block;
  block-size: 100%;
  inline-size: 100%;
  transform: scaleX(0);
  transform-origin: left center;
  background-image: linear-gradient(90deg, var(--color-accent-deep), var(--color-accent));
}
</style>
