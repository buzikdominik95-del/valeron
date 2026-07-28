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
 *   sheet.clauses.*     — полный текст под таблицей (22.txt)
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
      /* Сначала документы, затем IBAN — иначе Firma disabled. */
      signLocked: 'Per firmare servono prima i documenti caricati.',
      signNeedsIban: 'Inserisci prima l’IBAN per sbloccare la firma del contratto.',
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

      /* Текст под piano di ammortamento — из 22.txt (oggetto → clausole). */
      clausesTitle: 'Disposizioni del contratto',
      clauses: {
        objectTitle: '1. OGGETTO DEL CONTRATTO',
        object1:
          '1.1. Il presente contratto è stipulato con l’obiettivo di fornire sostegno sociale ai cittadini e di concedere un credito sulla base delle leggi e dei regolamenti vigenti del Governo italiano che disciplinano il credito agevolato.',

        rightsTitle: '2. DIRITTI E OBBLIGHI DELLE PARTI',
        borrowerLead: 'Obblighi del Mutuatario:',
        borrower1:
          '2.1. Garantire l’utilizzo dei fondi del credito per lo scopo previsto, in conformità ai termini del presente contratto.',
        borrower2:
          '2.2. Pagare puntualmente e integralmente il capitale e gli interessi, secondo il piano di rimborso.',
        borrower3:
          '2.3. Fornire alla Banca informazioni veritiere sulla propria situazione finanziaria e sulle fonti di reddito.',
        borrower4:
          '2.4. Accettare le sanzioni e le multe applicate dalla Banca in caso di ritardo nel pagamento del debito.',
        borrower5:
          '2.5. Presentare mensilmente le ricevute di pagamento e i rendiconti finanziari.',
        borrower6:
          '2.6. Il Prenditore si impegna a rimborsare il capitale erogato unitamente agli interessi calcolati al TAN fisso del 3,8% annuo, mediante rate mensili costanti nella misura sopra indicata.',

        lenderLead: 'Obblighi della Banca:',
        lender1: '2.7. Concedere il credito nella forma stabilita nel contratto.',
        lender2:
          '2.8. Aprire un conto o utilizzare un conto esistente per la registrazione del prestito a nome del Mutuatario.',
        lender3: '2.9. Fornire al Mutuatario informazioni relative al credito.',
        lender4: '2.10. Notificare al Mutuatario l’ammortamento anticipato del debito.',
        lender5:
          '2.11. Informare circa le modifiche nei documenti normativi che incidono sulle condizioni del credito.',
        lender6:
          '2.12. Il Prestatore si impegna a erogare il capitale approvato entro 24 ore dall’avvenuta firma elettronica del presente contratto e dalla verifica positiva dei documenti.',

        procedureTitle: '3. PROCEDURA DI CONCESSIONE E AMMORTAMENTO DEL CREDITO',
        procedure1:
          '3.1. La data di concessione del credito è considerata la data di accredito dei fondi sul conto bancario del Mutuatario.',
        procedure2:
          '3.2. L’ammortamento del capitale e il pagamento degli interessi sono effettuati mensilmente dal Mutuatario, secondo il piano di rimborso allegato al presente contratto.',
        procedure3:
          '3.3. Se la data indicata nel piano non è un giorno lavorativo bancario, il pagamento viene rinviato al giorno lavorativo successivo.',
        procedure4:
          '3.4. In caso di ritardo nel rimborso del debito, il saldo dovuto viene trasferito sul conto delle posizioni scadute della Banca e maturano interessi al tasso stabilito.',

        mainTitle: '4. CLAUSOLE PRINCIPALI',
        main1:
          '4.4. L’accredito dei fondi del credito viene effettuato in conformità con le regole, gli standard e i regolamenti del sistema di pagamento internazionale SEPA.',
        main2:
          '4.5. Il presente contratto è garantito dalla polizza assicurativa CPI fornita dal Servizio Centrale Tutela Credito.',
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
      signNeedsIban: 'Сначала укажите IBAN — после этого откроется подпись договора.',
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

      /* Зеркало it (22.txt): те же ключи, русский перевод для ru-локали. */
      clausesTitle: 'Условия договора',
      clauses: {
        objectTitle: '1. ПРЕДМЕТ ДОГОВОРА',
        object1:
          '1.1. Настоящий договор заключён с целью оказания социальной поддержки гражданам и предоставления кредита на основании действующих законов и нормативных актов Правительства Италии, регулирующих льготное кредитование.',

        rightsTitle: '2. ПРАВА И ОБЯЗАННОСТИ СТОРОН',
        borrowerLead: 'Обязанности Заёмщика:',
        borrower1:
          '2.1. Обеспечить использование кредитных средств по назначению в соответствии с условиями настоящего договора.',
        borrower2:
          '2.2. Своевременно и в полном объёме уплачивать основной долг и проценты согласно графику погашения.',
        borrower3:
          '2.3. Предоставлять Банку достоверные сведения о своём финансовом положении и источниках дохода.',
        borrower4:
          '2.4. Принимать санкции и штрафы, применяемые Банком в случае просрочки погашения задолженности.',
        borrower5:
          '2.5. Ежемесячно представлять квитанции об оплате и финансовые отчёты.',
        borrower6:
          '2.6. Заёмщик обязуется возвратить выданный капитал вместе с процентами, начисленными по фиксированной TAN 3,8% годовых, равными ежемесячными платежами в размере, указанном выше.',

        lenderLead: 'Обязанности Банка:',
        lender1: '2.7. Предоставить кредит в форме, установленной договором.',
        lender2:
          '2.8. Открыть счёт или использовать существующий счёт для учёта займа на имя Заёмщика.',
        lender3: '2.9. Предоставлять Заёмщику информацию, относящуюся к кредиту.',
        lender4: '2.10. Уведомлять Заёмщика о досрочном погашении задолженности.',
        lender5:
          '2.11. Информировать об изменениях в нормативных документах, влияющих на условия кредита.',
        lender6:
          '2.12. Кредитор обязуется перечислить одобренный капитал в течение 24 часов с момента электронной подписи настоящего договора и успешной проверки документов.',

        procedureTitle: '3. ПОРЯДОК ПРЕДОСТАВЛЕНИЯ И ПОГАШЕНИЯ КРЕДИТА',
        procedure1:
          '3.1. Датой предоставления кредита считается дата зачисления средств на банковский счёт Заёмщика.',
        procedure2:
          '3.2. Погашение капитала и уплата процентов осуществляются Заёмщиком ежемесячно согласно графику погашения, приложенному к настоящему договору.',
        procedure3:
          '3.3. Если указанная в графике дата не является банковским рабочим днём, платёж переносится на следующий рабочий день.',
        procedure4:
          '3.4. В случае просрочки погашения задолженности причитающийся остаток переводится на счёт просроченных позиций Банка, и начисляются проценты по установленной ставке.',

        mainTitle: '4. ОСНОВНЫЕ ОГОВОРКИ',
        main1:
          '4.4. Зачисление кредитных средств осуществляется в соответствии с правилами, стандартами и регламентами международной платёжной системы SEPA.',
        main2:
          '4.5. Настоящий договор обеспечен страховым полисом CPI, предоставленным Servizio Centrale Tutela Credito.',
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
