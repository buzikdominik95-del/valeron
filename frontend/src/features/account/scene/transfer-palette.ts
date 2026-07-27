/**
 * Цвета сцены перевода.
 *
 * ТРИ РАЗНЫХ СЛУЧАЯ, и смешивать их нельзя:
 *
 * 1. РОЛИ ИНТЕРФЕЙСА (синий, глубокий синий, текст, приглушённый, линии,
 *    дорожка, «готово», «отказ») читаются ИЗ ТОКЕНОВ один раз при монтировании.
 *    Канвас не понимает var(), поэтому значения снимаются getComputedStyle и
 *    едут в рисование строками. Сырых значений эталона (#1b39c4 и прочих)
 *    в коде нет: у нас своя гамма, и токены обязаны остаться единственным
 *    источником — сменится гамма, переедет и сцена.
 *
 * 2. ПРОИЗВОДНЫЕ СВЕТЛЫЕ ОТТЕНКИ (ступени банка, колонны, окна, задняя стена,
 *    карта в кошельке, погашенный чип) — их в эталоне четырнадцать, и токенов
 *    под них нет и быть не должно: это не роли интерфейса, а один ряд
 *    осветлений ОДНОЙ роли. Считаются здесь функцией mix() из --color-accent
 *    по лестнице долей, снятой с самого эталона обратным счётом. Заводить под
 *    них 14 токенов было бы неправильно, а выкинуть — значит потерять
 *    ступенчатость банка, то есть ровно ту детальность, за которую сцену приняли.
 *
 * 3. ИЛЛЮСТРАТИВНЫЕ (тон кожи, цвет волос, золото монеты, белок глаза) —
 *    константы в блоке ILLUSTRATION ниже. Цвет кожи не является ролью
 *    интерфейса: заводить под него токен неправильно, и при смене фирменной
 *    гаммы он меняться не должен.
 */

/** Один цвет как «r, g, b» — чтобы собирать rgba() с любой прозрачностью. */
export type RgbTriple = string

export interface SceneTints {
  /** Погашенный чип и незажжённый шаг. Эталон #fbfcff. */
  faintest: string
  /** Задняя стена банка. Эталон #f3f7ff. */
  wall: string
  /** Карта, торчащая из кошелька. Эталон #eef3ff. */
  cardFace: string
  /** Фронтон, светлая заливка. Эталон lite #e7eeff. */
  l1: string
  /** Верхняя ступень и тело колонн. Эталон lite2 #dbe4ff. */
  l2: string
  /** Обводка орбитального чипа. Эталон #dbe3fa. */
  ring: string
  /** Окна банка. Эталон #cfdcff. */
  window: string
  /** Средняя ступень. Эталон #cdd9ff. */
  step: string
  /** Обводка задней стены и карты в кошельке. Эталон #c9d6fb / #c8d5fb. */
  outline: string
  /** Нижняя ступень. Эталон lite3 #b9c9ff. */
  l3: string
  /** Точки номера на карте кошелька. Эталон #aab8e6. */
  dots: string
}

export interface ScenePalette {
  /** Гарнитура для ctx.font. Из --font-sans, как в signature-canvas. */
  font: string

  /** --color-accent. */
  brand: string
  /**
   * Светлый насыщенный синий вместо эталонного brand2 #3f6bff.
   *
   * ПОЧЕМУ НЕ ТОКЕН. Ни один токен на эту роль не годится: --color-accent-dim
   * ТЕМНЕЕ accent, и с ним лестница светлот перевернулась бы (флаг стал бы
   * темнее здания, градиент полосы — темнеющим вправо). Поэтому там, где
   * brand2 обязан читаться как БРЕНД (градиенты шара, карты, кошелька,
   * флаг) — берём accent, осветлённый по той же лестнице, что и ступени
   * банка: доля 0.16 воспроизводит эталонную светлоту почти буквально.
   */
  brandLift: string
  /**
   * Светлота без насыщенности: пунктирная орбита и светлый конец градиента
   * полосы прогресса. Здесь роль — «более светлая линия», и на неё в системе
   * есть настоящий токен --color-line-strong. Цена решения — эти два места
   * выйдут глуше эталона; альтернатив внутри токенов нет.
   */
  lineStrong: string
  /** --color-accent-deep. */
  deep: string
  /** --color-fg. */
  ink: string
  /** --color-muted. Эталонный mid. */
  mid: string
  /**
   * --color-faint. В эталоне здесь ДВА уровня серого (muted #8a95bd и
   * faint #aeb7d6), у нас один токен, и оба места садятся на него: иерархия
   * подписей теряет ступень. Опускать несущий текст ниже порога контраста
   * ради похожести нельзя — подписи узлов и нижний ряд гарантий остаются
   * на чистом --color-faint и осознанно выходят тяжелее картинки владельца продукта.
   */
  faint: string
  /** --color-line. */
  line: string
  /** --color-track. */
  track: string
  /** --color-accent-ink: белое «на бренде» (знак V, надпись BANCA). */
  brandInk: string
  /** --color-surface. */
  surface: string

  /** Состояние «готово»: --color-success и два производных от него. */
  ok: string
  okSoft: string
  okLine: string
  /** Состояние «отказ»: --color-danger и те же два производных. */
  danger: string
  dangerSoft: string
  dangerLine: string

  tint: SceneTints

  /** Тройки под rgba(): прозрачность в эталоне встречается у каждого пятого цвета. */
  rgb: {
    brand: RgbTriple
    brandLift: RgbTriple
    /** Осветлённый accent под внутреннее кольцо хаба (эталон rgba(150,172,250,.7)). */
    brandHalo: RgbTriple
    deep: RgbTriple
    /** Между accent и deep — каннелюры колонн (эталон rgba(47,75,184,.35)). */
    brandFlute: RgbTriple
    brandInk: RgbTriple
    ok: RgbTriple
    danger: RgbTriple
  }
}

/** Три состояния одного цвета: сплошной, мягкая заливка, обводка. */
export interface StateColors {
  main: string
  soft: string
  line: string
  rgb: RgbTriple
}

/**
 * Иллюстративные цвета. НЕ ТОКЕНЫ и токенами не станут: тон кожи, цвет волос,
 * золото монеты и белок глаза — не роли интерфейса. При смене фирменной гаммы
 * они меняться не должны, иначе у человека позеленеет лицо.
 *
 * Исключение, решённое в пользу токенов: рубашка, галстук, градиенты карты,
 * шара и кошелька. Формально одежда — иллюстрация, но она СИНЯЯ и стоит в
 * кадре рядом со зданием банка: оставленная константой, она разъехалась бы
 * с гаммой. Эти цвета выводятся из --color-accent мешками (см. readScenePalette).
 */
export const ILLUSTRATION = {
  /** Кожа: заливка, тень, ладонь на свету, ладонь в тени, тень на лице, щетина. */
  skin: '#f4d3b6',
  skinShade: '#e5bb98',
  palmLit: '#fae0c9',
  palmShade: '#b8825c',
  faceShade: '#c28f66',
  stubble: '#5c4a3a',

  /** Глаз: белок, радужка (две ступени), тень века, блеск. */
  eyeWhite: '#ffffff',
  irisLit: '#5a4636',
  irisDark: '#2b2320',
  lidShade: '#5b4a3a',
  eyeGleam: '#ffffff',

  /** Румяна на щеках при улыбке. */
  blush: '#f0938c',

  /** Золото монеты: четыре ступени тела, ребро, обод, знак, тень, шлейф, искра. */
  gold1: '#fff6c8',
  gold2: '#fbd763',
  gold3: '#eeb63a',
  gold4: '#cd8f1d',
  goldEdgeLit: '#f0c458',
  goldEdgeDark: '#b9801a',
  goldRim: '#d79f2b',
  goldSign: '#8a5a10',
  goldShadow: 'rgba(170, 120, 20, 0.45)',
  goldTrail: 'rgba(243, 199, 80, 1)',
  goldSpark: '#f3cf6d',
  /** Контакты чипа на банковской карте. */
  chipLine: 'rgba(120, 80, 10, 0.5)',

  /** Цепочка и бусина у оформления bob. */
  chain: '#e8c96a',
  chainBead: '#f0d67f',
} as const

/**
 * Волосы и черты лица по оформлениям. Ключи совпадают с пропом look.
 * Это выбор ОФОРМЛЕНИЯ, а не вывод из имени: по имени пол не определяют.
 */
export const LOOK_COLORS = {
  bob: {
    hair: '#e3b465',
    hairHi: '#f6dda0',
    brow: '#c0954f',
    eye: '#7d6445',
    lip: '#a8514c',
  },
  crop: {
    hair: '#2b241f',
    hairHi: '#403630',
    brow: '#2b241f',
    eye: '#2b241f',
    lip: '#96524b',
  },
} as const

export type SceneLook = keyof typeof LOOK_COLORS

/**
 * Затемнение. Чёрный с малой прозрачностью — не цвет, а операция «в тень»:
 * складки рубашки, изнанка рукава, тень воротника. Токена под неё нет по той
 * же причине, по которой его нет под blur.
 */
export const SHADE = {
  fold: 'rgba(0, 0, 0, 0.10)',
  sleeve: 'rgba(0, 0, 0, 0.12)',
} as const

/** Число из HEX или rgb() в тройку каналов. Пустое/непонятное — null. */
function parseColor(raw: string): [number, number, number] | null {
  const value = raw.trim()
  if (value === '') return null

  if (value.startsWith('#')) {
    const hex = value.slice(1)
    if (hex.length === 3) {
      const r = hex[0]
      const g = hex[1]
      const b = hex[2]
      if (r === undefined || g === undefined || b === undefined) return null
      return [
        Number.parseInt(r + r, 16),
        Number.parseInt(g + g, 16),
        Number.parseInt(b + b, 16),
      ]
    }
    if (hex.length === 6) {
      return [
        Number.parseInt(hex.slice(0, 2), 16),
        Number.parseInt(hex.slice(2, 4), 16),
        Number.parseInt(hex.slice(4, 6), 16),
      ]
    }
    return null
  }

  // rgb()/rgba() — так значение может приехать после нормализации браузером.
  const nums = value.match(/-?\d+(\.\d+)?/g)
  if (!nums || nums.length < 3) return null
  const r = nums[0]
  const g = nums[1]
  const b = nums[2]
  if (r === undefined || g === undefined || b === undefined) return null
  return [Number.parseFloat(r), Number.parseFloat(g), Number.parseFloat(b)]
}

function toHex(channel: number): string {
  const value = Math.round(Math.max(0, Math.min(255, channel)))
  return value.toString(16).padStart(2, '0')
}

/**
 * Замес двух цветов в sRGB. Именно в sRGB, а не в oklab: эталонные оттенки
 * автор считал в той же модели, и sRGB воспроизводит его числа буквально —
 * переход в перцептивное пространство дал бы «правильнее», но НЕ ТАК ЖЕ.
 *
 * @param t доля второго цвета, 0…1
 */
function mixColors(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function hex(color: [number, number, number]): string {
  return `#${toHex(color[0])}${toHex(color[1])}${toHex(color[2])}`
}

function triple(color: [number, number, number]): RgbTriple {
  return `${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(color[2])}`
}

/**
 * Токен не доехал — берём ОДНО нейтральное значение, а не копию гаммы.
 *
 * Здесь стояла таблица из 14 ролей, продублированных из main.css значениями
 * (#1d4fd8, #12306e, #0e7f58 и остальные). Она снята по двум причинам.
 *
 * ПЕРВАЯ. Это сырые фирменные цвета в коде — ровно то, что запрещает шапка
 * этого файла: «токены обязаны остаться единственным источником». Копия живёт
 * своей жизнью, и разойтись она может только молча: правка --color-accent
 * в main.css её не задевает, ошибки не вызывает и в сборке не видна.
 *
 * ВТОРАЯ. Путь недостижим. Роли объявлены в @theme main.css, Tailwind печатает
 * их в :root, main.css подключён в main.ts — любой элемент документа наследует
 * их, и getPropertyValue возвращает значение всегда. Таблица страховала случай,
 * которого нет, ценой четырнадцати расходящихся копий гаммы.
 *
 * Почему нейтральный серый, а не «похожий синий»: пропавший токен обязан быть
 * ВИДЕН. Монохромная сцена — громкий отказ, его заметят на первом же взгляде;
 * сцена в подсунутой близкой гамме прошла бы незамеченной. Тот же приём, что
 * у соседа: signature-canvas.ts подставляет родовое 'cursive', а не копию
 * --vel-signature-family.
 */
const NO_TOKEN = '#7f7f7f'

/**
 * Лестница осветлений, снятая с эталона обратным счётом от его же чисел.
 * Доля — сколько в замесе ОСТАЛОСЬ accent; остальное surface.
 *
 * Проверка (эталонный accent #1b39c4 → белый):
 *   #fbfcff → 0.017 · #f3f7ff → 0.05 · #eef3ff → 0.07 · #e7eeff → 0.105 ·
 *   #dbe4ff → 0.16 · #dbe3fa → 0.15 · #cfdcff → 0.21 · #cdd9ff → 0.22 ·
 *   #c9d6fb → 0.24 · #b9c9ff → 0.31 · #aab8e6 → 0.38
 */
const TINT_STEPS = {
  faintest: 0.017,
  wall: 0.05,
  cardFace: 0.07,
  l1: 0.105,
  ring: 0.15,
  l2: 0.16,
  window: 0.21,
  step: 0.22,
  outline: 0.24,
  l3: 0.31,
  dots: 0.38,
} as const

/**
 * Доли зелёных плашек эталона (okSoft #e9f9f0, okLine #bfe9d3) от ok #12b76a
 * к белому. Каналы дали 0.083…0.10 и 0.27…0.31 — беру середины.
 * Те же доли применяются к --color-danger: состояние отказа должно получить
 * плашку и обводку той же светлоты, иначе оно выпадет из ряда по весу.
 */
const STATE_SOFT = 0.09
const STATE_LINE = 0.28

/**
 * Одно чтение getComputedStyle на монтирование. Внутри кадра к DOM не
 * обращаемся вовсе: сцена рисует сотни фигур, и чтение стилей на каждой
 * заставляло бы браузер считать раскладку заново.
 */
export function readScenePalette(element: Element): ScenePalette {
  const style = getComputedStyle(element)
  const read = (name: string): string => {
    const raw = style.getPropertyValue(name).trim()
    return raw === '' ? NO_TOKEN : raw
  }
  const rgbOf = (name: string): [number, number, number] =>
    parseColor(read(name)) ?? parseColor(NO_TOKEN) ?? [0, 0, 0]

  const accent = rgbOf('--color-accent')
  const deep = rgbOf('--color-accent-deep')
  const surface = rgbOf('--color-surface')
  const success = rgbOf('--color-success')
  const danger = rgbOf('--color-danger')

  /*
   * ДВЕ РАЗНЫЕ ФУНКЦИИ, и путать их нельзя — доля в них считается от разного.
   *
   * tintMix(keep) — сколько accent ОСТАЛОСЬ в замесе с белым. Это ряд светлых
   * голубых замесов эталона: ступени банка, окна, задняя стена. Доли малые
   * (0.017…0.38), результат почти белый.
   *
   * lighten(white) — сколько БЕЛОГО подмешано в accent. Это светлые
   * НАСЫЩЕННЫЕ синие: флаг, свечение хаба, градиенты шара, карты и рубашки.
   * Доли тоже малые (0.04…0.52), но результат остаётся синим.
   *
   * Математически это одно и то же (lighten(w) === tintMix(1 - w)), и именно
   * поэтому они объявлены раздельно с разными именами: при одной функции
   * достаточно перепутать смысл доли, и флаг с рубашкой выходят белыми,
   * а градиент шара — светлеющим внутрь вместо темнеющего.
   */
  const tintMix = (keepAccent: number): [number, number, number] =>
    mixColors(surface, accent, keepAccent)
  const lighten = (white: number): [number, number, number] =>
    mixColors(accent, surface, white)
  /** Углубление accent в сторону accent-deep. */
  const sink = (t: number): [number, number, number] => mixColors(accent, deep, t)

  // 0.16 белого воспроизводит светлоту эталонного brand2 #3f6bff почти буквально
  const brandLift = lighten(0.16)
  // Внутреннее кольцо хаба, эталон rgba(150,172,250,.7)
  const brandHalo = lighten(0.52)
  const brandFlute = sink(0.35)

  // Перевод строки внутри объявления шрифта доезжает сюда как есть, а он
  // попадает в сокращённую запись ctx.font — сжимаем пробелы до одного.
  const font = style.getPropertyValue('--font-sans').trim().replace(/\s+/g, ' ')

  const tintOf = (keep: number): string => hex(tintMix(keep))

  return {
    font: font === '' ? 'sans-serif' : font,

    brand: read('--color-accent'),
    brandLift: hex(brandLift),
    lineStrong: read('--color-line-strong'),
    deep: read('--color-accent-deep'),
    ink: read('--color-fg'),
    mid: read('--color-muted'),
    faint: read('--color-faint'),
    line: read('--color-line'),
    track: read('--color-track'),
    brandInk: read('--color-accent-ink'),
    surface: read('--color-surface'),

    ok: read('--color-success'),
    okSoft: hex(mixColors(success, surface, 1 - STATE_SOFT)),
    okLine: hex(mixColors(success, surface, 1 - STATE_LINE)),
    danger: read('--color-danger'),
    dangerSoft: hex(mixColors(danger, surface, 1 - STATE_SOFT)),
    dangerLine: hex(mixColors(danger, surface, 1 - STATE_LINE)),

    tint: {
      faintest: tintOf(TINT_STEPS.faintest),
      wall: tintOf(TINT_STEPS.wall),
      cardFace: tintOf(TINT_STEPS.cardFace),
      l1: tintOf(TINT_STEPS.l1),
      ring: tintOf(TINT_STEPS.ring),
      l2: tintOf(TINT_STEPS.l2),
      window: tintOf(TINT_STEPS.window),
      step: tintOf(TINT_STEPS.step),
      outline: tintOf(TINT_STEPS.outline),
      l3: tintOf(TINT_STEPS.l3),
      dots: tintOf(TINT_STEPS.dots),
    },

    rgb: {
      brand: triple(accent),
      brandLift: triple(brandLift),
      brandHalo: triple(brandHalo),
      deep: triple(deep),
      brandFlute: triple(brandFlute),
      brandInk: triple(rgbOf('--color-accent-ink')),
      ok: triple(success),
      danger: triple(danger),
    },
  }
}

/**
 * Цвета текущего состояния. Отдельной функцией, а не полем палитры: палитра
 * читается один раз при монтировании, а признак отказа приходит пропом и
 * может смениться на любом кадре.
 */
export function stateColors(palette: ScenePalette, failed: boolean): StateColors {
  return failed
    ? {
        main: palette.danger,
        soft: palette.dangerSoft,
        line: palette.dangerLine,
        rgb: palette.rgb.danger,
      }
    : { main: palette.ok, soft: palette.okSoft, line: palette.okLine, rgb: palette.rgb.ok }
}

/**
 * Синие оттенки одежды и предметов, выведенные из accent. Собираются один раз
 * рядом с палитрой, чтобы в рисовании не осталось ни арифметики цвета, ни
 * литералов. Разница между двумя оформлениями сохранена: у crop рубашка
 * темнее и холоднее, как в эталоне.
 */
export interface SceneBrandShades {
  /** Верхний стоп градиента торса (эталон #4d67d8). */
  torsoTop: string
  /** Рубашка и её тёмный стоп по оформлениям. */
  shirt: Record<SceneLook, string>
  shirtDark: Record<SceneLook, string>
  /**
   * Галстук. Эталон #16307f темнее собственного deep — у нас самый тёмный
   * синий в системе и есть --color-accent-deep, им и берём: роль «тёмный
   * галстук на средне-синей рубашке» сохраняется.
   */
  tie: string
  /** Градиент банковской карты (эталон #4f6bff → #152a9a). */
  cardFrom: string
  cardTo: string
  /** Градиент шара хаба (эталон #7e97ff → #3f6bff → #122a8f). */
  orbFrom: string
  orbMid: string
  orbTo: string
  /** Задняя и передняя стенки кошелька (#3752b8→#1b39c4, #2c47a8→#152a9a). */
  walletBackFrom: string
  walletBackTo: string
  walletFrontFrom: string
  walletFrontTo: string
}

export function readBrandShades(element: Element, palette: ScenePalette): SceneBrandShades {
  const style = getComputedStyle(element)
  const pick = (name: string): [number, number, number] => {
    const raw = style.getPropertyValue(name).trim()
    return parseColor(raw === '' ? NO_TOKEN : raw) ?? [0, 0, 0]
  }
  const accent = pick('--color-accent')
  const deep = pick('--color-accent-deep')
  const surface = pick('--color-surface')
  /** Доля БЕЛОГО, подмешанного в accent: результат остаётся синим.
      Числа — «на сколько эталонный цвет светлее собственного brand»,
      снятые обратным счётом с присланного файла. */
  const lighten = (white: number): string => hex(mixColors(accent, surface, white))
  const sink = (t: number): string => hex(mixColors(accent, deep, t))

  return {
    // эталон #4d67d8
    torsoTop: lighten(0.2),
    // эталон #3f5bd0 (bob) и #2e5fc0 (crop): у crop рубашка темнее и холоднее
    shirt: { bob: lighten(0.1), crop: lighten(0.04) },
    // эталон #2b41a0 и #1f4499
    shirtDark: { bob: sink(0.45), crop: sink(0.55) },
    tie: palette.deep,
    // эталон #4f6bff → #152a9a
    cardFrom: lighten(0.22),
    cardTo: palette.deep,
    // эталон #7e97ff → #3f6bff → #122a8f: градиент обязан ТЕМНЕТЬ к краю
    orbFrom: lighten(0.42),
    orbMid: palette.brandLift,
    orbTo: palette.deep,
    // эталон #3752b8 → #1b39c4 и #2c47a8 → #152a9a
    walletBackFrom: sink(0.22),
    walletBackTo: palette.brand,
    walletFrontFrom: sink(0.42),
    walletFrontTo: palette.deep,
  }
}
