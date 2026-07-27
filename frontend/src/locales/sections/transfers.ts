/**
 * Строки секции переводов. В компоненте читаются под префиксом 'transfers.',
 * то есть titleLead — это t('transfers.titleLead').
 *
 * Набор ключей в it и ru совпадает один в один: непокрытый ключ vue-i18n
 * добирает из fallbackLocale, и посреди русской страницы всплыл бы итальянский.
 */
export default {
  it: {
    titleLead: 'Trasferimenti di fondi affidabili e sicuri',
    titleTail: 'dal tuo conto personale',
    body: 'Gestisci i tuoi trasferimenti in modo semplice, rapido e protetto direttamente dal tuo account personale Velora. La sicurezza dei tuoi fondi è la nostra priorità assoluta.',
  },

  ru: {
    titleLead: 'Надёжные и безопасные переводы средств',
    titleTail: 'из личного кабинета',
    body: 'Управляйте переводами просто, быстро и под защитой — прямо в личном кабинете Velora. Сохранность ваших денег для нас важнее всего.',
  },
} as const
