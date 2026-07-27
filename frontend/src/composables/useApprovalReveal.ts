import { onMounted, onUnmounted, ref } from 'vue'
import type { Ref } from 'vue'
import { gsap } from 'gsap'

/**
 * Момент одобрения на финальном экране мастера.
 *
 * Порядок кадров отвечает порядку смысла: сначала знак «да», потом сумма,
 * и только следом короткая радость. Всё это одна временная шкала GSAP —
 * тремя таймерами такую очередь не собрать, они разъедутся на слабой машине.
 *
 * Разметку композабл не приносит, а находит: внутри переданного корня он ждёт
 * `.vel-check`, а в нём `.vel-check__mark`. Это его договор с шаблоном шага —
 * переименуют класс в стилях, и знак останется на месте, но появляться будет
 * без движения, потому что искать GSAP продолжит по-старому.
 */

/** Длина пунктира галочки. Тем же числом задан stroke-dasharray в стилях:
    штрих длиннее самой линии, поэтому на старте знак полностью убран за край. */
const MARK_DASH = 32

/** Роли, из которых собирается конфетти. Сырых цветов в проекте нет —
    значения читаются из тех же токенов, что красят интерфейс. */
const CONFETTI_TOKENS = ['--color-accent', '--color-accent-deep', '--color-line-strong'] as const

/**
 * Загрузчик вынесен отдельно, чтобы из него же вывелся тип. Написать тип
 * руками не выйдет: пакет объявлен через `export =`, и в позиции типа
 * `typeof import(...)` даёт саму функцию, без обёртки с `default`.
 */
const loadConfetti = () => import('canvas-confetti')
type ConfettiApi = Awaited<ReturnType<typeof loadConfetti>>['default']

function themeColors(): string[] | undefined {
  const styles = getComputedStyle(document.documentElement)
  const values = CONFETTI_TOKENS.map((token) => styles.getPropertyValue(token).trim()).filter(
    (value) => value !== '',
  )
  // Пусто — значит темы на месте нет (например, стили ещё не приехали).
  // Пусть библиотека возьмёт свои цвета, чем сыпать частицы без цвета вовсе.
  return values.length > 0 ? values : undefined
}

/**
 * Корень шага приходит снаружи, а не заводится здесь: `ref="…"` в шаблоне
 * привязывается к переменной компонента, и владеть ею обязан он.
 *
 * @param root корень шага — область видимости для селекторов внутри контекста
 * @returns признак «галочка дорисована, сумму можно показывать»
 */
export function useApprovalReveal(root: Ref<HTMLElement | null>): Ref<boolean> {
  /** Сумму показываем не раньше, чем дорисуется галочка. */
  const amountRevealed = ref(false)

  /** Промис модуля: заказан один раз, залпов два. */
  let confettiReady: ReturnType<typeof loadConfetti> | null = null
  /** Тот же модуль, но уже загруженный — нужен, чтобы убрать канвас при уходе. */
  let confettiApi: ConfettiApi | null = null

  /**
   * Один короткий залп: горсть частиц из точки, а не фейерверк на весь экран.
   * ticks ограничивает жизнь частицы — мусор не висит над экраном полминуты.
   */
  async function fire(originX: number, angle: number): Promise<void> {
    if (!confettiReady) return

    const { default: confetti } = await confettiReady
    confettiApi = confetti

    confetti({
      particleCount: 32,
      spread: 52,
      startVelocity: 32,
      ticks: 130,
      gravity: 1.15,
      decay: 0.9,
      scalar: 0.85,
      angle,
      origin: { x: originX, y: 0.62 },
      colors: themeColors(),
      // Страховка самой библиотеки поверх нашей: настройку могли включить
      // между загрузкой модуля и залпом.
      disableForReducedMotion: true,
    })
  }

  let ctx: gsap.Context | undefined

  onMounted(() => {
    const scope = root.value
    if (!scope) return

    ctx = gsap.context(() => {
      /*
       * Штатный механизм GSAP вместо ручной проверки настройки: matchMedia сам
       * следит за условием и откатывает созданное внутри, когда условие ушло.
       * Два условия вместо одного — чтобы у «не двигать интерфейс» была своя
       * ветка: сумму там надо показать сразу, а не ждать анимации, которой нет.
       */
      const mm = gsap.matchMedia()

      mm.add(
        {
          motion: '(prefers-reduced-motion: no-preference)',
          still: '(prefers-reduced-motion: reduce)',
        },
        (self) => {
          if (self.conditions?.motion !== true) {
            amountRevealed.value = true
            return
          }

          /* Модуль тяжёлый и нужен ровно на этом экране: тянем его отдельным
             чанком и только здесь. Пока рисуется галочка, он успевает приехать. */
          confettiReady ??= loadConfetti()

          const timeline = gsap.timeline()

          timeline
            /*
             * Круг вырастает пружинно: back.out даёт лёгкий перелёт, и знак
             * «встаёт на место», а не проявляется.
             *
             * Масштабируется обёртка знака, а не сам <circle>. На экране это
             * одно и то же — галочка в этот момент ещё убрана за край штриха, —
             * но у html-элемента точка роста это его собственный центр, без
             * вычислений. Для svg-фигуры GSAP считает её через getBBox/getCTM,
             * а те врут, пока страница не разложена: круг уезжал из центра.
             */
            .fromTo('.vel-check', { scale: 0 }, { scale: 1, duration: 0.55, ease: 'back.out(1.7)' })
            // Галочка рисуется штрихом, начиная чуть раньше посадки круга:
            // так две части читаются одним движением, а не двумя.
            .fromTo(
              '.vel-check__mark',
              { strokeDashoffset: MARK_DASH },
              { strokeDashoffset: 0, duration: 0.32, ease: 'power2.inOut' },
              '-=0.14',
            )
            .call(() => {
              amountRevealed.value = true
            })
            .call(() => {
              void fire(0.34, 62)
            })
            // Второй залп с другой стороны и с задержкой: два хлопка вместо
            // одного ровного облака.
            .call(
              () => {
                void fire(0.66, 118)
              },
              undefined,
              '+=0.16',
            )
        },
      )
    }, scope)
  })

  onUnmounted(() => {
    ctx?.revert()
    // Канвас конфетти живёт в body и переживёт уход со шага, если его не убрать.
    confettiApi?.reset()
  })

  return amountRevealed
}
