(function () {
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

  function hasUrl(url, needle) {
    if (!url) return false;
    return String(url).indexOf(needle) >= 0;
  }

  function isPost(method) {
    if (!method) return false;
    return String(method).toUpperCase() === 'POST';
  }

  function getPanelRoot() {
    return document.getElementById('manager-rights-panel');
  }

  function getSelectedFromPanel() {
    var root = getPanelRoot();
    if (!root) return [];
    var selected = [];
    root.querySelectorAll('input[type="checkbox"]:checked').forEach(function (i) {
      selected.push(i.value);
    });
    return selected;
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

  function injectPanel() {
    if (getPanelRoot()) return;

    var cards = Array.from(document.querySelectorAll('div'));
    var userCard = null;
    cards.forEach(function (el) {
      if (userCard) return;
      var txt = typeof el.textContent === 'string' ? el.textContent : '';
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
    title.textContent = 'Права для нового менеджера';
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

    if (target && target.parentElement) {
      target.parentElement.insertBefore(panel, target);
    } else {
      userCard.appendChild(panel);
    }
  }

  function patchFetch() {
    var origFetch = window.fetch;
    if (!origFetch) return;

    window.fetch = function (input, init) {
      var url = '';
      if (typeof input === 'string') url = input;
      else if (input && input.url) url = input.url;

      var method = 'GET';
      if (init && init.method) method = init.method;
      else if (input && input.method) method = input.method;

      if (init && Object.prototype.hasOwnProperty.call(init, 'body')) {
        init.body = mutateUsersPayload(url, method, init.body);
      }

      return origFetch(input, init);
    };
  }

  function patchXHR() {
    var XHR = window.XMLHttpRequest;
    if (!XHR) return;

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
      return send.call(this, body);
    };
  }

  patchFetch();
  patchXHR();

  var obs = new MutationObserver(function () {
    injectPanel();
  });

  function start() {
    injectPanel();
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
