import { onMounted, onUnmounted, watch } from 'vue'
import type { Ref } from 'vue'
import { gsap } from 'gsap'
import { ANALYSIS_MOTION_OK } from '@/features/wizard/analysis-motion'
import type { BankStatus } from '@/composables/useBankAnalysis'

/**
 * Движение ОДНОЙ строки опроса банков (@/features/wizard/VelBankRow.vue):
 * наклон на время проверки и общий жест в момент «проверен».
 *
 * Живёт отдельно от компонента, потому что это отдельная обязанность с
 * отдельной ценой ошибки: contextSafe, matchMedia, поиск узлов по DOM и
 * flush: 'post' у наблюдателя — четыре тонкости, каждая из которых ломается
 * молча, без ошибки в консоли. Рядом с разметкой они тонули, и правка шаблона
 * шла впритык к правке таймлайна.
 *
 * Волна по всему списку сюда не относится: она про тринадцать строк сразу и
 * принадлежит их общему хозяину — VelBankList.
 *
 * Условие движения берётся из analysis-motion, а не заводится своё рядом:
 * строка, список и таймер шага обязаны замолкать при prefers-reduced-motion
 * одновременно, иначе половина экрана продолжит двигаться.
 */

/*
 * auto-animate здесь СНЯТ намеренно, не забыт.
 *
 * Он анимировал появление галочки, ведя ШИРИНУ ячейки статуса. Ширина — это
 * перерасчёт раскладки на каждом кадре, и на замерах ячейка прыгала на 44px:
 * библиотека берёт ширину из кэша, снятого до смены подписи, а подпись при
 * этом вылезала за свой бокс почти на 6px. Тринадцать строк, делающих так
 * по очереди, — это дёрганый список, а не плавный.
 *
 * Появление галочки и без него собрано здесь таймлайном GSAP: подложка знака
 * всходит масштабом, галочка рисуется штрихом. Обе величины — transform и
 * stroke-dashoffset, раскладку они не трогают.
 */

/** Наклон активной строки. Перспектива — на контейнере списка (VelBankList). */
const TILT_S = 0.22
const TILT_DEG = 2.5
const TILT_Z = 10

/** Знак банка всходит пружинно и дольше всех: он ведёт весь жест. */
const MARK_S = 0.42
const MARK_OVERSHOOT = 2.4

/** Галочка идёт следом, по уже поднявшемуся кругу. */
const CHECK_S = 0.26
const CHECK_AT_S = 0.12

/** Вспышка строки: быстро вверх, спокойно вниз — «подсветилась и успокоилась». */
const HALO_UP_S = 0.12
const HALO_DOWN_S = 0.34

type Move = () => void

/**
 * Корень строки приходит снаружи, а не заводится здесь: `ref="…"` в шаблоне
 * привязывается к переменной компонента, и владеть ею обязан он. По той же
 * причине контекст GSAP открывается прямо тут, а не через useGsapContext —
 * тот заводит собственный ref и отдаёт его наружу.
 *
 * @param root корень строки — область видимости контекста и цель наклона
 * @param status геттер статуса строки — по нему наблюдатель и пускает жесты
 */
export function useBankRowMotion(root: Ref<HTMLElement | null>, status: () => BankStatus): void {
  /*
   * Движение собирается не при монтировании, а в момент смены статуса: круг и
   * галочка приходят в DOM вместе со статусом verified, и раньше искать нечего.
   * contextSafe — штатный ответ GSAP на это: обёрнутая функция создаёт твины
   * в том же gsap.context, сколько бы времени ни прошло, и они попадают под
   * ctx.revert(). Без обёртки твин остался бы жить на отсоединённом узле.
   *
   * null означает «двигать нельзя»: при prefers-reduced-motion matchMedia внутрь
   * условия не заходит, наблюдатель ниже молча ничего не вызывает, и статусы
   * меняются мгновенно — классами.
   */
  let enter: Move | null = null
  let verify: Move | null = null

  let ctx: gsap.Context | null = null

  onMounted(() => {
    const scope = root.value
    // Корня нет — значит ref не привязан к элементу шаблона. Контекст без
    // области видимости заводить нельзя: он молча стал бы глобальным.
    if (!scope) return

    ctx = gsap.context(() => {
      gsap.matchMedia().add(ANALYSIS_MOTION_OK, (_self, contextSafe) => {
        if (!contextSafe) return

        /* Наклон переехал из CSS в GSAP не ради GSAP: transform у строки теперь один
           хозяин. Раньше наклон вёл CSS-переход, а волна в конце списка — твин;
           переход ретаргетился бы на каждом кадре твина и размазал бы оба движения. */
        enter = contextSafe(() => {
          const row = root.value
          if (!row) return

          gsap.to(row, { rotateX: TILT_DEG, z: TILT_Z, duration: TILT_S, ease: 'power2.out' })
        }) as Move

        /*
         * ОДИН таймлайн на строку, а не три твина по отдельности. Разница не в
         * красоте записи: тремя твинами моменты «круг всходит», «галочка пошла» и
         * «вспышка гаснет» держались бы лишь тем, что длительности случайно
         * сходятся, и правка любой из них тихо развалила бы жест. Здесь позиции
         * заданы явно, от нуля, и весь жест правится целиком.
         */
        /* Цель масштаба — корень знака, а не его подложка: подложка, кольцо
           и галочка лежат в одной ячейке сетки, и всходить они обязаны вместе,
           одним предметом. */
        verify = contextSafe(() => {
          const row = root.value
          const mark = row?.querySelector<HTMLElement>('.vel-mark')
          const halo = row?.querySelector<HTMLElement>('.vel-bank__halo')
          const check = row?.querySelector<SVGPathElement>('.vel-mark__check path')
          if (!row || !mark || !halo || !check) return

          /* Длину штриха спрашиваем у самого пути, а не считаем по d в уме:
             правка формы галочки в VelBankMark не должна ломать прорисовку. */
          const stroke = check.getTotalLength()
          gsap.set(check, { strokeDasharray: stroke })

          gsap
            .timeline()
            // Строка успокаивается: наклон уходит вместе с окончанием проверки.
            .to(row, { rotateX: 0, z: 0, duration: TILT_S, ease: 'power2.out' }, 0)
            // Круг всходит пружинно — единственная перелётная деталь жеста.
            .fromTo(
              mark,
              { scale: 0 },
              { scale: 1, duration: MARK_S, ease: `back.out(${MARK_OVERSHOOT})` },
              0,
            )
            // Галочка ПРОРИСОВЫВАЕТСЯ: штрих ведут dasharray + dashoffset, а не opacity.
            .fromTo(
              check,
              { strokeDashoffset: stroke },
              { strokeDashoffset: 0, duration: CHECK_S, ease: 'power2.out' },
              CHECK_AT_S,
            )
            .fromTo(
              halo,
              { opacity: 0 },
              { opacity: 1, duration: HALO_UP_S, ease: 'power1.out' },
              0,
            )
            .to(halo, { opacity: 0, duration: HALO_DOWN_S, ease: 'power2.in' }, HALO_UP_S)
        }) as Move

        /* Настройку можно включить прямо во время опроса: matchMedia откатит твины
           и снимет инлайновые значения GSAP. Дальше всё держится на классах, и
           проверенная строка остаётся проверенной — круг на месте, галочка цела. */
        return () => {
          enter = null
          verify = null
        }
      })
    }, scope)
  })

  // Без revert твины остались бы жить на отсоединённом узле: матчмедиа создан
  // внутри контекста, поэтому уезжает вместе с ним.
  onUnmounted(() => {
    ctx?.revert()
    ctx = null
  })

  /* flush: 'post' обязателен: наблюдатель ищет круг и галочку в DOM, а Vue
     добавляет их тем же изменением статуса. Кадр при этом не теряется — очередь
     post отрабатывает до отрисовки, и галочка не мигает нарисованной. */
  watch(
    status,
    (next) => {
      if (next === 'checking') enter?.()
      if (next === 'verified') verify?.()
    },
    { flush: 'post' },
  )
}
