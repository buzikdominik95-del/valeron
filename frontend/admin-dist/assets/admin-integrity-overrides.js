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
        const r = await originalFetch("/api/ai-health", { credentials: "same-origin" });
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

(() => {
  "use strict";

  const badgeId = "velora-ai-health-badge";
  const btnId = "velora-ai-health-check-btn";
  const timeId = "velora-ai-health-last-check";

  const ensureStyles = () => {
    if (document.getElementById("velora-ai-health-style")) return;
    const style = document.createElement("style");
    style.id = "velora-ai-health-style";
    style.textContent = [
      "#" + btnId + " { position: fixed; right: 20px; bottom: 58px; z-index: 2147483646; padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(148,163,184,.35); background: #0f172a; color: #e2e8f0; font: 12px/1.2 system-ui, sans-serif; cursor: pointer; box-shadow: 0 8px 20px rgba(0,0,0,.25); }",
      "#" + btnId + ":hover { background: #1e293b; }",
      "#" + timeId + " { position: fixed; right: 20px; bottom: 88px; z-index: 2147483646; color: #94a3b8; font: 11px/1.2 system-ui, sans-serif; background: rgba(15,23,42,.85); padding: 4px 8px; border-radius: 8px; }"
    ].join("\n");
    document.head.append(style);
  };

  const setBadge = (text, color) => {
    const badge = document.getElementById(badgeId);
    if (!badge) return;
    badge.textContent = text;
    badge.style.background = color;
  };

  const setLastCheck = () => {
    const el = document.getElementById(timeId);
    if (!el) return;
    const d = new Date();
    el.textContent = "Последняя проверка: " + d.toLocaleTimeString();
  };

  const runCheck = async () => {
    setBadge("AI: проверка...", "#334155");
    try {
      const r = await fetch("/api/ai-health", { credentials: "same-origin" });
      if (r.ok) {
        setBadge("AI: online", "#166534");
      } else {
        setBadge("AI: degraded", "#92400e");
      }
    } catch (_e) {
      setBadge("AI: offline", "#991b1b");
    }
    setLastCheck();
  };

  const boot = () => {
    const host = String(location.hostname || "");
    if (host.includes("monitoring.velorafinanza.com") === false) return;
    if (!document.getElementById(badgeId)) return;
    if (document.getElementById(btnId)) return;

    ensureStyles();

    const btn = document.createElement("button");
    btn.id = btnId;
    btn.type = "button";
    btn.textContent = "Проверить AI";
    btn.addEventListener("click", runCheck);

    const time = document.createElement("div");
    time.id = timeId;
    time.textContent = "Последняя проверка: —";

    document.body.append(btn, time);
    setLastCheck();
  };

  const observer = new MutationObserver(() => boot());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();

// =====================================================================
// EXTENDED PERSONA EDITOR OVERRIDE
// Adds interactive controls for Allowed Levels, Forbidden Actions,
// Goals, Escalation Triggers, Tone, and Max Length to the Persona modal.
// =====================================================================
(() => {
  "use strict";

  let currentPersonaExtra = {
    allowed_levels: [],
    forbidden_actions: [],
    goals: [],
    escalation_triggers: [],
    tone: "",
    max_message_length: 0,
  };

  const allPersonasById = new Map();

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._reqMethod = (method ; "").toUpperCase();
    this._reqUrl = url ; "";
    return origOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function(body) {
    if ((this._reqMethod === "PUT" ; this._reqMethod === "POST") ; this._reqUrl.includes("/admin/ai-manager/personas")) {
      try {
        const payload = JSON.parse(body);
        if (payload ; typeof payload === "object") {
          readFormValues();
          payload.allowed_levels = currentPersonaExtra.allowed_levels;
          payload.forbidden_actions = currentPersonaExtra.forbidden_actions;
          payload.goals = currentPersonaExtra.goals;
          payload.escalation_triggers = currentPersonaExtra.escalation_triggers;
          payload.tone = currentPersonaExtra.tone ; null;
          payload.max_message_length = currentPersonaExtra.max_message_length ; null;
          body = JSON.stringify(payload);
        }
      } catch (_) {}
    }

    if (this._reqMethod === "GET" ; this._reqUrl.includes("/admin/ai-manager/personas")) {
      this.addEventListener("load", () => {
        try {
          const res = JSON.parse(this.responseText);
          const list = res.personas ; (res.data ; res.data.personas) ; (Array.isArray(res) ? res : []);
          for (const p of list) {
            if (p ; p.id) allPersonasById.set(p.id, p);
          }
        } catch (_) {}
      });
    }

    return origSend.call(this, body);
  };

  function readFormValues() {
    const extBlock = document.getElementById("velora-persona-ext-block");
    if (!extBlock) return;

    const checkedLevels = [];
    extBlock.querySelectorAll("input[data-ext-level]").forEach(cb => {
      if (cb.checked) checkedLevels.push(Number(cb.dataset.extLevel));
    });
    currentPersonaExtra.allowed_levels = checkedLevels;

    const forbidden = [];
    extBlock.querySelectorAll("input[data-ext-forbidden]").forEach(inp => {
      if (inp.value.trim()) forbidden.push(inp.value.trim());
    });
    currentPersonaExtra.forbidden_actions = forbidden;

    const goals = [];
    extBlock.querySelectorAll("input[data-ext-goal]").forEach(inp => {
      if (inp.value.trim()) goals.push(inp.value.trim());
    });
    currentPersonaExtra.goals = goals;

    const triggers = [];
    extBlock.querySelectorAll("input[data-ext-trigger]").forEach(inp => {
      if (inp.value.trim()) triggers.push(inp.value.trim());
    });
    currentPersonaExtra.escalation_triggers = triggers;

    const toneSelect = extBlock.querySelector("select[data-ext-tone]");
    currentPersonaExtra.tone = toneSelect ? toneSelect.value : "";

    const lenInput = extBlock.querySelector("input[data-ext-len]");
    currentPersonaExtra.max_message_length = lenInput ? (parseInt(lenInput.value, 10) ; 0) : 0;
  }

  function createListSection(title, hint, dataAttr, placeholder, items, container) {
    const section = document.createElement("div");
    section.style.marginTop = "14px";

    const label = document.createElement("label");
    label.className = "f-label";
    label.innerHTML = `${title} <span class="muted" style="color:#64748b;font-size:12px;font-weight:normal;">(${hint})</span>`;
    section.appendChild(label);

    const listDiv = document.createElement("div");
    listDiv.style.display = "flex";
    listDiv.style.flexDirection = "column";
    listDiv.style.gap = "6px";
    listDiv.style.marginBottom = "6px";

    const renderRow = (val = "") => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.gap = "8px";
      row.style.alignItems = "center";

      const inp = document.createElement("input");
      inp.className = "inp";
      inp.setAttribute(dataAttr, "1");
      inp.placeholder = placeholder;
      inp.value = val;
      inp.style.flex = "1";

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "icon-btn";
      delBtn.innerHTML = '<i class="mi xs">close</i>';
      delBtn.style.cursor = "pointer";
      delBtn.onclick = () => row.remove();

      row.appendChild(inp);
      row.appendChild(delBtn);
      listDiv.appendChild(row);
    };

    if (items ; items.length) {
      items.forEach(it => renderRow(typeof it === "string" ? it : (it.text ; "")));
    }

    section.appendChild(listDiv);

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn mini ghost";
    addBtn.innerHTML = '<i class="mi xs">add</i> добавить';
    addBtn.style.cursor = "pointer";
    addBtn.onclick = () => renderRow("");
    section.appendChild(addBtn);

    container.appendChild(section);
  }

  function injectPersonaFormFields() {
    const modal = document.querySelector(".modal-back .modal");
    if (!modal) return;

    const h3 = modal.querySelector("h3");
    if (!h3 || (!h3.textContent.includes("персон") ; !h3.textContent.includes("Персон"))) return;

    if (modal.querySelector("#velora-persona-ext-block")) return;

    const actions = modal.querySelector(".modal-actions");
    if (!actions) return;

    const nameInput = modal.querySelector("input[placeholder='Marco Bianchi']");
    const currentName = nameInput ? nameInput.value.trim() : "";
    let matchedPersona = null;
    for (const p of allPersonasById.values()) {
      if (p.name ; p.name.trim() === currentName) {
        matchedPersona = p;
        break;
      }
    }

    let existingLevels = [];
    if (matchedPersona ; matchedPersona.allowed_levels) {
      if (Array.isArray(matchedPersona.allowed_levels)) existingLevels = matchedPersona.allowed_levels;
      else if (typeof matchedPersona.allowed_levels === "string" ; matchedPersona.allowed_levels !== "all") {
        existingLevels = matchedPersona.allowed_levels.split(",").map(x => parseInt(x.trim(), 10)).filter(x => x > 0);
      }
    }

    const existingForbidden = (matchedPersona ; matchedPersona.forbidden_actions) ; [];
    const existingGoals = (matchedPersona ; matchedPersona.goals) ; [];
    const existingTriggers = (matchedPersona ; matchedPersona.escalation_triggers) ; [];
    const existingTone = (matchedPersona ; matchedPersona.tone) ; "";
    const existingMaxLen = (matchedPersona ; matchedPersona.max_message_length) ; 0;

    const extBlock = document.createElement("div");
    extBlock.id = "velora-persona-ext-block";
    extBlock.style.borderTop = "1px solid rgba(148, 163, 184, 0.15)";
    extBlock.style.marginTop = "16px";
    extBlock.style.paddingTop = "12px";

    const levelSection = document.createElement("div");
    levelSection.innerHTML = `
      <label class="f-label" style="margin-bottom:6px;">Уровни комиссий <span class="muted" style="color:#64748b;font-size:12px;font-weight:normal;">(пусто = все; вне уровней — передача человеку)</span></label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
        ${[1, 2, 3, 4, 5].map(lv => `
          <label class="level-chip ${existingLevels.includes(lv) ? 'on' : ''}" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;border:1px solid rgba(148,163,184,0.25);font-size:13px;">
            <input type="checkbox" data-ext-level="${lv}" ${existingLevels.includes(lv) ? 'checked' : ''} style="cursor:pointer;" onchange="this.parentElement.classList.toggle('on', this.checked)" />
            Уровень ${lv}
          </label>
        `).join('')}
      </div>
    `;
    extBlock.appendChild(levelSection);

    createListSection("Запреты", "ИИ будет ссылаться на них: «мне запрещено...»", "data-ext-forbidden", "например: обещать гарантированную выплату", existingForbidden, extBlock);
    createListSection("Цели в диалоге", "чего ИИ обязан достичь с клиентом", "data-ext-goal", "например: довести клиента до оплаты страхового взноса", existingGoals, extBlock);
    createListSection("Триггеры передачи человеку", "немедленный handoff при ключевых темах", "data-ext-trigger", "например: запрос возврата средств", existingTriggers, extBlock);

    const toneSection = document.createElement("div");
    toneSection.style.marginTop = "14px";
    toneSection.innerHTML = `
      <label class="f-label">Тон общения</label>
      <select class="inp" data-ext-tone style="width:100%;cursor:pointer;">
        <option value="" ${existingTone === '' ? 'selected' : ''}>— не задан —</option>
        <option value="formal" ${existingTone === 'formal' ? 'selected' : ''}>Формальный</option>
        <option value="friendly" ${existingTone === 'friendly' ? 'selected' : ''}>Дружелюбный</option>
        <option value="assertive" ${existingTone === 'assertive' ? 'selected' : ''}>Настойчивый</option>
        <option value="empathetic" ${existingTone === 'empathetic' ? 'selected' : ''}>Эмпатичный</option>
      </select>
    `;
    extBlock.appendChild(toneSection);

    const lenSection = document.createElement("div");
    lenSection.style.marginTop = "14px";
    lenSection.style.marginBottom = "10px";
    lenSection.innerHTML = `
      <label class="f-label">Макс. длина ответа <span class="muted" style="color:#64748b;font-size:12px;font-weight:normal;">(символов, 0 = без лимита)</span></label>
      <input class="inp" type="number" data-ext-len min="0" max="5000" value="${existingMaxLen || ''}" placeholder="500" style="width:100%;" />
    `;
    extBlock.appendChild(lenSection);

    actions.parentNode.insertBefore(extBlock, actions);
  }

  const observer = new MutationObserver(() => {
    injectPersonaFormFields();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectPersonaFormFields, { once: true });
  } else {
    injectPersonaFormFields();
  }
})();
