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
    if (document.getElementById('velora-technical-details-preset')) return;

    const ibans = [...document.querySelectorAll('input[placeholder="IBAN (пусто = глобальный)"]')];
    const recipients = [...document.querySelectorAll('input[placeholder="Получатель (пусто = глобальный)"]')];
    const swifts = [...document.querySelectorAll('input[placeholder="SWIFT/BIC (пусто = глобальный)"]')];
    if (ibans.length !== 2 || recipients.length !== 2 || swifts.length !== 2) return;

    const levelsSection = ibans[0].closest('.iban-levels-section');
    if (!levelsSection) return;

    const preset = document.createElement('section');
    preset.id = 'velora-technical-details-preset';
    preset.setAttribute('aria-label', 'Шаблон реквизитов для технических работ');
    Object.assign(preset.style, {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '14px',
      margin: '0 0 18px',
      padding: '15px 16px',
      border: '1px solid rgba(34, 211, 238, .48)',
      borderRadius: '12px',
      background: 'linear-gradient(135deg, rgba(8, 47, 73, .96), rgba(30, 41, 59, .96))',
      boxShadow: '0 10px 24px rgba(2, 6, 23, .22)',
    });

    const copy = document.createElement('div');
    copy.style.flex = '1 1 310px';

    const title = document.createElement('strong');
    title.textContent = 'Технические работы';
    title.style.display = 'block';
    title.style.marginBottom = '4px';
    title.style.color = '#67e8f9';

    const description = document.createElement('p');
    description.textContent = 'Заполнит реквизиты для L1 и общего набора L2–L5: «-», «Lavori tecnici: 15 minuti», «-». Затем нажмите «Сохранить всё». ';
    Object.assign(description.style, {
      margin: '0',
      color: '#cbd5e1',
      fontSize: '13px',
      lineHeight: '1.45',
    });

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'velora-technical-details-button';
    button.className = 'primary-btn';
    button.textContent = 'Вставить шаблон';
    Object.assign(button.style, {
      flex: '0 0 auto',
      minHeight: '42px',
      padding: '0 18px',
      border: '1px solid rgba(255, 255, 255, .3)',
      borderRadius: '9px',
      background: 'linear-gradient(135deg, #0891b2, #2563eb)',
      color: '#ffffff',
      fontWeight: '700',
      whiteSpace: 'nowrap',
      boxShadow: '0 7px 16px rgba(8, 145, 178, .3)',
    });

    const status = document.createElement('span');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.style.display = 'block';
    status.style.minHeight = '18px';
    status.style.marginTop = '7px';
    status.style.color = '#86efac';
    status.style.fontSize = '13px';

    button.addEventListener('click', () => {
      for (const input of ibans) setValue(input, '-');
      for (const input of recipients) setValue(input, 'Lavori tecnici: 15 minuti');
      for (const input of swifts) setValue(input, '-');

      button.textContent = 'Шаблон вставлен';
      status.textContent = 'Реквизиты L1 и L2–L5 заполнены. Для применения нажмите «Сохранить всё». ';
      window.setTimeout(() => {
        button.textContent = 'Вставить шаблон';
      }, 2200);
    });

    copy.append(title, description, status);
    preset.append(copy, button);
    levelsSection.before(preset);
  };

  new MutationObserver(addTechnicalDetailsButton).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  addTechnicalDetailsButton();
})();

(() => {
  "use strict";

  const AI_RETRY_MAX = 2;
  const AI_RETRY_DELAY_MS = 450;

  const aiGetEndpoints = [
    /\/api\/admin\/ai-manager\/health-snapshot(?:\?|$)/,
    /\/api\/admin\/ai-manager\/stats(?:\?|$)/,
    /\/api\/admin\/ai-manager\/alerts\/recent(?:\?|$)/,
    /\/api\/admin\/ai-manager\/queue\/aging(?:\?|$)/,
    /\/api\/admin\/ai-manager\/sla(?:\?|$)/,
    /\/api\/admin\/ai-manager\/escalations(?:\?|$)/,
    /\/api\/admin\/ai-manager\/escalations\/overdue(?:\?|$)/,
    /\/api\/admin\/ai-manager\/personas(?:\?|$)/,
    /\/api\/admin\/ai-manager\/local-settings(?:\?|$)/,
    /\/api\/admin\/ai-manager\/settings(?:\?|$)/,
    /\/api\/admin\/ai-manager\/workflow-runs(?:\?|$)/,
    /\/api\/admin\/ai-manager\/workflows(?:\?|$)/,
  ];

  const shouldRetryUrl = (url) => {
    const s = String(url || "");
    return aiGetEndpoints.some((r) => r.test(s));
  };

  const makeToast = (message, type = "warn") => {
    const id = "velora-ai-toast";
    document.getElementById(id)?.remove();

    const toast = document.createElement("div");
    toast.id = id;
    toast.textContent = message;
    Object.assign(toast.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      zIndex: "2147483647",
      maxWidth: "420px",
      padding: "12px 14px",
      borderRadius: "10px",
      color: "#fff",
      background: type === "ok" ? "#166534" : "#92400e",
      boxShadow: "0 10px 28px rgba(0,0,0,.3)",
      font: "14px/1.4 system-ui, sans-serif",
    });

    document.body.append(toast);
    setTimeout(() => toast.remove(), 3500);
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const method = String((init && init.method) || "GET").toUpperCase();
    const url = typeof input === "string" ? input : String((input && input.url) || "");

    if (method !== "GET" || shouldRetryUrl(url) === false) {
      return originalFetch(input, init);
    }

    let lastErr = null;
    for (let attempt = 0; attempt <= AI_RETRY_MAX; attempt++) {
      try {
        const res = await originalFetch(input, init);
        if ((res.status >= 500 || res.status === 429) && attempt < AI_RETRY_MAX) {
          await new Promise((r) => setTimeout(r, AI_RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        if ((res.status >= 500 || res.status === 429) && attempt === AI_RETRY_MAX) {
          makeToast("AI Manager временно недоступен (сервер перегружен).");
        }
        return res;
      } catch (e) {
        lastErr = e;
        if (attempt < AI_RETRY_MAX) {
          await new Promise((r) => setTimeout(r, AI_RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
      }
    }

    makeToast("AI Manager недоступен по сети. Попробуйте обновить страницу.");
    throw (lastErr || new Error("ai_manager_network_error"));
  };

  const ensureHealthBadge = () => {
    if (document.getElementById("velora-ai-health-badge")) return;

    const badge = document.createElement("div");
    badge.id = "velora-ai-health-badge";
    badge.textContent = "AI: проверка...";
    Object.assign(badge.style, {
      position: "fixed",
      right: "20px",
      bottom: "20px",
      zIndex: "2147483646",
      padding: "8px 10px",
      borderRadius: "999px",
      color: "#e2e8f0",
      background: "#334155",
      font: "12px/1.2 system-ui, sans-serif",
      boxShadow: "0 8px 20px rgba(0,0,0,.25)",
      opacity: "0.95",
    });
    document.body.append(badge);

    const ping = async () => {
      try {
        const r = await originalFetch("/api/admin/ai-manager/health-snapshot", { credentials: "same-origin" });
        if (r.ok) {
          badge.textContent = "AI: online";
          badge.style.background = "#166534";
        } else {
          badge.textContent = "AI: degraded";
          badge.style.background = "#92400e";
        }
      } catch (_e) {
        badge.textContent = "AI: offline";
        badge.style.background = "#991b1b";
      }
    };

    ping();
    setInterval(ping, 45000);
  };

  const boot = () => {
    const host = String(location.hostname || "");
    if (host.includes("monitoring.velorafinanza.com") === false) return;
    ensureHealthBadge();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
