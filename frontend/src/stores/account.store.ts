import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import { formatIbanGroups, maskIban } from '@/lib/iban'

/**
 * Шаги пути клиента в личном кабинете. Порядок задаёт и нумерацию в трекере,
 * и то, что считается «до» текущего шага.
 *
 * Идентификаторы латиницей и независимы от языка: подписи живут в локали
 * (account.tracker.steps.*), здесь только ключи.
 */
export const ACCOUNT_STEPS = [
  'simulation',
  'approval',
  'account',
  'documents',
  'signature',
] as const

export type AccountStep = (typeof ACCOUNT_STEPS)[number]

/** Как шаг выглядит в трекере. */
export type AccountStepStatus = 'done' | 'current' | 'upcoming'

/** Страж для значений, пришедших извне — из localStorage или ответа API. */
export function isAccountStep(value: unknown): value is AccountStep {
  return typeof value === 'string' && (ACCOUNT_STEPS as readonly string[]).includes(value)
}

export interface AccountStepView {
  id: AccountStep
  /** Позиция в списке, с нуля. Номер на кружке — index + 1. */
  index: number
  status: AccountStepStatus
}

/**
 * Виды документов, которые кабинет просит загрузить. Как и шаги — только ключи:
 * подписи живут в локали (account.document.kinds.*).
 */
export const ACCOUNT_DOCUMENT_KINDS = ['identity', 'payslip', 'residence'] as const

export type AccountDocumentKind = (typeof ACCOUNT_DOCUMENT_KINDS)[number]

/**
 * Запись о принятом документе — ровно в той форме, в которой её отдаст API
 * (GET /api/account, см. api/account.api.ts). Карточка VelDocumentCard берёт
 * такую запись целиком одним пропом, поэтому подключение бэкенда сведётся
 * к появлению массива в ответе, а не к правке разметки.
 *
 * ГРАНИЦА. «Документ принят» — это слово сервера, а не браузера: файлы,
 * выбранные в VelDocumentUpload, пока никуда не уходят, и карточка о них
 * ничего не знает. Пустой список честнее выдуманной строки «загружено».
 */
export interface AccountDocument {
  kind: AccountDocumentKind
  /** Имя файла, как его назвал пользователь. */
  fileName: string
  /** Время загрузки в ISO-8601 из ответа сервера; null — сервер его не прислал. */
  uploadedAt: string | null
}

/**
 * Состояние личного кабинета: докуда дошла заявка и что уже сделано руками
 * пользователя. Бэкенда нет — как и в simulator.store, всё переживает
 * перезагрузку через useLocalStorage.
 *
 * ГРАНИЦА. Здесь нет и не должно быть решения банка: одобренной суммы, ставки,
 * результата проверки. Флаги ниже описывают только действия пользователя
 * (загрузил, вписал, подписал) и позицию в маршруте. Настоящие значения
 * подставит слой API — до этого момента их не выдумывает ни стор, ни экран.
 */
export const useAccountStore = defineStore('account', () => {
  /**
   * Пройденные шаги списком, а не счётчиком: маршрут не обязан быть строго
   * линейным — документы можно догрузить после того, как аккаунт уже создан.
   */
  const completed = useLocalStorage<AccountStep[]>('velora:account:completed', [])

  /** Шаг, на котором пользователь стоит сейчас. */
  const currentStep = useLocalStorage<AccountStep>('velora:account:step', ACCOUNT_STEPS[0])

  /* Действия пользователя. Каждое — факт с фронта, а не оценка со стороны банка. */
  const documentsUploaded = useLocalStorage<boolean>('velora:account:documents', false)
  const ibanProvided = useLocalStorage<boolean>('velora:account:iban', false)
  const contractSigned = useLocalStorage<boolean>('velora:account:signed', false)

  /**
   * IBAN в ЗАМАСКИРОВАННОМ виде — «IT60 X05• •••• •••• •••3 456».
   *
   * ПОЧЕМУ НЕ ПОЛНЫЙ НОМЕР. Полных реквизитов фронт не держит нигде: об этом
   * прямо сказано в api/account.api.ts (в сторе перевода остаётся только хвост
   * счёта), и localStorage — последнее место, куда номер счёта стоит класть.
   * Листу договора хватает маски: человек узнаёт свой счёт по началу и концу,
   * а подставит полный номер сервер, когда договор будет печатать он.
   *
   * Пустая строка — счёт не вводили. Тогда в договоре на этом месте остаётся
   * пустая линия, а не выдуманный номер.
   */
  const ibanMasked = useLocalStorage<string>('velora:account:ibanMasked', '')

  /**
   * Полный IBAN (группы по 4) — для автозаполнения Preleva / модалки.
   * Маска ibanMasked остаётся для листа договора; полный номер нужен, чтобы
   * не заставлять человека вводить счёт повторно.
   */
  const ibanFull = useLocalStorage<string>('velora:account:ibanFull', '')

  /**
   * Intestatario, если правили в Preleva; иначе подставляем client.fullName.
   */
  const payoutHolder = useLocalStorage<string>('velora:account:payoutHolder', '')

  /**
   * Когда подписан договор — ISO-8601. Нужен блоку успеха под подписями:
   * «Firmato il 26/07/2026 alle ore 14:31».
   *
   * Отдельно от contractSigned, а не вместо него: у сохранённого состояния
   * с прошлой выкладки флаг есть, а времени нет, и подставлять вместо него
   * «сейчас» нельзя — это выдумка о том, чего кабинет не знает. Пустая строка
   * означает ровно «подписано, когда именно — неизвестно», и строка со
   * временем в этом случае просто не рисуется.
   */
  const contractSignedAt = useLocalStorage<string>('velora:account:signedAt', '')

  /**
   * PNG dataURL росчерка — рисуется в листе договора (VelContractSignatures).
   * Пустая строка: подписано без сохранённого изображения (старые сессии).
   */
  const signatureDataUrl = useLocalStorage<string>('velora:account:signaturePng', '')

  /**
   * Онбординг-стрелки «куда нажать» уже показывали (закрыл / skip).
   * false → VelCoachGuide ведёт по шагам, пока не skip и не allDone.
   */
  const coachSeen = useLocalStorage<boolean>('velora:account:coachSeen', false)

  /**
   * После verify паспортная карточка остаётся в Documenti, пока пользователь
   * не уйдёт с вкладки; затем «паркуется» в Profilo (анимация не пропадает).
   */
  const docsParkedInProfile = useLocalStorage<boolean>('velora:docs:parkedProfile', false)

  /**
   * До какого уровня commission уже «посмотрели» Prestito после перехода.
   * 0 — пульс не гасили; 2/3 — после L1→L2 / L2→L3 открывали Prestito.
   * Кнопка мигает, пока currentLevel > prestitoPulseSeenLevel (для 2 и 3).
   */
  const prestitoPulseSeenLevel = useLocalStorage<number>('velora:account:prestitoSeen', 0)

  /**
   * Подтверждена ли почта. Стоит рядом с contractSigned и по той же причине:
   * это действие пользователя, а не решение банка — он открыл письмо и ввёл код.
   *
   * Самого адреса здесь нет: почта приходит из профиля вместе с делом клиента
   * (dossier.store, поле client.email), и вторая копия означала бы два разных
   * ответа на вопрос «какая у меня почта».
   *
   * Флаг переводит только markEmailVerified, и звать его вправе лишь слой API,
   * получивший от сервера положительный ответ на код: набор шести цифр в поле
   * сам по себе ничего не подтверждает.
   */
  const emailVerified = useLocalStorage<boolean>('velora:account:emailVerified', false)

  /**
   * Непрочитанные уведомления. Намеренно обычный ref, а не localStorage: это
   * состояние сервера, и переживать перезагрузку ему нечем — после неё список
   * заново приедет из API. До появления API флаг остаётся false, и точка на
   * колокольчике не загорается: рисовать несуществующее уведомление нельзя.
   */
  const hasUnreadNotices = ref(false)

  /**
   * Счётчик непрочитанных в Assistenza (как «2» на эталоне Calipso).
   * Демо: растёт после отправки сообщения менеджеру по комиссии; гасится
   * при открытии вкладки Assistenza. С API приедет из ответа /account.
   */
  const supportUnreadCount = ref(0)

  function bumpSupportUnread(by = 1): void {
    supportUnreadCount.value = Math.max(0, supportUnreadCount.value + by)
  }

  function clearSupportUnread(): void {
    supportUnreadCount.value = 0
  }

  function setSupportUnread(count: number): void {
    supportUnreadCount.value = Math.max(0, Math.floor(count))
  }

  /*
   * Чиним сохранённое состояние один раз при инициализации. В localStorage
   * лежит что угодно: ключи шагов из прошлой выкладки, дубли, ручная правка
   * через инструменты разработчика. Мусор здесь означал бы трекер, у которого
   * пройден несуществующий шаг.
   */
  const restored = Array.isArray(completed.value)
    ? [...new Set(completed.value.filter(isAccountStep))]
    : []
  if (restored.length !== completed.value.length) {
    completed.value = restored
  }
  if (!isAccountStep(currentStep.value)) {
    currentStep.value = ACCOUNT_STEPS[0]
  }

  const currentIndex = computed(() => Math.max(0, ACCOUNT_STEPS.indexOf(currentStep.value)))

  /**
   * Состояние одного шага.
   *
   * ПРОЙДЕННЫЙ ВАЖНЕЕ ТЕКУЩЕГО, и это не вкусовщина. Последний шаг маршрута —
   * «Firma», за ним ничего нет, поэтому currentStep с него уже никуда не
   * переедет. Пока «текущий» перебивал «пройденный», подписанный договор
   * оставался в состоянии 'current' навсегда: пять из пяти были недостижимы
   * в принципе, счётчик замирал на «4 / 5», а кнопка вывода средств —
   * единственное условие которой «пройдены все пять» — не разблокировалась
   * никогда, сколько бы шагов человек ни закрыл.
   *
   * aria-current при этом не теряется: пометку получает первый НЕзакрытый шаг,
   * то есть тот, на котором заявка действительно стоит. Когда закрыты все пять,
   * текущего шага нет ни на экране, ни в разметке — и это верно: работы
   * не осталось.
   *
   * Шаг перед текущим считается пройденным, даже если его нет в списке. Это не
   * додумывание за банк, а страховка от рассинхрона: если API перевёл заявку на
   * «Документы», значит одобрение позади — иначе трекер показал бы дыру
   * посреди ряда.
   */
  function statusOf(step: AccountStep, index: number): AccountStepStatus {
    if (completed.value.includes(step) || index < currentIndex.value) return 'done'
    if (step === currentStep.value) return 'current'
    return 'upcoming'
  }

  /** Готовый ряд для трекера: id, номер и состояние. */
  const steps = computed<AccountStepView[]>(() =>
    ACCOUNT_STEPS.map((id, index) => ({ id, index, status: statusOf(id, index) })),
  )

  /** Номер текущего шага для подписи «шаг 2 из 5». Всего шагов — steps.length. */
  const currentNumber = computed(() => currentIndex.value + 1)

  /** Отметить шаг пройденным, не двигая текущий. */
  function markDone(step: AccountStep): void {
    if (completed.value.includes(step)) return
    completed.value = [...completed.value, step]
  }

  /**
   * Перевести заявку на шаг: всё, что было до него, закрывается разом.
   * Один вызов вместо пары «отметь предыдущий, поставь текущий» — забыть
   * половину пары значит получить трекер с пропущенным кружком.
   */
  function advanceTo(step: AccountStep): void {
    const target = ACCOUNT_STEPS.indexOf(step)
    if (target < 0) return
    const passed = ACCOUNT_STEPS.slice(0, target)
    completed.value = [...new Set([...completed.value, ...passed])]
    currentStep.value = step
  }

  /** Зовёт только слой API, получивший от сервера подтверждение кода. */
  function markEmailVerified(): void {
    emailVerified.value = true
  }

  /**
   * Договор подписан. Флаг и время ставятся ОДНИМ вызовом: разнесённые по
   * двум присваиваниям, они однажды разъедутся — забыть половину пары значит
   * получить подписанный договор без даты подписи.
   */
  function markContractSigned(at: Date = new Date(), png = ''): void {
    contractSigned.value = true
    contractSignedAt.value = at.toISOString()
    if (png) signatureDataUrl.value = png
  }

  function markCoachSeen(): void {
    coachSeen.value = true
  }

  /**
   * Сохраняет полный IBAN + маску для договора.
   * raw — то, что человек набрал (с пробелами или без).
   * Без полного ibanFull Preleva не сможет автозаполнить поле.
   */
  function setIbanFromRaw(raw: string): void {
    const formatted = formatIbanGroups(raw)
    if (formatted.replace(/\s/g, '') === '') return
    ibanProvided.value = true
    ibanFull.value = formatted
    ibanMasked.value = maskIban(raw)
  }

  /**
   * Старый API: если в строке нет «•», это полный номер — пишем и full.
   * Если только маска (уже с точками) — full не трогаем.
   */
  function setIbanMasked(value: string): void {
    if (value.includes('•')) {
      ibanProvided.value = true
      ibanMasked.value = value
      return
    }
    setIbanFromRaw(value)
  }

  function setPayoutHolder(name: string): void {
    payoutHolder.value = name.trim()
  }

  function reset(): void {
    completed.value = []
    currentStep.value = ACCOUNT_STEPS[0]
    documentsUploaded.value = false
    docsParkedInProfile.value = false
    try {
      localStorage.removeItem('velora:docs:verified')
      localStorage.removeItem('velora:docs:parkedProfile')
    } catch {
      /* ignore */
    }
    ibanProvided.value = false
    ibanMasked.value = ''
    ibanFull.value = ''
    payoutHolder.value = ''
    contractSigned.value = false
    contractSignedAt.value = ''
    signatureDataUrl.value = ''
    coachSeen.value = false
    hasUnreadNotices.value = false
    supportUnreadCount.value = 0
    emailVerified.value = false
    prestitoPulseSeenLevel.value = 0
  }

  function markPrestitoSeen(level: number): void {
    prestitoPulseSeenLevel.value = Math.max(prestitoPulseSeenLevel.value, Math.floor(level))
  }

  return {
    completed,
    currentStep,
    currentIndex,
    currentNumber,
    steps,
    documentsUploaded,
    docsParkedInProfile,
    prestitoPulseSeenLevel,
    ibanProvided,
    ibanMasked,
    ibanFull,
    payoutHolder,
    contractSigned,
    contractSignedAt,
    signatureDataUrl,
    coachSeen,
    hasUnreadNotices,
    supportUnreadCount,
    emailVerified,
    markDone,
    markCoachSeen,
    advanceTo,
    markEmailVerified,
    markContractSigned,
    setIbanFromRaw,
    setIbanMasked,
    setPayoutHolder,
    bumpSupportUnread,
    clearSupportUnread,
    setSupportUnread,
    markPrestitoSeen,
    reset,
  }
})
