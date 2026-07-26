/**
 * IBAN: нормализация, разбивка по четыре знака, маска и контрольная сумма.
 *
 * Модуль намеренно чистый — ни Vue, ни DOM, ни локалей. Проверку можно
 * прогнать отдельно от интерфейса, хоть в консоли node:
 *
 *   import { isValidIban } from '@/lib/iban'
 *   isValidIban('IT60 X054 2811 1010 0000 0123 456')  // true
 *   isValidIban('IT60 X054 2811 1010 0000 0123 457')  // false — сломана цифра
 *   isValidIban('GB82 WEST 1234 5698 7654 32')        // true — другая страна
 *   isValidIban('DE89 3704 0044 0532 0130 00')        // true
 *
 * ДВА УРОВНЯ СТРОГОСТИ, и выбирать между ними надо осознанно:
 *
 *   • форма и длина — ibanShapeProblem() и ibanExpectedLength(). Отвечают на
 *     вопрос «похоже ли это на IBAN и столько ли знаков набрано»;
 *   • контрольная сумма — isValidIban(). Отвечает на вопрос «не сломана ли
 *     цифра внутри номера».
 *
 * Окно ввода счёта (VelContractIban) спрашивает только первый уровень — почему
 * именно так и чем за это платим, написано над isValidIban. Окно вывода
 * (VelPayoutDialog) по-прежнему считает контрольную сумму.
 *
 * Разделители (пробелы, дефисы, точки) считаются оформлением и отбрасываются:
 * на выписке IBAN печатают группами, и требовать от пользователя ровно тот же
 * набор пробелов незачем.
 */

/** Печатная форма IBAN — группы по четыре знака через пробел. */
export const IBAN_GROUP_SIZE = 4

/** Код страны по ISO 3166-1 alpha-2 — две буквы в начале номера. */
export const IBAN_COUNTRY_CODE_LENGTH = 2

/** Границы длины по ISO 13616: короче 15 и длиннее 34 знаков IBAN не бывает. */
export const IBAN_MIN_LENGTH = 15
export const IBAN_MAX_LENGTH = 34

/** Сколько знаков остаётся на виду в замаскированном виде: начало и конец. */
export const IBAN_VISIBLE_HEAD = 4
export const IBAN_VISIBLE_TAIL = 4

/** Заглушка середины. Точка спокойнее звёздочки и не читается как ошибка. */
const MASK_CHAR = '•'

/** Всё, что не латинская буква и не цифра, — оформление. */
const DECORATION = /[^0-9A-Z]/g

/**
 * Знаки, которые в набранной строке допустимы: сам номер плюс разделители,
 * которыми IBAN печатают на выписках и в письмах.
 *
 * Нужно отдельным выражением, потому что normalizeIban выбрасывает лишнее
 * МОЛЧА: после него уже не отличить «IT60 X054» от «IT60 X@54». Чтобы сказать
 * человеку про посторонний знак, смотреть надо на строку до нормализации.
 */
const ACCEPTED_INPUT = /^[0-9A-Za-z \-.]*$/

/** Форма по ISO 13616: две буквы страны, две контрольные цифры, дальше BBAN. */
const IBAN_SHAPE = /^[A-Z]{2}[0-9]{2}[0-9A-Z]+$/

/**
 * Сдвиг «буква → число» из ISO 13616: A = 10, B = 11, … Z = 35.
 * 'A'.charCodeAt(0) равен 65, значит вычитать нужно 55.
 */
const LETTER_OFFSET = 'A'.charCodeAt(0) - 10

/**
 * Длина IBAN по странам — реестр ISO 13616.
 *
 * Нужна, потому что контрольная сумма ловит порчу знаков, но не потерю целой
 * группы: обрезанный IBAN может случайно дать остаток 1. Италия — 27 знаков,
 * но таблица общая, страна кода не выделена ничем.
 *
 * Страны, которой в таблице нет, проверка длины не касается: остаются общий
 * диапазон 15…34 и контрольная сумма. Так функция не начнёт врать, когда
 * реестр пополнится очередным кодом.
 */
export const IBAN_LENGTHS: Readonly<Record<string, number>> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22,
  BR: 29, BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 22,
  EE: 20, EG: 29, ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23,
  GL: 18, GR: 27, GT: 28, HR: 21, HU: 28, IE: 22, IL: 23, IQ: 23, IS: 26,
  IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28, LC: 32, LI: 21, LT: 20, LU: 20,
  LV: 21, LY: 25, MC: 27, MD: 24, ME: 22, MK: 19, MR: 27, MT: 31, MU: 30,
  NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29, RO: 24, RS: 22,
  SA: 24, SC: 31, SE: 24, SI: 19, SK: 24, SM: 27, ST: 25, SV: 28, TL: 23,
  TN: 24, TR: 26, UA: 29, VA: 22, VG: 24, XK: 20,
}

/**
 * Оставляет от строки только знаки самого IBAN: верхний регистр, латиница
 * и цифры. Это внутреннее представление — в нём значение хранится и сверяется.
 */
export function normalizeIban(value: string): string {
  return value.toUpperCase().replace(DECORATION, '')
}

/** Режет уже очищенную строку на группы. Ничего не нормализует: маска
    состоит из знаков, которых normalizeIban не знает, и он бы их выбросил. */
function group(value: string): string {
  const groups: string[] = []
  for (let index = 0; index < value.length; index += IBAN_GROUP_SIZE) {
    groups.push(value.slice(index, index + IBAN_GROUP_SIZE))
  }
  return groups.join(' ')
}

/** Печатная форма: «IT60 X054 2811 1010 0000 0123 456». */
export function formatIbanGroups(value: string): string {
  return group(normalizeIban(value))
}

/**
 * Замаскированный вид: видно первые и последние четыре знака, середина —
 * точки. Длина строки совпадает с печатной формой, поэтому подмена одного
 * вида другим не двигает раскладку.
 *
 * Короткий обрывок (восемь знаков и меньше) прятать нечем: скрывать было бы
 * ровно нечего, и функция возвращает его как есть.
 */
export function maskIban(value: string): string {
  const chars = normalizeIban(value)
  const hidden = chars.length - IBAN_VISIBLE_HEAD - IBAN_VISIBLE_TAIL
  if (hidden <= 0) return group(chars)

  return group(
    chars.slice(0, IBAN_VISIBLE_HEAD) +
      MASK_CHAR.repeat(hidden) +
      chars.slice(chars.length - IBAN_VISIBLE_TAIL),
  )
}

/**
 * Куда встаёт каретка в печатной форме, если слева от неё `count` знаков
 * самого IBAN. Каждые четыре знака добавляют пробел, и после ровно четвёртого
 * каретка обязана остаться перед пробелом, а не за ним — отсюда (count − 1).
 */
export function ibanCaretPosition(count: number): number {
  if (count <= 0) return 0
  return count + Math.floor((count - 1) / IBAN_GROUP_SIZE)
}

/** Длина IBAN для страны из этого значения, если она известна реестру. */
export function ibanExpectedLength(value: string): number | undefined {
  return IBAN_LENGTHS[normalizeIban(value).slice(0, IBAN_COUNTRY_CODE_LENGTH)]
}

/**
 * Изъян формы:
 *   'chars'   — есть знак, которого в номере не бывает ни при какой стране;
 *   'country' — на месте кода страны стоит не буква.
 */
export type IbanShapeProblem = 'chars' | 'country'

/**
 * Что в строке заведомо не IBAN, независимо от того, дописана она или нет.
 * null — придраться не к чему: либо всё в порядке, либо просто недобор.
 *
 * ПОЧЕМУ ТОЛЬКО ЭТИ ДВА СЛУЧАЯ. Ошибка красным — заявление «так не бывает»,
 * и делать его можно лишь там, где дописывание строки уже ничего не спасёт.
 * Недобор длины к таким случаям не относится: человек ещё печатает, и красная
 * строка под полем была бы придиркой к незаконченной работе. Про остаток
 * говорит подсказка, а не ошибка.
 *
 * Проверяются только НАБРАННЫЕ знаки кода страны: одна буква — это ещё не
 * ошибка, а половина кода.
 */
export function ibanShapeProblem(value: string): IbanShapeProblem | null {
  if (!ACCEPTED_INPUT.test(value)) return 'chars'

  const country = normalizeIban(value).slice(0, IBAN_COUNTRY_CODE_LENGTH)
  if (/[^A-Z]/.test(country)) return 'country'

  return null
}

/**
 * Переводит IBAN в десятичное число по ISO 13616: цифра остаётся цифрой,
 * буква становится своим номером (A = 10 … Z = 35). Чужой знак — null,
 * считать такое нечего.
 */
function toDigits(value: string): string | null {
  let digits = ''
  for (const char of value) {
    if (char >= '0' && char <= '9') {
      digits += char
      continue
    }
    if (char >= 'A' && char <= 'Z') {
      digits += String(char.charCodeAt(0) - LETTER_OFFSET)
      continue
    }
    return null
  }
  return digits
}

/**
 * Остаток от деления на 97 для числа произвольной длины.
 *
 * Считается посимвольно: r = (r · 10 + цифра) mod 97. Промежуточное значение
 * не превышает 979, то есть остаётся точным целым. Собрать всё число целиком
 * нельзя — в нём до 68 цифр, а double точен до 15–16.
 */
function mod97(digits: string): number {
  let remainder = 0
  for (const char of digits) {
    remainder = (remainder * 10 + Number(char)) % 97
  }
  return remainder
}

/**
 * Проверка контрольной суммы IBAN — ISO 13616 поверх ISO 7064 MOD 97-10.
 *
 * Алгоритм целиком:
 *   1. Убрать оформление, привести к верхнему регистру.
 *   2. Проверить форму: две буквы страны, две контрольные цифры, дальше BBAN;
 *      всего от 15 до 34 знаков.
 *   3. Если длина для этой страны известна — сверить её.
 *   4. Первые четыре знака (страна и контрольные цифры) перенести в конец.
 *   5. Каждую букву заменить её номером: A → 10, B → 11, … Z → 35.
 *   6. Полученное число разделить на 97 с остатком.
 *   7. IBAN верен, если остаток равен единице.
 *
 * Что проверка НЕ делает: она ничего не знает о существовании счёта и банка.
 * Верный по контрольной сумме IBAN может быть выдуман — это ловится только
 * на стороне банка.
 *
 * ФУНКЦИЯ ЖИВА, НО ИЗ ОКНА ВВОДА СЧЁТА СНЯТА — СОЗНАТЕЛЬНО, ПО ПРОСЬБЕ
 * ЗАКАЗЧИКА. Не мёртвый код и не забытый хвост: удалять её нельзя.
 *
 * Почему сняли: отказ «IBAN non valido» ничего не объяснял. Человек видел
 * набранный номер, глазами всё сходилось, а окно молча не пускало дальше —
 * и починить это сообщение нечем, mod-97 умеет отвечать только «да» и «нет»
 * и никогда не показывает, ГДЕ ошибка. Заказчик выбрал: пусть окно проверяет
 * длину, а сумму считает банк, который всё равно проверяет её у себя.
 *
 * ЦЕНА РЕШЕНИЯ, и она настоящая. mod-97 ловит опечатку в одной цифре и
 * перестановку соседних — примерно 99 порч из ста. Проверка по длине не ловит
 * НИ ОДНУ из них: у «IT60 X054 2811 1010 0000 0123 456» и у того же номера
 * с одной сбитой цифрой длина одинаковая, оба пройдут. Значит, испорченный
 * номер уедет на бэкенд, и отказ придёт позже и не от поля, а от банка.
 *
 * Вернуть в интерфейс — одна строка в условии готовности:
 *   ready = длина сошлась && isValidIban(raw.value)
 * Ровно так это и сделано в VelPayoutDialog, где деньги уходят наружу.
 */
export function isValidIban(value: string): boolean {
  const iban = normalizeIban(value)

  if (iban.length < IBAN_MIN_LENGTH || iban.length > IBAN_MAX_LENGTH) return false
  if (!IBAN_SHAPE.test(iban)) return false

  const expected = IBAN_LENGTHS[iban.slice(0, 2)]
  if (expected !== undefined && expected !== iban.length) return false

  const digits = toDigits(iban.slice(4) + iban.slice(0, 4))
  if (digits === null) return false

  return mod97(digits) === 1
}
