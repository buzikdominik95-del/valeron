/**
 * Правила документа удостоверения личности: какой вид сколько снимков просит.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫМ МОДУЛЕМ. Таблицу «вид → стороны» спрашивают трое: список
 * переключателей (сколько снимков написать под названием), состояние загрузки
 * (сколько слотов открыть и когда считать комплект собранным) и сама карточка
 * (когда включать кнопку). Своя копия у каждого — это ровно тот случай, когда
 * паспорт однажды начнёт просить оборот в одном месте и не начнёт в двух
 * других, причём молча: типы совпадут, а поведение разъедется.
 *
 * Здесь же ограничения файла. Они того же рода — правило про документ, а не
 * про разметку, — и нужны и проверке в композабле, и атрибуту accept у поля.
 * Разъехавшись, они дают поле, которое пускает выбрать файл, отвергаемый
 * следом проверкой.
 *
 * Строк на экран отсюда нет: подписи живут в locales/sections/account.ts,
 * модуль отдаёт только ключи (см. docSideKey / docShotsKey).
 *
 * СТРАЖА ЗДЕСЬ НЕТ, И ЭТО ПРОВЕРЕНО. Рядом с DOC_KINDS лежала функция
 * isDocKind — «страж для значений, пришедших извне, из URL или localStorage».
 * Ни того, ни другого источника у вида документа нет: выбор живёт обычным ref
 * внутри useDocumentUpload и умирает вместе с экраном, в адресную строку
 * (useViewParams: step, view, tab) не попадает, в localStorage под ключами
 * velora:* его тоже нет. Значение приходит ровно из одного места — радиогруппы
 * VelDocKindChoice, где v-model перебирает сам DOC_KINDS. Проверять список
 * на принадлежность списку незачем, и страж удалён.
 *
 * Не путать с velora:docType из simulator.store: там СВОЙ словарь из пяти
 * значений (…, residence, other) под ключи wizard.identity.docTypes.*, и своя
 * починка сохранённого — restoreDocType в VelStepIdentity.vue, вместе с
 * переносом старого ключа 'id' → 'idCard'. Здешние три вида — про число
 * снимков, а не про то, чем человек удостоверяет личность; общий страж на два
 * словаря отбросил бы 'residence' как мусор.
 *
 * ЕСЛИ ВИД ДОКУМЕНТА ВСЁ-ТАКИ НАЧНЁТ ПЕРЕЖИВАТЬ ПЕРЕЗАГРУЗКУ (useLocalStorage
 * или ответ API), страж придётся завести заново — рядом с чтением, как это
 * сделано для шагов в account.store (isAccountStep). Без него в DOC_KIND_SIDES
 * уйдёт неизвестный ключ, sides окажется undefined, и экран загрузки останется
 * без слотов вовсе.
 */

/** Порядок совпадает с порядком строк на экране. */
export const DOC_KINDS = ['passport', 'idCard', 'licence'] as const

export type DocKind = (typeof DOC_KINDS)[number]

/** Сторона снимка. Односторонний документ занимает 'front' — второй стороны нет. */
export const DOC_SIDES = ['front', 'back'] as const

export type DocSide = (typeof DOC_SIDES)[number]

/**
 * Сколько и каких снимков просит вид документа.
 *
 * Паспорт — разворот с фотографией, одна страница. Карта и права печатаются
 * с двух сторон, и без оборота на них не видно ни срока действия, ни адреса,
 * поэтому банк требует оба снимка.
 */
export const DOC_KIND_SIDES: Record<DocKind, readonly DocSide[]> = {
  passport: ['front'],
  idCard: ['front', 'back'],
  licence: ['front', 'back'],
}

/**
 * Ключ подписи слота внутри account.docs.sides.
 *
 * У одностороннего документа сторон нет вовсе, и подпись «Lato frontale» на
 * единственном снимке паспорта заставляла бы искать несуществующую вторую
 * страницу. Поэтому у него своя подпись — «Foto del documento».
 */
export function docSideKey(kind: DocKind, side: DocSide): 'single' | DocSide {
  return DOC_KIND_SIDES[kind].length === 1 ? 'single' : side
}

/** Ключ строки «сколько снимков» под названием вида — account.docs.shots*. */
export function docShotsKey(kind: DocKind): 'shotsOne' | 'shotsTwo' {
  return DOC_KIND_SIDES[kind].length === 1 ? 'shotsOne' : 'shotsTwo'
}

/**
 * Что принимает поле выбора файла.
 * iOS/Android: image/* + heic; пустой type у части камер — по расширению.
 * PDF — скан с МФУ.
 */
export const DOC_ACCEPT =
  'image/jpeg,image/png,.jpeg,.jpg,.png'

/** Предел размера. Число подставляется и в подпись под кнопкой, и в текст ошибки. */
export const DOC_MAX_FILE_MB = 20

const BYTES_IN_MB = 1024 * 1024

export const DOC_MAX_FILE_BYTES = DOC_MAX_FILE_MB * BYTES_IN_MB

const IMAGE_EXT = /\.(jpe?g|png)$/i

/** Снимок/скан: MIME или расширение (мобильные камеры часто type=''). */
export function isSupportedDocFile(file: File): boolean {
  const type = (file.type || '').toLowerCase()
  if (type === 'image/jpeg' || type === 'image/png') return true
  if (type === '' || type === 'application/octet-stream') {
    const name = file.name || ''
    return IMAGE_EXT.test(name)
  }
  return false
}
