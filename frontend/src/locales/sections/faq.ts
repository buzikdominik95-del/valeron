/**
 * Строки секции вопросов и ответов. Подключаются под префиксом 'faq.',
 * то есть ключ title читается в компоненте как t('faq.title').
 *
 * Итальянский текст перенесён с velora.it дословно; апострофы
 * набраны типографским знаком ’, кавычки — ёлочками, как в оригинале.
 * Порядок вопросов задаёт не этот файл, а массив ключей в VelFaq.vue.
 */
export default {
  it: {
    label: 'Domande frequenti',
    title: 'Le vostre domande su Velora',
    items: {
      rate: {
        q: 'Da quali fondi è compensato il tasso? Perché è al 3,8%?',
        a: 'Mobilizziamo i meccanismi delle sovvenzioni europee, degli aiuti mirati e dei programmi brevettati, che si fanno carico del pagamento degli interessi principali alle banche commerciali.',
      },
      blacklist: {
        q: 'Cosa fare se sono nella lista nera ufficiale dei debitori?',
        a: 'È la nostra specialità principale. Non vi valutiamo in base agli errori passati. La nostra organizzazione si pone come garante finanziario (fideiussore) al vostro posto, il che cancella automaticamente i marcatori di rischio per le nostre banche partner.',
      },
      speed: {
        q: 'In quanto tempo vengono approvate le pratiche sociali?',
        a: 'Il sistema funziona interamente in modalità fintech automatizzata. La verifica e la selezione dei programmi richiedono fino a 2 ore; il versamento dei fondi avviene il giorno stesso della richiesta.',
      },
      banks: {
        q: 'Perché la mia banca non mi ha proposto un tasso al 3,8%, mentre voi potete farlo?',
        a: 'Le banche commerciali sono strutture a scopo di lucro, il cui obiettivo è massimizzare i profitti grazie a tassi elevati. Tacciono deliberatamente sull’esistenza delle sovvenzioni sociali europee e dei programmi brevettati di bonifica. Velora è un aggregatore sociale indipendente. Costringiamo il sistema bancario a funzionare secondo tariffe regolamentate dallo Stato, vantaggiose per i cittadini e non per gli azionisti.',
      },
      scoring: {
        q: 'L’invio della mia richiesta a tutte le banche peggiorerà la mia storia creditizia già difficile?',
        a: 'Impossibile. La nostra piattaforma utilizza la tecnologia di «scoring invisibile» intelligente. Non effettuiamo invii di massa registrati nelle banche dati come molteplici rifiuti. Il sistema confronta in tempo reale il vostro profilo con i limiti interni riservati delle banche partner sotto la nostra garanzia. Per i sistemi interbancari, questo appare come un’unica richiesta mirata e sicura.',
      },
      digital: {
        q: 'Devo recarmi negli uffici o fornire garanti personalmente?',
        a: 'No, Velora è un servizio 100% digitale. L’intero processo, dalla compilazione del modulo all’ottenimento dei fondi al 3,8%, si svolge online «qui e ora». Non avete bisogno di cercare garanti né di proporre un collaterale — è il nostro fondo sociale che assume interamente questa funzione. Il contratto viene firmato a distanza grazie a una firma digitale sicura.',
      },
      fees: {
        q: 'La piattaforma preleva commissioni nascoste o anticipi per la selezione del programma?',
        a: 'No. La procedura di analisi express e di orientamento della vostra pratica verso gli scenari sociali è completamente gratuita.',
      },
      upfront: {
        q: 'Devo pagare qualcosa al momento della presentazione dei documenti?',
        a: 'Assolutamente nulla. Velora applica la norma europea «Rischio iniziale zero». Finché il sistema non registra una decisione favorevole per il vostro programma, qualsiasi prelievo è escluso.',
      },
    },
  },

  ru: {
    label: 'Частые вопросы',
    title: 'Ваши вопросы о Velora',
    items: {
      rate: {
        q: 'За счёт чего компенсируется ставка? Почему именно 3,8%?',
        a: 'Мы подключаем механизмы европейских субсидий, адресной помощи и запатентованных программ — именно они берут на себя выплату основных процентов коммерческим банкам.',
      },
      blacklist: {
        q: 'Что делать, если я в официальном чёрном списке должников?',
        a: 'Это наша главная специализация. Мы не оцениваем вас по прошлым ошибкам. Наша организация сама становится вашим финансовым поручителем, и это автоматически снимает метки риска для банков-партнёров.',
      },
      speed: {
        q: 'Сколько времени занимает одобрение по социальным программам?',
        a: 'Система работает полностью в автоматическом финтех-режиме. Проверка и подбор программы занимают до 2 часов, а деньги поступают в день обращения.',
      },
      banks: {
        q: 'Почему мой банк не предложил мне ставку 3,8%, а вы можете?',
        a: 'Коммерческие банки работают ради прибыли, и их цель — заработать как можно больше на высоких ставках. О европейских социальных субсидиях и запатентованных программах оздоровления они молчат намеренно. Velora — независимый социальный агрегатор. Мы заставляем банковскую систему работать по государственным тарифам, выгодным гражданам, а не акционерам.',
      },
      scoring: {
        q: 'Не испортит ли отправка заявки во все банки мою и без того непростую кредитную историю?',
        a: 'Исключено. Платформа использует технологию умного «невидимого скоринга». Мы не делаем массовых рассылок, которые оседают в базах данных как череда отказов. Система в реальном времени сверяет ваш профиль с закрытыми внутренними лимитами банков-партнёров под нашу гарантию. Для межбанковских систем это выглядит как один точечный и безопасный запрос.',
      },
      digital: {
        q: 'Нужно ли приезжать в офис или лично приводить поручителей?',
        a: 'Нет, Velora — на 100% цифровой сервис. Весь путь, от заполнения анкеты до получения денег под 3,8%, проходит онлайн, здесь и сейчас. Искать поручителей и закладывать имущество не нужно — эту роль целиком берёт на себя наш социальный фонд. Договор подписывается дистанционно защищённой электронной подписью.',
      },
      fees: {
        q: 'Берёт ли платформа скрытые комиссии или предоплату за подбор программы?',
        a: 'Нет. Экспресс-анализ и направление вашей заявки в социальные программы полностью бесплатны.',
      },
      upfront: {
        q: 'Нужно ли что-то платить при подаче документов?',
        a: 'Ровно ничего. Velora придерживается европейской нормы «нулевой стартовый риск». Пока система не зафиксирует положительное решение по вашей программе, любые списания исключены.',
      },
    },
  },
} as const
