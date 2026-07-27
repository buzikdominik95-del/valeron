import { computed, watchEffect } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import { useCabinetTab } from '@/composables/useCabinetTab'
import type { CabinetTab } from '@/composables/useCabinetTab'
import { accountStepHref } from '@/features/account/account-anchors'
import { useAccountStore } from '@/stores/account.store'
import type { AccountStep, AccountStepStatus } from '@/stores/account.store'

/**
 * Состояние полосы шагов кабинета: подписи кружков, доля заливки дорожки и
 * переходы по шагам.
 *
 * ПОЧЕМУ КОМПОЗАБЛ, А НЕ СКРИПТ КОМПОНЕНТА. Полоса разложена на три файла
 * (каркас VelTrackerBar, ряд кружков VelTrackerRow, короткая полоса сжатого
 * вида VelTrackerMini), и все три показывают одно и то же продвижение. Считай
 * его каждый у себя — счётчик над полосой и длина залитой линии однажды
 * разойдутся. Здесь источник ровно один, а компоненты остаются разметкой.
 *
 * ДОЛЯ ЗАЛИВКИ СТАВИТСЯ ПЕРЕМЕННОЙ ИЗ СКРИПТА. Инлайн-стилей в шаблонах в
 * проекте нет, поэтому число уезжает в --vel-track-progress через
 * setProperty в post-эффекте — тот же приём, что в VelRange, и по той же
 * причине там не взят useCssVar (он затирает нашу запись).
 *
 * КУДА ВЕДЁТ ЩЕЛЧОК. Account (3) — на вкладку профиля, Documenti (4) и
 * Firma (5) — к своим панелям на Home, Simulazione и Approvazione — к
 * обзору. Предстоящие шаги без якоря не кликабельны: вести некуда.
 */

/** Один шаг полосы: состояние из стора плюс все его строки, уже переведённые. */
export interface TrackerStepItem {
  id: AccountStep
  /** Позиция в списке, с нуля. Номер на кружке — index + 1. */
  index: number
  status: AccountStepStatus
  /** Полное название — то, что читает скринридер. */
  title: string
  /** Короткая подпись под кружком — то, что видно. */
  short: string
  href: string | undefined
  canOpen: boolean
  goLabel: string
  statusLabel: string
}

export interface TrackerBar {
  /** Всего шагов. Константа: пять шагов заданы списком ACCOUNT_STEPS. */
  total: number
  doneCount: ComputedRef<number>
  allDone: ComputedRef<boolean>
  /** «Passo 4 di 5» цифрами — строка счётчика справа от подписи. */
  counterText: ComputedRef<string>
  /** Номер шага, на котором человек стоит сейчас, с единицы. */
  currentIndexLabel: ComputedRef<number>
  items: ComputedRef<TrackerStepItem[]>
  onActivate(event: MouseEvent, stepId: AccountStep, href: string | undefined): void
}

/**
 * @param root корень полосы — тот элемент, на который лягут CSS-переменные.
 *   Приходит снаружи, а не заводится здесь: ref под `ref="…"` обязан быть
 *   собственной привязкой компонента, иначе шаблон некуда его прицепить.
 */
export function useTrackerBar(root: Ref<HTMLElement | null>): TrackerBar {
  const { t } = useI18n()
  const { steps, total, doneCount, allDone } = useAccount()
  const { tab, select } = useCabinetTab()

  const counterText = computed(() =>
    t('account.progress.counter', { done: doneCount.value, total }),
  )

  const currentIndexLabel = computed(() => {
    const current = steps.value.find((step) => step.status === 'current')
    if (current !== undefined) return current.index + 1
    return allDone.value ? total : Math.min(total, doneCount.value + 1)
  })

  /* Все строки шага собираются здесь и уходят в кружок уже переведёнными:
     ключи i18n знает полоса, а кружок — только свою разметку. */
  const items = computed<TrackerStepItem[]>(() =>
    steps.value.map((step) => {
      const title = t(`account.tracker.steps.${step.id}`)
      const href = accountStepHref(step.id)
      const canOpen =
        step.status === 'done' ||
        step.status === 'current' ||
        href !== undefined ||
        step.id === 'simulation' ||
        step.id === 'approval'

      return {
        ...step,
        title,
        short: t(`account.tracker.stepsShort.${step.id}`),
        href,
        canOpen,
        goLabel: t('account.progress.goStep', { step: title }),
        statusLabel: t(`account.tracker.status.${step.status}`),
      }
    }),
  )

  /*
   * Доля закрашенной дорожки. Считается по ПОСЛЕДНЕМУ пройденному кружку, а
   * не по текущему: линия соединяет то, что уже позади, и дотянуть её до
   * кружка, к которому человек ещё не подошёл, значило бы соврать.
   * При одном шаге знаменатель обратился бы в ноль — отсюда Math.max.
   */
  const progress = computed(() => {
    if (allDone.value) return 1
    if (doneCount.value <= 0) return 0
    return Math.min(1, (doneCount.value - 1) / Math.max(1, total - 1))
  })

  /*
   * Переменные ставим на КОРЕНЬ полосы, а не на ряд кружков: долю заливки
   * читают двое — линия-соединитель под кружками и короткая полоса сжатого
   * вида, а она ряду не потомок. С записью на ряд сжатая полоса оставалась бы
   * пустой на любом шаге.
   */
  watchEffect(
    () => {
      const element = root.value
      if (element === null) return
      element.style.setProperty('--vel-track-progress', String(progress.value))
      element.style.setProperty('--vel-track-count', String(total))
    },
    { flush: 'post' },
  )

  /*
   * У КАЖДОГО ШАГА СВОЙ РАЗДЕЛ, и щелчок обязан сперва открыть именно его.
   * Панели документов и договора переехали с Home в раздел «Documenti» —
   * пока здесь стояло безусловное select('home'), обе ссылки уводили на
   * главную, где их якорей больше нет, и «Vai» не делал ничего вовсе.
   *
   * Таблица одна на оба незакрытых шага: 'account' — личные данные в профиле,
   * 'documents' и 'signature' — загрузка и договор в разделе документов.
   * Остальные шаги закрывает система, вести по ним некуда — им остаётся
   * обзор на главной.
   */
  /**
   * documents: до verify → Documenti; после accept карточка в Profilo (фотка 20).
   * signature всегда в Documenti (договор).
   */
  function tabForStep(stepId: AccountStep): CabinetTab {
    if (stepId === 'account') return 'profile'
    if (stepId === 'signature') return 'documents'
    if (stepId === 'documents') {
      const docsDone =
        useAccountStore().documentsUploaded === true ||
        steps.value.find((s) => s.id === 'documents')?.status === 'done'
      return docsDone ? 'profile' : 'documents'
    }
    return 'home'
  }

  function openStep(stepId: AccountStep, href: string | undefined): void {
    const target = tabForStep(stepId)
    if (tab.value !== target) select(target)

    // Шаг без якоря — это шаг без своей панели: показываем обзор сверху.
    if (href === undefined) {
      requestAnimationFrame(() => {
        document.getElementById('vel-account-content')?.scrollTo({ top: 0, behavior: 'smooth' })
      })
      return
    }

    /*
     * Двойной кадр, а не один: смена раздела перерисовывает содержимое, и
     * после первого кадра нужного якоря в документе ещё нет — getElementById
     * вернул бы null, а прокрутка молча не случилась бы.
     */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const id = href.replace(/^#/, '')
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })
  }

  /* Модификаторы не перехватываем: с Ctrl, Cmd, Shift и средней кнопкой
     человек просит браузер открыть новое окно, и адрес у шага настоящий. */
  function onActivate(event: MouseEvent, stepId: AccountStep, href: string | undefined): void {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (event.button !== 0) return
    event.preventDefault()
    openStep(stepId, href)
  }

  return {
    total,
    doneCount,
    allDone,
    counterText,
    currentIndexLabel,
    items,
    onActivate,
  }
}
