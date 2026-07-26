<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  tryOnScopeDispose,
  useDevicePixelRatio,
  useDocumentVisibility,
  useIntersectionObserver,
  usePreferredReducedMotion,
  useRafFn,
  useResizeObserver,
} from '@vueuse/core'
import {
  readBrandShades,
  readScenePalette,
} from '@/features/account/scene/transfer-palette'
import type {
  SceneBrandShades,
  SceneLook,
  ScenePalette,
} from '@/features/account/scene/transfer-palette'
import type { BackgroundColors } from '@/features/account/scene/draw-background'
import type { AmountParts, OverlayTexts } from '@/features/account/scene/draw-overlay'
import {
  advanceRuntime,
  createSceneRuntime,
  drawTransferFrame,
  REDUCED_MOTION_FRAME,
  resizeSceneBuffer,
  settleRuntime,
  tickScene,
} from '@/features/account/scene/transfer-scene'

/**
 * Сцена перевода на канвасе: банк, ядро Velora, получатель, монеты и
 * интерфейсный слой. Перенос присланной владельцем продукта анимации 1920×1080.
 *
 * Здесь только КОГДА рисовать: размеры, плотность экрана, жизненный цикл кадра
 * и сбор текстов из локали. Само рисование — в модулях scene/*.ts, ни один из
 * них про Vue не знает (тот же приём, что в VelHeroCanvas и VelSignaturePad).
 */

const props = withDefaults(
  defineProps<{
    /** Прогресс перевода, 0…1. Из пропов, а не из позиции в цикле сцены. */
    progress: number
    /** Одобренная сумма в евро. */
    amount: number
    /** Имя получателя для подписи узла. */
    name: string
    /** Реквизиты получателя, уже в маскированном виде. */
    iban: string
    /**
     * Остаток времени. ДОБАВЛЕН к списку пропов осознанно: без него требование
     * «остаток обязан идти из пропов» невыполнимо. Эталон печатал 298·(1-p)
     * секунд, то есть выдумывал время из позиции в цикле, а считать остаток
     * заново из progress внутри сцены значило бы вывести его повторно.
     */
    remainingMs: number
    failed?: boolean
    /**
     * Оформление человека. Это выбор ОФОРМЛЕНИЯ, а не вывод из имени:
     * по имени пол не определяют. В эталоне варианты переключались кнопками —
     * это была отладка автора, и здесь их нет.
     */
    look?: SceneLook
  }>(),
  { failed: false, look: 'bob' },
)

const { t, locale } = useI18n()

const root = useTemplateRef<HTMLElement>('root')
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')

/** Размер обёртки в CSS-пикселях. Высоту держит aspect-video, но читаем обе:
    буфер должен совпасть с фактическим прямоугольником, а не с расчётным. */
const size = ref({ width: 0, height: 0 })
const { pixelRatio } = useDevicePixelRatio()
const motion = usePreferredReducedMotion()
const visibility = useDocumentVisibility()
const onScreen = ref(false)

/** Палитра читается ОДИН раз, когда канвас появился: getComputedStyle внутри
    кадра заставлял бы браузер пересчитывать раскладку на каждой фигуре. */
const palette = ref<ScenePalette | null>(null)
const shades = ref<SceneBrandShades | null>(null)
const background = ref<BackgroundColors | null>(null)

const runtime = createSceneRuntime()

/**
 * Сумма двумя ярусами набора: цифры крупно, символ валюты мельче — так в
 * эталоне («10 000» кеглем 64 и «€» кеглем 40).
 *
 * n(amount, 'currency') отдаёт ОДНУ строку с символом внутри, и разобрать её
 * обратно нельзя: положение символа зависит от локали. Поэтому берём
 * formatToParts того же формата, что настроен для n() в i18n/index.ts —
 * стиль currency, EUR, без копеек, с разделителями групп. Символ валюты
 * не хардкодится, а порядок частей определяется по их месту в списке.
 */
const amountParts = computed<AmountParts>(() => {
  const parts = new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
    useGrouping: 'always',
  }).formatToParts(props.amount)

  let digits = ''
  let symbol = ''
  let symbolBefore = false
  let seenDigit = false

  for (const part of parts) {
    if (part.type === 'currency') {
      symbol = part.value
      symbolBefore = !seenDigit
      continue
    }
    // Пробел-разделитель между числом и символом в строку цифр не берём:
    // отбивку между ярусами ставит сама отрисовка.
    if (part.type === 'literal') continue
    if (part.type === 'integer' || part.type === 'group' || part.type === 'decimal') {
      seenDigit = true
    }
    digits += part.value
  }

  return { digits, symbol, symbolBefore }
})

/** Одна строка с суммой — для плашки «+сумма» и для sr-only. */
const amountText = computed(() => {
  const parts = amountParts.value
  return parts.symbolBefore
    ? `${parts.symbol} ${parts.digits}`
    : `${parts.digits} ${parts.symbol}`
})

const pctValue = computed(() => Math.round(Math.min(Math.max(props.progress, 0), 1) * 100))

const remain = computed(() => {
  const totalSeconds = Math.ceil(Math.max(0, props.remainingMs) / 1000)
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: String(totalSeconds % 60).padStart(2, '0'),
  }
})

const personIban = computed(() => {
  const tail = props.iban.trim()
  return tail === ''
    ? t('account.commission.anim.scene.personIbanNone')
    : t('account.commission.anim.scene.personIban', { tail })
})

const personName = computed(() => {
  const value = props.name.trim()
  return value === '' ? t('account.commission.anim.scene.personNone') : value
})

const texts = computed<OverlayTexts>(() => ({
  overline: t('account.commission.anim.scene.overline'),
  amount: amountParts.value,
  chipProtected: t('account.commission.anim.scene.chipProtected'),
  chipInstant: t('account.commission.anim.scene.chipInstant'),
  bankName: t('account.commission.anim.scene.bankName'),
  bankIban: t('account.commission.anim.scene.bankIban'),
  hubName: t('account.commission.anim.scene.hubName'),
  hubCaption: t('account.commission.anim.scene.hubCaption'),
  personName: personName.value,
  personIban: personIban.value,
  steps: [
    t('account.commission.anim.scene.steps.debited'),
    t('account.commission.anim.scene.steps.verified'),
    t('account.commission.anim.scene.steps.credited'),
  ],
  remainLabel: t('account.commission.anim.scene.remainLabel'),
  remainValue: `${remain.value.minutes}:${remain.value.seconds}`,
  pct: `${pctValue.value}%`,
  trust: [
    t('account.commission.anim.scene.trust.aes'),
    t('account.commission.anim.scene.trust.emi'),
    t('account.commission.anim.scene.trust.instant'),
    t('account.commission.anim.scene.trust.receipt'),
  ],
}))

const creditLabel = computed(() =>
  t('account.commission.anim.scene.credit', { amount: amountText.value }),
)

/** Подпись канваса. Ключи переиспользуются: они уже двухсостоянийные и уже
    говорят про «ядро», что и есть шар хаба. */
const sceneLabel = computed(() =>
  props.failed
    ? t('account.commission.anim.sceneFailed', { brand: 'Velora' })
    : t('account.commission.anim.sceneNormal', { brand: 'Velora' }),
)

/**
 * Дубль содержимого сцены текстом: канвас скринридеру недоступен. Сумма,
 * процент, остаток и состояние — всё, что нарисовано числами.
 *
 * ЭТА СТРОКА НЕ ЖИВАЯ ОБЛАСТЬ. Остаток тикает раз в секунду, и за один перевод
 * уровня 2 (7 минут) она меняется 500 раз — замерено прогоном с шагом опроса
 * useCommission (250 мс). Живая область на ней означала бы 500 объявлений
 * подряд: читать страницу под такой диктовкой невозможно. Числа остаются
 * доступны курсором скринридера в любой момент, а о событиях сообщает
 * отдельная область ниже.
 */
const srDetails = computed(() =>
  props.failed
    ? t('account.commission.anim.scene.srStatusFailed', {
        amount: amountText.value,
        pct: pctValue.value,
      })
    : t('account.commission.anim.scene.srStatus', {
        amount: amountText.value,
        pct: pctValue.value,
        minutes: remain.value.minutes,
        seconds: remain.value.seconds,
      }),
)

/**
 * Живая область: только события, а не поток чисел.
 *
 * Процент округляется до четверти, поэтому за весь перевод область меняется
 * не более пяти раз (0 → 25 → 50 → 75 → 100) плюс один раз на срыв. Смена
 * состояния объявляется сразу: это то самое, о чём молчать нельзя.
 */
const srLive = computed(() =>
  props.failed
    ? t('account.commission.anim.scene.srLiveFailed')
    : t('account.commission.anim.scene.srLive', {
        pct: Math.floor(pctValue.value / 25) * 25,
      }),
)

/** Один кадр на текущем состоянии. Зовётся и из raf, и на смену размера. */
function render(frameNumber: number): void {
  const element = canvas.value
  const currentPalette = palette.value
  const currentShades = shades.value
  const currentBackground = background.value
  if (!element || !currentPalette || !currentShades || !currentBackground) return
  if (size.value.width <= 0) return

  drawTransferFrame(
    element,
    runtime,
    currentPalette,
    currentShades,
    currentBackground,
    {
      progress: props.progress,
      failed: props.failed,
      look: props.look,
      cssWidth: size.value.width,
      ratio: pixelRatio.value,
      texts: texts.value,
      bankSign: t('account.commission.anim.scene.bankSign'),
      creditLabel: creditLabel.value,
    },
    frameNumber,
  )
}

/** Кадр без движения: сцена собрана, числа настоящие. */
function renderStill(): void {
  settleRuntime(runtime, props.progress, props.failed)
  render(REDUCED_MOTION_FRAME)
}

const raf = useRafFn(
  ({ delta }) => {
    const frameNumber = tickScene(runtime, delta)
    // null — номер кадра не изменился: раскадровка идёт на 30 fps, и на
    // 120-герцовом экране три из четырёх проходов рисовать нечего.
    if (frameNumber === null) return
    advanceRuntime(runtime, props.progress, props.failed)
    render(frameNumber)
  },
  { immediate: false },
)

useResizeObserver(root, (entries) => {
  const entry = entries[0]
  if (!entry) return
  const box = entry.contentRect
  // Новый объект, а не правка полей: watch сравнивает ссылки и должен
  // сработать даже при возврате к прежним числам.
  size.value = { width: box.width, height: box.height }
})

useIntersectionObserver(root, (entries) => {
  const entry = entries[0]
  if (!entry) return
  onScreen.value = entry.isIntersecting
})

/*
 * Цикл гоняется ТОЛЬКО когда в нём есть смысл. Сцена рисует сотни путей и
 * около двадцати градиентов за кадр — на ноутбуке от батареи это заметно.
 *
 * При prefers-reduced-motion цикл не запускается вовсе: рисуется один
 * показательный кадр, где сцена собрана. Числа в нём те же, из пропов,
 * поэтому неподвижная картинка не врёт.
 */
watch(
  [motion, onScreen, visibility, size],
  () => {
    const ready = size.value.width > 0 && palette.value !== null
    const shouldRun =
      ready && motion.value !== 'reduce' && onScreen.value && visibility.value === 'visible'
    if (shouldRun) raf.resume()
    else raf.pause()
    // Остановленная сцена всё равно обязана показывать кадр: и при reduce,
    // и при уходе за экран последнее нарисованное должно быть осмысленным.
    if (ready && !shouldRun && motion.value === 'reduce') renderStill()
  },
  { flush: 'post' },
)

/*
 * Первый замер снимаем сами, не дожидаясь наблюдателя: ResizeObserver отдаёт
 * размер только на следующем проходе разметки, и первый кадр канвас встретил
 * бы с буфером 300×150 по умолчанию — то есть видимой ступенькой.
 * Здесь же читаются токены: элемент к этому моменту в документе.
 */
watch(
  canvas,
  (element) => {
    if (!element) return
    palette.value = readScenePalette(element)
    shades.value = readBrandShades(element, palette.value)
    const style = getComputedStyle(element)
    const pick = (name: string): string => style.getPropertyValue(name).trim()
    // Фон эталона (#ffffff → #f4f7fd → #e9eefa) практически совпал с нашими
    // ролями surface / ground / raised — этот градиент достался даром.
    background.value = {
      top: pick('--color-surface'),
      middle: pick('--color-ground'),
      bottom: pick('--color-raised'),
    }
    const rect = element.getBoundingClientRect()
    if (rect.width > 0) size.value = { width: rect.width, height: rect.height }
  },
  { flush: 'post' },
)

/* Размер или плотность экрана изменились — пересобираем буфер и ОБЯЗАТЕЛЬНО
   рисуем заново: присваивание width обнуляет холст вместе с матрицей. */
watch(
  [size, pixelRatio],
  () => {
    const element = canvas.value
    if (!element || size.value.width <= 0) return
    resizeSceneBuffer(element, size.value.width, size.value.height, pixelRatio.value)
    // Ярус интерфейсного слоя мог смениться — проверку раскладки повторяем
    runtime.fitChecked = false
    if (motion.value === 'reduce') renderStill()
    else render(runtime.lastFrame < 0 ? 0 : runtime.lastFrame)
  },
  { flush: 'post' },
)

/* Числа пришли из пропов — перерисовываем немедленно, не ожидая кадра:
   при reduced-motion кадров не будет вовсе, а процент обязан обновиться. */
watch([() => props.progress, () => props.failed, () => props.look, texts], () => {
  if (motion.value === 'reduce') renderStill()
})

tryOnScopeDispose(() => {
  raf.pause()
})
</script>

<template>
  <div ref="root" class="vel-scene">
    <canvas ref="canvas" class="vel-scene__canvas" role="img" :aria-label="sceneLabel" />
    <!--
      ЧИСЛА ТЕКСТОМ ВНЕ КАНВАСА. Содержимое канваса скринридеру недоступно
      в принципе, поэтому сумма, процент, остаток и состояние обязаны быть
      здесь. Без role и без aria-live: строка меняется раз в секунду вместе с
      остатком, и живая область на ней превратилась бы в непрерывную диктовку.
    -->
    <p class="sr-only">{{ srDetails }}</p>
    <!--
      СОБЫТИЯ. role="status" (то есть polite), а не aria-live="assertive":
      перебивать чтение страницы нечем — процент округлён до четверти, и за
      весь перевод здесь набирается пять сообщений.
    -->
    <p class="sr-only" role="status">{{ srLive }}</p>
  </div>
</template>

<style scoped>
/*
  Пропорция кадра — 16:9, как у эталона. Кропать нечего: композиция занимает
  весь кадр (интерфейс прижат к 112 слева, 1808 справа, ряд гарантий на 1032).
*/
.vel-scene {
  position: relative;
  inline-size: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  /* 10px, а не 18px эталона: числа 6/10 выбраны владельцем продукта явно. */
  border-radius: var(--radius-panel);
  border: 1px solid var(--color-line);
  background-color: var(--color-surface);
}

.vel-scene__canvas {
  display: block;
  inline-size: 100%;
  block-size: 100%;
}
</style>
