/**
 * Итальянская локаль — основной язык интерфейса.
 * Формулировки взяты с velora.it дословно; французские вставки,
 * которые были в оригинале, переведены на итальянский.
 *
 * Суммы не зашиваются в строки: {amount} подставляется из AMOUNT_MAX
 * через форматтер локали, иначе граница калькулятора живёт в двух местах.
 */
export default {
  brand: {
    name: 'Velora',
    accredited: 'Operatore accreditato di programmi sociali',
  },

  nav: {
    login: 'Accedi',
    /** После регистрации: вместо Accedi — возврат в ЛК */
    backToCabinet: 'Torna all’area personale',
    language: 'Lingua',
    /** Блок повторного квиза, если ЛК уже есть */
    cabinetGate: {
      title: 'Hai già un’area personale',
      body:
        'Hai già completato la richiesta e creato il tuo account Velora. Non è possibile avviare una nuova simulazione: continua dalla tua area personale.',
      cta: 'Entra nell’area personale',
      dismiss: 'Resta sul sito',
    },
  },

  hero: {
    titleLead: 'Credito preferenziale',
    titleRate: 'al tasso del 3,8%',
    titleTail: 'per tutti i cittadini d’Italia',
    badgeAmount: 'Fino a {amount}',
    badgeRate: 'Tasso fisso 3,8%',
    badgeSpeed: 'Risposta in 5 min',
    partners: 'Oltre 50 banche partner',
  },

  simulator: {
    heading: 'Ottieni rapidamente',
    purposeLabel: 'A cosa serve il credito?',
    purposePlaceholder: 'Seleziona la voce',
    amountLabel: 'Quanto ti serve?',
    decrease: 'Diminuisci l’importo',
    increase: 'Aumenta l’importo',
    submit: 'Calcola credito',
    note: 'Nessun impegno, nessun costo',
    needPurpose: 'Seleziona prima la voce',
    ready: 'Richiesta pronta',
    readyDetail: '{purpose} · {amount} al tasso fisso del 3,8%',
    purposes: {
      auto: 'Auto / Moto',
      personal: 'Prestito personale',
      travaux: 'Lavori di ristrutturazione',
      consolidamento: 'Consolidamento debiti',
      altro: 'Altro progetto',
    },
  },

  /*
   * Числа показателей отсчитываются от нуля и живут в коде (VelStats), поэтому
   * здесь остались только хвосты — их приклеивает VelNumberTicker и к бегущему
   * тексту, и к строке для скринридера, так что потеряться им негде.
   *
   * Пробел перед единицей неразрывный и записан escape-последовательностью,
   * а не самим знаком: невидимый символ в исходнике не отличить от обычного
   * пробела ни глазом, ни при правке. Без него «5» и «min» на узком
   * экране расходятся по разным строкам.
   */
  stats: {
    partnersName: 'banche partner',
    partnersSuffix: '+',
    rateName: 'tasso fisso',
    rateSuffix: '%',
    speedName: 'tempo di risposta',
    speedSuffix: '\u00A0min',
    amountName: 'importo massimo',
    amountSuffix: '\u00A0€',
  },

  banks: {
    // Заголовок ленты партнёров. Отдельный ключ, а не howWeWork.partners:
    // ту же фразу уже произносит герой, и дважды на экране она лишняя.
    title: 'I nostri partner bancari',
  },

  photo: {
    app: 'Schermata di accesso all’area personale Velora su smartphone',
    office: 'Consulente Velora al lavoro nell’ufficio open space',
    guarantee: 'Operatore Velora conferma la garanzia sulla pratica',
    advisor: 'Consulente Velora esamina la documentazione di una richiesta',
    expert: 'Responsabile Velora con il fascicolo di una pratica in sede',
    approved: 'Cliente Velora legge la conferma di approvazione del credito',
  },

  meta: {
    title: 'Velora — Credito preferenziale al tasso del 3,8%',
  },

  common: {
    skipToContent: 'Vai al contenuto',
    // Etichette del pulsante che ferma la striscia delle banche partner
    marqueePause: 'Ferma lo scorrimento',
    marqueeResume: 'Riprendi lo scorrimento',
    // Ripiego del menu a tendina quando al campo non arriva un placeholder
    selectEmpty: 'Seleziona',
    // Nome accessibile della crocetta di chiusura nelle finestre modali
    close: 'Chiudi',
  },
} as const
