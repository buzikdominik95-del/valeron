(function () {
  var TOKEN_KEY = 'token';
  var SESSION_TOKEN_KEY = '__admin_tab_token';
  var EMAIL_STATUS = Object.create(null);

  function normalize(value) {
    if (value === null) return '';
    if (value === undefined) return '';
    return String(value).trim().toLowerCase();
  }

  function getToken() {
    try {
      var token = '';

      if (window.localStorage) {
        var fromLocal = window.localStorage.getItem(TOKEN_KEY);
        if (typeof fromLocal === 'string') {
          if (fromLocal !== '') {
            token = fromLocal;
          }
        }
      }

      if (token === '') {
        if (window.sessionStorage) {
          var fromSession = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
          if (typeof fromSession === 'string') {
            if (fromSession !== '') {
              token = fromSession;
            }
          }
        }
      }

      return token;
    } catch (e) {
      return '';
    }
  }

  function isUploaded(user) {
    if (!user) return false;

    var status = normalize(user.documents_status);

    if (status === 'verified') return true;
    if (status === 'uploaded') return true;
    if (status === 'accepted') return true;
    if (status === 'profile_filled') return true;

    var hasType = false;
    var hasNumber = false;

    if (normalize(user.document_type) !== '') {
      hasType = true;
    }
    if (normalize(user.document_number) !== '') {
      hasNumber = true;
    }

    if (hasType) {
      if (hasNumber) {
        return true;
      }
    }

    return false;
  }

  function ensureStyles() {
    if (document.getElementById('doc-upload-live-styles')) return;

    var style = document.createElement('style');
    style.id = 'doc-upload-live-styles';
    style.textContent = ''
      + '.doc-upload-live-badge{display:inline-flex;align-items:center;margin-left:8px;padding:2px 8px;border-radius:999px;font-size:11px;line-height:16px;font-weight:700;color:#15803d;background:rgba(22,163,74,.12);border:1px solid rgba(22,163,74,.45);}'
      + '.doc-status-live-green{color:#15803d!important;font-weight:700!important;}';

    document.head.appendChild(style);
  }

  function upsertBadge(host, email) {
    if (!host) return;

    var selector = '.doc-upload-live-badge[data-doc-email="' + email + '"]';
    var badge = host.querySelector(selector);

    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'doc-upload-live-badge';
      badge.setAttribute('data-doc-email', email);
      badge.textContent = 'Документ загружен';
      host.appendChild(badge);
    }
  }

  function markStatusTextsGreen() {
    var statusWords = {
      'verified': true,
      'uploaded': true,
      'accepted': true,
      'profile_filled': true,
      'document uploaded': true,
      'документ загружен': true
    };

    document.querySelectorAll('td,span,div,p,strong,b').forEach(function (el) {
      var text = normalize(el.textContent);
      if (!text) return;
      if (!statusWords[text]) return;

      if (text !== 'документ загружен') {
        el.textContent = 'Документ загружен';
      }
      el.classList.add('doc-status-live-green');
    });
  }

  function applyBadges() {
    ensureStyles();
    markStatusTextsGreen();

    var keys = Object.keys(EMAIL_STATUS);
    if (keys.length === 0) return;

    document.querySelectorAll('td,span,div,p,a,strong,b').forEach(function (el) {
      var text = normalize(el.textContent);
      if (!text) return;
      if (!EMAIL_STATUS[text]) return;

      var host = el.closest('tr, .chat-item, .user-item, .lead-item, .card, li, article, section, div');
      if (!host) {
        host = el.parentElement;
      }
      if (!host) return;

      upsertBadge(host, text);
    });
  }

  function refreshStatuses() {
    var headers = {};
    var token = getToken();
    if (token !== '') {
      headers.Authorization = 'Bearer ' + token;
    }

    window.fetch('/api/admin/users-monitoring?live=1&t=' + Date.now(), {
      method: 'GET',
      credentials: 'include',
      headers: headers
    })
      .then(function (res) {
        if (!res) {
          throw new Error('monitoring no response');
        }
        if (!res.ok) {
          throw new Error('monitoring status ' + res.status);
        }
        return res.json();
      })
      .then(function (payload) {
        var next = Object.create(null);
        var users = [];

        if (payload) {
          if (Array.isArray(payload.users)) {
            users = payload.users;
          }
        }

        users.forEach(function (user) {
          if (!user) return;
          var email = normalize(user.email);
          if (!email) return;
          next[email] = isUploaded(user);
        });

        EMAIL_STATUS = next;
        applyBadges();
      })
      .catch(function () {
      });
  }

  setTimeout(refreshStatuses, 900);
  setInterval(refreshStatuses, 5000);
  setInterval(applyBadges, 1300);
})();
