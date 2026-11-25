/* ==========================================================================
   BUTTER NOTE («Нота Масла») — Интерактив, Цены, Модалки, Квиз, Калькулятор
   Работает и при двойном клике (file://), и на сервере (http://)
   ========================================================================== */
(function () {
  'use strict';

  var STORAGE_PRICES_KEY = 'butterNoteCustomPrices';
  var STORAGE_COOKIE_KEY = 'butterNoteCookieConsent';

  /* ------------------------------------------------------------------------
     1. ЦЕНЫ ИЗ prices-config.js + ВИЗУАЛЬНЫЙ РЕДАКТОР (?edit-prices=1 / Alt+P)
     ------------------------------------------------------------------------ */
  function getEffectivePrices() {
    var base = window.BUTTER_NOTE_PRICES || {};
    var clone = {};
    Object.keys(base).forEach(function (k) {
      clone[k] = Object.assign({}, base[k]);
    });
    try {
      var saved = localStorage.getItem(STORAGE_PRICES_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        Object.keys(parsed).forEach(function (k) {
          if (clone[k] && !isNaN(Number(parsed[k]))) {
            clone[k].value = Number(parsed[k]);
          }
        });
      }
    } catch (e) {
      // Ignore storage errors
    }
    return clone;
  }

  function formatPriceNumber(num) {
    return String(Math.round(Number(num) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  }

  function renderAllPrices() {
    var prices = getEffectivePrices();
    var nodes = document.querySelectorAll('[data-price]');
    nodes.forEach(function (el) {
      var key = el.getAttribute('data-price');
      if (!prices[key]) return;
      var item = prices[key];
      var includeUnit = el.getAttribute('data-price-unit') === 'true';
      var text = formatPriceNumber(item.value) + (item.suffix || '');
      if (includeUnit && item.unit) {
        text += ' ' + item.unit;
      }
      el.textContent = text;
    });
    if (typeof window.butterNoteUpdateCalculator === 'function') {
      window.butterNoteUpdateCalculator();
    }
  }

  function buildConfigFileText(prices) {
    var lines = [
      '/* BUTTER NOTE («Нота Масла») — ЕДИНЫЙ ФАЙЛ ЦЕН */',
      'window.BUTTER_NOTE_PRICES = {'
    ];
    var keys = Object.keys(prices);
    keys.forEach(function (key, idx) {
      var p = prices[key];
      lines.push('  ' + key + ': {');
      lines.push('    value: ' + Number(p.value) + ',');
      lines.push('    suffix: ' + JSON.stringify(p.suffix || '') + ',');
      lines.push('    unit: ' + JSON.stringify(p.unit || '') + ',');
      lines.push('    label: ' + JSON.stringify(p.label || key));
      lines.push('  }' + (idx < keys.length - 1 ? ',' : ''));
    });
    lines.push('};');
    return lines.join('\n');
  }

  function openPriceEditor() {
    if (document.getElementById('priceEditorDrawer')) return;
    document.body.classList.add('price-editor-active');

    var prices = getEffectivePrices();
    var drawer = document.createElement('aside');
    drawer.id = 'priceEditorDrawer';
    drawer.className = 'price-editor-drawer';
    drawer.setAttribute('aria-label', 'Редактор цен Butter Note');

    var html = [
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">',
      '  <strong style="font-family:var(--font-display);font-size:1.15rem;">Редактор цен</strong>',
      '  <button type="button" id="closePriceEditor" class="btn btn--sm btn--outline" style="padding:4px 10px;">✕</button>',
      '</div>',
      '<p style="margin:0 0 12px;color:var(--ink-muted);font-size:0.9rem;">Все подсвеченные цены на сайте обновляются мгновенно. Для сохранения навсегда скачайте файл и замените им <code>js/prices-config.js</code>.</p>',
      '<div id="priceEditorFields"></div>',
      '<div style="display:grid;gap:8px;margin-top:14px;">',
      '  <button type="button" id="downloadPriceConfig" class="btn btn--primary btn--sm">Скачать prices-config.js</button>',
      '  <button type="button" id="resetPriceOverrides" class="btn btn--outline btn--sm">Сбросить к исходным</button>',
      '</div>'
    ].join('');
    drawer.innerHTML = html;
    document.body.appendChild(drawer);

    var fieldsWrap = document.getElementById('priceEditorFields');
    Object.keys(prices).forEach(function (key) {
      var item = prices[key];
      var row = document.createElement('div');
      row.className = 'price-editor-row';

      var lbl = document.createElement('label');
      lbl.textContent = item.label || key;
      lbl.setAttribute('for', 'pe-' + key);

      var inp = document.createElement('input');
      inp.type = 'number';
      inp.min = '0';
      inp.step = '10';
      inp.id = 'pe-' + key;
      inp.className = 'input';
      inp.style.padding = '8px 10px';
      inp.value = item.value;

      inp.addEventListener('input', function () {
        var overrides = {};
        try {
          overrides = JSON.parse(localStorage.getItem(STORAGE_PRICES_KEY) || '{}');
        } catch (e) {
          overrides = {};
        }
        overrides[key] = Number(inp.value) || 0;
        localStorage.setItem(STORAGE_PRICES_KEY, JSON.stringify(overrides));
        renderAllPrices();
      });

      row.appendChild(lbl);
      row.appendChild(inp);
      fieldsWrap.appendChild(row);
    });

    document.getElementById('closePriceEditor').addEventListener('click', function () {
      document.body.classList.remove('price-editor-active');
      drawer.remove();
    });

    document.getElementById('resetPriceOverrides').addEventListener('click', function () {
      localStorage.removeItem(STORAGE_PRICES_KEY);
      drawer.remove();
      document.body.classList.remove('price-editor-active');
      renderAllPrices();
      openPriceEditor();
    });

    document.getElementById('downloadPriceConfig').addEventListener('click', function () {
      var current = getEffectivePrices();
      var blob = new Blob([buildConfigFileText(current)], { type: 'application/javascript;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'prices-config.js';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  function initPriceEditorTriggers() {
    if (window.location.search.indexOf('edit-prices=1') !== -1) {
      openPriceEditor();
    }
    document.addEventListener('keydown', function (e) {
      if (e.altKey && (e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З')) {
        e.preventDefault();
        var existing = document.getElementById('priceEditorDrawer');
        if (existing) {
          existing.remove();
          document.body.classList.remove('price-editor-active');
        } else {
          openPriceEditor();
        }
      }
    });
  }

  /* ------------------------------------------------------------------------
     2. МОБИЛЬНОЕ МЕНЮ
     ------------------------------------------------------------------------ */
  function initMobileNav() {
    var burger = document.getElementById('burgerBtn');
    var drawer = document.getElementById('mobileNav');
    if (!burger || !drawer) return;

    burger.addEventListener('click', function () {
      var expanded = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!expanded));
      drawer.classList.toggle('is-open', !expanded);
    });
  }

  /* ------------------------------------------------------------------------
     3. COOKIE-БАННЕР (Обязательные + необязательные cookies)
     ------------------------------------------------------------------------ */
  function initCookieBanner() {
    var banner = document.getElementById('cookieBanner');
    if (!banner) return;

    try {
      if (localStorage.getItem(STORAGE_COOKIE_KEY)) {
        banner.hidden = true;
        return;
      }
    } catch (e) {}

    banner.hidden = false;

    var acceptAll = document.getElementById('cookieAcceptAll');
    var saveChoice = document.getElementById('cookieSaveChoice');
    var analyticsToggle = document.getElementById('cookieAnalyticsToggle');

    function saveAndClose(analyticsEnabled) {
      try {
        localStorage.setItem(
          STORAGE_COOKIE_KEY,
          JSON.stringify({ necessary: true, analytics: Boolean(analyticsEnabled), date: new Date().toISOString() })
        );
      } catch (e) {}
      banner.hidden = true;
    }

    if (acceptAll) {
      acceptAll.addEventListener('click', function () {
        saveAndClose(true);
      });
    }
    if (saveChoice) {
      saveChoice.addEventListener('click', function () {
        saveAndClose(analyticsToggle ? analyticsToggle.checked : false);
      });
    }
  }

  /* ------------------------------------------------------------------------
     4. МОДАЛЬНОЕ ОКНО ЗАПИСИ (работает на всех страницах)
     ------------------------------------------------------------------------ */
  function initBookingModal() {
    var modal = document.getElementById('bookingModal');
    if (!modal) return;

    var form = document.getElementById('bookingForm');
    var statusEl = document.getElementById('bookingStatus');
    var formatSelect = document.getElementById('bookingFormat');
    var noteInput = document.getElementById('bookingNote');
    var closeBtn = document.getElementById('bookingModalClose');

    function openModal(presetFormat, presetNote) {
      if (formatSelect && presetFormat) {
        for (var i = 0; i < formatSelect.options.length; i++) {
          if (formatSelect.options[i].value === presetFormat) {
            formatSelect.selectedIndex = i;
            break;
          }
        }
      }
      if (noteInput && presetNote) {
        noteInput.value = presetNote;
      }
      if (statusEl) {
        statusEl.hidden = true;
        statusEl.textContent = '';
      }
      if (form) form.hidden = false;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }

    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-open-booking]');
      if (!trigger) return;
      e.preventDefault();
      openModal(trigger.getAttribute('data-booking-format'), trigger.getAttribute('data-booking-note'));
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = (document.getElementById('bookingName').value || '').trim();
        var contact = (document.getElementById('bookingContact').value || '').trim();
        var chosen = formatSelect ? formatSelect.options[formatSelect.selectedIndex].text : 'Мастер-класс';
        if (!name || !contact) return;

        form.hidden = true;
        if (statusEl) {
          statusEl.hidden = false;
          statusEl.className = 'status-box';
          statusEl.innerHTML =
            '<strong>Заявка принята!</strong> Спасибо, ' +
            escapeHtml(name) +
            '. Мы зафиксировали выбор «' +
            escapeHtml(chosen) +
            '» и свяжемся по контакту <strong>' +
            escapeHtml(contact) +
            '</strong> в течение 2 часов, чтобы подтвердить удобное время и уточнить предпочтения по ароматам.';
        }
      });
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ------------------------------------------------------------------------
     5. ЛИД-МАГНИТ И МИНИ-КВИЗ (Главная страница)
     ------------------------------------------------------------------------ */
  function initLeadMagnetAndQuiz() {
    var lmForm = document.getElementById('leadMagnetForm');
    var lmModal = document.getElementById('guideModal');
    var lmClose = document.getElementById('guideModalClose');
    var lmDownload = document.getElementById('downloadGuideTextBtn');

    if (lmForm && lmModal) {
      lmForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var userName = (document.getElementById('leadName').value || 'гость').trim();
        var greetingEl = document.getElementById('guideGreeting');
        if (greetingEl) {
          greetingEl.textContent = userName + ', твой персональный гид Butter Note уже открыт!';
        }
        lmModal.classList.add('is-open');
        lmModal.setAttribute('aria-hidden', 'false');
      });

      if (lmClose) {
        lmClose.addEventListener('click', function () {
          lmModal.classList.remove('is-open');
          lmModal.setAttribute('aria-hidden', 'true');
        });
      }
      lmModal.addEventListener('click', function (e) {
        if (e.target === lmModal) {
          lmModal.classList.remove('is-open');
          lmModal.setAttribute('aria-hidden', 'true');
        }
      });
    }

    if (lmDownload) {
      lmDownload.addEventListener('click', function () {
        var guideText = [
          'BUTTER NOTE («Нота Масла») — ГИД: КАК ПОДОБРАТЬ АРОМАТ ДЛЯ КАЖДОЙ КОМНАТЫ',
          '==========================================================================',
          '1. ПРИХОЖАЯ: малина, бергамот, кедр — 5-6 палочек (встречает с порога).',
          '2. ГОСТИНАЯ: корица, ваниль, сливочное масло — 5 палочек (атмосфера тепла).',
          '3. СПАЛЬНЯ: голубая гортензия, миндальное молоко, белый мускус — 3-4 палочки.',
          '4. РАБОЧИЙ СТОЛ: утренняя роса, лист смородины, минеральные ноты — 3 палочки.',
          '5. ВАННАЯ: эвкалипт, антуриум, светлое дерево — 4 палочки.',
          '',
          '5 СОЧЕТАНИЙ МАСЕЛ ДЛЯ УЮТА:',
          '- «Ягодный вечер»: черника + малина + лист смородины',
          '- «Корица и дым»: цейлонская корица + стручок ванили + сандал',
          '- «Голубая гортензия»: гортензия + антуриум + белый мускус',
          '- «Сливочная тишина»: сливочное масло + бобы тонка + кедр',
          '- «Утро в Петербурге»: бергамот + влажный камень + шалфей',
          '',
          'Ждём тебя на мастер-классе в СПб! Сайт: Butter Note («Нота Масла»)'
        ].join('\n');
        var blob = new Blob([guideText], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'butter-note-aroma-guide.txt';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
    }

    // Mini-quiz
    var quizContainer = document.getElementById('aromaQuiz');
    if (quizContainer) {
      var answers = {};
      var resultBox = document.getElementById('quizResult');
      var collections = {
        berry: {
          title: 'Твой ароматический тип — «Ягодный вечер»',
          desc: 'Сочная черника, спелая малина, ежевика и свежий лист смородины. Яркий, тёплый и жизнерадостный шлейф для гостиной или кухни.',
          line: 'Тематический МК «Ягодный вечер»'
        },
        spice: {
          title: 'Твой ароматический тип — «Корица и дым»',
          desc: 'Цейлонская корица, стручки ванили, бархатный дым и сандал. Идеально для осенне-зимних вечеров с пледом и книгой.',
          line: 'Тематический МК «Корица и дым»'
        },
        floral: {
          title: 'Твой ароматический тип — «Голубая гортензия»',
          desc: 'Прохладная гортензия, аккорд антуриума, утренняя роса и чистый белый мускус. Воздушная эстетика для спальни и кабинета.',
          line: 'Тематический МК «Голубая гортензия»'
        },
        cream: {
          title: 'Твой ароматический тип — «Сливочная тишина»',
          desc: 'Мягкая гурманская база из сливочного масла, бобов тонка, миндального молока и светлого кедра. Аромат абсолютного спокойствия.',
          line: 'Тематический МК «Сливочная тишина»'
        }
      };

      quizContainer.addEventListener('click', function (e) {
        var btn = e.target.closest('.quiz-option-btn');
        if (!btn) return;
        var q = btn.getAttribute('data-q');
        var val = btn.getAttribute('data-val');
        answers[q] = val;

        var siblings = quizContainer.querySelectorAll('.quiz-option-btn[data-q="' + q + '"]');
        siblings.forEach(function (s) {
          s.classList.remove('is-selected');
        });
        btn.classList.add('is-selected');

        if (answers.q1 && answers.q2 && answers.q3 && resultBox) {
          var tally = { berry: 0, spice: 0, floral: 0, cream: 0 };
          [answers.q1, answers.q2, answers.q3].forEach(function (k) {
            if (tally[k] !== undefined) tally[k] += 1;
          });
          var bestKey = answers.q1;
          Object.keys(tally).forEach(function (k) {
            if (tally[k] > tally[bestKey]) bestKey = k;
          });
          var col = collections[bestKey];
          resultBox.hidden = false;
          resultBox.innerHTML =
            '<h4>' +
            col.title +
            '</h4><p style="margin-bottom:14px;">' +
            col.desc +
            '</p><button type="button" class="btn btn--cream btn--sm" data-open-booking data-booking-format="group_mk" data-booking-note="' +
            escapeHtml(col.line) +
            '">Собрать этот аромат на МК</button>';
        }
      });
    }
  }

  /* ------------------------------------------------------------------------
     6. ФИЛЬТР АФИШИ (Мастер-классы)
     ------------------------------------------------------------------------ */
  function initScheduleFilter() {
    var wrap = document.getElementById('scheduleFilters');
    var rows = document.querySelectorAll('.schedule-row[data-category]');
    if (!wrap || !rows.length) return;

    wrap.addEventListener('click', function (e) {
      var pill = e.target.closest('.filter-pill');
      if (!pill) return;
      var cat = pill.getAttribute('data-filter');

      wrap.querySelectorAll('.filter-pill').forEach(function (p) {
        p.classList.remove('is-active');
      });
      pill.classList.add('is-active');

      rows.forEach(function (row) {
        var rowCat = row.getAttribute('data-category');
        row.style.display = cat === 'all' || rowCat.indexOf(cat) !== -1 ? '' : 'none';
      });
    });
  }

  /* ------------------------------------------------------------------------
     7. ИНТЕРАКТИВНАЯ ПИРАМИДА (Инфографика на странице Гида)
     ------------------------------------------------------------------------ */
  function initInfographicPyramid() {
    var box = document.getElementById('pyramidTierDetails');
    var triggers = document.querySelectorAll('[data-pyramid-tier]');
    if (!box || !triggers.length) return;

    var tiers = {
      top: {
        title: 'Верхние ноты — 20% композиции (первые 15–30 минут)',
        text: 'Первое впечатление, когда ты заходишь в комнату. Лёгкие летучие молекулы: спелая малина, черника, бергамот, утренняя роса.'
      },
      heart: {
        title: 'Сердечные ноты — 50% композиции (основное звучание 2–4 часа)',
        text: 'Характер и душа аромата. Именно здесь встречаются голубая гортензия, глянцевый антуриум, цейлонская корица и лист смородины.'
      },
      base: {
        title: 'Базовые ноты — 30% композиции (шлейф и стойкость до 3–4 месяцев)',
        text: 'Фундамент, который удерживает формулу во флаконе 100 мл: сливочное масло, стручковая ваниль, бобы тонка, сандал и светлый кедр.'
      }
    };

    triggers.forEach(function (el) {
      el.addEventListener('click', function () {
        var key = el.getAttribute('data-pyramid-tier');
        if (!tiers[key]) return;
        box.innerHTML = '<strong>' + tiers[key].title + '</strong><p style="margin:6px 0 0;">' + tiers[key].text + '</p>';
      });
    });
  }

  /* ------------------------------------------------------------------------
     8. КАЛЬКУЛЯТОР СОБЫТИЙ И ПОДАРКОВ (Страница «Подарки и события»)
     ------------------------------------------------------------------------ */
  function initEventCalculator() {
    var calcType = document.getElementById('calcEventType');
    var calcGuests = document.getElementById('calcGuests');
    var calcGuestsVal = document.getElementById('calcGuestsVal');
    var calcOutskirts = document.getElementById('calcOutskirts');
    var calcTotalEl = document.getElementById('calcTotal');
    var calcBreakdownEl = document.getElementById('calcBreakdown');
    var calcCta = document.getElementById('calcBookBtn');

    if (!calcType || !calcGuests || !calcTotalEl) return;

    function updateCalculator() {
      var prices = getEffectivePrices();
      var type = calcType.value;
      var guests = Number(calcGuests.value) || 1;
      if (calcGuestsVal) calcGuestsVal.textContent = guests + ' чел.';

      var unitPrice = prices.group_mk ? prices.group_mk.value : 3900;
      var label = 'Групповой или девичник';
      var total = 0;

      if (type === 'corp') {
        unitPrice = prices.corp_from ? prices.corp_from.value : 3500;
        label = 'Выездной корпоратив / тимбилдинг';
        total = unitPrice * guests;
      } else if (type === 'diy') {
        unitPrice = prices.diy_box ? prices.diy_box.value : 2900;
        label = 'Наборы «Сделай сам»';
        total = unitPrice * guests;
      } else if (type === 'cert') {
        unitPrice = prices.cert_from ? prices.cert_from.value : 3900;
        label = 'Подарочные сертификаты';
        total = unitPrice * guests;
      } else {
        total = unitPrice * guests;
      }

      if (calcOutskirts && calcOutskirts.checked) {
        total += 2500;
      }

      calcTotalEl.textContent = formatPriceNumber(total) + ' ₽';
      if (calcBreakdownEl) {
        calcBreakdownEl.textContent =
          label +
          ' · ' +
          guests +
          ' × ' +
          formatPriceNumber(unitPrice) +
          ' ₽' +
          (calcOutskirts && calcOutskirts.checked ? ' + 2 500 ₽ выезд по ЛО' : '');
      }
      if (calcCta) {
        calcCta.setAttribute(
          'data-booking-note',
          label + ', участников/штук: ' + guests + ', расчёт: ' + formatPriceNumber(total) + ' ₽'
        );
      }
    }

    window.butterNoteUpdateCalculator = updateCalculator;
    calcType.addEventListener('change', updateCalculator);
    calcGuests.addEventListener('input', updateCalculator);
    if (calcOutskirts) calcOutskirts.addEventListener('change', updateCalculator);
    updateCalculator();
  }

  /* ------------------------------------------------------------------------
     9. ФОРМА ОБРАТНОЙ СВЯЗИ (Страница «О студии»)
     ------------------------------------------------------------------------ */
  function initContactForm() {
    var form = document.getElementById('contactForm');
    var status = document.getElementById('contactStatus');
    if (!form || !status) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = (document.getElementById('contactName').value || '').trim();
      var topic = document.getElementById('contactTopic').value;
      if (!name) return;

      status.hidden = false;
      status.className = 'status-box';
      status.innerHTML =
        '<strong>Сообщение отправлено!</strong> Спасибо, ' +
        escapeHtml(name) +
        '. Мы получили обращение по теме «' +
        escapeHtml(topic) +
        '» и ответим в рабочее время (11:00–21:00).';
      form.reset();
    });
  }

  /* ------------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    renderAllPrices();
    initPriceEditorTriggers();
    initMobileNav();
    initCookieBanner();
    initBookingModal();
    initLeadMagnetAndQuiz();
    initScheduleFilter();
    initInfographicPyramid();
    initEventCalculator();
    initContactForm();
  });
})();
