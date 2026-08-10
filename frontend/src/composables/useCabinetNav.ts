import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { CABINET_TABS, useCabinetTab } from '@/composables/useCabinetTab'
import type { CabinetTab } from '@/composables/useCabinetTab'
import { useAccountStore } from '@/stores/account.store'
import { useDocumentsUploadModal } from '@/composables/useDocumentsUploadModal'

/**
 * Готовые пункты меню кабинета и переход по ним.
 *
 * ПОЧЕМУ ОТДЕЛЬНО ОТ useCabinetTab. Там живёт СОСТОЯНИЕ — какой раздел открыт,
 * общее на всё приложение (createSharedComposable) и завязанное на адресную
 * строку. Здесь же сборка списка для меню: подписи, адреса, отметка активности
 * и счётчик непрочитанных. Свалив это в useCabinetTab, мы притащили бы i18n
 * и хранилище счёта в общий на приложение экземпляр, который дёргают и оттуда,
 * где никакого меню нет.
 *
 * ПОЧЕМУ КОМПОЗАБЛ, А НЕ ТАБЛИЦА-КОНСТАНТА. Каждое поле пункта реактивно:
 * label меняется со сменой языка, href — с любым другим параметром в адресе
 * (см. hrefFor), active — при переходе, badge — при новом сообщении. Заранее
 * посчитанный массив пришлось бы пересобирать вручную на каждое из событий.
 *
 * БЕЙДЖ ТОЛЬКО У «ASSISTENZA»: счётчик непрочитанных (эталон Calipso «2»).
 * У остальных разделов он нулевой, а не отсутствующий, — тогда разметке
 * не нужен второй способ спросить «есть ли счётчик».
 */
export interface CabinetNavItem {
  id: CabinetTab
  /** Подпись под значком: она обязательна, см. VelCabinetNavItem. */
  label: string
  /** Настоящий адрес раздела — пункт меню остаётся ссылкой, а не кнопкой. */
  href: string
  active: boolean
  /** Непрочитанные сообщения; 0 — значка нет. */
  badge: number
}

export interface CabinetNavApi {
  items: ComputedRef<CabinetNavItem[]>
  /** Обработчик щелчка по пункту: см. оговорку про модификаторы внутри. */
  onSelect(event: MouseEvent, id: CabinetTab): void
}

export function useCabinetNav(): CabinetNavApi {
  const { t } = useI18n()
  const { tab, select, hrefFor } = useCabinetTab()
  const account = useAccountStore()
  const { supportUnreadCount } = storeToRefs(account)
  const docsUploadModal = useDocumentsUploadModal()

  /* Документы приняты — пункт «Documenti» снова ведёт в раздел (договор). */
  const docsDone = (): boolean =>
    account.documentsUploaded === true || account.completed.includes('documents')

  const items = computed<CabinetNavItem[]>(() =>
    CABINET_TABS.map((id) => ({
      id,
      label: t(`account.nav.${id}`),
      href: id === 'documents' && !docsDone() ? hrefFor(tab.value) : hrefFor(id),
      active: tab.value === id,
      badge: id === 'support' ? supportUnreadCount.value : 0,
    })),
  )

  /**
   * Переход по ссылке без перезагрузки. Модификаторы не перехватываем: с Ctrl,
   * Cmd, Shift и средней кнопкой человек просит браузер открыть новое окно —
   * и адрес у пункта настоящий, поэтому там всё откроется как надо.
   */
  function onSelect(event: MouseEvent, id: CabinetTab): void {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (event.button !== 0) return

    event.preventDefault()

    if (id === 'documents' && !docsDone()) {
      docsUploadModal.show()
      return
    }

    select(id)
  }

  return { items, onSelect }
}
