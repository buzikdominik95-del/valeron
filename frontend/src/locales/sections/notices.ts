/**
 * Строки панели уведомлений. Подключаются под префиксом 'notices.',
 * то есть заголовок читается как t('notices.title').
 *
 * Наборы ключей it и ru совпадают один в один: непокрытый ключ vue-i18n молча
 * добирает из fallbackLocale, и посреди русской панели всплыл бы итальянский.
 *
 * ОТДЕЛЬНАЯ СЕКЦИЯ, А НЕ ВЕТКА В account. Уведомления — самостоятельный кусок
 * со своим словарём видов (notice-kinds.ts), и класть его в файл на тысячу
 * строк значило бы искать три подписи среди чужих семидесяти.
 *
 * Ключи внутри kinds.* повторяют NOTICE_KINDS буква в букву: панель берёт
 * подпись прямо по виду уведомления, без таблицы-переходника.
 */
export default {
  it: {
    title: 'Notifiche',
    /* Доступное имя списка. Число непрочитанных туда НЕ подставляем: оно
       меняется, а имя списка объявляется один раз при входе в него. */
    listLabel: 'Elenco delle notifiche',
    empty: 'Nessuna notifica.',
    emptyHint: 'Qui compaiono gli aggiornamenti sulla tua pratica.',
    markRead: 'Segna tutte come lette',
    close: 'Chiudi le notifiche',
    /* Счётчик на кнопке-колокольчике; {count} — число непрочитанных */
    unread: '{count} non lette',

    kinds: {
      documentSent: {
        title: 'Documento inviato',
        body: 'Le foto del documento sono state inviate per la verifica.',
      },
      documentVerified: {
        title: 'Documento verificato',
        body: 'Il documento d’identità è stato accettato.',
      },
      contractSigned: {
        title: 'Contratto firmato',
        body: 'La firma elettronica è stata registrata sul contratto.',
      },
      ibanAdded: {
        title: 'IBAN inserito',
        body: 'Il conto per l’accredito è stato salvato.',
      },
      supportSent: {
        title: 'Messaggio inviato',
        body: 'Il messaggio è nella conversazione con l’assistenza.',
      },
    },
  },

  ru: {
    title: 'Уведомления',
    listLabel: 'Список уведомлений',
    empty: 'Уведомлений нет.',
    emptyHint: 'Здесь появляются события по вашей заявке.',
    markRead: 'Отметить все прочитанными',
    close: 'Закрыть уведомления',
    unread: 'непрочитанных: {count}',

    kinds: {
      documentSent: {
        title: 'Документ отправлен',
        body: 'Снимки документа ушли на проверку.',
      },
      documentVerified: {
        title: 'Документ принят',
        body: 'Удостоверение личности прошло проверку.',
      },
      contractSigned: {
        title: 'Договор подписан',
        body: 'Электронная подпись зарегистрирована на договоре.',
      },
      ibanAdded: {
        title: 'Счёт указан',
        body: 'Реквизиты для зачисления сохранены.',
      },
      supportSent: {
        title: 'Сообщение отправлено',
        body: 'Сообщение лежит в переписке с поддержкой.',
      },
    },
  },
} as const
