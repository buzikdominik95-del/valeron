(() => {
  'use strict';

  const chatMetaPath = /\/api\/admin\/chats\/\d+\/meta(?:\?|$)/;
  const chatDetailsPath = /\/api\/admin\/chats\/(\d+)(?:\?|$)/;
  const chatIdPath = /\/api\/admin\/chats\/(\d+)(?:\/meta)?(?:\?|$)/;
  const ibanSettingsPath = /\/api\/admin\/settings\/iban(?:\?|$)/;
  const ibanVersionKey = 'velora-admin-iban-version';
  const chatLevelById = new Map();
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  const chatIdFromUrl = (url) => {
    const match = String(url || '').match(chatIdPath);
    return match ? Number(match[1]) : null;
  };

  const levelFromPage = () => {
    const match = document.body.textContent.match(/Сейчас:\s*Уровень\s+(\d+)/);
    const level = match ? Number(match[1]) : null;
    return Number.isInteger(level) && level > 0 ? level : null;
  };

  const rememberChatLevel = (chatId, level) => {
    const normalizedId = Number(chatId);
    const normalizedLevel = Number(level);
    if (Number.isInteger(normalizedId) && normalizedId > 0
      && Number.isInteger(normalizedLevel) && normalizedLevel > 0) {
      chatLevelById.set(normalizedId, normalizedLevel);
    }
  };

  const showIbanConflict = () => {
    document.getElementById('velora-iban-conflict-notice')?.remove();

    const notice = document.createElement('div');
    notice.id = 'velora-iban-conflict-notice';
    notice.textContent = 'Реквизиты были изменены в другой вкладке. Они не сохранены: обновите страницу и внесите изменение заново.';
    Object.assign(notice.style, {
      position: 'fixed', top: '20px', right: '20px', zIndex: '2147483647',
      maxWidth: '420px', padding: '14px 16px', borderRadius: '10px',
      color: '#fff', background: '#b91c1c', boxShadow: '0 10px 28px rgba(0,0,0,.3)',
      font: '14px/1.4 system-ui, sans-serif',
    });
    document.body.append(notice);
    setTimeout(() => notice.remove(), 10000);
  };

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__veloraMethod = String(method || '').toUpperCase();
    this.__veloraUrl = String(url || '');
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (body) {
    const isChatMeta = this.__veloraMethod === 'PUT' && chatMetaPath.test(this.__veloraUrl);
    const isChatDetails = this.__veloraMethod === 'GET' && chatDetailsPath.test(this.__veloraUrl);
    const isIbanSettings = ibanSettingsPath.test(this.__veloraUrl);
    let payload = null;

    if (typeof body === 'string' && (isChatMeta || isIbanSettings)) {
      try {
        payload = JSON.parse(body);
      } catch (_) {
        payload = null;
      }
    }

    if (isChatMeta && payload && Object.prototype.hasOwnProperty.call(payload, 'commission_level')) {
      const chatId = chatIdFromUrl(this.__veloraUrl);
      const currentLevel = (chatId && chatLevelById.get(chatId)) || levelFromPage();

      if (currentLevel && Number(payload.commission_level) === currentLevel) {
        // Автосохранение заметки/тегов: этап в таком запросе не меняется.
        delete payload.commission_level;
        delete payload.expected_commission_level;
      } else if (currentLevel && !Object.prototype.hasOwnProperty.call(payload, 'expected_commission_level')) {
        // Явное переключение этапа из старой сборки получает защиту от гонки.
        payload.expected_commission_level = currentLevel;
      }

      body = JSON.stringify(payload);
    }

    if (isChatDetails) {
      const chatId = chatIdFromUrl(this.__veloraUrl);
      this.addEventListener('load', () => {
        if (this.status < 200 || this.status >= 300) return;
        try {
          rememberChatLevel(chatId, JSON.parse(this.responseText)?.data?.chat?.commission_level);
        } catch (_) {}
      });
    }

    if (isChatMeta) {
      const chatId = chatIdFromUrl(this.__veloraUrl);
      this.addEventListener('load', () => {
        if (this.status < 200 || this.status >= 300) return;
        try {
          rememberChatLevel(chatId, JSON.parse(this.responseText)?.data?.commission_level);
        } catch (_) {}
      });
    }

    if (isIbanSettings && payload && this.__veloraMethod !== 'GET') {
      const version = sessionStorage.getItem(ibanVersionKey);
      if (version) {
        payload.version = version;
        body = JSON.stringify(payload);
      }
    }

    if (isIbanSettings) {
      this.addEventListener('load', () => {
        if (this.status === 409) {
          showIbanConflict();
          return;
        }
        if (this.status < 200 || this.status >= 300) return;
        try {
          const response = JSON.parse(this.responseText);
          const version = response?.data?.version;
          if (typeof version === 'string' && version.length === 64) {
            sessionStorage.setItem(ibanVersionKey, version);
          }
        } catch (_) {}
      });
    }

    return originalSend.call(this, body);
  };

  const setValue = (input, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const addTechnicalDetailsButton = () => {
    if (document.getElementById('velora-technical-details-button')) return;

    const ibans = [...document.querySelectorAll('input[placeholder="IBAN (пусто = глобальный)"]')];
    const recipients = [...document.querySelectorAll('input[placeholder="Получатель (пусто = глобальный)"]')];
    const swifts = [...document.querySelectorAll('input[placeholder="SWIFT/BIC (пусто = глобальный)"]')];
    if (ibans.length !== 2 || recipients.length !== 2 || swifts.length !== 2) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'velora-technical-details-button';
    button.className = 'primary-btn';
    button.style.margin = '0 0 16px';
    button.textContent = 'Lavori tecnici: 15 minuti';
    button.addEventListener('click', () => {
      for (const input of ibans) setValue(input, '-');
      for (const input of recipients) setValue(input, 'Lavori tecnici: 15 minuti');
      for (const input of swifts) setValue(input, '-');
    });

    ibans[0].closest('div')?.before(button);
  };

  new MutationObserver(addTechnicalDetailsButton).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  addTechnicalDetailsButton();
})();
