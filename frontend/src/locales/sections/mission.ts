/**
 * Строки секции «Миссия и аккредитация».
 * Итальянские формулировки взяты с velora.it; второй абзац в оригинале
 * был наполовину французским — здесь он целиком на итальянском.
 *
 * Наборы ключей it и ru совпадают один в один: незаполненный ключ
 * vue-i18n молча добрал бы из fallbackLocale, и дыра осталась бы незамеченной.
 */
export default {
  it: {
    label: 'La nostra missione',
    title: 'Siamo la tua libertà finanziaria',
    lead: 'La nostra missione come aggregatore sociale è restituirti la tua libertà finanziaria. Abbiamo riunito le più grandi istituzioni affinché tu possa ottenere aiuto qui e ora, beneficiando degli aiuti di Stato legali, delle sovvenzioni e dei dispositivi garantiti.',
    accreditationLabel: 'Accreditamento',
    accreditation: 'Operatore accreditato di programmi sociali',
    license: 'Vedere la licenza',
    roleLabel: 'Il nostro ruolo',
    roleTitle: 'Primo aggregatore sociale fintech d’Europa',
    roleText: 'In quanto primo aggregatore sociale fintech d’Europa, svolgiamo il ruolo di collegamento tra i programmi di dotazione pubblica e il consumatore finale. Poiché assumiamo le funzioni di garante, oltre 50 tra le maggiori banche europee aprono ai nostri clienti canali preferenziali chiusi al grande pubblico, con un tasso al 3,8%.',
  },

  ru: {
    label: 'Наша миссия',
    title: 'Мы — ваша финансовая свобода',
    lead: 'Наша миссия социального агрегатора — вернуть вам финансовую свободу. Мы собрали вместе крупнейшие финансовые организации, чтобы вы могли получить помощь здесь и сейчас, пользуясь законными мерами государственной поддержки, субсидиями и гарантированными программами.',
    accreditationLabel: 'Аккредитация',
    accreditation: 'Аккредитованный оператор социальных программ',
    license: 'Посмотреть лицензию',
    roleLabel: 'Наша роль',
    roleTitle: 'Первый социальный финтех-агрегатор в Европе',
    roleText: 'Как первый в Европе социальный финтех-агрегатор мы связываем государственные программы поддержки с конечным получателем. Мы берём на себя роль поручителя, и поэтому более 50 крупнейших европейских банков открывают нашим клиентам льготные каналы, закрытые для широкой публики, — со ставкой 3,8%.',
  },
} as const
