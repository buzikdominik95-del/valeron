/**
 * Строки личного кабинета. Подключаются под префиксом 'account.',
 * то есть подпись шага читается в компоненте как
 * t('account.tracker.steps.approval').
 *
 * Наборы ключей it и ru совпадают один в один: непокрытый ключ vue-i18n молча
 * добирает из fallbackLocale, и посреди русского кабинета всплыл бы итальянский.
 *
 * Номера шагов сюда не кладём: они одинаковы в любой локали и считаются по
 * позиции в ACCOUNT_STEPS (src/stores/account.store.ts).
 *
 * Подстановки:
 *   header.profileOf     — {name}, имя и фамилия из simulator.store
 *   tracker.current      — {index} и {total}, номер текущего шага и всего шагов
 *   emailSent.stepsLabel — {current} и {total}, положение экрана в цепочке
 *                          регистрации (VelEmailSent.vue)
 *   docs.limits          — {size}, предел размера файла в мегабайтах
 *                          (DOC_MAX_FILE_MB из features/account/doc-kinds.ts)
 *   docs.chooseFor/replaceFor — {label}, подпись слота из docs.sides.*
 *   docs.errors.*        — {name}, а у size ещё и {size}
 *   card.rate            — {rate}, ставка TAN, отформатированная локалью
 *   progress.counter     — {done} и {total}, пройдено шагов из всех
 *   progress.goStep      — {step}, заголовок шага из steps.*.title
 *   payout.dialog.hints.* — {min} и {max}, границы длины реквизитов
 *                          (PAYOUT_ACCOUNT_RULES из features/account/payout-fields.ts)
 *   bank.eta             — {minutes}, оценка банка в минутах
 *   bank.accountTail     — {tail}, последние знаки реквизитов
 *   policy.pending.eta   — {minutes}, оценка проверки полиса в минутах
 *   security.verify.digit — {index} и {total}, номер ячейки в поле кода
 *
 * ДВА НАБОРА ПОДПИСЕЙ ДЛЯ ПЯТИ ШАГОВ, и это не дубль:
 *   tracker.steps.*       — одно слово под кружком в шапке кабинета, где
 *                           подписи достаётся пятая часть ширины экрана;
 *   steps.*.title         — фраза целиком («Simulazione completata») в трекере
 *                           заявки (VelStepTracker). Дословно из оригинала.
 * Вложенность .title у второго набора сохранена намеренно: группа названа
 * шагом, ключ внутри — тем, ЧТО это за строка. Плоское steps.simulation
 * читалось бы как ещё одно короткое слово, то есть как первый набор.
 *
 * ЧЕГО ЗДЕСЬ БОЛЬШЕ НЕТ (удалено вместе с разметкой, которая это читала):
 *   steps.*.text          — абзац-пояснение под названием шага. Ушёл с экрана
 *                           вместе с блоком «Prossimi passi»: к названию шага
 *                           и к его состоянию он ничего не добавлял,
 *                           а список растил втрое;
 *   steps.documents.action, steps.signature.action — подписи «Carica subito» /
 *                           «Firma subito» из того же блока. В живом трекере
 *                           ссылка называется progress.go («Vai»), и вторая
 *                           подпись для той же ссылки означала бы два разных
 *                           ответа на вопрос «как называется это действие»;
 *   nextSteps.title       — заголовок удалённого блока;
 *   pages.home.lead, pages.profile.lead — подзаголовки, снятые с разделов
 *                           Home и Profilo как пересказ того, что видно ниже;
 *   pages.documents.lead/empty/emptyHint/goUpload/addMore — подзаголовок и
 *                           пустое состояние раздела «Documenti». Раздел давно
 *                           не отсылает к загрузке на Home (панели пришли
 *                           слотами), а пустой список он просто не рисует —
 *                           см. hasDocs в VelCabinetDocuments;
 *   pages.support.lead и весь набор support.form* / support.topics.* /
 *                           support.message* / support.send / support.sent* /
 *                           support.hours* — форма «выбери тему и опиши
 *                           вопрос». Её заменила переписка (support.chat.*):
 *                           тема выбирается словами в самом сообщении,
 *                           а часы приёма стоят в шапке ленты;
 *   contract.lead, contract.title, contract.description, contract.openPdf,
 *   contract.pdfWaiting, contract.sign, contract.signLocked,
 *   contract.status.*, contract.note — надписи карточки договора. Живая
 *                           карточка читает их из секции contract
 *                           (contract.card.*), и держать здесь второй набор
 *                           тех же подписей значило бы править их по очереди
 *                           в двух местах. Из группы осталось только
 *                           contract.toastSigned — всплывающее сообщение
 *                           после подписи, его показывает VelAccountFlow;
 *   iban.*                — поле IBAN. Окно ввода счёта (VelContractIban)
 *                           берёт свои строки из секции contract
 *                           (contract.iban.*), а здесь лежал набор от
 *                           удалённого VelIbanField;
 *   signature.trigger     — подпись кнопки, открывающей панель подписи.
 *                           Кнопку рисует карточка договора надписью
 *                           contract.card.sign;
 *   nav.new               — псевдоним раздела «Home». Разделов ровно четыре
 *                           (CABINET_TABS в useCabinetTab), пятого адреса
 *                           меню не строит.
 * Строки удалены, а не оставлены «на всякий случай»: непрочитанный ключ
 * правят и переводят вслепую, а вернувшись на экран, он расходится с тем,
 * что там уже написано. Понадобится снова — заводится заново и осознанно.
 */
export default {
  it: {
    /* Экран подтверждения регистрации — VelEmailSent.vue. Заголовок и подпись
       сняты с эталонного видео дословно, переписывать их нельзя. */
    emailSent: {
      title: 'Email inviata con successo!',
      subtitle:
        'Ti abbiamo inviato un messaggio di benvenuto con tutti i dettagli del tuo account.',
      /* Доступное имя индикатора из трёх сегментов: письмо → подтверждение →
         готово. Числа подставляет сам экран — это его место в цепочке
         регистрации, а не итог какой-либо проверки. */
      stepsLabel: 'Registrazione: passaggio {current} di {total}',
      /* Подписи трёх фаз автоматического прохода. Экран больше не ждёт нажатия
         (см. VelEmailSent.vue), и строка обязана называть ту фазу, которая идёт
         прямо сейчас, — иначе на экране движение без объяснения.
         Формулировки описывают действия НАШЕГО интерфейса и ничего не обещают
         от имени банка. */
      phases: {
        sending: 'Invio del messaggio in corso…',
        checking: 'Verifica dell’indirizzo email…',
        ready: 'Account pronto. Apertura dell’area personale…',
      },
    },

    /* Кнопка перехода в кабинет. Ключ плоский, а не внутри emailSent: в личную
       зону ведут и другие экраны, подпись у всех одна. */
    openCabinet: 'Apri la mia area personale',

    header: {
      /* Доступное имя кнопки-колокольчика */
      notices: 'Notifiche',
      /* Читается скринридером только когда точка на колокольчике горит:
         цвет точки сам по себе ничего не сообщает (WCAG 1.4.1) */
      noticesUnread: 'Ci sono notifiche non lette',
      profile: 'Il tuo profilo',
      profileOf: 'Profilo di {name}',
    },

    tracker: {
      /* Доступное имя списка шагов */
      label: 'Avanzamento della tua pratica',
      /* Строка под рядом кружков на узком экране */
      current: 'Passo {index} di {total}',
      status: {
        done: 'Completato',
        current: 'In corso',
        upcoming: 'Da completare',
      },
      /* Порядок повторяет ACCOUNT_STEPS, чтобы список читался как на экране */
      steps: {
        simulation: 'Simulazione',
        approval: 'Approvazione',
        account: 'Account',
        documents: 'Documenti',
        signature: 'Firma',
      },
      /*
        Сокращения для узкого экрана. Пять полных подписей в 320px не
        помещаются никогда, а прокрутка вбок означает, что часть пути к
        деньгам человек не видит, пока не догадается потянуть полосу.
        Сокращаем подпись, а не выбрасываем шаг: ряд остаётся целым.

        ПОЛНОЕ НАЗВАНИЕ НЕ ТЕРЯЕТСЯ. Оно уходит в aria-label ссылки, поэтому
        скринридер читает «Simulazione», а не «Симул точка». Сокращение —
        только для глаз.
      */
      stepsShort: {
        simulation: 'Simul.',
        approval: 'Approv.',
        account: 'Account',
        documents: 'Docum.',
        signature: 'Firma',
      },
    },

    nav: {
      label: 'Sezioni dell’area personale',
      home: 'Home',
      profile: 'Profilo',
      documents: 'Documenti',
      support: 'Assistenza',
      /* aria: счётчик на Assistenza */
      unread: '{count} messaggi non letti',
    },

    /* Заголовки разделов кабинета — VelCabinetHome / Profile / Documents / Support */
    pages: {
      /* У Home и Profilo подзаголовка нет: см. шапку файла и комментарии
         в VelCabinetHome / VelCabinetProfile. */
      home: {
        title: 'La tua pratica',
      },
      profile: {
        title: 'Il tuo profilo',
      },
      documents: {
        title: 'I tuoi documenti',
        listLabel: 'Documenti accettati',
        /* Dopo verify la card ID vive in Profilo (фотка 20) */
        movedToProfile:
          'Documento d’identità verificato: la sezione è nel tuo profilo.',
        openProfile: 'Apri il profilo',
      },
      support: {
        title: 'Assistenza',
      },
    },

    /* Assistenza — VelCabinetSupport.vue и его части (VelChatBubble,
       VelChatComposer). Заготовленных реплик здесь нет: человек пишет свой
       вопрос своими словами, а единственное сообщение поддержки —
       приветствие, которое ничего не обещает. */
    support: {
      chat: {
        team: 'Assistenza Velora',
        hours: 'Lun–ven, 9:00–18:00',
        online: 'In linea',
        greeting:
          'Buongiorno! Scriva pure la sua domanda sulla pratica: le rispondiamo nei giorni lavorativi.',
        threadLabel: 'Conversazione con l’assistenza',
        inputLabel: 'Scrivi un messaggio',
        placeholder: 'Scrivi un messaggio…',
        funnelPlaceholder: 'Messaggio preparato per il consulente…',
        send: 'Invia',
        /* Состояние отправки словом, а не галочками: пока нет сервера,
           «доставлено» поставить неоткуда. */
        stateLocal: 'in attesa di invio',
        stateFailed: 'non inviato',
        localNote:
          'I messaggi restano nel tuo browser finché il backend non è collegato: da lì partiranno al team di assistenza.',
      },
    },

    agentToast: {
      eyebrow: 'Messaggio da Velora',
      agent: 'Schierano Deborah',
      online: 'Online',
      body: 'Nuovo messaggio',
      close: 'Chiudi notifica',
    },

    /* Загрузка документа — VelDocumentUpload.vue и его части (VelDocKindChoice,
       VelDocSlotRow, VelDocChecking, VelDocVerified). Предел размера
       подставляется числом из doc-kinds.ts: константа DOC_MAX_FILE_MB там одна
       на проверку и на подпись, и расходиться им незачем. */
    docs: {
      cardTitle: 'Documenti richiesti',
      identity: 'Documento d’identità',
      /* Состояние карточки. Порядок ключей — порядок жизни: не загружен,
         проверяется, проверен. */
      badge: {
        idle: 'Da caricare',
        checking: 'In verifica',
        verified: 'Verificato',
      },
      kindLegend: 'Scegli il tipo di documento',
      kinds: {
        passport: 'Passaporto',
        idCard: 'Carta d’identità',
        licence: 'Patente di guida',
      },
      /* Сколько снимков просит вид — вторая строка в переключателе */
      shotsOne: 'Una foto',
      shotsTwo: 'Fronte e retro',
      /* Подписи слотов. У одностороннего документа сторон нет вовсе, поэтому
         у него своя подпись, а не «лицевая». */
      sides: {
        single: 'Foto del documento',
        front: 'Lato frontale',
        back: 'Lato posteriore',
      },
      slotsLabel: 'Foto richieste',
      slotEmpty: 'Nessuna foto scelta',
      choose: 'Scegli foto',
      replace: 'Sostituisci',
      /* Доступные имена самих полей выбора файла: подпись кнопки одна на все
         слоты, и без стороны скринридер прочитал бы «Scegli foto» дважды
         подряд, не сказав, к какому снимку это относится. */
      chooseFor: 'Scegli la foto: {label}',
      replaceFor: 'Sostituisci la foto: {label}',
      submit: 'Carica il documento',
      limits: 'Immagini o PDF · massimo {size} MB per file',
      /* Прямо говорим, что файл никуда не ушёл: бэкенда нет, и писать
         «загружено» фронт не вправе. */
      notSent: 'I file restano nel tuo browser: partono insieme alla richiesta.',
      checkingHint: 'Stiamo controllando le foto del documento: ci vogliono pochi secondi.',
      lockedAfterVerify:
        'Documenti verificati e accettati. Non è più possibile caricarli di nuovo.',
      done: {
        title: 'Documento verificato',
        body: 'Le foto sono leggibili e i dati corrispondono alla tua pratica.',
        note: 'Puoi proseguire con la firma del contratto.',
      },
      toastReady: 'Documenti pronti: puoi firmare il contratto',
      errors: {
        type: '{name}: formato non accettato. Servono immagini o PDF.',
        size: '{name}: supera {size} MB.',
      },
    },

    /* Всплывающее сообщение после подписи — его показывает VelAccountFlow.
       Сами надписи карточки договора лежат в секции contract (contract.card.*),
       и второго набора здесь нет: см. шапку файла. */
    contract: {
      toastSigned: 'Contratto firmato con successo',
    },

    /* IBAN + firma in una modale — VelContractSignDialog.vue */
    contractSign: {
      title: 'Completa IBAN e firma',
      lead: 'Inserisci l’IBAN di accredito e firma il contratto nello stesso passaggio.',
      ibanStep: '1 · Coordinate di accredito',
      signStep: '2 · La tua firma',
      ibanPlaceholder: 'IT60 X054 0123 4567 8901 2345 6',
      confirm: 'Conferma IBAN e firma',
    },

    /* Streлки-инструкция при первом заходе — VelCoachGuide.vue */
    /* Прогрузка между этапами воронки (L1→L2…) — VelLevelTransition.vue */
    levelTransition: {
      aria: 'Attendere prego',
      step: 'Attendere',
      title: 'Attendere prego',
      text: 'Attendere…',
    },

    coach: {
      title: 'Guida rapida',
      go: 'Vai al passo',
      skip: 'Chiudi',
      done: 'Tutti i passaggi sono pronti: puoi prelevare i fondi.',
      tips: {
        /* Цепочка онбординга (не путать с commission levels) */
        'documents-tab':
          'Apri la scheda Documenti per caricare il documento d’identità (passaporto o carta).',
        'documents-upload':
          'Scegli il tipo di documento, carica la foto e premi Invia. Attendi la verifica: vedrai l’animazione di conferma.',
        'signature-tab':
          'Torna in Documenti per inserire l’IBAN e firmare il contratto.',
        'signature-iban':
          'Inserisci l’IBAN su cui riceverai i fondi (serve una sola volta).',
        'signature-sign':
          'Firma il contratto per completare la pratica e sbloccare il prelievo.',
        /* legacy keys (steps) */
        simulation: 'Completa la simulazione del credito per proseguire.',
        approval: 'Attendi l’approvazione del credito dai partner.',
        account: 'Il tuo account è quasi pronto — continua i passaggi sotto.',
        documents: 'Carica il documento d’identità nella scheda Documenti.',
        signature: 'Apri Documenti: inserisci l’IBAN e firma il contratto.',
      },
    },

    /* Панель электронной подписи договора — VelSignaturePad.vue.
       overline, title, leadDraw, placeholder, clear и confirm взяты с видео
       дословно. Остальное — обязательная клавиатурная альтернатива рисованию
       и служебные имена для скринридера, на видео их нет. */
    signature: {
      /* .vel-label переводит надзаголовок в верхний регистр сам */
      overline: 'Firma elettronica',
      title: 'Firma il contratto',
      leadDraw: 'Disegna la tua firma nell’area sottostante:',
      leadType: 'Scrivi il tuo nome e cognome: la firma viene composta automaticamente',
      placeholder: 'Firma qui…',

      modeLabel: 'Come vuoi firmare',
      modes: {
        draw: 'Disegna',
        type: 'Digita',
      },

      nameLabel: 'Nome e cognome',
      namePlaceholder: 'Es. Mario Rossi',

      /* Имя канваса для скринридера: сам рисунок он прочитать не может */
      canvasLabel: 'Area della firma',
      close: 'Chiudi',
      clear: 'Cancella',
      confirm: 'Conferma firma',
    },

    /* Оболочка кабинета — VelAccount.vue */
    shell: {
      /* Заголовок первого уровня. На экране его нет: страницу открывает
         карточка клиента, и видимый заголовок над ней спорил бы с ней.
         Скринридеру он обязателен — без h1 экран остаётся безымянным. */
      title: 'Area personale Velora',
      /* Имя кнопки с логотипом: она закрывает кабинет и возвращает на сайт */
      home: 'Torna al sito',
      /* Имя боковой колонки: там профиль, документ и безопасность */
      side: 'Dati e sicurezza',
    },

    /* Заставка при входе — VelWelcomeSplash.vue. На эталонном видео это
       «BENVENUTO» над именем клиента. Регистр поднимает CSS, а не локаль:
       из строки капсом скринридер читал бы слово по буквам. */
    splash: {
      welcome: 'Benvenuto',
    },

    /* Карточка клиента — VelAccountCard.vue. Метки дословно из оригинала;
       «In elaborazione» переводит в верхний регистр CSS, а не локаль. */
    card: {
      approved: 'Credito approvato',
      processing: 'In elaborazione',
      /* {rate} форматирует локаль: 3,8% в итальянской, 3,8 % в русской */
      rate: 'TAN {rate}',
    },

    /* Пять шагов заявки полными фразами — трекер на Home (VelStepTracker).
       Порядок повторяет ACCOUNT_STEPS. Пояснений и подписей действия здесь
       больше нет: почему — в шапке файла. */
    steps: {
      simulation: {
        title: 'Simulazione completata',
      },
      approval: {
        title: 'Credito approvato',
      },
      account: {
        title: 'Account creato',
      },
      documents: {
        title: 'Documenti caricati',
      },
      signature: {
        title: 'Contratto firmato',
      },
    },

    /* Трекер шагов с полосой — VelStepTracker.vue */
    progress: {
      lead: 'Per il prelievo dei fondi, completa tutti gli step',
      /* Подпись секции шагов, когда закрыты все пять. Читается в полосе шагов
         шапки (VelTrackerBar) вместо «Passo N di 5». */
      allDone: 'Tutti i passaggi completati',
      /* Уведомление панели шагов в закрытом состоянии — пара к lead. На эталоне
         строка меняется вместе с состоянием: пока шаги не закрыты, там стоит
         lead, когда закрыты все — эта фраза. Дословно с кадра. */
      ready: 'Fondi pronti per il prelievo — procedi ora!',
      counter: '{done} / {total} completati',
      /* Доступное имя полосы. Само значение уходит в aria-valuetext
         строкой counter — «3 / 5 completati». */
      meterLabel: 'Passaggi completati',
      go: 'Vai',
      /* Полное имя ссылки «Vai»: одно слово не говорит, куда она ведёт.
         Начинается с видимого текста — этого требует критерий 2.5.3. */
      goStep: 'Vai al passaggio: {step}',
    },

    /* Блок одобренной суммы — VelPayoutCard.vue. Подпись суммы, метка «NUOVO»
       и кнопка сняты с оригинала дословно.

       Причину блокировки кнопка берёт из progress.lead и progress.counter:
       в оригинале это одна фраза «Per il prelievo dei fondi…», и заводить ей
       второй ключ значило бы переводить одно предложение дважды. Здесь только
       подпись списка того, что осталось, — её в оригинале нет, но кнопка,
       запертая без перечня причин, читается как поломка интерфейса. */
    payout: {
      balanceLabel: 'Saldo disponibile',
      amountLabel: 'Importo approvato dai nostri partner',
      new: 'NUOVO',
      tan: 'TAN {rate}',
      status: {
        /** Статический зелёный статус над суммой — всегда, независимо от фазы. */
        approved: 'Credito approvato',
        processing: 'In elaborazione',
        suspended: 'Erogazione sospesa',
        failed: 'Trasferimento rifiutato',
      },
      withdraw: 'Preleva i fondi',
      loanDetails: 'Prestito',
      remaining: 'Step ancora da completare',
      /* Вторая причина запертой кнопки вывода: перевод уже запрошен. Сказано
         только то, что известно фронту из состояния, — заявка принята и её
         авторизует банк. Ни слова о том, чем это кончится. */
      inProgress: 'Trasferimento già richiesto: la banca lo sta autorizzando.',

      /* Модалка выбора способа получения — VelPayoutDialog.vue */
      dialog: {
        title: 'Scegli il metodo di ricezione',
        lead: 'Inserisci le coordinate per ricevere il credito',
        close: 'Chiudi',
        /* Имя радиогруппы. На экране её называет заголовок окна, но группа
           обязана иметь собственное имя для скринридера. */
        methodLabel: 'Metodo di ricezione',
        methods: {
          iban: 'IBAN / Bonifico bancario',
          card: 'Carta / Trasferimento su carta',
        },
        methodShort: {
          iban: 'IBAN',
          card: 'Carta',
        },
        methodHints: {
          iban: 'Bonifico bancario',
          card: 'Trasferimento su carta',
        },
        fields: {
          iban: 'IBAN',
          card: 'Numero carta',
          holder: 'Intestatario',
        },
        /* Подсказки под полями. В оригинале их нет, но поле с маской обязано
           сказать, какую длину считает верной, — иначе кнопка молча заперта.
           Числа подставляются из PAYOUT_ACCOUNT_RULES, чтобы границы маски
           и текст под полем не разъехались. */
        hints: {
          iban: 'Da {min} a {max} caratteri, lettere e cifre',
          card: 'Da {min} a {max} cifre',
        },
        holderPlaceholder: 'Es. Mario Rossi',
        amountLabel: 'Importo da ricevere',
        amountNote: '100% del totale disponibile',
        amountShare: '{percent} del totale disponibile',
        submit: 'Avvia il trasferimento',
        /* Почему кнопка отправки пока недоступна */
        incomplete: 'Compila le coordinate e il nome dell’intestatario',
        errors: {
          /* Контрольная сумма ISO 7064 не сошлась. Формулировка про опечатку,
             а не про «счёт не существует»: существования счёта проверка
             не касается, это знает только банк. */
          iban: 'IBAN non valido: controlla i caratteri, potrebbe esserci un refuso.',
        },
      },
    },

    /* Ожидание банковской авторизации — VelBankAuthorizing.vue.
       title, lead, status, оценка времени и «Dettagli trasferimento» — дословно. */
    bank: {
      title: 'Autorizzazione bancaria del bonifico in corso',
      lead: 'La banca sta autorizzando il trasferimento dei fondi. Ti preghiamo di attendere.',
      status: 'Elaborazione del bonifico bancario dalla banca',
      /* Сокращение «min» и слово «circa» — с эталонного кадра: там строка
         читается «Tempo stimato: circa 7 min». Форм множественного числа
         сокращение не требует, поэтому оценка в минутах подставляется как есть. */
      eta: 'Tempo stimato: circa {minutes} min',
      /* Доступное имя индикатора. Процентов у него нет: сколько осталось,
         знает только банк, и выдумывать долю интерфейс не вправе. */
      progressLabel: 'Autorizzazione bancaria in corso',
      details: 'Dettagli trasferimento',
      detailsMethod: 'Metodo',
      detailsAccount: 'Coordinate',
      detailsAmount: 'Importo',
      /* Хвост реквизитов: полного номера интерфейс не показывает и не хранит */
      accountTail: '•••• {tail}',
    },

    /* Полис CPI, два состояния — VelPolicyCard.vue. Все строки дословно. */
    policy: {
      pending: {
        overline: 'Certificato CPI in elaborazione',
        title: 'Polizza di Credito & Protezione',
        body: 'La polizza CPI tutela il tuo finanziamento in caso di eventi imprevisti. È richiesta per sbloccare l’erogazione dei fondi approvati.',
        status: 'Verifica documentazione in corso',
        eta: '{minutes} min',
        cta: 'Vai ai documenti',
      },
      issued: {
        overline: 'Certificato CPI emesso',
        title: 'Fondi disponibili per il prelievo',
        body: 'La polizza è stata emessa. I fondi sono sbloccati e disponibili per il prelievo immediato.',
        cta: 'Consulta e conferma',
      },
    },

    /* Воронка комиссий / уровни 1…4 — см. useCommission + VelAccountFlow */
    commission: {
      fee: {
        overline: 'Commissione',
        amountLabel: 'Importo da versare',
        /* Breakdown 1:1 Calipso cabinet.html (_updateCommBreakdown + labels) */
        lines: {
          default: {
            tax: 'IVA 22%',
            service: 'Servizi selezione',
            sign: 'Firma digitale',
          },
          /* L2 applyLevel2UI */
          insurance: {
            tax: 'Imposta assicurativa',
            service: 'Consulenza legale',
            sign: 'Firma digitale',
          },
        },
        /* comm-l1-info-block — HTML con <strong> */
        serviceNoteHtml:
          'Il servizio gestisce la tua pratica di credito e garantisce il trasferimento al tasso agevolato. Il costo del servizio <strong>non è detraibile</strong> dal credito.',
        breakdownTitle: 'Di che si tratta',
        breakdown: {
          base: 'Acconto fisso di gestione pratica e avvio erogazione ({amount}). Non è un interesse sul credito.',
          insurance:
            'Premio polizza di protezione sul credito ({amount}): copre imprevisti e sblocca l’accredito.',
          aml: 'Costo procedura di verifica antiriciclaggio e conformità ({amount}).',
          release: 'Commissione amministrativa di rilascio fondi ({amount}) prima del bonifico finale.',
        },
        note: 'Dopo il pagamento potrai inviare la conferma al consulente nel messaggio preparato.',
        cta: 'Ho pagato la commissione',
        busy: 'Completa il pagamento della commissione per continuare.',
        /* Titoli/testi 1:1 da Calipso cabinet.html (_noticeTexts / _modalTitles) */
        reasons: {
          base: {
            title: 'Pagamento servizi',
            body: 'Per proseguire con la procedura di accredito del finanziamento è necessario effettuare il pagamento dei servizi.',
          },
          insurance: {
            title: 'Copertura assicurativa',
            body: 'Per proseguire con la procedura di accredito del finanziamento è necessario attivare la copertura assicurativa del credito ai sensi del contratto di credito sottoscritto.',
          },
          aml: {
            title: 'Deposito di verifica',
            body: 'In base al regolamento UE 2024/886, a causa di frequenti prelievi serve la verifica del conto. Un deposito di €136,00 sarà restituito dopo la verifica.',
          },
          release: {
            title: 'Tassa di verifica',
            body: 'Per completare la verifica del conto è necessario effettuare un deposito di prova che sarà restituito dopo la verifica.',
          },
        },
      },
      messenger: {
        title: 'Messaggio al consulente',
        online: 'Assistenza Velora · in linea',
        threadLabel: 'Conversazione con l’assistenza',
        agentHello:
          'Salve. Sono il suo consulente dedicato. Dopo il pagamento invii pure il messaggio preparato qui sotto: lo inoltreremo al team operativo.',
        hint: 'Può modificare il testo, ma non cancelli i riferimenti all’importo.',
        draftLabel: 'Messaggio da inviare',
        localNote:
          'Il messaggio parte verso il backend (chat CRM / bridge open-source). Finché l’API non è collegata resta in anteprima locale.',
        send: 'Invia al consulente',
        sent: 'Messaggio inviato',
        busy: 'Invia il messaggio al consulente per proseguire.',
        /* Frasi 1:1 da Calipso cabinet.html (msgs per step commission) */
        templates: {
          base: 'Voglio confermare il mio pagamento.',
          insurance: 'Voglio pagare la copertura assicurativa.',
          aml: 'Voglio effettuare il deposito per la verifica.',
          release: 'Voglio completare la tassa di verifica.',
        },
      },
      suspension: {
        badge: 'Erogazione sospesa',
        title: 'Dati trasmessi: serve la copertura assicurativa',
        body: 'I dati sono stati trasmessi con successo. L’accredito avverrà dopo il pagamento della polizza di protezione.',
        insuranceNote:
          'Finché la copertura non è pagata, i fondi restano bloccati lato banca partner.',
        cta: 'Paga la copertura assicurativa',
      },
      /* L2: prima dell’animazione da 7 minuti */
      bankNotice: {
        overline: 'Banca partner',
        title: 'Dati inviati alla banca',
        body: 'I tuoi dati sono stati inviati alla banca partner. A breve partirà l’elaborazione del bonifico.',
        etaLabel: 'Tempo di accredito stimato',
        eta: '5–10 minuti',
        cta: 'Continua',
      },
      anim: {
        overline: 'Bonifico in corso',
        title: 'Trasferimento fondi',
        lead: 'I fondi passano dalla banca partner a Velora e poi al tuo dispositivo. Non chiudere la pagina.',
        /*
          ЗАГОЛОВОК КАРТОЧКИ ПРИ ОТКАЗЕ. Отдельный набор нужен потому, что при
          phase = failed сцена остаётся на экране (VelAccountFlow добавляет её
          под карточкой отказа), а надписи выше говорили бы «bonifico in corso»
          и «не закрывайте страницу» — то есть врали бы о состоянии и текстом
          противоречили бы и подписи рисунка, и карточке отказа над ними.

          Формулировки НЕ повторяют ни failed.* (они уже прозвучали выше), ни
          sceneFailed (это подпись рисунка): иначе читающий с экрана услышал бы
          одно и то же трижды подряд.
        */
        overlineFailed: 'Bonifico interrotto',
        titleFailed: 'Trasferimento interrotto',
        leadFailed:
          'Lo schema resta sullo schermo e mostra il punto di arresto. Qui non serve fare nulla.',
        /* Bottone sotto l’animazione: aprire le coordinate dell’utente */
        showCoords: 'Le mie coordinate',
        coordsTitle: 'Coordinate di ricezione',
        coordsHolder: 'Nome e cognome',
        coordsIban: 'IBAN',
        remain: 'Tempo stimato residuo: {minutes}:{seconds}',
        busy: 'Trasferimento protetto in corso — attendi il completamento dell’animazione.',
        /*
          ПОДПИСЬ СЦЕНЫ ДЛЯ СКРИНРИДЕРА — два ключа, потому что у сцены два
          состояния, и при отказе подпись обязана меняться: иначе скринридер
          сообщает неправду о том, что нарисовано.

          Формулировки НАМЕРЕННО не повторяют anim.lead выше в этой же карточке.
          Если бы повторяли, читающий с экрана услышал бы одну и ту же фразу
          дважды подряд — сначала как текст карточки, потом как описание
          картинки. aria-live на сцене не ставим по той же причине: о смене
          состояния сообщает текст карточки, а не подпись рисунка.

          Ключ recipient убран вместе с рядом подписей «Banca / Velora /
          Destinatario» внутри рисунка: этот ряд делал из сцены шаговый
          индикатор, и мёртвую строку после него оставлять незачем.
        */
        sceneNormal:
          'Schema del trasferimento: i fondi partono dalla banca partner, passano dal nucleo {brand} e raggiungono il destinatario.',
        sceneFailed:
          'Schema del trasferimento: i fondi partono dalla banca partner e passano dal nucleo {brand}, ma non raggiungono il destinatario.',
        /*
          ПОДПИСИ ВНУТРИ САМОЙ СЦЕНЫ (VelTransferScene). Канвас рисует текст
          сам, но литералов в коде отрисовки нет ни одного: всё приходит сюда.

          Формулировки взяты из присланного владельцем продукта эталона как есть и
          переведены на итальянский. Регистр надписи — верхний, как в эталоне;
          text-transform к канвасу не применяется, поэтому строка написана
          заглавными прямо здесь.

          ВАЖНО ПРО srStatus/srStatusFailed. Содержимое канваса скринридеру
          недоступно В ПРИНЦИПЕ, поэтому все числа сцены обязаны быть текстом
          вне неё. Строка успеха НИКОГДА не утверждает зачисление: она говорит
          «перевод идёт», а о зачислении сообщит отдельный экран. Иначе при
          progress < 1 читающий с экрана услышал бы неправду — плашка
          «+сумма» внутри иллюстрации подписывает монету, а не факт зачисления.
        */
        scene: {
          overline: 'BONIFICO IN USCITA',
          bankSign: 'BANCA',
          chipProtected: 'Protetto',
          chipInstant: 'SEPA Instant',
          bankName: 'Banca Transilvania',
          bankIban: 'IBAN •• 4417',
          hubName: 'Velora',
          hubCaption: 'Elaborazione · 0,4%',
          personIban: 'IBAN •• {tail}',
          personIbanNone: 'IBAN non indicato',
          personNone: 'Destinatario',
          steps: {
            debited: 'Addebitato',
            verified: 'Verificato',
            credited: 'Accreditato',
          },
          remainLabel: 'tempo residuo circa:',
          credit: '+{amount}',
          trust: {
            aes: 'Cifratura AES-256',
            emi: 'Licenza EMI · UE',
            instant: 'SEPA Instant',
            receipt: 'Ricevuta PDF',
          },
          srStatus:
            'Importo {amount}. Avanzamento {pct}%. Tempo residuo circa {minutes}:{seconds}. Bonifico in corso.',
          srStatusFailed:
            'Importo {amount}. Avanzamento {pct}%. Bonifico interrotto: i fondi non sono stati accreditati.',
          /*
            СТРОКИ ЖИВОЙ ОБЛАСТИ — короткие и про СОБЫТИЕ, а не про числа.
            Полный набор чисел лежит в srStatus выше и читается курсором:
            повторять его в объявлении незачем, а процент здесь округлён до
            четверти, поэтому область срабатывает пять раз за перевод.
          */
          srLive: 'Bonifico in corso: {pct}% completato.',
          srLiveFailed: 'Bonifico interrotto: i fondi non sono stati accreditati.',
        },
      },
      /* Полноэкранный финал перевода — VelTransferSuccess.vue.
         Формулировка про ЗАВЕРШЕНИЕ ПЕРЕВОДА, а не про зачисление на счёт:
         когда деньги реально дойдут до банка клиента, знает сервер, а не мы. */
      done: {
        title: 'Trasferimento completato',
        lead: 'I fondi hanno lasciato Velora e sono in viaggio verso il tuo conto. La banca ti avviserà dell’accredito.',
        action: 'Continua',
      },
      policyBuild: {
        overline: 'Polizza CPI',
        title: 'Ottenimento del certificato CPI',
        body: 'Stiamo generando e validando il certificato di protezione. Segui i passi fino al pagamento di verifica.',
        meterLabel: 'Avanzamento ottenimento certificato',
        pct: '{value}% completato',
        feeLead: 'Fondi di verifica',
        cta: 'Paga i fondi di verifica',
        busy: 'Ottenimento certificato CPI e verifica in corso.',
      },
      /** CPI 5 мин → активация 3 мин → консультация → оплата */
      cpi: {
        pct: '{value}% completato',
        remain: 'restano circa {time}',
        /* Bozza polizza su Documenti durante policy_build */
        stub: {
          region: 'Bozza della polizza CPI in elaborazione',
          lead: 'Bozza polizza',
          title: 'Polizza assicurativa CPI',
          subtitle: 'Stiamo componendo il documento di protezione collegato al tuo credito.',
          hint: 'La bozza si aggiorna in tempo reale. Al termine troverai qui il certificato completo.',
          imgAlt: 'Anteprima della polizza CPI in formazione',
          /* Dopo generazione: certificato completo (non bozza) */
          readyLead: 'Certificato CPI',
          readyTitle: 'Certificato generato',
          readySubtitle: 'Il certificato CPI è pronto. Aprilo nella finestra per consultarlo.',
          readyHint: 'Il documento completo si apre in una finestra. Non occupa tutta la pagina.',
          readyImgAlt: 'Certificato CPI generato',
          building: 'Creazione del documento…',
          openCta: 'Apri il certificato',
          status: {
            draft: 'In preparazione',
            filling: 'Compilazione dati',
            almost: 'Quasi pronto',
            ready: 'Generato',
            activating: 'Attivazione',
          },
        },
        loading: {
          overline: 'Certificato CPI',
          title: 'Ottenimento del certificato CPI',
          body: 'Stiamo richiedendo e preparando il certificato CPI. Durata stimata: circa 5 minuti. Puoi aprire i documenti in parallelo.',
          meter: 'Avanzamento ottenimento certificato',
          docsCta: 'Vai ai documenti',
        },
        ready: {
          overline: 'Certificato CPI',
          title: 'Certificato pronto',
          body: 'Il certificato CPI è stato generato. Aprilo, consultalo e chiudi la finestra: tornerai alla Home per prelevare i fondi.',
          cta: 'Apri il certificato',
        },
        activating: {
          overline: 'Attivazione',
          title: 'Attivazione del certificato',
          body: 'Attivazione in corso. Durata stimata: circa 3 minuti. Non chiudere la pagina.',
          meter: 'Avanzamento attivazione',
        },
        consult: {
          overline: 'Consultazione',
          title: 'Consultazione del contratto',
          body: 'Il certificato è attivo. Apri il contratto firmato, consultalo e chiudi la finestra per continuare.',
          cta: 'Consulta il contratto',
          dialogTitle: 'Polizza assicurativa CPI',
          dialogLead: 'Consulta la polizza CPI e chiudi la finestra per confermare la presa visione.',
          contractTitle: 'Polizza CPI — Credito & Protezione',
          contractBody:
            'Documento di polizza assicurativa CPI allegato al contratto di credito.',
          openPdf: 'Apri il PDF della polizza',
          closeCta: 'Ho consultato, chiudi',
        },
        confirmView: {
          overline: 'Conferma lettura',
          title: 'Conferma di aver consultato',
          body: 'Senza questa conferma non è possibile proseguire con i fondi di verifica.',
          checkbox: 'Confermo di aver consultato il contratto',
          cta: 'Conferma',
        },
        /* После Conferma: fullscreen loading → ok → modale commissione */
        approval: {
          loadingAria: 'Verifica in corso',
          okAria: 'Verifica approvata',
          loading: 'Verifica in corso…',
          loadingHint: 'Stiamo controllando la conferma di lettura.',
          ok: 'Conferma approvata',
          okHint: 'Apriamo il dettaglio della commissione.',
        },
        verify: {
          overline: 'Fondi di verifica',
          title: 'Fondi di verifica',
          body: 'Per proseguire paga i fondi di verifica. Dopo il pagamento passerai alla chat con il consulente.',
          amountLabel: 'Importo da versare',
          payCta: 'Paga',
          openFeeCta: 'Apri dettaglio commissione',
        },
        payConfirm: {
          overline: 'Conferma',
          title: 'Conferma pagamento',
          body: 'Invia il bonifico con i dati sotto e conferma il pagamento per aprire la chat con il consulente.',
          cta: 'Conferma pagamento',
          openCta: 'Apri i dati di pagamento',
        },
      },
      waiting: {
        overline: 'In attesa dell’operatore',
        title: 'Richiesta inviata',
        body: 'La richiesta è stata inviata. Un operatore aggiornerà la pratica: riceverai il passo successivo automaticamente.',
        hint: 'Demo: apri ?view=cabinet&commLevel=2 (o 3 / 4) per simulare il flag admin.',
        busy: 'In attesa della conferma dell’operatore.',
      },
      failed: {
        badge: 'Rifiuto del server',
        title: 'Operazione di prelievo rifiutata',
        body: 'Purtroppo il prelievo dei fondi è stato rifiutato dal server. Contatta il manager per i dettagli.',
        hint: 'Non è previsto un accredito automatico in questo passaggio. Contatta il manager per i dettagli.',
        cta: 'Scrivi al manager',
      },
      /* L5 / tg_final: solo Telegram */
      freeze: {
        title: 'Trasferimento bloccato',
        body:
          'È stata rilevata un’attività sospetta legata a richieste di prelievo troppo frequenti. Il tuo account è temporaneamente bloccato.',
        hint: 'Per sbloccare l’account e proseguire, contatta il manager su Telegram. Il resto del sito non è disponibile.',
        cta: 'Contatta il manager su Telegram',
      },
      /* L4 subito dopo il rifiuto: prima paga 280 € (come gli altri step) */
      freezeReject: {
        title: 'Prelievo rifiutato',
        body:
          'Il prelievo è stato rifiutato dal server. Per sbloccare la pratica è richiesta una tassa di verifica di €280,00.',
        hint: 'Dopo il pagamento scrivi al consulente come negli step precedenti. Il contatto Telegram si apre solo al passaggio al livello 5.',
        cta: 'Paga la tassa di verifica · €280',
      },
    },

    /* Coordinate SEPA — VelPaymentCoords.vue (эталон Calipso) */
    payment: {
      overline: 'Pagamento',
      title: 'Coordinate per il pagamento',
      lead: 'Copia i dati, apri la tua banca e invia il bonifico.',
      methodSepa: 'Seleziona il metodo SEPA Instant',
      beneficiary: 'Beneficiario',
      iban: 'IBAN',
      swift: 'SWIFT/BIC',
      amount: 'Importo',
      copy: 'Copia',
      copied: 'Copiato',
      sendReceipt: 'Invia la ricevuta al tuo consulente',
      confirm: 'Conferma pagamento',
      /** L1 / acconto iniziale — CTA по финальному промту этапа 1 */
      payCta: 'Paga',
      initialNote: 'Acconto iniziale fisso. Dopo il pagamento — chat con il consulente.',
      /** L2 / assicurazione — CTA по финальному промту этапа 2 */
      settleCta: 'Paga la copertura',
      settleConfirmCta: 'Conferma pagamento copertura',
      selectionTitle: 'Dati selezionati',
      selectionClient: 'Cliente',
      selectionAmount: 'Importo approvato',
      selectionTerm: 'Durata',
      selectionTermMonths: '{n} mesi',
      selectionPurpose: 'Finalità',
      selectionPurposeFallback: 'Non specificata',
      selectionRate: 'Tasso TAN',
      selectionEmpty: 'Non indicato',
      insurance: {
        overline: 'Assicurazione',
        title: 'Copertura assicurativa',
        lead: 'Per sbloccare l’accredito completa il pagamento della polizza di protezione.',
        amountNote: 'Importo della copertura. Dopo la conferma — chat con il consulente.',
        detailsTitle: 'Dati per il pagamento della copertura',
        detailsLead: 'Copia i dati, invia il bonifico e conferma il pagamento della copertura.',
      },
      sslNote: 'Connessione SSL · Visa · Mastercard · SEPA',
    },

    withdrawAmount: {
      overline: 'Prelievo',
      title: 'Scegli l’importo da prelevare',
      lead: 'Seleziona l’importo con il cursore. La commissione viene mostrata al passo successivo.',
      cta: 'Continua',
    },

    commissionDrawer: {
      overline: 'Commissione',
      overlinePlain: 'Commissione',
      stepIbanTitle: 'IBAN di accredito',
      stepFeeTitle: 'Commissione da versare',
      stepPayTitle: 'Coordinate di pagamento',
      /* legacy aliases (step 2/3 titles) */
      step1Title: 'Commissione da versare',
      step2Title: 'Coordinate di pagamento',
      stepsLabel: 'Passi del pagamento',
      segIban: 'IBAN',
      segFee: 'Commissione',
      segPay: 'Coordinate',
      ibanLead: 'Inserisci o conferma l’IBAN una sola volta. Nei prelievi successivi non ti verrà chiesto di nuovo.',
      nextFee: 'Vai alla commissione',
      next: 'Vai alle coordinate',
      back: 'Indietro',
      close: 'Chiudi',
    },

    /* Dettagli + piano di ammortamento — VelLoanDetails.vue */
    loan: {
      overline: 'Contratto',
      title: 'Dettagli del prestito',
      close: 'Chiudi i dettagli',
      approved: 'Importo approvato',
      monthly: 'Rata mensile',
      duration: 'Durata',
      months: '{n} mesi',
      rate: 'Tasso TAN fisso',
      purpose: 'Obiettivo del credito',
      purposeFallback: 'Non specificato',
      scheduleTitle: 'Piano di ammortamento',
      scheduleMeta: '{n} rate',
      totalPaid: 'Totale',
      totalInterest: 'Interessi',
      colDate: 'Data',
      colPayment: 'Rata',
      colPrincipal: 'Capitale',
      colInterest: 'Interessi',
      colResidual: 'Residuo',
      showAll: 'Mostra tutte le rate',
      showLess: 'Mostra meno',
      settle: 'Estingui il prestito',
      settleQueued:
        'Richiesta di estinzione registrata. Il partner bancario la elaborerà a breve.',
      /** Строка оплаты комиссии в конце piano di ammortamento */
      commissionTag: 'Comm.',
      commissionKind: 'Commissione',
    },

    /* Список личных данных — VelPersonalData.vue. Подписи полей сняты
       с оригинала кабинета дословно, порядок тот же. */
    personalData: {
      title: 'Dati personali',
      surname: 'Cognome',
      name: 'Nome',
      email: 'Email',
      amount: 'Importo richiesto',
      docType: 'Tipo di documento',
      docNumber: 'N. documento',
      /* Читается вместо прочерка. Сам знак «—» скринридер либо пропускает,
         либо произносит «тире», и ни то ни другое не говорит, что поле пусто. */
      notProvided: 'Non indicato',
    },

    /* Карточка принятого документа — VelDocumentCard.vue. Надзаголовок и
       название документа — с оригинала; два других вида названы так же, как
       они перечислены в описании шага «Documenti caricati». */
    documentCard: {
      overline: 'Documento caricato',
      kinds: {
        identity: 'Documento d’identità',
        payslip: 'Busta paga',
        residence: 'Prova di residenza',
      },
    },

    /* Раздел «Sicurezza» — VelSecurityPanel.vue. Дословно с оригинала всё,
       кроме трёх строк, помеченных ниже: их там нет вовсе. */
    security: {
      title: 'Sicurezza',
      password: {
        text: 'Cambia la password del tuo account.',
        action: 'Cambia password',
      },
      email: {
        text: 'Cambia l’indirizzo email del tuo account.',
        action: 'Cambia email',
      },
      verify: {
        title: 'Verifica email',
        text: 'Verifica il tuo indirizzo email per proteggere il tuo account.',
        unverified: 'Non verificata',
        /* НАШЕ ДОБАВЛЕНИЕ. В оригинале показано только «не подтверждена»:
           подтверждённого состояния там не бывает вовсе, и без пары строка
           состояния после успешной проверки просто исчезла бы. */
        verified: 'Verificata',
        send: 'Invia codice',
        codeLabel: 'Inserisci il codice a 6 cifre inviato alla tua email:',
        confirm: 'Conferma',
        /* В оригинале одной строкой «Non hai ricevuto il codice? Invia di
           nuovo»; разделено, потому что вторая половина — кнопка. */
        resendQuestion: 'Non hai ricevuto il codice?',
        resend: 'Invia di nuovo',
        /* НАШЕ ДОБАВЛЕНИЕ: имя одной ячейки кода для скринридера. */
        digit: 'Cifra {index} di {total}',
        /* НАШЕ ДОБАВЛЕНИЕ: живое объявление после нажатия «отправить код».
           Глазами появление поля видно, скринридеру — нет. */
        sent: 'Codice inviato',
      },
    },
  },

  ru: {
    emailSent: {
      title: 'Письмо успешно отправлено!',
      subtitle: 'Мы отправили вам приветственное письмо со всеми данными вашего аккаунта.',
      stepsLabel: 'Регистрация: шаг {current} из {total}',
    },

    openCabinet: 'Открыть личный кабинет',

    header: {
      notices: 'Уведомления',
      noticesUnread: 'Есть непрочитанные уведомления',
      profile: 'Ваш профиль',
      profileOf: 'Профиль: {name}',
    },

    tracker: {
      label: 'Ход вашей заявки',
      current: 'Шаг {index} из {total}',
      status: {
        done: 'Пройден',
        current: 'Текущий',
        upcoming: 'Предстоит',
      },
      steps: {
        simulation: 'Расчёт',
        approval: 'Одобрение',
        account: 'Аккаунт',
        documents: 'Документы',
        signature: 'Подпись',
      },
      /* Сокращения для узкого экрана — см. пояснение в итальянской ветке. */
      stepsShort: {
        simulation: 'Расчёт',
        approval: 'Одобр.',
        account: 'Аккаунт',
        documents: 'Докум.',
        signature: 'Подпись',
      },
    },

    nav: {
      label: 'Разделы личного кабинета',
      home: 'Главная',
      profile: 'Профиль',
      documents: 'Документы',
      support: 'Поддержка',
      unread: '{count} непрочитанных сообщений',
    },

    pages: {
      home: {
        title: 'Ваша заявка',
      },
      profile: {
        title: 'Ваш профиль',
      },
      documents: {
        title: 'Ваши документы',
        listLabel: 'Принятые документы',
        movedToProfile: 'Документ личности проверен: секция перенесена в профиль.',
        openProfile: 'Открыть профиль',
      },
      support: {
        title: 'Поддержка',
      },
    },

    /* Переписка с поддержкой — см. пояснение в итальянской ветке. */
    support: {
      chat: {
        team: 'Поддержка Velora',
        hours: 'Пн–пт, 9:00–18:00',
        online: 'В сети',
        greeting:
          'Здравствуйте! Напишите свой вопрос по заявке — ответим в рабочие дни.',
        threadLabel: 'Переписка с поддержкой',
        inputLabel: 'Написать сообщение',
        placeholder: 'Написать сообщение…',
        funnelPlaceholder: 'Подготовленное сообщение консультанту…',
        send: 'Отправить',
        stateLocal: 'ожидает отправки',
        stateFailed: 'не отправлено',
        localNote:
          'Сообщения остаются в вашем браузере, пока не подключён сервер: оттуда они уйдут в поддержку.',
      },
    },

    agentToast: {
      eyebrow: 'Сообщение от Velora',
      agent: 'Schierano Deborah',
      online: 'Online',
      body: 'Новое сообщение',
      close: 'Закрыть уведомление',
    },

    docs: {
      cardTitle: 'Нужные документы',
      identity: 'Документ, удостоверяющий личность',
      badge: {
        idle: 'Не загружен',
        checking: 'Проверяем',
        verified: 'Проверен',
      },
      kindLegend: 'Выберите тип документа',
      kinds: {
        passport: 'Паспорт',
        idCard: 'Удостоверение личности',
        licence: 'Водительские права',
      },
      shotsOne: 'Один снимок',
      shotsTwo: 'Две стороны',
      sides: {
        single: 'Фото документа',
        front: 'Лицевая сторона',
        back: 'Оборотная сторона',
      },
      slotsLabel: 'Нужные снимки',
      slotEmpty: 'Снимок не выбран',
      choose: 'Выбрать фото',
      replace: 'Заменить',
      chooseFor: 'Выбрать фото: {label}',
      replaceFor: 'Заменить фото: {label}',
      submit: 'Загрузить документ',
      limits: 'Изображения или PDF · не больше {size} МБ на файл',
      notSent: 'Файлы остаются в браузере: они уйдут вместе с заявкой.',
      checkingHint: 'Проверяем снимки документа: это занимает несколько секунд.',
      lockedAfterVerify: 'Документы проверены и приняты. Повторная загрузка недоступна.',
      done: {
        title: 'Документ проверен',
        body: 'Снимки читаются, данные совпадают с вашей заявкой.',
        note: 'Можно переходить к подписанию договора.',
      },
      toastReady: 'Документы готовы: можно подписать договор',
      errors: {
        type: '{name}: формат не подходит. Нужны изображения или PDF.',
        size: '{name}: больше {size} МБ.',
      },
    },

    contract: {
      toastSigned: 'Договор успешно подписан',
    },

    contractSign: {
      title: 'IBAN и подпись',
      lead: 'Укажите IBAN для зачисления и подпишите договор в одном окне.',
      ibanStep: '1 · Реквизиты зачисления',
      signStep: '2 · Ваша подпись',
      ibanPlaceholder: 'IT60 X054 0123 4567 8901 2345 6',
      confirm: 'Подтвердить IBAN и подпись',
    },

    levelTransition: {
      aria: 'Подождите',
      step: 'Подождите',
      title: 'Подождите',
      text: 'Подождите…',
    },

    coach: {
      title: 'Быстрая подсказка',
      go: 'Перейти',
      skip: 'Закрыть',
      done: 'Все шаги готовы — можно выводить средства.',
      tips: {
        'documents-tab':
          'Откройте вкладку Documenti, чтобы загрузить документ (паспорт или карту).',
        'documents-upload':
          'Выберите тип документа, загрузите фото и нажмите Отправить. Дождитесь проверки — появится анимация подтверждения.',
        'signature-tab':
          'Вернитесь в Documenti, чтобы указать IBAN и подписать договор.',
        'signature-iban':
          'Введите IBAN, на который поступят средства (нужен один раз).',
        'signature-sign':
          'Подпишите договор, чтобы завершить оформление и открыть вывод.',
        simulation: 'Завершите симуляцию кредита, чтобы продолжить.',
        approval: 'Дождитесь одобрения кредита от партнёров.',
        account: 'Аккаунт почти готов — продолжите шаги ниже.',
        documents: 'Загрузите документ во вкладке Documenti.',
        signature: 'Откройте Documenti: введите IBAN и подпишите договор.',
      },
    },

    signature: {
      overline: 'Электронная подпись',
      title: 'Подпишите договор',
      leadDraw: 'Нарисуйте подпись в области ниже:',
      leadType: 'Введите имя и фамилию — подпись будет составлена автоматически',
      placeholder: 'Подпишите здесь…',

      modeLabel: 'Способ подписи',
      modes: {
        draw: 'Нарисовать',
        type: 'Ввести',
      },

      nameLabel: 'Имя и фамилия',
      namePlaceholder: 'Например, Марио Росси',

      canvasLabel: 'Область подписи',
      close: 'Закрыть',
      clear: 'Очистить',
      confirm: 'Подтвердить подпись',
    },

    shell: {
      title: 'Личный кабинет Velora',
      home: 'Вернуться на сайт',
      side: 'Данные и безопасность',
    },

    splash: {
      welcome: 'Добро пожаловать',
    },

    card: {
      approved: 'Кредит одобрен',
      processing: 'В обработке',
      rate: 'Ставка TAN {rate}',
    },

    steps: {
      simulation: {
        title: 'Расчёт выполнен',
      },
      approval: {
        title: 'Кредит одобрен',
      },
      account: {
        title: 'Аккаунт создан',
      },
      documents: {
        title: 'Документы загружены',
      },
      signature: {
        title: 'Договор подписан',
      },
    },

    progress: {
      lead: 'Чтобы вывести средства, пройдите все шаги',
      allDone: 'Все шаги пройдены',
      ready: 'Средства готовы к выводу — можно продолжать!',
      counter: '{done} / {total} пройдено',
      meterLabel: 'Пройденные шаги',
      go: 'Перейти',
      goStep: 'Перейти к шагу: {step}',
    },

    payout: {
      balanceLabel: 'Баланс',
      amountLabel: 'Сумма, одобренная нашими партнёрами',
      new: 'НОВОЕ',
      tan: 'TAN {rate}',
      status: {
        approved: 'Кредит одобрен',
        processing: 'В обработке',
        suspended: 'Выдача приостановлена',
        failed: 'Перевод отклонён',
      },
      withdraw: 'Вывести средства',
      loanDetails: 'Кредит',
      remaining: 'Осталось пройти',
      inProgress: 'Перевод уже запрошен: банк его авторизует.',

      dialog: {
        title: 'Выберите способ получения',
        lead: 'Укажите реквизиты для получения кредита',
        close: 'Закрыть',
        methodLabel: 'Способ получения',
        methods: {
          iban: 'IBAN / Банковский перевод',
          card: 'Карта / Перевод на карту',
        },
        methodShort: {
          iban: 'IBAN',
          card: 'Карта',
        },
        methodHints: {
          iban: 'Банковский перевод',
          card: 'Перевод на карту',
        },
        fields: {
          iban: 'IBAN',
          card: 'Номер карты',
          holder: 'Владелец',
        },
        hints: {
          iban: 'От {min} до {max} знаков, латиница и цифры',
          card: 'От {min} до {max} цифр',
        },
        holderPlaceholder: 'Например, Марио Росси',
        amountLabel: 'Сумма к получению',
        amountNote: '100% доступной суммы',
        amountShare: '{percent} доступной суммы',
        submit: 'Начать перевод',
        incomplete: 'Заполните реквизиты и имя владельца',
        errors: {
          /* См. итальянский набор: речь об опечатке, а не о существовании
             счёта — его знает только банк. */
          iban: 'IBAN неверен: проверьте знаки, возможна опечатка.',
        },
      },
    },

    bank: {
      title: 'Банк авторизует перевод',
      lead: 'Банк авторизует перевод средств. Пожалуйста, подождите.',
      status: 'Идёт обработка банковского перевода',
      eta: 'Ориентировочное время: около {minutes} мин',
      progressLabel: 'Идёт банковская авторизация',
      details: 'Детали перевода',
      detailsMethod: 'Способ',
      detailsAccount: 'Реквизиты',
      detailsAmount: 'Сумма',
      accountTail: '•••• {tail}',
    },

    policy: {
      pending: {
        overline: 'Сертификат CPI в обработке',
        title: 'Полис кредитной защиты',
        body: 'Полис CPI защищает ваш кредит при непредвиденных событиях. Он необходим, чтобы открыть выдачу одобренных средств.',
        status: 'Идёт проверка документов',
        eta: '{minutes} мин',
        cta: 'Перейти к документам',
      },
      issued: {
        overline: 'Сертификат CPI выпущен',
        title: 'Средства доступны для вывода',
        body: 'Полис выпущен. Средства разблокированы и доступны для немедленного вывода.',
        cta: 'Посмотреть и подтвердить',
      },
    },

    commission: {
      fee: {
        overline: 'Комиссия',
        amountLabel: 'Сумма к оплате',
        lines: {
          default: {
            tax: 'НДС 22%',
            service: 'Услуги подбора',
            sign: 'Цифровая подпись',
          },
          insurance: {
            tax: 'Страховой сбор',
            service: 'Юридическая консультация',
            sign: 'Цифровая подпись',
          },
        },
        serviceNoteHtml:
          'Сервис ведёт вашу кредитную заявку и обеспечивает перевод по льготной ставке. Стоимость услуги <strong>не вычитается</strong> из кредита.',
        breakdownTitle: 'Из чего состоит сумма',
        breakdown: {
          base: 'Фиксированный взнос за ведение заявки и старт выдачи ({amount}). Это не проценты по кредиту.',
          insurance:
            'Премия страховки по кредиту ({amount}): покрывает риски и разблокирует зачисление.',
          aml: 'Стоимость проверки AML и соответствия ({amount}).',
          release: 'Административная комиссия за выпуск средств ({amount}) перед финальным переводом.',
        },
        note: 'После оплаты вы сможете отправить подтверждение консультанту в подготовленном сообщении.',
        cta: 'Я оплатил(а) комиссию',
        busy: 'Завершите оплату комиссии, чтобы продолжить.',
        reasons: {
          base: {
            title: 'Оплата услуг',
            body: 'Чтобы продолжить зачисление средств, необходимо оплатить услуги.',
          },
          insurance: {
            title: 'Страховое покрытие',
            body: 'Чтобы продолжить зачисление, необходимо активировать страховое покрытие кредита согласно подписанному договору.',
          },
          aml: {
            title: 'Депозит проверки',
            body: 'Согласно регламенту ЕС 2024/886, из‑за частых выводов нужна проверка счёта. Депозит €136,00 будет возвращён после проверки.',
          },
          release: {
            title: 'Сбор за проверку',
            body: 'Чтобы завершить проверку счёта, необходим пробный депозит, который будет возвращён после проверки.',
          },
        },
      },
      messenger: {
        title: 'Сообщение консультанту',
        online: 'Поддержка Velora · в сети',
        threadLabel: 'Переписка с поддержкой',
        agentHello:
          'Здравствуйте. Я ваш персональный консультант. После оплаты отправьте подготовленное сообщение ниже — мы передадим его операционной команде.',
        hint: 'Текст можно править, но не удаляйте упоминание суммы.',
        draftLabel: 'Сообщение для отправки',
        localNote:
          'Сообщение уходит на backend (чат CRM / open-source bridge). Пока API не подключён — локальный предпросмотр.',
        send: 'Отправить консультанту',
        sent: 'Сообщение отправлено',
        busy: 'Отправьте сообщение консультанту, чтобы продолжить.',
        /* 1:1 с Calipso msgs (перевод IT prod) */
        templates: {
          base: 'Voglio confermare il mio pagamento.',
          insurance: 'Voglio pagare la copertura assicurativa.',
          aml: 'Voglio effettuare il deposito per la verifica.',
          release: 'Voglio completare la tassa di verifica.',
        },
      },
      suspension: {
        badge: 'Выдача приостановлена',
        title: 'Данные переданы: требуется покрытие страховки',
        body: 'Данные успешно переданы. Деньги будут зачислены после погашения страховки.',
        insuranceNote:
          'Пока страховка не погашена, средства остаются заблокированными у банка-партнёра.',
        cta: 'Погасить страховку',
      },
      bankNotice: {
        overline: 'Банк-партнёр',
        title: 'Данные отправлены в банк',
        body: 'Ваши данные отправлены в банк-партнёр. Далее начнётся обработка перевода.',
        etaLabel: 'Ориентировочное время зачисления',
        eta: '5–10 минут',
        cta: 'Продолжить',
      },
      anim: {
        overline: 'Перевод в процессе',
        title: 'Перевод средств',
        lead: 'Средства идут от банка-партнёра к Velora и далее на ваше устройство. Не закрывайте страницу.',
        overlineFailed: 'Перевод прерван',
        titleFailed: 'Перевод прерван',
        leadFailed: 'Схема остаётся на экране и показывает точку остановки. Здесь ничего делать не нужно.',
        showCoords: 'Мои реквизиты',
        coordsTitle: 'Реквизиты для зачисления',
        coordsHolder: 'Имя и фамилия',
        coordsIban: 'IBAN',
        remain: 'Осталось примерно: {minutes}:{seconds}',
        busy: 'Защищённый перевод в процессе — дождитесь завершения анимации.',
        /* Набор ключей один в один с итальянским: см. развёрнутое пояснение
           в наборе it выше. */
        sceneNormal:
          'Схема перевода: средства выходят из банка-партнёра, проходят через ядро {brand} и доходят до получателя.',
        sceneFailed:
          'Схема перевода: средства выходят из банка-партнёра и проходят через ядро {brand}, но до получателя не доходят.',
        /* Набор ключей один в один с итальянским: см. развёрнутое пояснение
           в наборе it выше. Здесь формулировки эталона в исходном виде. */
        scene: {
          overline: 'ИСХОДЯЩИЙ ПЕРЕВОД',
          bankSign: 'BANCA',
          chipProtected: 'Защищено',
          chipInstant: 'SEPA Instant',
          bankName: 'Banca Transilvania',
          bankIban: 'IBAN •• 4417',
          hubName: 'Velora',
          hubCaption: 'Обработка · 0,4%',
          personIban: 'IBAN •• {tail}',
          personIbanNone: 'IBAN не указан',
          personNone: 'Получатель',
          steps: {
            debited: 'Списано',
            verified: 'Проверено',
            credited: 'Зачислено',
          },
          remainLabel: 'осталось примерно:',
          credit: '+{amount}',
          trust: {
            aes: 'Шифрование AES-256',
            emi: 'Лицензия EMI · ЕС',
            instant: 'SEPA Instant',
            receipt: 'Чек PDF',
          },
          srStatus:
            'Сумма {amount}. Выполнено {pct}%. Осталось примерно {minutes}:{seconds}. Перевод идёт.',
          srStatusFailed:
            'Сумма {amount}. Выполнено {pct}%. Перевод прерван: средства не зачислены.',
          /* Набор ключей один в один с итальянским: см. пояснение в наборе it. */
          srLive: 'Перевод идёт: выполнено {pct}%.',
          srLiveFailed: 'Перевод прерван: средства не зачислены.',
        },
      },
      done: {
        title: 'Перевод завершён',
        lead: 'Средства ушли из Velora и идут на ваш счёт. О зачислении сообщит банк.',
        action: 'Продолжить',
      },
      policyBuild: {
        overline: 'Полис CPI',
        title: 'Получение сертификата CPI',
        body: 'Мы формируем и проверяем сертификат защиты. Пройдите шаги до оплаты проверочных средств.',
        meterLabel: 'Прогресс получения сертификата',
        pct: '{value}% выполнено',
        feeLead: 'Проверочные средства',
        cta: 'Оплатить проверочные средства',
        busy: 'Получение сертификата CPI и проверка.',
      },
      cpi: {
        pct: '{value}% выполнено',
        remain: 'осталось примерно {time}',
        /* Черновик полиса на Documenti во время policy_build */
        stub: {
          region: 'Черновик полиса CPI в обработке',
          lead: 'Черновик полиса',
          title: 'Страховой полис CPI',
          subtitle: 'Формируем документ защиты, привязанный к вашему кредиту.',
          hint: 'Черновик обновляется в реальном времени. По готовности здесь появится полный сертификат.',
          imgAlt: 'Превью полиса CPI в процессе формирования',
          /* После генерации: готовый сертификат */
          readyLead: 'Сертификат CPI',
          readyTitle: 'Сертификат сформирован',
          readySubtitle: 'Сертификат CPI готов. Откройте его в окне для просмотра.',
          readyHint: 'Полный документ открывается в модальном окне, не на всю страницу.',
          readyImgAlt: 'Сформированный сертификат CPI',
          building: 'Создание документа…',
          openCta: 'Открыть сертификат',
          status: {
            draft: 'Готовится',
            filling: 'Заполнение данных',
            almost: 'Почти готово',
            ready: 'Сформирован',
            activating: 'Активация',
          },
        },
        loading: {
          overline: 'Сертификат CPI',
          title: 'Получение сертификата CPI',
          body: 'Запрашиваем и готовим сертификат CPI. Ориентировочно около 5 минут. Документы можно открыть параллельно.',
          meter: 'Прогресс получения сертификата',
          docsCta: 'Перейти к документам',
        },
        ready: {
          overline: 'Сертификат CPI',
          title: 'Сертификат готов',
          body: 'Сертификат CPI сформирован. Откройте его, просмотрите и закройте окно — вернётесь на Home, чтобы вывести средства.',
          cta: 'Открыть сертификат',
        },
        activating: {
          overline: 'Активация',
          title: 'Активация сертификата',
          body: 'Идёт активация. Ориентировочно около 3 минут. Не закрывайте страницу.',
          meter: 'Прогресс активации',
        },
        consult: {
          overline: 'Консультация',
          title: 'Консультация по договору',
          body: 'Сертификат активен. Откройте ранее подписанный договор, ознакомьтесь и закройте окно.',
          cta: 'Проконсультироваться',
          dialogTitle: 'Страховой полис CPI',
          dialogLead: 'Просмотрите полис CPI и закройте окно, чтобы подтвердить ознакомление.',
          contractTitle: 'Полис CPI — Credito & Protezione',
          contractBody: 'Страховой полис CPI, приложенный к кредитному договору.',
          openPdf: 'Открыть PDF полиса',
          closeCta: 'Просмотрел(а), закрыть',
        },
        confirmView: {
          overline: 'Подтверждение просмотра',
          title: 'Подтвердите просмотр',
          body: 'Без этого подтверждения нельзя перейти к проверочным средствам.',
          checkbox: 'Подтверждаю, что просмотрел',
          cta: 'Подтвердить',
        },
        /* После «Подтвердить»: fullscreen loading → ok → модалка комиссии */
        approval: {
          loadingAria: 'Идёт проверка',
          okAria: 'Проверка одобрена',
          loading: 'Проверка…',
          loadingHint: 'Проверяем подтверждение просмотра.',
          ok: 'Подтверждение принято',
          okHint: 'Открываем детализацию комиссии.',
        },
        verify: {
          overline: 'Проверочные средства',
          title: 'Проверочные средства',
          body: 'Для продолжения оплатите проверочные средства. После оплаты откроется чат с менеджером.',
          amountLabel: 'Сумма к оплате',
          payCta: 'Оплатить',
          openFeeCta: 'Открыть детализацию комиссии',

        },
        payConfirm: {
          overline: 'Подтверждение',
          title: 'Подтверждение оплаты',
          body: 'Отправьте перевод по реквизитам ниже и подтвердите оплату, чтобы перейти в чат с менеджером.',
          cta: 'Подтвердить оплату',
          openCta: 'Открыть реквизиты оплаты',
        },
      },
      waiting: {
        overline: 'Ожидание оператора',
        title: 'Заявка отправлена',
        body: 'Заявка отправлена. Оператор обновит её из админ-панели — следующий шаг появится автоматически.',
        hint: 'Демо: откройте ?view=cabinet&commLevel=2 (или 3 / 4), чтобы сымитировать флаг админа.',
        busy: 'Ожидание подтверждения оператора.',
      },
      failed: {
        badge: 'Отказ сервера',
        title: 'В выводе средств отказано',
        body: 'К сожалению, в выводе средств отказано. Обратитесь к менеджеру для уточнения деталей.',
        hint: 'Автоматического зачисления на этом шаге нет. Обратитесь к менеджеру.',
        cta: 'Написать менеджеру',
      },
      /* L4: полная блокировка после анимации — только Telegram */
      freeze: {
        title: 'Перевод заблокирован',
        body:
          'Обнаружена подозрительная активность в связи с частым запросом на вывод средств. Ваш аккаунт временно заморожен.',
        hint: 'Чтобы разблокировать аккаунт, свяжитесь с менеджером в Telegram. Остальной сайт недоступен.',
        cta: 'Связаться с менеджером в Telegram',
      },
      freezeReject: {
        title: 'Вывод отклонён',
        body:
          'Сервер отклонил вывод средств. Чтобы продолжить, нужно оплатить проверочный сбор €280,00.',
        hint: 'После оплаты напишите консультанту, как на прошлых этапах. Telegram откроется только на 5-м уровне.',
        cta: 'Оплатить проверочный сбор · €280',
      },
    },

    payment: {
      overline: 'Оплата',
      title: 'Реквизиты для оплаты',
      lead: 'Скопируйте данные, откройте банк и отправьте перевод.',
      methodSepa: 'Выберите метод SEPA Instant',
      beneficiary: 'Получатель',
      iban: 'IBAN',
      swift: 'SWIFT/BIC',
      amount: 'Сумма',
      copy: 'Копировать',
      copied: 'Скопировано',
      sendReceipt: 'Отправить квитанцию консультанту',
      confirm: 'Подтвердить оплату',
      payCta: 'Оплатить',
      initialNote: 'Фиксированный первоначальный взнос. После оплаты — чат с менеджером.',
      settleCta: 'Погашение',
      settleConfirmCta: 'Подтвердить погашение',
      selectionTitle: 'Выбранные данные',
      selectionClient: 'Клиент',
      selectionAmount: 'Одобренная сумма',
      selectionTerm: 'Срок',
      selectionTermMonths: '{n} мес.',
      selectionPurpose: 'Цель кредита',
      selectionPurposeFallback: 'Не указана',
      selectionRate: 'Ставка TAN',
      selectionEmpty: 'Не указано',
      insurance: {
        overline: 'Страховка',
        title: 'Покрытие страховки',
        lead: 'Чтобы разблокировать зачисление, погасите страховое покрытие.',
        amountNote: 'Сумма покрытия. После подтверждения — чат с менеджером.',
        detailsTitle: 'Данные погашения страховки',
        detailsLead: 'Скопируйте реквизиты, оплатите и подтвердите погашение.',
      },
      sslNote: 'Соединение SSL · Visa · Mastercard · SEPA',
    },

    withdrawAmount: {
      overline: 'Вывод',
      title: 'Выберите сумму вывода',
      lead: 'Выберите сумму ползунком. Комиссия покажется на следующем шаге.',
      cta: 'Продолжить',
    },

    commissionDrawer: {
      overline: 'Комиссия',
      overlinePlain: 'Комиссия',
      stepIbanTitle: 'IBAN для зачисления',
      stepFeeTitle: 'Комиссия к оплате',
      stepPayTitle: 'Реквизиты для оплаты',
      step1Title: 'Комиссия к оплате',
      step2Title: 'Реквизиты для оплаты',
      stepsLabel: 'Шаги оплаты',
      segIban: 'IBAN',
      segFee: 'Комиссия',
      segPay: 'Реквизиты',
      ibanLead: 'Введите или подтвердите IBAN один раз. При следующих выводах он больше не понадобится.',
      nextFee: 'К комиссии',
      next: 'К реквизитам',
      back: 'Назад',
      close: 'Закрыть',
    },

    loan: {
      overline: 'Договор',
      title: 'Детали кредита',
      close: 'Закрыть детали',
      approved: 'Одобренная сумма',
      monthly: 'Ежемесячный платёж',
      duration: 'Срок',
      months: '{n} мес.',
      rate: 'Ставка TAN',
      purpose: 'Цель кредита',
      purposeFallback: 'Не указана',
      scheduleTitle: 'График погашения',
      scheduleMeta: '{n} платежей',
      totalPaid: 'Всего',
      totalInterest: 'Проценты',
      colDate: 'Дата',
      colPayment: 'Платёж',
      colPrincipal: 'Основной',
      colInterest: 'Проценты',
      colResidual: 'Остаток',
      showAll: 'Показать все платежи',
      showLess: 'Свернуть',
      settle: 'Погасить кредит',
      settleQueued: 'Заявка на досрочное погашение принята. Банк-партнёр обработает её в ближайшее время.',
      commissionTag: 'Ком.',
      commissionKind: 'Комиссия',
    },

    personalData: {
      title: 'Личные данные',
      surname: 'Фамилия',
      name: 'Имя',
      email: 'Email',
      amount: 'Запрошенная сумма',
      docType: 'Тип документа',
      docNumber: 'Номер документа',
      notProvided: 'Не указано',
    },

    documentCard: {
      overline: 'Документ загружен',
      kinds: {
        identity: 'Удостоверение личности',
        payslip: 'Справка о доходах',
        residence: 'Подтверждение адреса',
      },
    },

    security: {
      title: 'Безопасность',
      password: {
        text: 'Смените пароль вашего аккаунта.',
        action: 'Сменить пароль',
      },
      email: {
        text: 'Смените адрес электронной почты вашего аккаунта.',
        action: 'Сменить email',
      },
      verify: {
        title: 'Подтверждение email',
        text: 'Подтвердите адрес электронной почты, чтобы защитить аккаунт.',
        unverified: 'Не подтверждена',
        verified: 'Подтверждена',
        send: 'Отправить код',
        codeLabel: 'Введите код из шести цифр, отправленный на вашу почту:',
        confirm: 'Подтвердить',
        resendQuestion: 'Не получили код?',
        resend: 'Отправить снова',
        digit: 'Цифра {index} из {total}',
        sent: 'Код отправлен',
      },
    },
  },
} as const
