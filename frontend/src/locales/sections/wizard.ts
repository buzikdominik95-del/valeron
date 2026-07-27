/**
 * Строки пошаговой формы (мастера заявки). Подключаются под префиксом 'wizard.',
 * то есть next читается в компоненте как t('wizard.next'),
 * а статус банка — как t('wizard.analysis.verified').
 *
 * Наборы ключей it и ru совпадают один в один: непокрытый ключ vue-i18n молча
 * добирает из fallbackLocale, и посреди русской формы всплыл бы итальянский.
 *
 * Номера шагов сюда не кладём: они одинаковы в любой локали и считаются
 * по позиции в WIZARD_STEPS, как номера в секции «Come lavoriamo».
 *
 * Подстановки:
 *   progressLabel        — {percent} (0…100, из useWizard().progress)
 *   analysis.liveMessage — {checked} и {total} (checkedCount и banks.length
 *                          из useBankAnalysis)
 */
export default {
  it: {
    /* Обязательная оговорка о кредите: текст нормативный, не переписывать. */
    disclaimer:
      'Un credito ti impegna e deve essere rimborsato. Verifica la tua capacità di rimborso prima di impegnarti.',
    help: 'Serve aiuto?',
    back: 'Indietro',
    next: 'Continua',
    /* Пробел перед двоеточием — типографика исходного макета, не опечатка. */
    /* Без пробела перед двоеточием: пробел там — французская норма, в
       итальянском его нет. Осталось от исходника, снятого с французского
       сайта; русская строка ниже с самого начала была набрана правильно,
       то есть локали ещё и расходились между собой. */
    progressLabel: 'Avanzamento: {percent}%',

    purpose: {
      lead: 'Simula la tua richiesta in pochi clic, è semplice e senza impegno',
      title: 'Per quale obiettivo stai richiedendo un credito?',
      required: 'Tutti i campi sono obbligatori',
      hints: {
        auto: 'Finanziamento del tuo veicolo nuovo o usato',
        personal: 'Per i tuoi progetti personali e le spese impreviste',
        travaux: 'Ristrutturazione, ampliamento o efficienza energetica',
        consolidamento: 'Raggruppa i tuoi crediti in un’unica rata ridotta',
        altro: 'Tutti gli altri progetti personali e bisogni vari',
      },
    },

    amount: {
      lead: 'Importo del credito',
      title: 'Scegli l’importo che ti serve',
      hint: 'Tasso fisso al 3,8%, senza costi di istruttoria. Puoi modificare l’importo in qualsiasi momento.',
    },
    duration: {
      lead: 'Scegli la durata del rimborso',
      title: 'Per quale durata?',
      unit: 'mesi',
      perMonth: '/mese',
      months: '{count} mesi',
      summaryAmount: 'Importo richiesto',
      summaryMonthly: 'Rata mensile stimata',
      footnote: 'Stima indicativa basata su un tasso preferenziale del 3,8% TAN. Offerta soggetta ad accettazione.',
    },

    identity: {
      lead: 'Dati personali',
      title: 'Dicci chi sei',
      surname: 'Cognome',
      name: 'Nome',
      gender: 'Sesso',
      genderMale: 'Uomo',
      genderFemale: 'Donna',
      genderHint: 'Serve per personalizzare l’animazione del prelievo.',
      docType: 'Tipo di documento',
      /* Заглушка обязана отличаться от подписи: до выбора они стоят друг под
         другом, и одинаковый текст читается как сбой, а не как поле. */
      docTypePlaceholder: 'Seleziona il tipo',
      docNumber: 'Numero del documento',
      docNumberPlaceholder: 'Es. AB1234567',
      docNumberHint: 'Es. {example}',
      docErrors: {
        empty: 'Inserisci il numero del documento.',
        short: 'Numero troppo corto. Esempio: {example}',
        long: 'Numero troppo lungo. Esempio: {example}',
        shape: 'Formato non valido. Esempio: {example}',
      },
      privacy:
        'Acconsento al trattamento dei miei dati personali per la verifica della richiesta.',
      submit: 'Avvia la verifica',
      /* Порядок пунктов задаёт DOC_TYPES в VelStepIdentity.vue, здесь он
         повторён один в один, чтобы список читался как на экране. */
      docTypes: {
        passport: 'Passaporto',
        idCard: 'Carta d’identità nazionale',
        licence: 'Patente di guida',
        residence: 'Permesso di soggiorno',
        other: 'Altro documento ufficiale',
      },
    },

    analysis: {
      lead: 'Analisi in corso',
      title: 'Confronto con le banche partner',
      subtitle: 'Scoring invisibile: nessuna traccia nella tua storia creditizia.',
      stageRequest: 'Invio della richiesta',
      stageScoring: 'Scoring invisibile',
      done: 'Analisi completata',
      waiting: 'Ancora qualche secondo…',
      pending: 'In attesa',
      checking: 'Verifica in corso',
      verified: 'Verificata',
      liveMessage: 'Verificate {checked} banche partner su {total}.',
    },

    finalizing: {
      title: 'Finalizzazione in corso',
      subtitle: 'Calcolo del tuo tasso al 3,8%…',
      /* Стадии ОФОРМЛЕНИЯ, а не отчёт о проверках: «verifichiamo»,
         «prepariamo». Про решение банка здесь ни слова — экран его не знает,
         а пользователь прочитал бы такую строку как ответ по своей заявке.
         Порядок показа задаёт FINALIZING_STEP_KEYS в
         @/features/wizard/finalizing.ts, здесь он повторён один в один. */
      steps: {
        profile: 'Verifichiamo i dati del profilo',
        banks: 'Confrontiamo con le banche partner',
        rate: 'Calcoliamo il tuo tasso',
        offer: 'Prepariamo la tua offerta',
      },
    },

    result: {
      title: 'Il tuo credito è approvato',
      subtitle:
        'Le banche partner hanno confermato la disponibilità dei fondi al tasso sociale del 3,8%.',
      badge: 'Approvato',
      amountLabel: 'Importo approvato',
      terms: 'Rata mensile: {monthly} · Durata: {months} mesi · Tasso fisso al 3,8%',
      notice: 'L’offerta resta riservata per 24 ore, poi il fascicolo torna in coda.',
      cta: 'Finalizza la mia richiesta',
    },

    /* Окно создания кабинета — VelRegisterDialog.vue. Стоит между результатом
       расчёта и экраном письма; на эталоне это отдельное модальное окно. */
    register: {
      title: 'Il tuo spazio personale',
      secure: 'Spazio personale sicuro · SSL',
      tabCreate: 'Crea account',
      tabLogin: 'Accedi',
      leadCreate: 'Crea il tuo account per gestire la tua pratica di credito.',
      leadLogin: 'Accedi al tuo account per riprendere la pratica.',
      email: 'Indirizzo email',
      password: 'Password',
      confirm: 'Conferma password',
      submitCreate: 'Crea account e accedi',
      submitLogin: 'Accedi',
      encrypted: 'I tuoi dati sono protetti con crittografia',
      errors: {
        emailRequired: 'Inserisci il tuo indirizzo email.',
        emailShape: 'Controlla l’indirizzo: manca la chiocciola o il dominio.',
        passwordRequired: 'Inserisci una password.',
        passwordShort: 'Almeno {min} caratteri.',
        confirmRequired: 'Ripeti la password.',
        confirmMismatch: 'Le due password non coincidono.',
        noAccount:
          'Nessun account con questa email. Completa prima la simulazione e crea lo spazio personale.',
      },
    },
  },

  ru: {
    disclaimer:
      'Кредит — это обязательство, и его придётся вернуть. Прежде чем брать его на себя, оцените свои силы по погашению.',
    help: 'Нужна помощь?',
    back: 'Назад',
    next: 'Продолжить',
    progressLabel: 'Прогресс: {percent}%',

    purpose: {
      lead: 'Рассчитайте заявку в несколько кликов — просто и ни к чему не обязывает',
      title: 'На какую цель вы берёте кредит?',
      required: 'Все поля обязательны',
      hints: {
        auto: 'Покупка нового или подержанного транспорта',
        personal: 'На личные планы и непредвиденные траты',
        travaux: 'Ремонт, расширение или утепление жилья',
        consolidamento: 'Соберите все кредиты в один платёж поменьше',
        altro: 'Любые другие личные проекты и нужды',
      },
    },

    amount: {
      lead: 'Сумма кредита',
      title: 'Выберите нужную сумму',
      hint: 'Фиксированная ставка 3,8%, без комиссии за оформление. Сумму можно изменить в любой момент.',
    },
    duration: {
      lead: 'Выберите срок погашения',
      title: 'На какой срок?',
      unit: 'мес.',
      perMonth: '/мес.',
      months: '{count} мес.',
      summaryAmount: 'Запрошенная сумма',
      summaryMonthly: 'Расчётный платёж',
      footnote: 'Ориентировочный расчёт по льготной ставке 3,8% годовых. Предложение требует одобрения.',
    },

    identity: {
      lead: 'Личные данные',
      title: 'Расскажите, кто вы',
      surname: 'Фамилия',
      name: 'Имя',
      gender: 'Пол',
      genderMale: 'Мужской',
      genderFemale: 'Женский',
      genderHint: 'Нужен, чтобы анимация вывода была с мужчиной или женщиной.',
      docType: 'Тип документа',
      docTypePlaceholder: 'Выберите тип',
      docNumber: 'Номер документа',
      docNumberPlaceholder: 'Например, AB1234567',
      docNumberHint: 'Например, {example}',
      docErrors: {
        empty: 'Укажите номер документа.',
        short: 'Слишком короткий номер. Пример: {example}',
        long: 'Слишком длинный номер. Пример: {example}',
        shape: 'Неверный формат. Пример: {example}',
      },
      privacy: 'Я согласен на обработку персональных данных для проверки заявки.',
      submit: 'Запустить проверку',
      docTypes: {
        passport: 'Паспорт',
        idCard: 'Удостоверение личности',
        licence: 'Водительские права',
        residence: 'Вид на жительство',
        other: 'Иной официальный документ',
      },
    },

    analysis: {
      lead: 'Идёт анализ',
      title: 'Сверка с банками-партнёрами',
      subtitle: 'Невидимый скоринг — без следов в кредитной истории.',
      stageRequest: 'Отправка заявки',
      stageScoring: 'Невидимый скоринг',
      done: 'Анализ завершён',
      waiting: 'Ещё несколько секунд…',
      pending: 'В очереди',
      checking: 'Проверяем',
      verified: 'Проверен',
      liveMessage: 'Проверено {checked} банков-партнёров из {total}.',
    },

    finalizing: {
      title: 'Завершаем оформление',
      subtitle: 'Рассчитываем вашу ставку 3,8%…',
      steps: {
        profile: 'Сверяем данные профиля',
        banks: 'Сопоставляем с банками-партнёрами',
        rate: 'Рассчитываем вашу ставку',
        offer: 'Готовим ваше предложение',
      },
    },

    result: {
      title: 'Ваш кредит одобрен',
      subtitle: 'Банки-партнёры подтвердили доступность средств по социальной ставке 3,8%.',
      badge: 'Одобрено',
      amountLabel: 'Одобренная сумма',
      terms: 'Ежемесячный платёж: {monthly} · Срок: {months} мес. · Фиксированная ставка 3,8%',
      notice: 'Предложение закреплено за вами на 24 часа, потом заявка вернётся в общую очередь.',
      cta: 'Оформить заявку',
    },

    register: {
      title: 'Ваш личный кабинет',
      secure: 'Защищённый личный кабинет · SSL',
      tabCreate: 'Создать аккаунт',
      tabLogin: 'Войти',
      leadCreate: 'Создайте аккаунт, чтобы вести свою заявку на кредит.',
      leadLogin: 'Войдите в аккаунт, чтобы вернуться к заявке.',
      email: 'Адрес электронной почты',
      password: 'Пароль',
      confirm: 'Повторите пароль',
      submitCreate: 'Создать аккаунт и войти',
      submitLogin: 'Войти',
      encrypted: 'Ваши данные защищены шифрованием',
      errors: {
        emailRequired: 'Укажите адрес электронной почты.',
        emailShape: 'Проверьте адрес: не хватает собаки или домена.',
        passwordRequired: 'Введите пароль.',
        passwordShort: 'Не короче {min} символов.',
        confirmRequired: 'Повторите пароль.',
        confirmMismatch: 'Пароли не совпадают.',
        noAccount:
          'Аккаунта с этой почтой нет. Сначала пройдите симуляцию и создайте личный кабинет.',
      },
    },
  },
} as const
