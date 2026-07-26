/**
 * Строки секции «Сценарии помощи». Подключаются под префиксом `programs.`.
 *
 * Заголовок секции на исходном сайте остался французским
 * («Scénarios d'aide disponibles pour la population») — это дефект локализации
 * оригинала, поэтому здесь он приведён к итальянскому. Тексты карточек
 * перенесены дословно.
 */
export default {
  it: {
    label: 'Programmi',
    title: 'Scenari di aiuto disponibili per la popolazione',
    items: {
      grants: {
        title: 'Sovvenzioni sociali',
        text: 'Finanziamento non rimborsabile o parzialmente compensato per i bisogni prioritari.',
      },
      rate: {
        title: 'Credito preferenziale al 3,8%',
        text: 'Tasso fisso sovvenzionato dai fondi sociali europei.',
      },
      guarantor: {
        title: 'Programma «Garante»',
        text: 'Meccanismo speciale per le persone in lista nera. Assumiamo i rischi presso le banche al vostro posto.',
      },
      patents: {
        title: 'Brevetti e aiuti progetti',
        text: 'Finanziamento delle iniziative locali e dei lavoratori autonomi secondo uno schema semplificato.',
      },
    },
  },

  ru: {
    label: 'Программы',
    title: 'Сценарии помощи, доступные населению',
    items: {
      grants: {
        title: 'Социальные субсидии',
        text: 'Безвозвратное или частично компенсируемое финансирование первоочередных нужд.',
      },
      rate: {
        title: 'Льготный кредит под 3,8%',
        text: 'Фиксированная ставка, субсидируемая европейскими социальными фондами.',
      },
      guarantor: {
        title: 'Программа «Поручитель»',
        text: 'Отдельный механизм для тех, кто попал в чёрный список. Риски перед банками берём на себя.',
      },
      patents: {
        title: 'Патенты и помощь проектам',
        text: 'Финансирование местных инициатив и самозанятых по упрощённой схеме.',
      },
    },
  },
} as const
