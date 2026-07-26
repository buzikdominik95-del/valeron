import { computed, onUnmounted, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { useTimeoutFn } from '@vueuse/core'
import { useLocalStorage } from '@vueuse/core'
import { wantsFastAnim } from '@/lib/fast-anim'
import {
  DOC_KIND_SIDES,
  DOC_MAX_FILE_BYTES,
  DOC_SIDES,
  isSupportedDocFile,
} from '@/features/account/doc-kinds'
import type { DocKind, DocSide } from '@/features/account/doc-kinds'

/**
 * Состояние экрана загрузки документа: выбранный вид, снимки по сторонам,
 * проверка и её таймер.
 *
 * ЗАЧЕМ ОТДЕЛЬНО ОТ КОМПОНЕНТА. Здесь сходятся четыре вещи, каждая из которых
 * умеет ломаться молча: смена вида документа обязана выбросить уже выбранные
 * снимки, каждая пересъёмка обязана отозвать прежний object URL, таймер
 * проверки обязан умереть вместе с компонентом, а наружу всё это обязано
 * отдаваться плоским File[] для v-model. В шаблоне рядом с разметкой любая из
 * четырёх теряется при первой же правке вёрстки.
 *
 * ГРАНИЦА. Файлы никуда не уходят — бэкенда нет. «Проверено» здесь означает
 * ровно «демонстрационный таймер дотикал», а не ответ банка; поэтому же
 * ожидание сжимается флагом ?fastAnim=1, как и остальные ожидания кабинета.
 */

/** Фазы карточки. Промежуточная 'checking' существует, чтобы «загрузил» и
    «проверено» не случались одним кадром: мгновенная зелёная галочка читается
    как «ничего не проверяли». */
export type DocCheckStatus = 'idle' | 'checking' | 'verified'

export type DocRejectReason = 'type' | 'size'

export interface DocRejection {
  name: string
  reason: DocRejectReason
}

/** Сколько «идёт проверка». Три секунды — столько, чтобы успеть прочитать
    поясняющую строку, и не столько, чтобы уйти из вкладки. */
const VERIFY_MS = 3000

/** То же ожидание под ?fastAnim=1: автопрогон и демо не ждут по-настоящему. */
const VERIFY_FAST_MS = 700

export interface DocumentUpload {
  /** Выбранный вид документа; null — пока не выбран, слотов ещё нет. */
  kind: Ref<DocKind | null>
  /** Какие снимки просит выбранный вид. Пусто, пока вид не выбран. */
  sides: ComputedRef<readonly DocSide[]>
  /** Снимок по стороне — источник подписи и имени файла в строке слота. */
  fileOf: (side: DocSide) => File | null
  /** Адрес превью по стороне: только для картинок, у PDF его нет. */
  previewOf: (side: DocSide) => string | null
  /** Последний отвергнутый файл — компонент переводит причину в текст. */
  rejection: Ref<DocRejection | null>
  status: Ref<DocCheckStatus>
  /** Все нужные снимки выбраны — кнопку можно разблокировать. */
  ready: ComputedRef<boolean>
  pick: (side: DocSide, file: File | null) => void
  submit: () => void
}

/**
 * @param files модель компонента (v-model): плоский список выбранных файлов.
 * @param options.locked если документы уже приняты (store) — сразу verified.
 */
export function useDocumentUpload(
  files: Ref<File[]>,
  options: { locked?: Ref<boolean> } = {},
): DocumentUpload {
  const kind = ref<DocKind | null>(null)
  const picked = ref<Partial<Record<DocSide, File>>>({})
  const previews = ref<Partial<Record<DocSide, string>>>({})
  const rejection = ref<DocRejection | null>(null)

  /**
   * Факт «документы проверены» переживает вкладку: иначе после ухода с
   * Documenti снова открывалась бы форма загрузки.
   */
  const docsVerified = useLocalStorage<boolean>('velora:docs:verified', false)

  const status = ref<DocCheckStatus>(
    docsVerified.value || options.locked?.value === true ? 'verified' : 'idle',
  )

  const { start: startVerify } = useTimeoutFn(
    () => {
      status.value = 'verified'
      docsVerified.value = true
    },
    () => (wantsFastAnim() ? VERIFY_FAST_MS : VERIFY_MS),
    { immediate: false },
  )

  /* Store уже пометил documents uploaded — не даём снова idle. */
  watch(
    () => options.locked?.value === true,
    (locked) => {
      if (locked) {
        status.value = 'verified'
        docsVerified.value = true
      }
    },
    { immediate: true },
  )

  const sides = computed<readonly DocSide[]>(() =>
    kind.value === null ? [] : DOC_KIND_SIDES[kind.value],
  )

  const ready = computed(
    () =>
      sides.value.length > 0 &&
      sides.value.every((side) => picked.value[side] instanceof File),
  )

  function fileOf(side: DocSide): File | null {
    return picked.value[side] ?? null
  }

  function previewOf(side: DocSide): string | null {
    return previews.value[side] ?? null
  }

  /*
   * Адрес object URL живёт до конца жизни вкладки, а не до смены переменной:
   * браузер держит за ним копию файла. Пересняли оборот трижды — три копии
   * снимка в памяти вкладки, и уходят они только с закрытием вкладки.
   */
  function revoke(side: DocSide): void {
    const url = previews.value[side]
    if (url === undefined) return
    URL.revokeObjectURL(url)
    const next = { ...previews.value }
    delete next[side]
    previews.value = next
  }

  function revokeAll(): void {
    for (const side of DOC_SIDES) revoke(side)
  }

  /** Наружу отдаём снимки в том же порядке, в каком они стоят на экране. */
  function syncModel(): void {
    files.value = sides.value
      .map((side) => picked.value[side])
      .filter((file): file is File => file instanceof File)
  }

  function pick(side: DocSide, file: File | null): void {
    /* После verify загрузка закрыта — pick молча игнорируем. */
    if (status.value !== 'idle') return
    if (file === null) return

    if (!isSupportedDocFile(file)) {
      rejection.value = { name: file.name, reason: 'type' }
      return
    }
    if (file.size > DOC_MAX_FILE_BYTES) {
      rejection.value = { name: file.name, reason: 'size' }
      return
    }

    rejection.value = null
    // Отзыв ДО записи нового адреса: иначе прежний остаётся без ссылки на него,
    // и отозвать его будет уже нечем.
    revoke(side)
    picked.value = { ...picked.value, [side]: file }

    // Превью только у картинок: PDF в <img> не рисуется, а адрес под него
    // всё равно занял бы копию файла в памяти.
    if (file.type.startsWith('image/')) {
      previews.value = { ...previews.value, [side]: URL.createObjectURL(file) }
    }

    syncModel()
  }

  function submit(): void {
    // Двойное нажатие и нажатие по неполному комплекту не должны запускать
    // второй таймер: он пережил бы первый и «проверил» бы карточку дважды.
    if (!ready.value || status.value !== 'idle') return

    status.value = 'checking'
    startVerify()
  }

  /*
   * Смена вида документа выбрасывает уже выбранные снимки.
   * После verify вид не меняем — форма скрыта.
   */
  watch(kind, () => {
    if (status.value !== 'idle') return
    revokeAll()
    picked.value = {}
    rejection.value = null
    syncModel()
  })

  /*
   * Родитель очистил список (сброс store) — чистим и слоты. Условие про
   * непустое состояние обязательно: без него собственный syncModel() с пустым
   * результатом заводил бы этот же обработчик по кругу.
   */
  watch(
    files,
    (next) => {
      if (next.length > 0 || Object.keys(picked.value).length === 0) return
      revokeAll()
      picked.value = {}
    },
    { deep: true },
  )

  onUnmounted(() => {
    // Таймер проверки снимает useTimeoutFn сам. Остаётся то, чего за нас никто
    // не сделает: уход с экрана не освобождает копии файлов — их держит
    // браузер, а не компонент.
    revokeAll()
  })

  return { kind, sides, fileOf, previewOf, rejection, status, ready, pick, submit }
}
