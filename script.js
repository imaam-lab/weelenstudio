/* ==========================================================================
   Weelen Studio — shared script (vanilla JavaScript, no dependencies)
   Modules: navigation, cursor, reveal, hero canvas, pricing, contact form,
   package shortcuts, back-to-top.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Configuration ------------------------------------------------ */
  var CONFIG = {
    brand: 'Weelen Studio',
    whatsappNumber: '94756598911', // +94 756 598 911, international format without "+"
    email: 'weelenstudio@gmail.com'
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Helpers ------------------------------------------------------ */
  function $(selector, scope) { return (scope || document).querySelector(selector); }
  function $$(selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); }

  function whatsappUrl(text) {
    return 'https://wa.me/' + CONFIG.whatsappNumber + '?text=' + encodeURIComponent(text);
  }

  /* ---------- Navigation --------------------------------------------------- */
  function initNavigation() {
    var header = $('.site-header');
    var nav = $('#site-nav');
    var toggle = $('.nav-toggle');
    if (!header || !nav || !toggle) { return; }

    // Active page state (also set in the HTML; this keeps it correct if files are renamed)
    var current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    $$('.nav__link', nav).forEach(function (link) {
      var target = (link.getAttribute('href') || '').split('#')[0].toLowerCase();
      if (target === current || (current === '' && target === 'index.html')) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    var mobileQuery = window.matchMedia('(max-width: 900px)');

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('is-locked', open && mobileQuery.matches);
    }

    function syncHidden() {
      // Keep the closed mobile menu out of the tab order and accessibility tree
      var hidden = mobileQuery.matches && !nav.classList.contains('is-open');
      if (hidden) { nav.setAttribute('inert', ''); } else { nav.removeAttribute('inert'); }
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
      syncHidden();
    });

    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) { setOpen(false); syncHidden(); }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        syncHidden();
        toggle.focus();
      }
    });

    function onBreakpoint() { setOpen(false); syncHidden(); }
    if (mobileQuery.addEventListener) { mobileQuery.addEventListener('change', onBreakpoint); }
    else if (mobileQuery.addListener) { mobileQuery.addListener(onBreakpoint); }
    syncHidden();

    var ticking = false;
    function onScroll() {
      if (ticking) { return; }
      ticking = true;
      window.requestAnimationFrame(function () {
        header.classList.toggle('is-scrolled', window.scrollY > 8);
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Custom cursor ------------------------------------------------ */
  function initCursor() {
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!fine.matches) { return; }

    var root = document.documentElement;
    var dot = document.createElement('div');
    var ring = document.createElement('div');
    dot.className = 'cursor-dot';
    ring.className = 'cursor-ring';
    dot.setAttribute('aria-hidden', 'true');
    ring.setAttribute('aria-hidden', 'true');
    dot.appendChild(document.createElement('i'));
    ring.appendChild(document.createElement('i'));
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    root.classList.add('has-cursor');

    var mouse = { x: -100, y: -100 };
    var trail = { x: -100, y: -100 };
    var started = false;
    var raf = null;

    var CLICKABLE = 'a, button, [role="tab"], summary, label, .chip, .btn';
    var TEXTUAL = 'input, textarea, select';

    function render() {
      var ease = reduceMotion ? 1 : 0.18;
      trail.x += (mouse.x - trail.x) * ease;
      trail.y += (mouse.y - trail.y) * ease;
      dot.style.transform = 'translate3d(' + mouse.x + 'px,' + mouse.y + 'px,0)';
      ring.style.transform = 'translate3d(' + trail.x + 'px,' + trail.y + 'px,0)';
      var settled = Math.abs(mouse.x - trail.x) < 0.1 && Math.abs(mouse.y - trail.y) < 0.1;
      raf = settled ? null : window.requestAnimationFrame(render);
    }
    function kick() { if (raf === null) { raf = window.requestAnimationFrame(render); } }

    document.addEventListener('pointermove', function (event) {
      if (event.pointerType && event.pointerType !== 'mouse') { return; }
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      if (!started) {
        trail.x = mouse.x; trail.y = mouse.y;
        started = true;
        dot.classList.add('is-on');
        ring.classList.add('is-on');
      }
      kick();
    }, { passive: true });

    document.addEventListener('pointerover', function (event) {
      var target = event.target;
      if (!(target instanceof Element)) { return; }
      var isText = !!target.closest(TEXTUAL);
      var isClickable = !isText && !!target.closest(CLICKABLE);
      dot.classList.toggle('is-text', isText);
      ring.classList.toggle('is-text', isText);
      dot.classList.toggle('is-hover', isClickable);
      ring.classList.toggle('is-hover', isClickable);
    });

    document.addEventListener('pointerdown', function () { ring.classList.add('is-down'); });
    document.addEventListener('pointerup', function () { ring.classList.remove('is-down'); });

    document.documentElement.addEventListener('mouseleave', function () {
      dot.classList.remove('is-on'); ring.classList.remove('is-on');
    });
    document.documentElement.addEventListener('mouseenter', function () {
      if (started) { dot.classList.add('is-on'); ring.classList.add('is-on'); }
    });

    // If the device switches to touch-only (e.g. a detachable keyboard), remove the custom cursor
    function onChange() {
      if (fine.matches) { return; }
      root.classList.remove('has-cursor');
      dot.remove();
      ring.remove();
    }
    if (fine.addEventListener) { fine.addEventListener('change', onChange); }
  }

  /* ---------- Scroll reveal ------------------------------------------------ */
  function initReveal() {
    var items = $$('[data-reveal]');
    if (!items.length) { return; }

    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    items.forEach(function (el) {
      var delay = el.getAttribute('data-reveal-delay');
      if (delay) { el.style.transitionDelay = delay + 'ms'; }
      observer.observe(el);
    });
  }

  /* ---------- Hero honeycomb canvas --------------------------------------- */
  function initHeroCanvas() {
    var wrap = $('[data-hero-canvas]');
    if (!wrap) { return; }
    var canvas = $('canvas', wrap);
    var ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    if (!ctx) { return; }

    var hero = wrap.parentElement;
    var styles = getComputedStyle(document.documentElement);
    var inkRgb = styles.getPropertyValue('--ink-rgb').trim() || '24, 24, 27';
    var accentRgb = styles.getPropertyValue('--accent-rgb').trim() || '107, 79, 187';

    var size = 0;          // hexagon radius
    var width = 0;
    var height = 0;
    var cells = [];
    var pointer = { x: -999, y: -999, strength: 0, target: 0 };
    var raf = null;

    function hash(col, row) {
      var n = Math.sin(col * 127.1 + row * 311.7) * 43758.5453;
      return n - Math.floor(n);
    }

    function build() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var rect = wrap.getBoundingClientRect();
      width = Math.max(rect.width, 1);
      height = Math.max(rect.height, 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      size = width < 600 ? 22 : 30;
      var hexW = Math.sqrt(3) * size;
      var vert = size * 1.5;
      cells = [];
      var rows = Math.ceil(height / vert) + 2;
      var cols = Math.ceil(width / hexW) + 2;
      for (var r = -1; r < rows; r++) {
        for (var c = -1; c < cols; c++) {
          var cx = c * hexW + (r % 2 ? hexW / 2 : 0);
          var cy = r * vert;
          cells.push({ x: cx, y: cy, tint: hash(c, r) > 0.93 ? 0.07 : 0 });
        }
      }
      draw();
    }

    function path(cx, cy) {
      ctx.beginPath();
      for (var i = 0; i < 6; i++) {
        var angle = Math.PI / 180 * (60 * i - 30);
        var px = cx + (size - 1) * Math.cos(angle);
        var py = cy + (size - 1) * Math.sin(angle);
        if (i === 0) { ctx.moveTo(px, py); } else { ctx.lineTo(px, py); }
      }
      ctx.closePath();
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      var radius = 170;
      for (var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        var glow = 0;
        if (pointer.strength > 0.01) {
          var dx = cell.x - pointer.x;
          var dy = cell.y - pointer.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < radius) { glow = Math.pow(1 - d / radius, 1.6) * pointer.strength; }
        }
        path(cell.x, cell.y);
        if (cell.tint || glow) {
          ctx.fillStyle = 'rgba(' + accentRgb + ',' + (cell.tint + glow * 0.16).toFixed(3) + ')';
          ctx.fill();
        }
        ctx.strokeStyle = glow > 0.02
          ? 'rgba(' + accentRgb + ',' + (0.14 + glow * 0.7).toFixed(3) + ')'
          : 'rgba(' + inkRgb + ',0.09)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    function loop() {
      var ease = reduceMotion ? 1 : 0.12;
      pointer.strength += (pointer.target - pointer.strength) * ease;
      if (Math.abs(pointer.target - pointer.strength) < 0.01) { pointer.strength = pointer.target; }
      draw();
      raf = pointer.strength === pointer.target ? null : window.requestAnimationFrame(loop);
    }
    function kick() { if (raf === null) { raf = window.requestAnimationFrame(loop); } }

    hero.addEventListener('pointermove', function (event) {
      if (event.pointerType && event.pointerType !== 'mouse') { return; }
      var rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.target = 1;
      kick();
    }, { passive: true });

    hero.addEventListener('pointerleave', function () {
      pointer.target = 0;
      kick();
    });

    if ('ResizeObserver' in window) {
      new ResizeObserver(build).observe(wrap);
    } else {
      window.addEventListener('resize', build);
    }
    build();
  }

  /* ---------- Pricing: category tabs, view toggle, deep links ------------- */
  function initPricing() {
    var tablist = $('[data-price-tabs]');
    if (!tablist) { return; }
    var tabs = $$('[role="tab"]', tablist);
    var panels = tabs.map(function (tab) { return document.getElementById(tab.getAttribute('aria-controls')); });

    function select(index, focus) {
      tabs.forEach(function (tab, i) {
        var active = i === index;
        tab.setAttribute('aria-selected', String(active));
        tab.setAttribute('tabindex', active ? '0' : '-1');
        if (panels[i]) { panels[i].hidden = !active; }
      });
      if (focus) { tabs[index].focus(); }
      if (tabs[index].scrollIntoView && !reduceMotion) {
        tabs[index].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      }
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () {
        select(index, false);
        if (history.replaceState) { history.replaceState(null, '', '#' + tab.getAttribute('data-key')); }
      });
      tab.addEventListener('keydown', function (event) {
        var next = null;
        if (event.key === 'ArrowRight') { next = (index + 1) % tabs.length; }
        else if (event.key === 'ArrowLeft') { next = (index - 1 + tabs.length) % tabs.length; }
        else if (event.key === 'Home') { next = 0; }
        else if (event.key === 'End') { next = tabs.length - 1; }
        if (next !== null) { event.preventDefault(); select(next, true); }
      });
    });

    function fromHash() {
      var key = location.hash.replace('#', '');
      for (var i = 0; i < tabs.length; i++) {
        if (tabs[i].getAttribute('data-key') === key) { select(i, false); return true; }
      }
      return false;
    }
    if (!fromHash()) { select(0, false); }
    window.addEventListener('hashchange', fromHash);

    // List / Compare toggle
    $$('[data-view-toggle]').forEach(function (group) {
      var panel = group.closest('.price-panel');
      var tiers = $('.tiers', panel);
      $$('button', group).forEach(function (button) {
        button.addEventListener('click', function () {
          $$('button', group).forEach(function (b) { b.setAttribute('aria-pressed', String(b === button)); });
          tiers.setAttribute('data-view', button.getAttribute('data-view'));
        });
      });
    });
  }

  /* ---------- Contact form + WhatsApp -------------------------------------- */
  function initContactForm() {
    var form = $('#inquiry-form');
    if (!form) { return; }

    var success = $('#form-success');
    var fields = {
      name: form.elements.name,
      email: form.elements.email,
      phone: form.elements.phone,
      type: form.elements.type,
      budget: form.elements.budget,
      message: form.elements.message
    };
    var waLinks = $$('[data-whatsapp]');

    var rules = {
      name: function (v) { return v.length < 2 ? 'Enter your name.' : ''; },
      email: function (v) {
        if (!v) { return 'Enter your email address.'; }
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Enter a valid email address, like name@example.com.';
      },
      phone: function (v) {
        if (!v) { return ''; }
        var digits = v.replace(/\D/g, '');
        return /^[+()\d\s-]+$/.test(v) && digits.length >= 7 && digits.length <= 15
          ? '' : 'Enter a valid phone number, for example +94 756 598 911.';
      },
      type: function (v) { return v ? '' : 'Choose a project type.'; },
      budget: function (v) { return v.length > 60 ? 'Keep the budget under 60 characters.' : ''; },
      message: function (v) {
        if (v.length < 10) { return 'Tell us a little more about your project (at least 10 characters).'; }
        return v.length > 2000 ? 'Keep the message under 2000 characters.' : '';
      }
    };

    function setError(key, message) {
      var field = fields[key];
      var wrapper = field.closest('.field');
      var output = $('#error-' + key);
      wrapper.classList.toggle('has-error', !!message);
      if (message) { field.setAttribute('aria-invalid', 'true'); } else { field.removeAttribute('aria-invalid'); }
      if (output) { output.textContent = message; }
    }

    function validateField(key) {
      var message = rules[key](fields[key].value.trim());
      setError(key, message);
      return !message;
    }

    function values() {
      var data = {};
      Object.keys(fields).forEach(function (key) { data[key] = fields[key].value.trim(); });
      return data;
    }

    function buildMessage(data) {
      var lines = ['Hello ' + CONFIG.brand + ',', '', 'I would like to start a project.', ''];
      if (data.name) { lines.push('Name: ' + data.name); }
      if (data.email) { lines.push('Email: ' + data.email); }
      if (data.phone) { lines.push('Phone / WhatsApp: ' + data.phone); }
      if (data.type) { lines.push('Project type: ' + data.type); }
      if (data.budget) { lines.push('Budget: ' + data.budget); }
      if (data.message) { lines.push('', 'Project details:', data.message); }
      return lines.join('\n');
    }

    function updateWhatsApp() {
      var data = values();
      var hasContent = data.name || data.type || data.message;
      var text = hasContent
        ? buildMessage(data)
        : 'Hello ' + CONFIG.brand + ', I would like to start a project. Could we discuss the details?';
      var url = whatsappUrl(text);
      waLinks.forEach(function (link) { link.setAttribute('href', url); });
    }

    Object.keys(fields).forEach(function (key) {
      fields[key].addEventListener('blur', function () { validateField(key); });
      fields[key].addEventListener('input', function () {
        if (fields[key].closest('.field').classList.contains('has-error')) { validateField(key); }
        updateWhatsApp();
      });
      fields[key].addEventListener('change', updateWhatsApp);
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var firstInvalid = null;
      Object.keys(fields).forEach(function (key) {
        if (!validateField(key) && !firstInvalid) { firstInvalid = fields[key]; }
      });
      if (firstInvalid) { firstInvalid.focus(); return; }

      // There is no backend on a static site, so hand the finished inquiry to WhatsApp or email.
      var data = values();
      var text = buildMessage(data);
      $('#send-whatsapp').setAttribute('href', whatsappUrl(text));
      $('#send-email').setAttribute('href',
        'mailto:' + CONFIG.email +
        '?subject=' + encodeURIComponent('Project inquiry: ' + data.type) +
        '&body=' + encodeURIComponent(text));

      form.hidden = true;
      success.hidden = false;
      success.setAttribute('tabindex', '-1');
      success.focus();
    });

    var edit = $('#edit-inquiry');
    if (edit) {
      edit.addEventListener('click', function () {
        success.hidden = true;
        form.hidden = false;
        fields.name.focus();
      });
    }

    updateWhatsApp();
  }

  /* ---------- Package / service shortcuts --------------------------------- */
  function initShortcuts() {
    var form = $('#inquiry-form');
    if (!form) { return; }

    $$('[data-service]').forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var service = trigger.getAttribute('data-service');
        var pkg = trigger.getAttribute('data-package');
        var price = trigger.getAttribute('data-price');
        var select = form.elements.type;
        if (select && service) { select.value = service; select.dispatchEvent(new Event('change', { bubbles: true })); }
        var message = form.elements.message;
        if (message && pkg && !message.value.trim()) {
          message.value = 'I am interested in the ' + pkg + ' package for ' + service +
            (price ? ' (' + price + ').' : '.');
          message.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (isSuccessVisible()) { $('#edit-inquiry').click(); }
      });
    });

    function isSuccessVisible() {
      var box = $('#form-success');
      return box && !box.hidden;
    }
  }

  /* ---------- Back to top -------------------------------------------------- */
  function initBackToTop() {
    var button = $('.to-top');
    if (!button) { return; }
    var ticking = false;
    function update() {
      button.classList.toggle('is-visible', window.scrollY > 700);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    button.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    update();
  }

  /* ---------- Init --------------------------------------------------------- */
  function init() {
    initNavigation();
    initCursor();
    initReveal();
    initHeroCanvas();
    initPricing();
    initContactForm();
    initShortcuts();
    initBackToTop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
