import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { ACCOUNT_STEPS, useAccountStore } from '@/stores/account.store'
import type { AccountDocument, AccountStep, AccountStepStatus } from '@/stores/account.store'
import { useDossierStore } from '@/stores/dossier.store'
import { useSimulatorStore } from '@/stores/simulator.store'
import { approvedFromRequested } from '@/features/wizard/offer-terms'
import type {
  AccountPolicyStatus,
  AccountTransferStatus,
  PayoutMethod,
  PayoutTransferRequest,
} from '@/api/account.api'

/**
 * Состояние личного кабинета одним окном для всех его блоков: карточка клиента,
 * трекер шагов, блок суммы, ожидание банка, полис CPI.
 *
 * ЧТО ПРИДЁТ С БЭКЕНДА (форма описана в src/api/account.api.ts, GET /api/account):
 *   client            — имя, фамилия и почта из профиля;
 *   credit            — одобренная сумма в евроцентах, ставка TAN, метка «новое»;
 *   policy            — полис CPI: 'processing' или 'issued' и оценка ожидания;
 *   transfer          — перевод: 'idle' или 'authorizing' и оценка ожидания;
 *   steps/currentStep — прогресс по пяти шагам заявки.
 * Подключение: ответ уходит в dossier.hydrate(), правится один файл — api/account.api.ts.
 *
 * ЧЕГО ЗДЕСЬ НЕТ. Композабл ничего не решает за банк и не считает условия сам:
 * сумма, ставка, состояние полиса и перевода приходят готовыми. Считается
 * только то, что выводится из уже известного: статус шага, счётчик пройденных,
 * доля заполнения полосы.
 *
 * ТРИ ИСТОЧНИКА, ОДИН ВИД:
 *   dossier.store   — решение банка (заглушка формы API);
 *   account.store   — маршрут заявки и действия пользователя (localStorage);
 *   simulator.store — то, что человек сам ввёл в мастере.
 * Последний нужен ради связности экранов: мастер только что показал ему его
 * имя и его сумму, и другие значения в кабинете читались бы как чужая заявка.
 * Заглушка из ТЗ остаётся для входа по прямой ссылке — пустое имя и нулевая
 * сумма хуже честной демонстрации.
 */

/**
 * Шаги, которые закрывает сам пользователь: загрузить документы и подписать
 * договор. Именно у них в оригинале стоит ссылка «Vai» — остальные три
 * закрывает система, и вести по ним некуда.
 */
const USER_ACTION_STEPS: readonly AccountStep[] = ['documents', 'signature']

export interface AccountClientView {
  /**
   * Имя и фамилия по отдельности: список «Dati personali» показывает их
   * двумя строками, и разбирать fullName обратно на части он не должен.
   * Правило подстановки при этом одно на всех — см. client ниже.
   */
  firstName: string
  lastName: string
  fullName: string
  email: string
  /** Одна буква для кружка в карточке. Пусто, если имени нет вовсе. */
  initial: string
}

export interface AccountStepItem {
  id: AccountStep
  /** Позиция в списке, с нуля. Номер на кружке — index + 1. */
  index: number
  status: AccountStepStatus
  /** Шаг ждёт действия пользователя: рядом уместна ссылка «Vai». */
  needsAction: boolean
}

export interface AccountApi {
  client: ComputedRef<AccountClientView>
  steps: ComputedRef<AccountStepItem[]>
  /** Всего шагов. Константа: пять шагов заданы списком ACCOUNT_STEPS. */
  total: number
  doneCount: ComputedRef<number>
  allDone: ComputedRef<boolean>
  /** Доля заполнения полосы, 0…1 — уходит в CSS-переменную трекера. */
  progress: ComputedRef<number>
  /** Одобренная сумма в евро (в ответе API — целые евроценты). */
  approvedAmount: ComputedRef<number>
  /**
   * Сумма на карточке баланса / вывода / L4-анимации:
   * credito approvato + fee L2…L3 (не L1 base).
   */
  loanBalanceEuros: ComputedRef<number>
  ratePercent: ComputedRef<number>
  isNewOffer: ComputedRef<boolean>
  policyStatus: ComputedRef<AccountPolicyStatus>
  policyEtaMinutes: ComputedRef<number>
  /** Полис выпущен — карточка CPI переключается на второе состояние. */
  isPolicyIssued: ComputedRef<boolean>
  transferStatus: ComputedRef<AccountTransferStatus>
  transferEtaMinutes: ComputedRef<number>
  /** Банк авторизует перевод прямо сейчас — на экране блок ожидания. */
  isAuthorizing: ComputedRef<boolean>
  /** Куда ушли деньги. null — перевод не запрашивали. */
  transferMethod: ComputedRef<PayoutMethod | null>
  /** Последние знаки реквизитов. Полного номера у фронта нет. */
  transferAccountTail: ComputedRef<string>
  /**
   * Единственное условие вывода: пройдены все пять шагов. Отдельное имя рядом
   * с allDone, потому что на экране это разные утверждения — «всё сделано»
   * и «можно забрать деньги», — и разойтись они однажды могут.
   */
  canWithdraw: ComputedRef<boolean>
  /** Что осталось сделать. Из этого списка складывается причина блокировки. */
  pendingSteps: ComputedRef<AccountStep[]>
  /** Документы, принятые сервером. Пустой список — карточек нет вовсе. */
  documents: ComputedRef<AccountDocument[]>
  startTransfer(request: PayoutTransferRequest): Promise<boolean>
  markOfferSeen(): void
}

/** Первая буква строки. Array.from, а не [0]: индекс режет суррогатную пару. */
function firstLetter(value: string): string {
  return Array.from(value.trim())[0] ?? ''
}

export function useAccount(): AccountApi {
  const accountStore = useAccountStore()
  const dossierStore = useDossierStore()

  const { steps: routeSteps } = storeToRefs(accountStore)
  const { dossier } = storeToRefs(dossierStore)
  const { amount, firstName, surname, email } = storeToRefs(useSimulatorStore())

  /**
   * Первичная заливка маршрута.
   *
   * ВАЖНО: GET /account сейчас всегда шлёт documents+signature completed
   * и currentStep=signature (заглушка бэка). Если blindly advanceTo(signature),
   * пользователь «скипает» загрузку документов и IBAN.
   *
   * documents / signature закрываем ТОЛЬКО по локальным флагам
   * (documentsUploaded / contractSigned), не по серверным completed.
   */
  const untouched =
    accountStore.completed.length === 0 && accountStore.currentStep === ACCOUNT_STEPS[0]

  if (untouched) {
    /* Wizard-шаги (система) — из ответа / stub. */
    for (const step of dossier.value.steps) {
      if (!step.completed) continue
      if (step.id === 'documents' || step.id === 'signature') continue
      accountStore.markDone(step.id)
    }
    /* Куда вести: реальные действия пользователя, не серверный skip. */
    if (accountStore.documentsUploaded) {
      accountStore.markDone('documents')
      accountStore.advanceTo('signature')
      if (accountStore.contractSigned) accountStore.markDone('signature')
    } else {
      accountStore.advanceTo('documents')
    }
  }

  /*
   * Починка уже испорченного localStorage: сервер «закрыл» docs/firma,
   * а локально файлов/подписи нет → вернуть на Documenti / Firma.
   */
  accountStore.reconcileUserSteps()

  const client = computed<AccountClientView>(() => {
    /*
     * Только данные заявки пользователя (мастер + регистрация).
     * Заглушку Marco Rossi больше не подмешиваем — в кабинет без заявки
     * не пускаем (useAccountView / useLandingLogin).
     */
    const first = firstName.value.trim()
    const last = surname.value.trim()

    return {
      firstName: first,
      lastName: last,
      fullName: [first, last].filter((part) => part !== '').join(' '),
      email: email.value.trim(),
      initial: firstLetter(first === '' ? last : first).toUpperCase(),
    }
  })

  const steps = computed<AccountStepItem[]>(() =>
    routeSteps.value.map((step) => ({
      id: step.id,
      index: step.index,
      status: step.status,
      needsAction: step.status !== 'done' && USER_ACTION_STEPS.includes(step.id),
    })),
  )

  const total = ACCOUNT_STEPS.length

  const doneCount = computed(
    () => steps.value.filter((step) => step.status === 'done').length,
  )

  const allDone = computed(() => doneCount.value === total)
  const progress = computed(() => doneCount.value / total)

  /*
   * Одобрено меньше запрошенного на 15…20% — частичное одобрение. Считает та
   * же функция, что и экран результата мастера (offer-terms), и это условие:
   * своя формула здесь означала бы, что мастер обещал одну сумму, а кабинет
   * по той же заявке показывает другую.
   *
   * Ветка заглушки не трогается: там сумма приходит из ответа API уже
   * одобренной, и урезать её второй раз было бы двойным снижением.
   */
  const approvedAmount = computed(() => {
    const fromApi = Number(dossier.value?.credit?.approvedAmountCents ?? 0) / 100
    if (Number.isFinite(fromApi)) {
      if (fromApi > 0) {
        return fromApi
      }
    }

    return approvedFromRequested(amount.value)
  })

  /**
   * Как на карточке Il tuo saldo / Prestito / L4 anim:
   * base approvato + commissioni L2…L3 già pagate (non L1).
   */
  const loanBalanceEuros = computed(() => approvedAmount.value)

  const ratePercent = computed(() => dossier.value.credit.ratePercent)
  const isNewOffer = computed(() => dossier.value.credit.isNew)

  const policyStatus = computed(() => dossier.value.policy.status)
  const policyEtaMinutes = computed(() => dossier.value.policy.etaMinutes)
  const isPolicyIssued = computed(() => policyStatus.value === 'issued')

  const transferStatus = computed(() => dossier.value.transfer.status)
  const transferEtaMinutes = computed(() => dossier.value.transfer.etaMinutes)
  const isAuthorizing = computed(() => transferStatus.value === 'authorizing')
  const transferMethod = computed(() => dossier.value.transfer.method)
  const transferAccountTail = computed(() => dossier.value.transfer.accountTail)

  /*
   * Что осталось. Считаем по steps, а не по account.completed: текущий шаг
   * в маршруте помечен 'current' и в completed попадёт только когда его
   * закроют, — то есть незакрытым он должен считаться и здесь.
   */
  const pendingSteps = computed<AccountStep[]>(() =>
    steps.value.filter((step) => step.status !== 'done').map((step) => step.id),
  )

  const canWithdraw = computed(() => pendingSteps.value.length === 0)

  /* Список отдаётся как есть: решение «документ принят» целиком за сервером,
     и досочинять его по выбранным в браузере файлам кабинет не вправе. */
  const documents = computed(() => dossier.value.documents)

  return {
    client,
    steps,
    total,
    doneCount,
    allDone,
    progress,
    approvedAmount,
    loanBalanceEuros,
    ratePercent,
    isNewOffer,
    policyStatus,
    policyEtaMinutes,
    isPolicyIssued,
    transferStatus,
    transferEtaMinutes,
    isAuthorizing,
    transferMethod,
    transferAccountTail,
    canWithdraw,
    pendingSteps,
    documents,
    startTransfer: dossierStore.startTransfer,
    markOfferSeen: dossierStore.markOfferSeen,
  }
}
