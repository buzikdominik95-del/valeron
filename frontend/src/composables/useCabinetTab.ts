import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { useViewParams } from '@/composables/useViewParams'

/**
 * Раздел личного кабинета: Home, Profilo, Documenti, Assistenza.
 *
 * ЗАЧЕМ. Кабинет был одной длинной колонкой, где все панели лежали друг под
 * другом. В эталоне это четыре раздела, между которыми переключаются, а не
 * скроллят. Значит у кабинета появляется собственное «где я сейчас», и жить
 * оно обязано в адресной строке: переживает перезагрузку, копируется ссылкой
 * и не теряется при возврате из внешнего окна (банк, почта).
 *
 * ПОЧЕМУ ОБЩИЙ ЭКЗЕМПЛЯР ПАРАМЕТРОВ. Своя копия useUrlSearchParams собирает
 * строку запроса заново только из того, что знает сама: записав ?tab, она
 * снесла бы ?view=cabinet — то есть переключение раздела выкидывало бы
 * человека из кабинета на лендинг. На эти грабли в проекте уже наступали
 * (см. useViewParams), поэтому здесь тот же общий экземпляр, что и у
 * useAppView с useWizard.
 *
 * ЗАМЕНА ЗАПИСИ ИСТОРИИ, А НЕ ДОБАВЛЕНИЕ. useViewParams открыт в режиме
 * writeMode: 'replace', и это здесь принципиально: с 'push' системная кнопка
 * «назад» отматывала бы вкладки по одной, и чтобы выйти из кабинета, человеку
 * пришлось бы нажать её столько раз, сколько разделов он открыл. Вход в
 * кабинет свою запись в историю добавляет сам (useAppView.enter).
 */
export const CABINET_TABS = ['home', 'profile', 'documents', 'support'] as const

export type CabinetTab = (typeof CABINET_TABS)[number]

/** Раздел по умолчанию: сюда попадает вход без ?tab и с мусорным ?tab. */
export const DEFAULT_CABINET_TAB: CabinetTab = 'home'

/** Страж для значения из адресной строки — там лежит что угодно. */
export function isCabinetTab(value: unknown): value is CabinetTab {
  return typeof value === 'string' && (CABINET_TABS as readonly string[]).includes(value)
}

/**
 * Идентификатор заголовка открытого раздела. Один на все четыре страницы:
 * на экране в каждый момент времени существует ровно один такой заголовок,
 * и оболочка переводит на него фокус после смены вкладки — иначе с клавиатуры
 * человек остаётся в меню и не понимает, что экран сменился.
 */
export const CABINET_HEADING_ID = 'vel-cabinet-heading'

export interface CabinetTabApi {
  /** Открытый раздел. Мусор и пустое значение читаются как 'home'. */
  tab: ComputedRef<CabinetTab>
  /** Открыть раздел: запись истории заменяется, а не добавляется. */
  select(next: CabinetTab): void
  /**
   * Адрес раздела для настоящей ссылки в меню. Прочие параметры сохраняются:
   * без этого «открыть в новой вкладке» уводило бы на лендинг, потеряв ?view.
   */
  hrefFor(next: CabinetTab): string
}

function createCabinetTab(): CabinetTabApi {
  const params = useViewParams()

  /*
   * Мусорный ?tab=zzz чиним сразу, а не только на чтение (тот же приём, что
   * в useAppView): иначе он остаётся в адресе, которым потом делятся, и
   * ссылка каждый раз открывает не тот раздел, что видел отправитель.
   */
  if (params.tab !== undefined && !isCabinetTab(params.tab)) {
    delete params.tab
  }

  const tab = computed<CabinetTab>(() =>
    isCabinetTab(params.tab) ? params.tab : DEFAULT_CABINET_TAB,
  )

  function select(next: CabinetTab): void {
    // Страж и на запись: значение приходит из разметки меню, но однажды придёт
    // и извне — из ссылки, кода уведомления, глубокого перехода.
    if (!isCabinetTab(next) || tab.value === next) return
    params.tab = next
  }

  function hrefFor(next: CabinetTab): string {
    const search = new URLSearchParams()

    for (const [key, value] of Object.entries(params)) {
      if (key === 'tab' || value === undefined) continue
      if (Array.isArray(value)) {
        for (const item of value) search.append(key, item)
      } else {
        search.set(key, value)
      }
    }

    search.set('tab', next)
    return `?${search.toString()}`
  }

  return { tab, select, hrefFor }
}

/** Состояние общее на приложение: кабинет на экране один. */
export const useCabinetTab = createSharedComposable(createCabinetTab)
