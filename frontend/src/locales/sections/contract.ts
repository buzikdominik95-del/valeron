/**
 * Строки экрана подписания договора: карточка «Firma», полоса предпросмотра
 * и сам лист договора. В компонентах читаются под префиксом 'contract.',
 * то есть card.sign — это t('contract.card.sign').
 *
 * ПОЧЕМУ ОТДЕЛЬНАЯ СЕКЦИЯ, А НЕ ВЕТКА В account.ts. Лист договора — это
 * юридический текст на полсотни строк, и в общем словаре кабинета он утопил
 * бы собой всё остальное. Отдельный файл ещё и правится отдельно: договор
 * вычитывает юрист, интерфейс — редактор, и в один файл они лезть не должны.
 *
 * Набор ключей в it и ru совпадает один в один: непокрытый ключ vue-i18n молча
 * добирает из fallbackLocale, и посреди русского договора всплыл бы итальянский.
 *
 * Подстановки:
 *   sheet.madeAt        — {place}
 *   sheet.months        — {count}
 *   sheet.rateNote      — {rate} (уже отформатированная строка процента)
 *   sheet.purposeLine   — {purpose}
 *   sheet.clauses.repayment — {count}
 *   sheet.total         — {count}
 *   sheet.signedAt      — {date}, {time}
 *
 * ЮРИДИЧЕСКАЯ ЗАГЛУШКА — sheet.legalNote. Читай комментарий перед ключом
 * прежде чем что-либо там менять.
 */
export default {
  it: {
    card: {
      /* Прописные и разрядку делает CSS (.vel-contract-card__lead) — в словаре
         строка лежит обычным образом, как и у .vel-label по всему проекту. */
      lead: 'Firma dei documenti',
      title: 'Contratto di credito',
      openPdf: 'Apri PDF',
      pdfWaiting: 'Il PDF sarà disponibile appena la banca partner lo prepara.',
      enterIban: 'Inserisci IBAN',
      ibanDone: 'IBAN inserito',
      sign: 'Firma il contratto',
      signed: 'Contratto firmato',
      /* Условие подписи ровно одно — принятые документы. IBAN на него не
         влияет: иначе маршрут замкнулся бы сам на себя. */
      signLocked: 'Per firmare servono prima i documenti caricati.',
    },

    pdfDialog: {
      overline: 'Documento',
      title: 'Contratto di credito',
      close: 'Chiudi',
      openTab: 'Apri in una nuova scheda',
      empty: 'PDF non disponibile.',
      loading: 'Preparazione del PDF con i tuoi dati…',
    },

    preview: {
      title: 'Anteprima del contratto',
      badge: 'Generato',
      /* Подпись всей области предпросмотра для скринридера. */
      region: 'Anteprima del contratto di credito',
    },

    sheet: {
      issuer: 'Intermediario Finanziario — Milano, Italia',
      title: 'Contratto di credito al consumo',
      subtitle: 'ai sensi del D.Lgs. 141/2010 – Credito ai Consumatori',
      place: 'Milano',
      madeAt: 'Fatto a {place}, il',
      numberLabel: 'N. Contratto:',

      partiesTitle: 'Tra i sottoscritti',
      partiesBody:
        'Velora S.r.l., con sede in Milano (Italia), di seguito «il Prestatore», e la persona fisica di seguito indicata, di seguito «il Prenditore», si conviene e si stipula quanto segue.',

      fields: {
        name: 'Nome e cognome del Prenditore',
        email: 'Indirizzo email',
        docType: 'Tipo di documento d’identità',
        docNumber: 'Numero del documento',
        iban: 'IBAN per accredito',
      },
      /* Читается вместо пустой линии: прочерк — типографика, скринридеру он
         ничего не говорит. */
      empty: 'da completare',

      termsTitle: 'Condizioni Finanziarie',
      terms: {
        amount: 'Importo erogato',
        monthly: 'Rata mensile',
        duration: 'Durata',
      },
      months: '{count} mesi',
      rateNote: 'TAN Fisso: {rate} — Tasso Annuo Nominale fisso per tutta la durata',
      purposeLine: 'Finalità del credito: {purpose}',
      purposeUnset: 'non indicata',

      scheduleTitle: 'Piano di Ammortamento',
      columns: {
        index: 'N.',
        date: 'Data',
        payment: 'Rata totale',
        principal: 'Quota capitale',
        interest: 'Quota interessi',
        residual: 'Saldo residuo',
      },
      total: 'Totale ({count} rate)',
      /* Подпись прокручиваемой области: таблица шире экрана телефона и ездит
         внутри своей рамки, и об этом надо сказать вслух. */
      scrollHint: 'Piano di ammortamento — tabella scorrevole in orizzontale',

      clausesTitle: 'Clausole Principali',
      clauses: {
        repayment:
          '1. Rimborso. Il Prenditore si impegna a rimborsare l’importo erogato in {count} rate mensili posticipate, alle date e per gli importi indicati nel piano di ammortamento sopra riportato.',
        early:
          '2. Rimborso anticipato. Il Prenditore può rimborsare anticipatamente, in tutto o in parte, quanto dovuto in qualsiasi momento, con diritto alla riduzione degli interessi e dei costi relativi alla vita residua del contratto, secondo la normativa vigente in materia di credito ai consumatori.',
        withdrawal:
          '3. Recesso. Il Prenditore può recedere dal presente contratto entro quattordici giorni dalla conclusione, senza penalità e senza indicarne il motivo, dandone comunicazione al Prestatore con le modalità indicate nella documentazione precontrattuale.',
        data:
          '4. Trattamento dei dati. I dati personali del Prenditore sono trattati per la gestione del rapporto contrattuale e per gli adempimenti di legge, nel rispetto del Regolamento (UE) 2016/679. L’informativa completa è disponibile nell’area personale.',
      },

      /*
       * ЗАГЛУШКА. ЭТО НЕ ТЕКСТ ДОГОВОРА, А МЕСТО ПОД НЕГО.
       *
       * В образце владельца продукта здесь стояли надзор Банка Италии и номер в реестре
       * финансовых посредников. Ни того, ни другого у нас нет, и придумать
       * регистрационный номер в договоре нельзя ни при каких условиях —
       * это не «рыба текста», а заявление о лицензии от лица компании.
       *
       * Строку заполняет ВЛАДЕЛЕЦ ПРОДУКТА своими настоящими реквизитами
       * (полное наименование, адрес, номер и реестр, орган надзора) перед
       * выкладкой. До тех пор здесь честное «данные о регистрации будут
       * дополнены» — и в it, и в ru.
       */
      legalNote: 'Velora S.r.l. — dati di iscrizione da completare.',
      previewNote:
        'Il presente documento è un’anteprima generata dall’area personale: fa fede il testo definitivo trasmesso dal Prestatore.',

      signatures: {
        lender: 'Firma del Prestatore',
        borrower: 'Firma del Prenditore',
      },
      signedTitle: 'Contratto firmato',
      signedAt: 'Firmato il {date} alle ore {time}',
    },

    iban: {
      title: 'IBAN per l’accredito',
      lead: 'Su questo conto la banca partner versa l’importo del credito. Compare nel contratto al posto della riga vuota.',
      label: 'IBAN',
      placeholder: 'IT00 X000 0000 0000 0000 0000 000',
      hint: 'Lettere e cifre. Il campo si ferma alla lunghezza del paese: 27 per l’Italia.',
      /*
       * СЧЁТЧИК ОСТАТКА, А НЕ ОТКАЗ. Пока знаков не хватает, под полем стоит
       * эта строка: она говорит, сколько дописать, и не объявляет неверным то,
       * что человек ещё печатает.
       *
       * Форма «Caratteri mancanti: {count}» выбрана вместо живого «ancora
       * 4 caratteri» намеренно: число тут меняется от 1 до 34, а падежных
       * правил для ru в createI18n не задано (i18n/index.ts), и в русской ветке
       * вышло бы «ещё 1 знака». Двоеточие снимает согласование в обоих языках,
       * и обе ветки читаются одинаково.
       */
      remaining: 'Caratteri mancanti: {count}',
      /* Красным — только про заведомо негодное, см. ibanShapeProblem. */
      badChars: 'Solo lettere e cifre: gli altri segni non fanno parte dell’IBAN.',
      country: 'L’IBAN inizia con il codice paese di due lettere, ad esempio IT.',
      submit: 'Salva IBAN',
      close: 'Chiudi',
      /* Полный номер нигде не сохраняется — см. комментарий в VelContractIban. */
      privacy: 'Del numero conserviamo solo l’inizio e la fine: il resto resta nascosto.',

      /* Три шага окна. Подписи короткие: они стоят в ряд и на узком экране
         делят ширину на троих. */
      steps: {
        entry: 'Conto',
        confirm: 'Verifica',
        done: 'Fatto',
      },
      next: 'Continua',
      back: 'Modifica',
      /* Шаг читки: контрольная сумма из проверки снята, и опечатку в цифре
         теперь ловит только сам человек — см. VelContractIban. */
      checkLabel: 'Controlla il numero',
      checkWarn:
        'Un numero errato manda i fondi su un altro conto: la banca non può annullare il bonifico.',
      savedLead: 'IBAN salvato. Comparirà nel contratto al posto della riga vuota.',
      done: 'Fatto',
    },
  },

  ru: {
    card: {
      lead: 'Подписание документов',
      title: 'Кредитный договор',
      openPdf: 'Открыть PDF',
      pdfWaiting: 'PDF появится, как только банк-партнёр его подготовит.',
      enterIban: 'Указать IBAN',
      ibanDone: 'IBAN внесён',
      sign: 'Подписать договор',
      signed: 'Договор подписан',
      signLocked: 'Чтобы подписать, сначала загрузите документы.',
    },

    pdfDialog: {
      overline: 'Документ',
      title: 'Кредитный договор',
      close: 'Закрыть',
      openTab: 'Открыть в новой вкладке',
      empty: 'PDF недоступен.',
      loading: 'Готовим PDF с вашими данными…',
    },

    preview: {
      title: 'Предпросмотр договора',
      badge: 'Сформирован',
      region: 'Предпросмотр кредитного договора',
    },

    sheet: {
      issuer: 'Финансовый посредник — Милан, Италия',
      title: 'Договор потребительского кредита',
      subtitle: 'в соответствии с D.Lgs. 141/2010 — кредитование потребителей',
      place: 'Милан',
      madeAt: 'Составлено в городе {place},',
      numberLabel: '№ договора:',

      partiesTitle: 'Между сторонами',
      partiesBody:
        'Velora S.r.l., место нахождения — Милан (Италия), далее «Кредитор», и указанное ниже физическое лицо, далее «Заёмщик», договорились о нижеследующем.',

      fields: {
        name: 'Имя и фамилия заёмщика',
        email: 'Адрес электронной почты',
        docType: 'Вид документа, удостоверяющего личность',
        docNumber: 'Номер документа',
        iban: 'IBAN для зачисления',
      },
      empty: 'не заполнено',

      termsTitle: 'Финансовые условия',
      terms: {
        amount: 'Сумма к выдаче',
        monthly: 'Ежемесячный платёж',
        duration: 'Срок',
      },
      months: '{count} мес.',
      rateNote: 'Фиксированный TAN: {rate} — номинальная годовая ставка на весь срок',
      purposeLine: 'Цель кредита: {purpose}',
      purposeUnset: 'не указана',

      scheduleTitle: 'График погашения',
      columns: {
        index: '№',
        date: 'Дата',
        payment: 'Платёж всего',
        principal: 'Основной долг',
        interest: 'Проценты',
        residual: 'Остаток долга',
      },
      total: 'Итого ({count} платежей)',
      scrollHint: 'График погашения — таблица прокручивается вбок',

      clausesTitle: 'Основные условия',
      clauses: {
        repayment:
          '1. Погашение. Заёмщик обязуется вернуть выданную сумму {count} ежемесячными платежами в даты и в размерах, указанных в приведённом выше графике погашения.',
        early:
          '2. Досрочное погашение. Заёмщик вправе в любой момент полностью или частично погасить задолженность досрочно с уменьшением процентов и расходов, приходящихся на оставшийся срок договора, в соответствии с действующими правилами потребительского кредитования.',
        withdrawal:
          '3. Отказ от договора. Заёмщик вправе отказаться от договора в течение четырнадцати дней с момента заключения без штрафов и без объяснения причин, уведомив кредитора способом, указанным в преддоговорных документах.',
        data:
          '4. Обработка данных. Персональные данные заёмщика обрабатываются для исполнения договора и выполнения требований закона в соответствии с Регламентом (ЕС) 2016/679. Полное уведомление доступно в личном кабинете.',
      },

      /* См. развёрнутый комментарий в итальянской части: это заглушка,
         реквизиты вписывает владелец продукта. */
      legalNote: 'Velora S.r.l. — данные о регистрации будут дополнены.',
      previewNote:
        'Этот документ — предпросмотр, сформированный личным кабинетом: юридическую силу имеет окончательный текст, переданный кредитором.',

      signatures: {
        lender: 'Подпись кредитора',
        borrower: 'Подпись заёмщика',
      },
      signedTitle: 'Договор подписан',
      signedAt: 'Подписано {date} в {time}',
    },

    iban: {
      title: 'IBAN для зачисления',
      lead: 'На этот счёт банк-партнёр переведёт сумму кредита. Он подставится в договор вместо пустой строки.',
      label: 'IBAN',
      placeholder: 'IT00 X000 0000 0000 0000 0000 000',
      hint: 'Латиница и цифры. Поле останавливается на длине страны: для Италии — 27.',
      /* Про форму с двоеточием см. комментарий в итальянской ветке. */
      remaining: 'Осталось знаков: {count}',
      badChars: 'Только латиница и цифры: остальные знаки в IBAN не входят.',
      country: 'IBAN начинается с двухбуквенного кода страны, например IT.',
      submit: 'Сохранить IBAN',
      close: 'Закрыть',
      privacy: 'От номера сохраняем только начало и конец: середина остаётся скрытой.',

      steps: {
        entry: 'Счёт',
        confirm: 'Проверка',
        done: 'Готово',
      },
      next: 'Продолжить',
      back: 'Исправить',
      checkLabel: 'Проверьте номер',
      checkWarn:
        'Неверный номер отправит деньги на чужой счёт: отменить перевод банк не сможет.',
      savedLead: 'IBAN сохранён. Он встанет в договор вместо пустой строки.',
      done: 'Готово',
    },
  },
} as const
