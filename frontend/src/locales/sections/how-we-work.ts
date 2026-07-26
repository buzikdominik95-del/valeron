/**
 * Строки секции «Come lavoriamo». Подключаются под префиксом howWeWork.,
 * то есть title читается как t('howWeWork.title').
 *
 * Наборы ключей it и ru совпадают один в один: пропущенный ключ vue-i18n
 * молча добрал бы из fallbackLocale, и в русской версии остался бы итальянский.
 * Номера шагов (01/02/03) сюда не кладём — они одинаковы в любой локали
 * и считаются по позиции в компоненте.
 */
export default {
  it: {
    title: 'Come lavoriamo',
    steps: {
      form: {
        title: 'Questionario istantaneo',
        text: 'Compilate una sola richiesta, e i nostri algoritmi la adattano istantaneamente alle esigenze di tutte le banche partner leali.',
      },
      shield: {
        title: 'Protezione contro i rifiuti',
        text: 'Il nostro statuto di organismo sociale ci permette di compensare uno storico creditizio negativo grazie ai nostri fondi di garanzia interni.',
      },
      rate: {
        title: 'Tasso fisso al 3,8%',
        text: 'Nessuna maggiorazione nascosta da parte delle banche commerciali. Beneficiate di un tasso sovvenzionato puro, protetto dai programmi di Stato.',
      },
    },
    partners: 'Oltre 50 banche partner',
  },

  ru: {
    title: 'Как мы работаем',
    steps: {
      form: {
        title: 'Мгновенная анкета',
        text: 'Вы заполняете одну заявку, а наши алгоритмы тут же подгоняют её под требования каждого банка-партнёра.',
      },
      shield: {
        title: 'Защита от отказов',
        text: 'Статус социальной организации позволяет нам перекрывать испорченную кредитную историю собственными гарантийными фондами.',
      },
      rate: {
        title: 'Фиксированная ставка 3,8%',
        text: 'Никаких скрытых наценок от коммерческих банков. Вы получаете чистую субсидированную ставку под защитой государственных программ.',
      },
    },
    partners: 'Более 50 банков-партнёров',
  },
} as const
