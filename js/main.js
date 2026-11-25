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

      rows.forEach(function (row, idx) {
        var rowCat = row.getAttribute('data-category');
        var show = cat === 'all' || rowCat.indexOf(cat) !== -1;
        row.classList.remove('is-filtering');
        row.style.display = show ? '' : 'none';
        if (show) {
          void row.offsetWidth;
          row.style.animationDelay = (idx * 55) + 'ms';
          row.classList.add('is-filtering');
        }
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
        triggers.forEach(function (t) {
          t.classList.remove('is-active');
        });
        el.classList.add('is-active');
        box.classList.add('is-switching');
        window.setTimeout(function () {
          box.innerHTML = '<strong>' + tiers[key].title + '</strong><p style="margin:6px 0 0;">' + tiers[key].text + '</p>';
          box.classList.remove('is-switching');
        }, 140);
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

    var lastRenderedTotal = null;
    var calcTweenRaf = null;

    function tweenCalcTotal(targetTotal) {
      if (lastRenderedTotal === null) {
        lastRenderedTotal = targetTotal;
        calcTotalEl.textContent = formatPriceNumber(targetTotal) + ' ₽';
        return;
      }
      var startVal = lastRenderedTotal;
      if (startVal === targetTotal) return;
      if (calcTweenRaf) cancelAnimationFrame(calcTweenRaf);
      calcTotalEl.classList.remove('is-updating');
      void calcTotalEl.offsetWidth;
      calcTotalEl.classList.add('is-updating');
      var startTime = performance.now();
      var duration = 280;

      function step(now) {
        var p = Math.min((now - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var current = Math.round(startVal + (targetTotal - startVal) * eased);
        calcTotalEl.textContent = formatPriceNumber(current) + ' ₽';
        if (p < 1) {
          calcTweenRaf = requestAnimationFrame(step);
        } else {
          lastRenderedTotal = targetTotal;
        }
      }
      calcTweenRaf = requestAnimationFrame(step);
    }

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

      tweenCalcTotal(total);
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
     10. МОУШН-ДИЗАЙН (ПРОБНАЯ ВЕРСИЯ /motion/)
     ------------------------------------------------------------------------ */
  function isReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function initScrollProgress() {
    var bar = document.getElementById('scrollProgress');
    if (!bar) return;
    var ticking = false;

    function updateProgress() {
      ticking = false;
      var doc = document.documentElement;
      var scrollTop = window.scrollY || doc.scrollTop || 0;
      var maxScroll = Math.max(doc.scrollHeight - window.innerHeight, 1);
      var ratio = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
      bar.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateProgress);
      }
    }, { passive: true });
    updateProgress();
  }

  function initScrollReveal() {
    if (isReducedMotion()) return;
    document.documentElement.classList.add('motion-ready');

    var selectors = [
      '.section-head',
      '.card',
      '.hero-fact',
      '.schedule-row',
      '.lead-magnet-box',
      '.tripwire-banner',
      '.infographic-poster',
      '.calc-card',
      '.faq-item',
      '.social-pill'
    ];
    var targets = Array.prototype.slice.call(document.querySelectorAll(selectors.join(',')));
    if (!targets.length) return;

    targets.forEach(function (el) {
      el.setAttribute('data-reveal', '');
      var parent = el.parentElement;
      if (parent) {
        var sameSiblings = Array.prototype.filter.call(parent.children, function (c) {
          return c.matches && c.matches(selectors.join(','));
        });
        var pos = sameSiblings.indexOf(el);
        if (pos > 0) {
          el.style.setProperty('--reveal-delay', ((pos % 4) * 85) + 'ms');
        }
      }
    });

    function revealVisibleNow() {
      var vh = window.innerHeight || 800;
      targets.forEach(function (el) {
        if (el.classList.contains('is-revealed')) return;
        var rect = el.getBoundingClientRect();
        if (rect.top < vh - 20) {
          el.classList.add('is-revealed');
        }
      });
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

      targets.forEach(function (el) {
        io.observe(el);
      });
    } else {
      targets.forEach(function (el) {
        el.classList.add('is-revealed');
      });
    }

    revealVisibleNow();
    window.addEventListener('scroll', revealVisibleNow, { passive: true });
    window.setTimeout(revealVisibleNow, 400);
  }

  function initHeroParallax() {
    if (isReducedMotion()) return;
    var heroImg = document.querySelector('.hero-visual .arch-frame img');
    if (!heroImg) return;
    var ticking = false;

    function updateParallax() {
      ticking = false;
      if (window.innerWidth <= 1040) {
        heroImg.style.transform = '';
        return;
      }
      var y = Math.min(window.scrollY || 0, 600);
      heroImg.style.transform = 'translateY(' + (y * 0.045).toFixed(1) + 'px)';
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateParallax);
      }
    }, { passive: true });
  }

  function initInfographicMotion() {
    var list = document.querySelector('.room-bar-list');
    if (!list) return;
    var bars = list.querySelectorAll('.reed-meter > span[data-meter-width]');
    if (!bars.length || isReducedMotion()) return;

    bars.forEach(function (b) {
      b.style.width = '0%';
    });

    function fillBars() {
      bars.forEach(function (b, idx) {
        var target = b.getAttribute('data-meter-width') || '60%';
        window.setTimeout(function () {
          b.style.width = target;
        }, idx * 120);
      });
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            fillBars();
            io.disconnect();
          }
        });
      }, { threshold: 0.25 });
      io.observe(list);
    } else {
      fillBars();
    }
  }

  function initHeaderScrollState() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    function syncHeader() {
      header.classList.toggle('is-scrolled', (window.scrollY || 0) > 24);
    }
    window.addEventListener('scroll', syncHeader, { passive: true });
    syncHeader();
  }

  function initScentMistCanvas() {
    var canvases = Array.prototype.slice.call(document.querySelectorAll('.scent-mist-canvas'));
    if (!canvases.length || isReducedMotion()) return;

    var mouseX = 0.5;
    var mouseY = 0.4;
    window.addEventListener('pointermove', function (e) {
      mouseX = e.clientX / Math.max(window.innerWidth, 1);
      mouseY = e.clientY / Math.max(window.innerHeight, 1);
    }, { passive: true });

    canvases.forEach(function (canvas) {
      if (!canvas.getContext) return;
      var ctx = canvas.getContext('2d');
      var w = 0;
      var h = 0;
      var active = true;

      function resize() {
        var rect = canvas.parentElement ? canvas.parentElement.getBoundingClientRect() : { width: window.innerWidth, height: 420 };
        w = Math.max(rect.width, 320);
        h = Math.max(rect.height, 260);
        canvas.width = Math.floor(w * Math.min(window.devicePixelRatio || 1, 1.5));
        canvas.height = Math.floor(h * Math.min(window.devicePixelRatio || 1, 1.5));
      }

      var blobs = [
        { x: 0.22, y: 0.35, r: 0.36, color: 'rgba(169, 191, 217, 0.16)', phase: 0.4 },
        { x: 0.72, y: 0.28, r: 0.42, color: 'rgba(244, 235, 193, 0.14)', phase: 1.8 },
        { x: 0.52, y: 0.68, r: 0.38, color: 'rgba(142, 34, 44, 0.22)', phase: 3.1 },
        { x: 0.85, y: 0.74, r: 0.32, color: 'rgba(169, 191, 217, 0.13)', phase: 4.5 },
        { x: 0.15, y: 0.78, r: 0.30, color: 'rgba(244, 235, 193, 0.11)', phase: 2.3 }
      ];

      var motes = [];
      for (var m = 0; m < 16; m++) {
        motes.push({
          x: Math.random(),
          y: Math.random(),
          r: 1.2 + Math.random() * 2.0,
          speedY: 0.00025 + Math.random() * 0.00045,
          drift: Math.random() * Math.PI * 2,
          alpha: 0.2 + Math.random() * 0.42
        });
      }

      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          active = entries[0] ? entries[0].isIntersecting : true;
        }, { threshold: 0.02 });
        io.observe(canvas);
      }

      window.addEventListener('resize', resize, { passive: true });
      resize();

      var t = Math.random() * 4;
      function frame() {
        requestAnimationFrame(frame);
        if (!active || !canvas.width) return;
        t += 0.012;
        var cw = canvas.width;
        var ch = canvas.height;
        ctx.clearRect(0, 0, cw, ch);

        for (var i = 0; i < blobs.length; i++) {
          var b = blobs[i];
          var px = (b.x + Math.sin(t + b.phase) * 0.08 + (mouseX - 0.5) * 0.06) * cw;
          var py = (b.y + Math.cos(t * 0.8 + b.phase) * 0.07 + (mouseY - 0.5) * 0.05) * ch;
          var rad = b.r * Math.max(cw, ch);
          var grad = ctx.createRadialGradient(px, py, 0, px, py, rad);
          grad.addColorStop(0, b.color);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, rad, 0, Math.PI * 2);
          ctx.fill();
        }

        for (var j = 0; j < motes.length; j++) {
          var pt = motes[j];
          pt.y -= pt.speedY;
          if (pt.y < -0.05) pt.y = 1.05;
          var mx = (pt.x + Math.sin(t * 1.4 + pt.drift) * 0.015) * cw;
          var my = pt.y * ch;
          ctx.fillStyle = 'rgba(244, 235, 193, ' + pt.alpha.toFixed(2) + ')';
          ctx.beginPath();
          ctx.arc(mx, my, pt.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      requestAnimationFrame(frame);
    });
  }

  function initWatermarkScrollDrift() {
    var words = Array.prototype.slice.call(document.querySelectorAll('.hero-marquee-word, .page-hero-word'));
    if (!words.length || isReducedMotion()) return;
    var ticking = false;
    function syncWords() {
      ticking = false;
      var shift = Math.min(window.scrollY || 0, 700) * -0.22;
      words.forEach(function (w) {
        w.style.setProperty('--hero-shift', shift.toFixed(1) + 'px');
      });
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(syncWords);
      }
    }, { passive: true });
    syncWords();
  }

  function initImmersiveStory() {
    var track = document.getElementById('storyTrack');
    var heroWord = document.querySelector('.hero-marquee-word');
    if (!track || isReducedMotion()) return;

    var acts = Array.prototype.slice.call(track.querySelectorAll('.story-act'));
    var wordOne = document.getElementById('storyWordOne');
    var depthImg = document.getElementById('storyDepthImg');
    var pillars = Array.prototype.slice.call(track.querySelectorAll('.story-pillar'));
    var ribbonTrack = document.getElementById('storyRibbonTrack');
    var ribbonViewport = track.querySelector('.story-ribbon-viewport');
    var compassBtns = Array.prototype.slice.call(track.querySelectorAll('[data-goto-act]'));
    var compassBar = document.getElementById('storyCompassBar');

    var targetP = 0;
    var smoothP = 0;

    function clamp01(v) {
      return v < 0 ? 0 : (v > 1 ? 1 : v);
    }

    function computeTarget() {
      var rect = track.getBoundingClientRect();
      var scrollable = Math.max(track.offsetHeight - window.innerHeight, 1);
      targetP = clamp01(-rect.top / scrollable);

      if (heroWord) {
        var heroShift = Math.min(window.scrollY || 0, 700) * -0.22;
        heroWord.style.setProperty('--hero-shift', heroShift.toFixed(1) + 'px');
      }
    }

    function renderLoop() {
      smoothP += (targetP - smoothP) * 0.11;

      // Act opacities with smooth overlap crossfades
      var op0 = 1 - clamp01((smoothP - 0.25) / 0.14);
      var op1 = clamp01((smoothP - 0.22) / 0.14) * (1 - clamp01((smoothP - 0.62) / 0.14));
      var op2 = clamp01((smoothP - 0.60) / 0.14);
      var ops = [op0, op1, op2];

      acts.forEach(function (act, idx) {
        act.style.opacity = ops[idx].toFixed(3);
        act.classList.toggle('is-active', ops[idx] > 0.35);
      });

      // Act 1 tracked word glide
      if (wordOne) {
        var p0 = clamp01(smoothP / 0.35);
        var tx = (0.5 - p0) * 180;
        wordOne.style.transform = 'translate3d(calc(-50% + ' + tx.toFixed(1) + 'px), -50%, 0)';
      }

      // Act 2 zoom + pillars lift
      if (depthImg) {
        var p1 = clamp01((smoothP - 0.28) / 0.42);
        var sc = 1.16 - p1 * 0.14;
        depthImg.style.transform = 'scale(' + sc.toFixed(3) + ')';
        pillars.forEach(function (pil, i) {
          var local = clamp01((p1 - i * 0.12) / 0.45);
          pil.style.opacity = local.toFixed(3);
          pil.style.transform = 'translate3d(0, ' + ((1 - local) * 26).toFixed(1) + 'px, 0)';
        });
      }

      // Act 3 horizontal card ribbon translation driven by vertical scroll
      if (ribbonTrack && ribbonViewport) {
        var p2 = clamp01((smoothP - 0.65) / 0.33);
        var maxShift = Math.max(ribbonTrack.scrollWidth - ribbonViewport.clientWidth, 0);
        var rx = -p2 * maxShift;
        ribbonTrack.style.transform = 'translate3d(' + rx.toFixed(1) + 'px, 0, 0)';
      }

      // Diamond compass active state
      var activeAct = smoothP < 0.33 ? 0 : (smoothP < 0.66 ? 1 : 2);
      compassBtns.forEach(function (btn, idx) {
        btn.classList.toggle('is-active', idx === activeAct);
      });
      if (compassBar) {
        compassBar.style.transform = 'scaleX(' + smoothP.toFixed(3) + ')';
      }

      requestAnimationFrame(renderLoop);
    }

    compassBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var actIdx = Number(btn.getAttribute('data-goto-act')) || 0;
        var targets = [0.05, 0.48, 0.88];
        var scrollable = Math.max(track.offsetHeight - window.innerHeight, 1);
        var topAbs = track.getBoundingClientRect().top + (window.scrollY || 0);
        window.scrollTo({
          top: topAbs + scrollable * targets[actIdx],
          behavior: 'smooth'
        });
      });
    });

    window.addEventListener('scroll', computeTarget, { passive: true });
    window.addEventListener('resize', computeTarget, { passive: true });
    computeTarget();
    requestAnimationFrame(renderLoop);
  }

  function initCursorAuraAndTilt() {
    if (isReducedMotion() || !window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return;
    var aura = document.createElement('div');
    aura.className = 'cursor-aura';
    aura.setAttribute('aria-hidden', 'true');
    document.body.appendChild(aura);

    var cx = -400;
    var cy = -400;
    var tx = -400;
    var ty = -400;

    document.addEventListener('pointermove', function (e) {
      tx = e.clientX;
      ty = e.clientY;
      aura.style.opacity = '1';
    }, { passive: true });

    document.addEventListener('mouseleave', function () {
      aura.style.opacity = '0';
    });

    function moveAura() {
      cx += (tx - cx) * 0.14;
      cy += (ty - cy) * 0.14;
      aura.style.left = cx.toFixed(1) + 'px';
      aura.style.top = cy.toFixed(1) + 'px';
      requestAnimationFrame(moveAura);
    }
    requestAnimationFrame(moveAura);

    // Subtle 3deg 3D tilt on cards
    var tiltCards = Array.prototype.slice.call(document.querySelectorAll('.card, .ribbon-card'));
    tiltCards.forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var rect = card.getBoundingClientRect();
        var rx = ((e.clientY - rect.top) / rect.height - 0.5) * -5;
        var ry = ((e.clientX - rect.left) / rect.width - 0.5) * 5;
        card.style.transform = 'perspective(800px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-4px)';
      });
      card.addEventListener('pointerleave', function () {
        card.style.transform = '';
      });
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
    initHeaderScrollState();
    initScentMistCanvas();
    initWatermarkScrollDrift();
    initImmersiveStory();
    initScrollProgress();
    initScrollReveal();
    initHeroParallax();
    initInfographicMotion();
    initCursorAuraAndTilt();
  });
})();
