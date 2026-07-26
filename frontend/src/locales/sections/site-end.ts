/**
 * Строки заключительного блока: SEO-перелинковка + подвал.
 * Подключаются под префиксом 'siteEnd.', ключи it и ru совпадают один в один.
 *
 * Суммы в названиях офферов зашиты в строки намеренно: это SEO-заголовки
 * посадочных страниц, а не значения калькулятора, и через форматтер валюты
 * они не проходят.
 *
 * В оригинальном подвале заголовок колонки партнёров был по-французски
 * («Partenaires») — здесь дефект локализации исправлен на «Partner».
 */
export default {
  it: {
    title: 'Hai bisogno di un credito?',
    ctaLabel: 'Faccio un credito al consumo',

    simulationsTitle: 'Simula i tuoi crediti',
    simulations: {
      credit: 'Simulazione credito',
      auto: 'Simulazione credito auto',
      works: 'Simulazione credito lavori',
      personal: 'Simulazione prestito personale',
      revolving: 'Simulazione credito revolving',
      consolidation: 'Simulazione consolidamento debiti',
    },

    offersTitle: 'Le nostre offerte di credito',
    offers: {
      a4000: 'Credito di 4.000 €',
      a5000: 'Credito di 5.000 €',
      a10000: 'Credito di 10.000 €',
      a15000: 'Credito di 15.000 €',
      a20000: 'Credito di 20.000 €',
      a22000: 'Credito di 22.000 €',
    },

    /* Заголовок подвала виден только скринридеру: он держит порядок заголовков */
    footerTitle: 'Navigazione del sito',

    programsTitle: 'Programmi',
    programs: {
      rate: 'Prog. Aiuto al 3,8%',
      subsidies: 'Sovvenzioni Sociali',
      patents: 'Supporto ai Brevetti',
      renovation: 'Aiuto alla Ristrutturazione',
    },

    partnersTitle: 'Partner',
    partners: {
      network: 'Rete di Banche Partner',
      missions: 'Le Nostre Missioni Sociali',
      how: 'Come Aiutiamo',
      contact: 'Contattaci',
    },

    legalTitle: 'Informazioni',
    legal: {
      terms: 'Informazioni legali',
      privacy: 'Politica sulla privacy',
      sitemap: 'Mappa del sito',
      governance: 'Governance Sociale',
      guarantee: 'Regole di Garanzia',
    },
  },

  ru: {
    title: 'Нужен кредит?',
    ctaLabel: 'Оформить потребительский кредит',

    simulationsTitle: 'Рассчитайте свой кредит',
    simulations: {
      credit: 'Расчёт кредита',
      auto: 'Расчёт автокредита',
      works: 'Расчёт кредита на ремонт',
      personal: 'Расчёт личного займа',
      revolving: 'Расчёт возобновляемого кредита',
      consolidation: 'Расчёт объединения долгов',
    },

    offersTitle: 'Наши кредитные предложения',
    offers: {
      a4000: 'Кредит 4 000 €',
      a5000: 'Кредит 5 000 €',
      a10000: 'Кредит 10 000 €',
      a15000: 'Кредит 15 000 €',
      a20000: 'Кредит 20 000 €',
      a22000: 'Кредит 22 000 €',
    },

    footerTitle: 'Навигация по сайту',

    programsTitle: 'Программы',
    programs: {
      rate: 'Программа помощи под 3,8%',
      subsidies: 'Социальные субсидии',
      patents: 'Поддержка патентов',
      renovation: 'Помощь на ремонт жилья',
    },

    partnersTitle: 'Партнёры',
    partners: {
      network: 'Сеть банков-партнёров',
      missions: 'Наши социальные миссии',
      how: 'Как мы помогаем',
      contact: 'Связаться с нами',
    },

    legalTitle: 'Информация',
    legal: {
      terms: 'Правовая информация',
      privacy: 'Политика конфиденциальности',
      sitemap: 'Карта сайта',
      governance: 'Социальное управление',
      guarantee: 'Правила гарантии',
    },
  },
} as const
