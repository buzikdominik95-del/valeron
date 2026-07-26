import { inject, provide } from 'vue'
import type { InjectionKey } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * Хореография появления: единственное место, где записано, КАК на этом сайте
 * блок выходит в кадр. Двое зовущих — @/components/ui/VelStage.vue (секция
 * целиком) и @/components/ui/VelReveal.vue (одиночный блок вне сцены), и
 * оба берут параметры отсюда: разъехавшиеся длительности сразу читаются как
 * две разные системы движения на одной странице.
 *
 * Движение объясняет переход, а не развлекает: 16 пикселей подъёма и полсекунды
 * — ровно столько, чтобы глаз заметил направление и пошёл за ним вниз.
 */

/** Метка на корне VelReveal: по ней сцена собирает свои цели. */
export const REVEAL_ATTR = 'data-vel-reveal'
/** Собственная задержка блока в миллисекундах — проп delayMs, см. VelReveal. */
export const REVEAL_DELAY_ATTR = 'data-vel-reveal-delay'
/** Метка «появляться с наклоном» — проп tilt, см. VelReveal. */
export const REVEAL_TILT_ATTR = 'data-vel-reveal-tilt'
/** Селектор целей внутри сцены */
export const REVEAL_SELECTOR = `[${REVEAL_ATTR}]`

/**
 * Условие для gsap.matchMedia(). Штатный механизм GSAP вместо ручной проверки:
 * matchMedia сам подписывается на смену настройки и откатывает всё, что создано
 * внутри условия, когда пользователь просит не двигать интерфейс. Ручная
 * проверка отработала бы один раз при монтировании и на смену не отозвалась.
 */
export const REVEAL_MOTION_OK = '(prefers-reduced-motion: no-preference)'

/**
 * Точка входа в кадр: верх блока прошёл 88% высоты окна.
 *
 * Экспортируется, потому что заголовок секции появляется по собственному
 * триггеру (@/components/ui/VelSplitHeading.vue): свою цифру он завести не
 * вправе — заголовок и карточки под ним обязаны входить в кадр по одной черте.
 */
export const REVEAL_START = 'top 88%'
const REVEAL_DURATION = 0.5
const REVEAL_EASE = 'power2.out'
/** Подъём при появлении, px */
const REVEAL_SHIFT = 16
/** Шаг лесенки между соседями одной пачки, с */
const REVEAL_STEP = 0.08
/**
 * Потолок пачки. Восемь вопросов FAQ, вошедшие в кадр разом, при сплошной
 * лесенке заставили бы последний ждать больше полусекунды после первого.
 * ScrollTrigger.batch сам разложит их на группы по шесть, и отсчёт лесенки
 * в каждой начнётся заново.
 */
const REVEAL_BATCH_MAX = 6
/** Окно сбора пачки, с */
const REVEAL_INTERVAL = 0.1

/**
 * Наклон карточки при появлении, градусы.
 *
 * Шесть — это ровно столько, чтобы карточка прочиталась лежащей чуть глубже
 * страницы и выпрямилась к концу подъёма. Больше десяти уже даёт заметное
 * искажение текста в первых кадрах: буквы верхней строки едут в перспективе,
 * и заголовок карточки на мгновение становится нечитаемым.
 *
 * Перспективу задаёт РОДИТЕЛЬ — класс .vel-depth в @/assets/styles/main.css.
 * Здесь её ставить нельзя: transformPerspective пишется в собственный transform
 * элемента, и функция-значение вернула бы неповёрнутым карточкам
 * `perspective(0px)`, то есть невалидный transform целиком.
 */
const REVEAL_TILT = 6

/** Наклон конкретной цели: помеченные — REVEAL_TILT, остальные — ноль. */
function tiltOf(target: Element): number {
  return target.hasAttribute(REVEAL_TILT_ATTR) ? REVEAL_TILT : 0
}

/**
 * Состояние ожидания.
 *
 * Прозрачность БЕЗ visibility — намеренно. autoAlpha при нуле ставит
 * `visibility: hidden`, а такой блок выпадает из порядка обхода Tab: на
 * лендинге, где ниже первого экрана скрыто всё, клавиатурному пользователю
 * стало бы некуда уходить фокусом. Прозрачный блок фокус принимает, браузер
 * подкручивает к нему страницу, и появление отрабатывает штатно; поверх этого
 * сцена ещё и показывает блок мгновенно по focusin — см. revealNow.
 *
 * В конечном кадре autoAlpha честно доводится до 1 и заодно снимает возможный
 * visibility: hidden, если его кто-то поставил снаружи.
 */
function hiddenVars(): gsap.TweenVars {
  /* rotationX — каноническое имя поворота вокруг горизонтальной оси в GSAP
     (rotateX принимается как псевдоним). Значение считается на каждую цель
     отдельно: в одной пачке лежат и карточки с глубиной, и обычные блоки. */
  return { opacity: 0, y: REVEAL_SHIFT, rotationX: (_i: number, target: Element) => tiltOf(target) }
}

function shownVars(): gsap.TweenVars {
  return { autoAlpha: 1, y: 0, rotationX: 0, duration: REVEAL_DURATION, ease: REVEAL_EASE }
}

/** Собственная задержка блока, с. Ноль для всех, кто её не просил. */
function ownDelay(target: Element): number {
  const raw = target.getAttribute(REVEAL_DELAY_ATTR)
  if (raw === null) return 0
  const ms = Number(raw)
  return Number.isFinite(ms) && ms > 0 ? ms / 1000 : 0
}

/**
 * Лесенка внутри пачки. Именно она и есть хореография секции: заголовок,
 * подзаголовок и карточки входят в кадр вместе, а выезжают по очереди —
 * потому что это ОДИН твин со stagger, а не N твинов с посчитанными руками
 * задержками. Порядок берётся из DOM, то есть из порядка чтения.
 */
function revealStagger(index: number, target: Element): number {
  return index * REVEAL_STEP + ownDelay(target)
}

/** Прячет цели перед появлением. Прячет СКРИПТ — в таблице стилей такого нет. */
export function hideReveal(targets: Element[]): void {
  if (targets.length === 0) return
  gsap.set(targets, hiddenVars())
}

/**
 * Секция: одна пачка — один твин со stagger.
 *
 * ScrollTrigger.batch — штатная замена IntersectionObserver: он собирает
 * элементы, вошедшие в кадр за общее окно, и отдаёт их одним массивом.
 * Пачке хватает единственного onEnter без onLeaveBack: показанное остаётся
 * показанным, что равно toggleActions 'play none none none' у одиночного блока.
 */
export function batchReveal(targets: Element[]): void {
  if (targets.length === 0) return

  hideReveal(targets)

  ScrollTrigger.batch(targets, {
    start: REVEAL_START,
    once: true,
    interval: REVEAL_INTERVAL,
    batchMax: REVEAL_BATCH_MAX,
    onEnter: (batch) => {
      gsap.to(batch, { ...shownVars(), stagger: revealStagger, overwrite: 'auto' })
    },
  })
}

/**
 * Одиночный блок вне сцены: свой ScrollTrigger, те же цифры.
 * @param delayMs собственная задержка блока (проп delayMs)
 */
export function singleReveal(target: Element, delayMs: number): void {
  gsap.set(target, hiddenVars())

  gsap.to(target, {
    ...shownVars(),
    delay: Number.isFinite(delayMs) && delayMs > 0 ? delayMs / 1000 : 0,
    scrollTrigger: {
      trigger: target,
      start: REVEAL_START,
      toggleActions: 'play none none none',
    },
  })
}

/**
 * Показать немедленно. Нужно ровно для фокуса: клавиатура может увести в блок,
 * который ещё не проявился, и целиться в невидимое пользователь не должен.
 * overwrite снимает твин появления, если он как раз играл.
 */
export function revealNow(target: Element): void {
  /* rotationX сбрасывается наравне с остальным — иначе блок, показанный по
     фокусу, остался бы навсегда наклонённым: overwrite снимает твин появления,
     который довёл бы наклон до нуля, а сам ноль поставить забыли. Набор
     обязан совпадать с hiddenVars() ключ в ключ. */
  gsap.set(target, { autoAlpha: 1, y: 0, rotationX: 0, overwrite: 'auto' })
}

/**
 * Признак «этой секцией уже занимается сцена».
 *
 * Сцена объявляет себя в setup, то есть раньше, чем дети успевают решить свою
 * судьбу, — поэтому VelReveal внутри сцены не заводит собственный ScrollTrigger
 * и не анимируется дважды.
 */
const RevealStageKey: InjectionKey<true> = Symbol('vel-reveal-stage')

export function provideRevealStage(): void {
  provide(RevealStageKey, true)
}

export function useRevealStage(): boolean {
  return inject(RevealStageKey, false)
}
