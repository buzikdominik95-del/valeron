/**
 * Опознавательный знак банка: монограмма, пара цветов и форма подложки.
 *
 * ЛОГОТИПОВ ЗДЕСЬ НЕТ И НЕ БУДЕТ. Настоящие знаки банков — чужие товарные
 * марки; права на них нам никто не передавал, и картинка, скачанная «чтобы
 * было похоже», попадает в продукт незаконно. Поэтому марка РИСУЕТСЯ САМА:
 * монограмма из имени плюс подложка, у которой цвет и форма выведены из того
 * же имени. Узнаваемость получается не из чужой графики, а из устойчивости —
 * BNP Paribas всегда синий шестиугольник, и через десять открытий экрана тоже.
 *
 * ПОЧЕМУ ИЗ ИМЕНИ, А НЕ ИЗ ПОРЯДКА В СПИСКЕ. Тот же состав банков показывает
 * лента партнёров на витрине (@/sections/VelBankStrip.vue), состав правится
 * руками, а позже придёт с бэкенда в произвольном порядке. Возьми мы индекс
 * массива — марка меняла бы цвет от перестановки строк, и «узнаваемость»
 * держалась бы ровно до первой правки BANKS.
 *
 * ХЕШ С ЛАВИНОЙ, А НЕ ПРОСТО FNV. Младшие биты FNV-1a распределены плохо:
 * на наших тринадцати именах `hash % 8` давал всего ЧЕТЫРЕ цвета из восьми,
 * по три-четыре банка на каждый. Финализатор fmix32 из MurmurHash3 размешивает
 * старшие биты в младшие, и те же тринадцать имён дают семь цветов из восьми
 * и одиннадцать разных сочетаний «цвет + форма» из тринадцати (замер, не
 * оценка). Два оставшихся совпадения — Societe Generale/Santander и
 * Deutsche Bank/BBVA — различаются монограммой: SO/SA и DE/BB.
 *
 * Цвет и форму берём из РАЗНЫХ участков хеша (младшие биты и сдвиг на 8),
 * иначе они менялись бы синхронно и восемнадцать сочетаний выродились бы
 * в восемь.
 */

/** Имена классов-модификаторов цвета. Сами цвета — в стилях VelBankMark. */
const TONES = ['navy', 'royal', 'plum', 'teal', 'forest', 'brick', 'slate', 'ochre'] as const

/**
 * Формы подложки. Три, а не восемь: форма обязана читаться в квадрате 2rem,
 * а звезда или трапеция на 32 пикселях превращаются в кляксу.
 */
const SHAPES = ['circle', 'squircle', 'hex'] as const

export type BankMarkTone = (typeof TONES)[number]
export type BankMarkShape = (typeof SHAPES)[number]

export interface BankMarkIdentity {
  /** Класс-модификатор с парой «подложка + монограмма». */
  toneClass: string
  /** Класс-модификатор с формой подложки. */
  shapeClass: string
  /** Две буквы имени в верхнем регистре. */
  initials: string
}

/**
 * FNV-1a с финализатором fmix32.
 *
 * Math.imul обязателен: обычное умножение в JavaScript идёт по double, и
 * произведение больше 2^53 теряет младшие разряды — то есть ровно те, по
 * которым потом берётся остаток. Тогда хеш перестал бы быть хешем и разные
 * имена массово сходились бы к одному цвету.
 *
 * `>>> 0` после каждого шага держит значение беззнаковым: без него старший
 * бит делает число отрицательным, и остаток от деления тоже уходит в минус —
 * индекс массива стал бы отрицательным, а марка — undefined.
 */
function hashName(name: string): number {
  let hash = 0x811c9dc5

  for (let index = 0; index < name.length; index += 1) {
    hash ^= name.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }

  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x85ebca6b) >>> 0
  hash ^= hash >>> 13
  hash = Math.imul(hash, 0xc2b2ae35) >>> 0
  hash ^= hash >>> 16

  return hash >>> 0
}

/**
 * Монограмма: первые буквы двух слов либо две первые буквы одного слова.
 *
 * Пустые куски отбрасываются намеренно: двойной пробел в имени, пришедшем
 * с бэкенда, дал бы монограмму из одной буквы и пустоты.
 */
function monogram(name: string): string {
  // Разбор ПАРОЙ, а не по индексам: при noUncheckedIndexedAccess обращение
  // words[0] само по себе может оказаться undefined, и компилятор прав —
  // имя банка приходит извне и однажды приедет пустой строкой.
  const [first, second] = name.split(' ').filter((word) => word !== '')

  if (first === undefined) return '??'
  if (second === undefined) return first.slice(0, 2).toUpperCase()

  return (first.charAt(0) + second.charAt(0)).toUpperCase()
}

/**
 * Фиксированные цвета/формы «как на старом проде» для известных банков.
 * Без чужих логотипов — только фирменные палитры и монограммы.
 */
const BRAND: Record<string, { tone: (typeof TONES)[number]; shape: (typeof SHAPES)[number]; initials?: string }> = {
  'bnp paribas': { tone: 'navy', shape: 'hex', initials: 'BP' },
  'societe generale': { tone: 'brick', shape: 'squircle', initials: 'SG' },
  'société générale': { tone: 'brick', shape: 'squircle', initials: 'SG' },
  'credit agricole': { tone: 'forest', shape: 'circle', initials: 'CA' },
  'crédit agricole': { tone: 'forest', shape: 'circle', initials: 'CA' },
  santander: { tone: 'brick', shape: 'circle', initials: 'SA' },
  hsbc: { tone: 'brick', shape: 'squircle', initials: 'HS' },
  revolut: { tone: 'slate', shape: 'hex', initials: 'RE' },
  'deutsche bank': { tone: 'plum', shape: 'circle', initials: 'DB' },
  ing: { tone: 'ochre', shape: 'squircle', initials: 'IN' },
  bbva: { tone: 'royal', shape: 'hex', initials: 'BB' },
  unicredit: { tone: 'brick', shape: 'circle', initials: 'UN' },
  'intesa sanpaolo': { tone: 'forest', shape: 'squircle', initials: 'IS' },
  commerzbank: { tone: 'ochre', shape: 'hex', initials: 'CO' },
  barclays: { tone: 'teal', shape: 'hex', initials: 'BA' },
}

/**
 * Марка банка по его имени. Чистая функция: одно имя — всегда один результат,
 * поэтому вызывать её можно хоть на каждой перерисовке.
 */
export function bankMarkIdentity(name: string): BankMarkIdentity {
  const key = name.trim().toLowerCase()
  const brand = BRAND[key]
  if (brand) {
    return {
      toneClass: `vel-mark--${brand.tone}`,
      shapeClass: `vel-mark--${brand.shape}`,
      initials: brand.initials ?? monogram(name),
    }
  }

  const hash = hashName(name)
  return {
    toneClass: `vel-mark--${TONES[hash % TONES.length]}`,
    shapeClass: `vel-mark--${SHAPES[(hash >>> 8) % SHAPES.length]}`,
    initials: monogram(name),
  }
}
