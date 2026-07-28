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
      + '.unread-dot{display:inline-block;width:8px;height:8px;border-radius:999px;background:#ef4444;box-shadow:0 0 0 1px rgba(239,68,68,.35),0 0 8px rgba(239,68,68,.75);margin-left:8px;vertical-align:middle;}'
      + '.commission-badge-boost{border:1px solid rgba(99,102,241,.9)!important;box-shadow:0 0 0 1px rgba(99,102,241,.35),0 0 12px rgba(99,102,241,.45);animation:commissionPulse 1.35s ease-in-out infinite alternate;}'
      + '@keyframes commissionPulse{from{box-shadow:0 0 0 1px rgba(99,102,241,.25),0 0 6px rgba(99,102,241,.25);}to{box-shadow:0 0 0 1px rgba(99,102,241,.65),0 0 14px rgba(99,102,241,.65);}}';

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
      if (onlyDigits !== '1') {
        el.classList.add('commission-badge-boost');
      } else {
        el.classList.remove('commission-badge-boost');
      }
    });
  }

  function applyUnreadDotInChatList() {
    var list = document.querySelectorAll('[class*=chat], .chat-item, li, .conversation-item');
    list.forEach(function (row) {
      var badge = row.querySelector('.unread-badge');
      var dot = row.querySelector('.unread-dot');
      if (!badge) {
        if (dot) {
          dot.remove();
        }
        return;
      }

      var n = 0;
      var txt = '';
      if (typeof badge.textContent === 'string') txt = badge.textContent.trim();
      if (txt !== '') {
        var parsed = parseInt(txt, 10);
        if (!isNaN(parsed)) n = parsed;
      }

      if (n > 0) {
        if (!dot) {
          dot = document.createElement('span');
          dot.className = 'unread-dot';
          badge.parentElement.appendChild(dot);
        }
      } else {
        if (dot) {
          dot.remove();
        }
      }
    });
  }

  setInterval(function () {
    ensureEnhancementStyles();
    applyCommissionGlow();
    applyUnreadDotInChatList();
  }, 1000);

  setInterval(function () {
    injectRightsPanel();
    applyRights(parseStoredRights());
  }, 1200);
})();
