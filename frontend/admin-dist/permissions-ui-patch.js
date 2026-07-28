(function () {
  var STORAGE_KEY = 'adminHiddenElements';
  var RIGHTS = [
    { key: 'nav_chats', label: 'Скрыть раздел: Чаты' },
    { key: 'nav_monitoring', label: 'Скрыть раздел: Мониторинг' },
    { key: 'nav_settings', label: 'Скрыть раздел: Настройки' },
    { key: 'tab_iban', label: 'Скрыть вкладку: IBAN' },
    { key: 'tab_users', label: 'Скрыть вкладку: Пользователи' },
    { key: 'tab_managers', label: 'Скрыть вкладку: Менеджеры' },
    { key: 'tab_commissions', label: 'Скрыть вкладку: Комиссии' },
    { key: 'tab_leads', label: 'Скрыть вкладку: Лиды' },
    { key: 'tab_tags', label: 'Скрыть вкладку: Теги' },
    { key: 'action_delete', label: 'Скрыть кнопки удаления' },
    { key: 'action_toggle_manager', label: 'Скрыть переключатель активности менеджера' },
    { key: 'action_edit_commission', label: 'Скрыть редактирование комиссий' }
  ];

  function parseStoredRights() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch (e) {
      return [];
    }
  }

  function saveRights(arr) {
    if (!Array.isArray(arr)) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  function clearRights() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function getSelectedFromPanel() {
    var root = document.getElementById('manager-rights-panel');
    if (!root) return [];
    var selected = [];
    root.querySelectorAll('input[type="checkbox"]:checked').forEach(function (i) {
      selected.push(i.value);
    });
    return selected;
  }

  function hasUrl(url, needle) {
    if (!url) return false;
    return String(url).indexOf(needle) >= 0;
  }

  function isPost(method) {
    if (!method) return false;
    return String(method).toUpperCase() === 'POST';
  }

  function mutateUsersPayload(url, method, body) {
    if (!hasUrl(url, '/api/admin/users')) return body;
    if (!isPost(method)) return body;
    if (typeof body !== 'string') return body;

    try {
      var data = JSON.parse(body);
      if (!Array.isArray(data.hidden_elements)) {
        data.hidden_elements = getSelectedFromPanel();
      }
      return JSON.stringify(data);
    } catch (e) {
      return body;
    }
  }

  function setElementHidden(el, hidden) {
    if (!el) return;
    if (hidden) {
      el.setAttribute('data-hidden-by-rights', '1');
      el.style.setProperty('display', 'none', 'important');
      return;
    }

    if (el.getAttribute('data-hidden-by-rights') === '1') {
      el.style.removeProperty('display');
      el.removeAttribute('data-hidden-by-rights');
    }
  }

  function toggleByExactText(selector, text, hidden) {
    document.querySelectorAll(selector).forEach(function (el) {
      var v = '';
      if (typeof el.textContent === 'string') {
        v = el.textContent.trim();
      }
      if (v === text) {
        setElementHidden(el, hidden);
      }
    });
  }

  function toggleSelector(selector, hidden) {
    document.querySelectorAll(selector).forEach(function (el) {
      setElementHidden(el, hidden);
    });
  }

  function applyRights(keys) {
    if (!Array.isArray(keys)) keys = [];

    var has = function (key) {
      return keys.indexOf(key) >= 0;
    };

    toggleByExactText('a,button,span,div', 'Чаты', has('nav_chats'));
    toggleByExactText('a,button,span,div', 'Мониторинг', has('nav_monitoring'));
    toggleByExactText('a,button,span,div', 'Настройки', has('nav_settings'));

    toggleByExactText('button,span,div', 'IBAN', has('tab_iban'));
    toggleByExactText('button,span,div', 'Пользователи', has('tab_users'));
    toggleByExactText('button,span,div', 'Менеджеры', has('tab_managers'));
    toggleByExactText('button,span,div', 'Комиссии', has('tab_commissions'));
    toggleByExactText('button,span,div', 'Лиды', has('tab_leads'));
    toggleByExactText('button,span,div', 'Теги', has('tab_tags'));

    toggleSelector('.danger, .danger-btn, .ghost-btn.danger, .icon-btn.danger, .commission-delete', has('action_delete'));
    toggleSelector('.manager-toggle', has('action_toggle_manager'));
    toggleSelector('.commission-edit', has('action_edit_commission'));
  }

  function injectRightsPanel() {
    if (document.getElementById('manager-rights-panel')) return;

    var cards = Array.from(document.querySelectorAll('div'));
    var userCard = null;
    cards.forEach(function (el) {
      if (userCard) return;
      var txt = '';
      if (typeof el.textContent === 'string') txt = el.textContent;
      if (txt.indexOf('Создание пользователей') >= 0) {
        userCard = el;
      }
    });
    if (!userCard) return;

    var panel = document.createElement('div');
    panel.id = 'manager-rights-panel';
    panel.style.marginTop = '14px';
    panel.style.padding = '12px';
    panel.style.border = '1px solid rgba(255,255,255,0.12)';
    panel.style.borderRadius = '10px';
    panel.style.background = 'rgba(255,255,255,0.02)';

    var title = document.createElement('div');
    title.textContent = 'Скрыть элементы интерфейса для нового менеджера';
    title.style.fontSize = '13px';
    title.style.fontWeight = '600';
    title.style.marginBottom = '10px';
    panel.appendChild(title);

    var grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(2, minmax(240px, 1fr))';
    grid.style.gap = '8px 14px';

    RIGHTS.forEach(function (r) {
      var label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '8px';
      label.style.fontSize = '12px';
      label.style.opacity = '0.95';

      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = r.key;

      var span = document.createElement('span');
      span.textContent = r.label;

      label.appendChild(cb);
      label.appendChild(span);
      grid.appendChild(label);
    });

    panel.appendChild(grid);

    var target = userCard.querySelector('button.primary-btn');
    if (!target) target = userCard;

    if (target) {
      if (target.parentElement) {
        target.parentElement.insertBefore(panel, target);
      } else {
        userCard.appendChild(panel);
      }
    } else {
      userCard.appendChild(panel);
    }
  }

  function responseIsAuth(url) {
    if (hasUrl(url, '/api/admin/auth/login')) return true;
    if (hasUrl(url, '/api/admin/auth/me')) return true;
    return false;
  }

  function saveRightsFromAuthResponse(payload) {
    if (!payload || !payload.user) {
      clearRights();
      return;
    }

    var role = '';
    if (typeof payload.user.role === 'string') {
      role = payload.user.role.toLowerCase();
    }

    var isRestrictedRole = role === 'manager' || role === 'team_lead';
    if (!isRestrictedRole) {
      clearRights();
      return;
    }

    if (!Array.isArray(payload.user.hidden_elements)) {
      clearRights();
      return;
    }

    saveRights(payload.user.hidden_elements);
  }

  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function (input, init) {
      var url = '';
      if (typeof input === 'string') {
        url = input;
      } else {
        if (input) {
          if (input.url) {
            url = input.url;
          }
        }
      }

      var method = 'GET';
      if (init) {
        if (init.method) {
          method = init.method;
        } else {
          if (input) {
            if (input.method) {
              method = input.method;
            }
          }
        }
      } else {
        if (input) {
          if (input.method) {
            method = input.method;
          }
        }
      }

      if (init) {
        if (Object.prototype.hasOwnProperty.call(init, 'body')) {
          init.body = mutateUsersPayload(url, method, init.body);
        }
      }

      return origFetch(input, init).then(function (res) {
        if (responseIsAuth(url)) {
          res.clone().json().then(saveRightsFromAuthResponse).catch(function () {});
        }
        return res;
      });
    };
  }

  var XHR = window.XMLHttpRequest;
  if (XHR) {
    var open = XHR.prototype.open;
    var send = XHR.prototype.send;

    XHR.prototype.open = function (method, url) {
      this.__u = url;
      this.__m = method;
      return open.apply(this, arguments);
    };

    XHR.prototype.send = function (body) {
      try {
        body = mutateUsersPayload(this.__u, this.__m, body);
      } catch (e) {}

      this.addEventListener('load', function () {
        try {
          if (!responseIsAuth(this.__u)) return;
          var parsed = JSON.parse(this.responseText);
          saveRightsFromAuthResponse(parsed);
        } catch (e) {}
      });

      return send.call(this, body);
    };
  }


  function ensureEnhancementStyles() {
    if (document.getElementById('admin-enhancement-styles')) return;

    var style = document.createElement('style');
    style.id = 'admin-enhancement-styles';
    style.textContent = ''
      + '.unread-badge{background:#dc2626!important;border-color:#dc2626!important;color:#fff!important;box-shadow:0 0 0 1px rgba(220,38,38,.35),0 0 8px rgba(220,38,38,.35);}'
      + '.commission-badge{min-width:84px!important;padding:6px 14px!important;display:inline-flex!important;justify-content:center!important;}'
      + '.commission-badge-boost{border:1px solid rgba(99,102,241,.95)!important;box-shadow:0 0 0 1px rgba(99,102,241,.45),0 0 14px rgba(99,102,241,.55);animation:commissionPulse 1.35s ease-in-out infinite alternate;}'
      + '.chat-header-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;}'
      + '.chat-header-tag{display:inline-flex;align-items:center;justify-content:center;padding:2px 8px;border-radius:999px;font-size:11px;line-height:16px;border:1px solid rgba(99,102,241,.85);color:#d8ddff;background:rgba(99,102,241,.14);}'
      + '@keyframes commissionPulse{from{box-shadow:0 0 0 1px rgba(99,102,241,.25),0 0 6px rgba(99,102,241,.25);}to{box-shadow:0 0 0 1px rgba(99,102,241,.75),0 0 16px rgba(99,102,241,.75);}}';

    document.head.appendChild(style);
  }

  function applyCommissionGlow() {
    document.querySelectorAll('.commission-badge').forEach(function (el) {
      var txt = '';
      if (typeof el.textContent === 'string') txt = el.textContent.trim();
      var onlyDigits = txt.replace(/[^0-9]/g, '');
      if (onlyDigits === '') {
        el.classList.remove('commission-badge-boost');
        return;
      }
      el.classList.add('commission-badge-boost');
    });
  }

  function applyUnreadCounterStyle() {
    document.querySelectorAll('.unread-dot').forEach(function (dot) {
      dot.remove();
    });

    document.querySelectorAll('.unread-badge').forEach(function (badge) {
      var txt = '';
      if (typeof badge.textContent === 'string') txt = badge.textContent.trim();
      var n = parseInt(txt, 10);
      if (!isNaN(n) && n > 0) {
        badge.style.setProperty('background', '#dc2626', 'important');
        badge.style.setProperty('border-color', '#dc2626', 'important');
        badge.style.setProperty('color', '#ffffff', 'important');
      }
    });
  }

  function cleanupPhoneRow() {
    document.querySelectorAll('div,span,p,strong,b').forEach(function (el) {
      var t = '';
      if (typeof el.textContent === 'string') t = el.textContent.trim();
      if (t !== 'Телефон:') return;

      var row = el.closest('div');
      if (!row) return;
      if (row.getAttribute('data-phone-row-hidden') === '1') return;
      row.setAttribute('data-phone-row-hidden', '1');
      row.style.setProperty('display', 'none', 'important');
    });
  }

  function collectTagsFromLeadInfo() {
    var label = null;
    document.querySelectorAll('div,span,p,strong,b').forEach(function (el) {
      if (label) return;
      var t = '';
      if (typeof el.textContent === 'string') t = el.textContent.trim();
      if (t === 'Теги') label = el;
    });
    if (!label) return [];

    var scope = label.closest('aside,section,div') || document.body;
    var deny = {
      'Теги': true,
      'Заметки': true,
      'Уровень': true,
      'Уровень комиссии': true,
      'Информация о лиде': true
    };

    var out = [];
    scope.querySelectorAll('button,span,div,a').forEach(function (el) {
      var t = '';
      if (typeof el.textContent === 'string') t = el.textContent.trim();
      if (!t) return;
      if (t.length > 20) return;
      if (deny[t]) return;
      if (/^Уровень\s*\d+$/i.test(t)) return;
      if (!/^[A-Za-zА-Яа-я0-9_-]{1,20}$/.test(t)) return;
      if (out.indexOf(t) >= 0) return;
      out.push(t);
    });

    return out.slice(0, 8);
  }

  function findLeadName() {
    var label = null;
    document.querySelectorAll('div,span,p,strong,b').forEach(function (el) {
      if (label) return;
      var t = '';
      if (typeof el.textContent === 'string') t = el.textContent.trim();
      if (t === 'Имя:') label = el;
    });
    if (!label) return '';

    var row = label.closest('div');
    if (!row) return '';

    var cand = '';
    row.querySelectorAll('div,span,p,strong,b').forEach(function (el) {
      var t = '';
      if (typeof el.textContent === 'string') t = el.textContent.trim();
      if (!t || t === 'Имя:') return;
      if (t.length < 2) return;
      cand = t;
    });
    return cand;
  }

  function applyHeaderTags() {
    var tags = collectTagsFromLeadInfo();
    var name = findLeadName();
    if (!name) return;

    var nameEl = null;
    document.querySelectorAll('div,span,h1,h2,h3,h4').forEach(function (el) {
      if (nameEl) return;
      var t = '';
      if (typeof el.textContent === 'string') t = el.textContent.trim();
      if (t !== name) return;

      var r = el.getBoundingClientRect();
      if (r.top > 220) return;
      if (r.left < 220) return;
      if (r.right > window.innerWidth - 260) return;
      nameEl = el;
    });
    if (!nameEl) return;

    var host = nameEl.parentElement || nameEl;
    var box = host.querySelector('#chat-header-tags-patch');
    if (!box) {
      box = document.createElement('div');
      box.id = 'chat-header-tags-patch';
      box.className = 'chat-header-tags';
      host.appendChild(box);
    }

    box.innerHTML = '';
    tags.forEach(function (tag) {
      var el = document.createElement('span');
      el.className = 'chat-header-tag';
      el.textContent = tag;
      box.appendChild(el);
    });
  }

  setInterval(function () {
    ensureEnhancementStyles();
    applyCommissionGlow();
    applyUnreadCounterStyle();
    cleanupPhoneRow();
    applyHeaderTags();
  }, 1000);

  setInterval(function () {
    injectRightsPanel();
    applyRights(parseStoredRights());
  }, 1200);
})();
