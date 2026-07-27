import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { useAppView } from '@/composables/useAppView'
import { useViewParams } from '@/composables/useViewParams'

/**
 * Открыт ли кабинет — одним окном для его шапки, кнопки «Accedi» и экрана
 * результата мастера.
 *
 * ПОЧЕМУ НЕ СВОЙ ПАРАМЕТР. Верхний уровень приложения уже живёт в ?view=…
 * (useAppView: 'email' — экран письма, 'cabinet' — кабинет). Второй параметр
 * под тот же экран означал бы два имени одного состояния: ссылка с одним
 * работала бы, с другим нет. Поэтому здесь адаптер, а не вторая маршрутизация,
 * и значение остаётся 'cabinet'. Переименовать его в 'account' — одна строка
 * в APP_VIEWS, все остальные файлы читают состояние через этот композабл.
 *
 * ЧТО АДАПТЕР ДОБАВЛЯЕТ СВЕРХУ. Взаимное исключение экранов: кабинет и мастер
 * оба полноэкранные, у каждого свой <main>, и вместе им на странице не быть.
 * useAppView про мастер не знает — открывая кабинет, ?step здесь снимается
 * явно, иначе после выхода на сайт пользователь проваливался бы обратно
 * в незакрытый мастер.
 */
export interface AccountViewApi {
  isOpen: ComputedRef<boolean>
  open(): void
  close(): void
}

function createAccountView(): AccountViewApi {
  const appView = useAppView()
  const params = useViewParams()

  const isOpen = computed(() => appView.view.value === 'cabinet')

  function open(): void {
    // Мастер на этом заканчивается: из кабинета в него не возвращаются шагом
    // назад, а начинают новую заявку.
    delete params.step
    appView.openCabinet()
  }

  function close(): void {
    /*
     * Симметрично open(): экраны взаимно исключающие, и выход на сайт обязан
     * снять ОБА параметра. Снимался только ?view, поэтому уцелевший ?step
     * возвращал пользователя ровно туда, откуда он только что вышел: щелчок
     * по логотипу из кабинета открывал мастер вместо главной.
     *
     * Снимается здесь, а не в useAppView.backToSite(): верхний уровень про
     * мастер не знает и знать не должен — про оба экрана знает этот адаптер.
     *
     * ?tab — по той же причине: это раздел ВНУТРИ кабинета (useCabinetTab),
     * и на лендинге он бессмысленный хвост в адресе, которым потом делятся.
     */
    delete params.step
    delete params.tab
    appView.backToSite()
  }

  return { isOpen, open, close }
}

/** Состояние общее на всё приложение — см. обоснование в useWizard. */
export const useAccountView = createSharedComposable(createAccountView)
