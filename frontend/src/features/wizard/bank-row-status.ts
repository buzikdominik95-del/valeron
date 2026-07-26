import type { BankStatus } from '@/composables/useBankAnalysis'

/**
 * Соответствие «статус → роли» для строки опроса банков (VelBankRow).
 *
 * Отдельный модуль, потому что это справочник, а не логика: три таблицы подряд
 * читаются разом, и сразу видно, что статус разведён по трём независимым
 * признакам — слово, цвет подписи и пара «рамка + фон». В самом .vue они стояли
 * между пропами и таймлайном и мешали читать и то, и другое.
 *
 * Record<BankStatus, string> держит полноту на компиляторе: появится четвёртый
 * статус — не соберётся ни одна из таблиц, и ни одна ветка не забудется молча.
 */

/**
 * Ключи подписей. Слово — главный носитель статуса, а не подсказка к цвету:
 * почему именно так, подробно расписано в шапке VelBankRow.
 */
export const STATUS_LABEL: Record<BankStatus, string> = {
  pending: 'wizard.analysis.pending',
  checking: 'wizard.analysis.checking',
  verified: 'wizard.analysis.verified',
}

/*
 * Цвет подписи статуса. text-faint у ожидания заменён на text-muted: faint и
 * accent — оттенки одного синего, и «в очереди» с «проверяем» различались лишь
 * насыщенностью. Теперь синий остался только у активной строки.
 */
export const STATUS_CLASS: Record<BankStatus, string> = {
  pending: 'text-muted',
  checking: 'text-accent',
  verified: 'text-success',
}

/*
 * Рамка и фон строки. Держатся классами-ролями в разметке, а не в scoped-стилях:
 * стили компонента идут вне слоёв и перебивают утилиты Tailwind из
 * @layer utilities. Поэтому в <style> у строки остаются только ширина и
 * стиль рамки, но не её цвет.
 */
export const ROW_CLASS: Record<BankStatus, string> = {
  pending: 'border-line bg-surface',
  checking: 'border-accent bg-raised',
  verified: 'border-success/40 bg-surface',
}
