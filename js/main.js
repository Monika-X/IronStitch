/* =====================================================
   IRONSMITH COBBLERS — Main JavaScript
   All interactive features, no dependencies
   ===================================================== */

'use strict';

/* ── Theme & RTL Persistence ─────────────────────── */
const ThemeManager = (() => {
  const root = document.documentElement;

  function init() {
    const saved = localStorage.getItem('is_theme') || 'light';
    const rtl   = localStorage.getItem('is_rtl')   || 'ltr';
    apply(saved, rtl);
    bindToggle();
  }

  function apply(theme, dir) {
    root.setAttribute('data-theme', theme);
    root.setAttribute('dir', dir);
    updateToggleUI(theme, dir);
  }

  function toggle() {
    const curr  = root.getAttribute('data-theme') || 'light';
    const next  = curr === 'light' ? 'dark' : 'light';
    const dir   = root.getAttribute('dir') || 'ltr';
    localStorage.setItem('is_theme', next);
    apply(next, dir);
  }

  function toggleRTL() {
    const curr = root.getAttribute('dir') || 'ltr';
    const next = curr === 'ltr' ? 'rtl' : 'ltr';
    const theme = root.getAttribute('data-theme') || 'light';
    localStorage.setItem('is_rtl', next);
    apply(theme, next);
  }

  function updateToggleUI(theme, dir) {
    const themeBtn = document.querySelector('[data-action="toggle-theme"]');
    const rtlBtn   = document.querySelector('[data-action="toggle-rtl"]');

    if (themeBtn) {
      themeBtn.innerHTML = theme === 'dark'
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
      themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }

    if (rtlBtn) {
      rtlBtn.textContent = dir === 'rtl' ? 'LTR' : 'RTL';
      rtlBtn.style.fontSize = '0.68rem';
      rtlBtn.style.fontWeight = '700';
    }
  }

  function bindToggle() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      if (action === 'toggle-theme') toggle();
      if (action === 'toggle-rtl')   toggleRTL();
    });
  }

  return { init };
})();

/* ── Page Transition ─────────────────────────────── */
const PageTransition = (() => {
  let overlay;
  let isTransitioning = false;

  function init() {
    overlay = document.createElement('div');
    overlay.className = 'page-transition';
    overlay.setAttribute('aria-hidden','true');
    document.body.appendChild(overlay);

    // Reveal on initial load — ensure overlay never stays visible after load/back
    requestAnimationFrame(()=>{
      overlay.classList.add('leaving');
      overlay.addEventListener('animationend', () => {
        overlay.className = 'page-transition';
        overlay.style.transform = '';
        isTransitioning = false;
      }, { once: true });
      // Fallback: force hide after 800ms if animationend never fires (e.g., reduced-motion)
      setTimeout(()=>{
        if(overlay.classList.contains('leaving')){
          overlay.className = 'page-transition';
          overlay.style.transform = '';
          isTransitioning = false;
        }
      }, 850);
    });

    // Critical: when page is restored from bfcache (back/forward), overlay may be stuck at scaleY(1) from previous entering — force hide
    window.addEventListener('pageshow', (e)=>{
      // Always reset on pageshow, especially when persisted (bfcache)
      overlay.className = 'page-transition';
      overlay.style.transform = 'scaleY(0)';
      isTransitioning = false;
      // Also unlock scroll in case mobile menu was open when navigating away
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.paddingRight = '';
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.overscrollBehavior = '';
    });

    // Also reset on visibility (tab switch back)
    document.addEventListener('visibilitychange', ()=>{
      if(document.visibilityState==='visible' && !isTransitioning){
        overlay.className = 'page-transition';
        overlay.style.transform = 'scaleY(0)';
      }
    });

    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http') || a.target === '_blank') return;

      a.addEventListener('click', e => {
        // Don't intercept if already transitioning or modifier keys
        if(isTransitioning || e.ctrlKey || e.metaKey || e.shiftKey || e.button!==0) return;
        e.preventDefault();
        const dest = a.href;
        // Prevent double-transition
        if(isTransitioning) return;
        isTransitioning = true;
        overlay.className = 'page-transition';
        // Force reflow so animation restarts
        void overlay.offsetWidth;
        overlay.classList.add('entering');
        let navigated = false;
        const go = ()=>{ if(!navigated){ navigated=true; window.location.href = dest; } };
        overlay.addEventListener('animationend', go, { once: true });
        // Fallback navigate after 700ms if animationend fails
        setTimeout(go, 700);
      });
    });
  }

  return { init };
})();

/* ── Navbar ──────────────────────────────────────── */
const Navbar = (() => {
  let nav, hamburger, mobileMenu, overlay;
  let menuOpen = false;

  function init() {
    nav       = document.querySelector('.navbar');
    hamburger = document.querySelector('.hamburger');
    mobileMenu= document.querySelector('.mobile-menu');
    overlay   = document.querySelector('.mobile-menu-overlay');

    if (!nav) return;

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    hamburger?.addEventListener('click', toggleMenu);
    overlay?.addEventListener('click', closeMenu);

    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const cleanCurrent = currentPath.split('#')[0].split('?')[0];
    document.querySelectorAll('.navbar__nav a, .mobile-menu a').forEach(a => {
      const href = a.getAttribute('href');
      if (!href) return;
      const targetFile = href.split('#')[0].split('?')[0].split('/').pop();
      if (targetFile && targetFile === cleanCurrent) {
        a.classList.add('active');
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && menuOpen) closeMenu();
    });

    // Close menu when any mobile link is tapped — keeps scroll lock in sync
    document.addEventListener('click', e=>{
      if(menuOpen && e.target.closest('.mobile-menu a')) closeMenu();
    });
  }

  function handleScroll() {
    if (!nav) return;
    const scrolled = window.scrollY > 50;
    nav.classList.toggle('scrolled', scrolled);
    if (nav.dataset.transparent === 'true') {
      nav.classList.toggle('transparent', !scrolled);
    }
  }

  let scrollY = 0;
  function toggleMenu() { menuOpen ? closeMenu() : openMenu(); }

  function openMenu() {
    menuOpen = true;
    hamburger?.classList.add('open');
    mobileMenu?.classList.add('open');
    overlay?.classList.add('open');
    hamburger?.setAttribute('aria-expanded','true');
    mobileMenu?.setAttribute('aria-hidden','false');
    // Lock background scroll — preserve scroll position, allow menu internal scroll
    scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarW > 0) document.body.style.paddingRight = scrollbarW + 'px';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
  }

  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    hamburger?.classList.remove('open');
    mobileMenu?.classList.remove('open');
    overlay?.classList.remove('open');
    hamburger?.setAttribute('aria-expanded','false');
    mobileMenu?.setAttribute('aria-hidden','true');
    // Restore scroll
    const top = document.body.style.top;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.paddingRight = '';
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.overscrollBehavior = '';
    document.documentElement.style.overscrollBehavior = '';
    // Restore scroll position from stored offset
    const y = Math.abs(parseInt(top || '0', 10)) || scrollY;
    window.scrollTo(0, y);
  }

  return { init };
})();

/* ── Hero Slider ─────────────────────────────────── */
const HeroSlider = (() => {
  let slides, dots, current = 0, timer;

  function init() {
    slides = document.querySelectorAll('.slide');
    dots   = document.querySelectorAll('.slider-dot');
    if (!slides.length) return;

    document.querySelector('.slider-btn.prev')?.addEventListener('click', () => go(current - 1));
    document.querySelector('.slider-btn.next')?.addEventListener('click', () => go(current + 1));
    dots.forEach((d, i) => d.addEventListener('click', () => go(i)));

    let startX = 0;
    const hero = document.querySelector('.hero');
    if (hero) {
      hero.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
      hero.addEventListener('touchend', e => {
        const diff = startX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) go(diff > 0 ? current + 1 : current - 1);
      });
    }

    startAuto();
  }

  function go(index) {
    slides[current].classList.remove('active');
    dots[current]?.classList.remove('active');
    current = ((index % slides.length) + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current]?.classList.add('active');
    clearInterval(timer);
    startAuto();
  }

  function startAuto() {
    timer = setInterval(() => go(current + 1), 5500);
  }

  return { init };
})();

/* ── Scroll Reveal ───────────────────────────────── */
const ScrollReveal = (() => {
  function init() {
    const elements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
    if (!elements.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    elements.forEach(el => observer.observe(el));
  }

  return { init };
})();

/* ── Before/After Slider ─────────────────────────── */
const BeforeAfterSlider = (() => {
  function init() {
    document.querySelectorAll('.ba-slider').forEach(slider => {
      const handle   = slider.querySelector('.ba-slider__handle');
      const afterDiv = slider.querySelector('.ba-slider__after');
      let dragging = false;

      function setPosition(clientX) {
        const rect = slider.getBoundingClientRect();
        let pct = ((clientX - rect.left) / rect.width) * 100;
        pct = Math.max(5, Math.min(95, pct));
        handle.style.left = pct + '%';
        afterDiv.style.width = pct + '%';
      }

      slider.addEventListener('mousedown',  e => { dragging = true; setPosition(e.clientX); });
      window.addEventListener('mouseup',    ()  => { dragging = false; });
      window.addEventListener('mousemove',  e => { if (dragging) setPosition(e.clientX); });
      slider.addEventListener('touchstart', e => { dragging = true; setPosition(e.touches[0].clientX); }, { passive: true });
      window.addEventListener('touchend',   ()  => { dragging = false; });
      window.addEventListener('touchmove',  e => { if (dragging) setPosition(e.touches[0].clientX); }, { passive: true });
      slider.addEventListener('click', e => setPosition(e.clientX));
    });
  }

  return { init };
})();

/* ── FAQ Accordion ───────────────────────────────── */
const FAQ = (() => {
  function init() {
    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item  = btn.closest('.faq-item');
        const ans   = item.querySelector('.faq-answer');
        const isOpen = item.classList.contains('open');

        item.closest('.faq-list, .faq-accordion')
            ?.querySelectorAll('.faq-item.open')
            .forEach(i => {
              i.classList.remove('open');
              i.querySelector('.faq-answer').style.maxHeight = null;
            });

        if (!isOpen) {
          item.classList.add('open');
          ans.style.maxHeight = ans.scrollHeight + 'px';
        }
      });
    });
  }

  return { init };
})();

/* ── Gallery Lightbox ────────────────────────────── */
const Lightbox = (() => {
  let lb, lbImg;

  function init() {
    lb    = document.querySelector('.lightbox');
    lbImg = document.querySelector('.lightbox__img');
    if (!lb) return;

    document.querySelectorAll('[data-lightbox]').forEach(item => {
      item.addEventListener('click', () => {
        const src = item.dataset.lightbox || item.querySelector('img')?.src;
        if (src && lbImg) {
          lbImg.src = src;
          lb.classList.add('open');
          document.body.style.overflow = 'hidden';
        }
      });
    });

    lb.querySelector('.lightbox__close')?.addEventListener('click', close);
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  function close() {
    lb?.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { if (lbImg) lbImg.src = ''; }, 300);
  }

  return { init };
})();

/* ── Back to Top ─────────────────────────────────── */
const BackToTop = (() => {
  function init() {
    const btn = document.querySelector('.back-to-top');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  return { init };
})();

/* ── Form Validation ─────────────────────────────── */
const FormValidator = (() => {
  function init() {
    document.querySelectorAll('.validated-form').forEach(form => {
      // Prevent native submit and handle via JS — only inputs reset, no page reload
      form.setAttribute('novalidate', '');
      form.addEventListener('submit', e => {
        e.preventDefault();
        e.stopPropagation();
        let valid = true;

        form.querySelectorAll('[data-required]').forEach(field => {
          const err = field.closest('.form-group')?.querySelector('.form-error') || field.parentElement.querySelector('.form-error');
          const val = (field.value || '').trim();
          if (!val) {
            field.classList.add('error');
            if (err) { err.textContent = err.dataset.msg || 'This field is required.'; err.classList.add('visible'); }
            valid = false;
          } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
            field.classList.add('error');
            if (err) { err.textContent = 'Please enter a valid email address.'; err.classList.add('visible'); }
            valid = false;
          } else {
            field.classList.remove('error');
            if (err) err.classList.remove('visible');
          }
        });

        if (!valid) {
          const firstErr = form.querySelector('.form-control.error, [data-required].error');
          firstErr?.focus();
          return;
        }

        const btn = form.querySelector('[type="submit"]');
        const origHTML = btn ? btn.innerHTML : '';
        const origText = btn ? btn.textContent : '';
        if (btn) { btn.innerHTML = 'Sending…'; btn.disabled = true; btn.setAttribute('aria-busy','true'); }

        // Determine contextual success messaging
        let title = 'Message Sent!';
        let text  = "We'll get back to you within 24 hours.";
        const isNewsletter = form.querySelector('.newsletter__input') || form.querySelector('.footer__newsletter-input') || form.closest('.newsletter') || form.closest('.footer__newsletter-form') || (form.querySelector('input[type="email"]') && form.querySelectorAll('input').length===1 && form.querySelectorAll('textarea, select').length===0);
        const isNotify = btn && /Notify/i.test(btn.textContent) || form.querySelector('input[aria-label*="notification"]');
        const isContact = form.id === 'contact-form' || form.querySelector('#c-name') || form.querySelector('#h2-name');

        if (isNewsletter) {
          title = 'Subscribed Successfully!';
          text  = 'Welcome to the IronStitch family — check your inbox for confirmation.';
        } else if (isNotify) {
          title = "You're on the list!";
          text  = "We'll notify you as soon as we're back. Thank you for your patience.";
        } else if (isContact) {
          title = 'Enquiry Sent!';
          text  = "Thank you — we'll respond within 4 business hours.";
        }

        setTimeout(() => {
          // Show global toast
          showToast(title, text);
          // Show inline success (only inside form, no page reload)
          showInlineSuccess(form, title, text);
          // Reset only inputs — no page reload
          form.reset();
          // Clear any lingering error states
          form.querySelectorAll('.form-control.error').forEach(el=>el.classList.remove('error'));
          form.querySelectorAll('.form-error.visible').forEach(el=>el.classList.remove('visible'));
          if (btn) { btn.innerHTML = origHTML || origText; btn.disabled = false; btn.removeAttribute('aria-busy'); }
          // Return focus to first input for accessibility after reset
          const firstInput = form.querySelector('.form-control, input, textarea, select');
          firstInput?.focus({ preventScroll: false });
        }, 900);
      });

      // Live clear on input/change
      form.querySelectorAll('[data-required]').forEach(field => {
        const ev = field.tagName === 'SELECT' ? 'change' : 'input';
        field.addEventListener(ev, () => {
          const err = field.closest('.form-group')?.querySelector('.form-error') || field.parentElement.querySelector('.form-error');
          if ((field.value||'').trim()) {
            field.classList.remove('error');
            if (err) err.classList.remove('visible');
          }
        });
      });

      // Ensure pressing Enter inside inputs does not trigger page reload elsewhere
      form.addEventListener('keydown', e=>{
        if(e.key==='Enter' && e.target.tagName==='INPUT' && e.target.type!=='email' && e.target.type!=='textarea'){
          // allow default submit handling via our listener, but prevent native form navigation
          // no extra action needed
        }
      });
    });
  }

  function showInlineSuccess(form, title, text){
    // Remove existing inline success if any
    form.querySelectorAll('.form-success').forEach(el=>el.remove());
    const success = document.createElement('div');
    success.className = 'form-success';
    success.setAttribute('role','status');
    success.setAttribute('aria-live','polite');
    success.innerHTML = `
      <div style="display:flex;gap:0.75rem;align-items:flex-start;">
        <span style="flex-shrink:0;width:28px;height:28px;border-radius:50%;background:var(--brass);color:var(--ivory);display:flex;align-items:center;justify-content:center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
        </span>
        <div>
          <div style="font-weight:700;font-size:0.95rem;color:var(--espresso);margin-bottom:0.2rem;">${title}</div>
          <div style="font-size:0.85rem;color:var(--text-primary);font-weight:500;line-height:1.5;">${text}</div>
        </div>
        <button type="button" aria-label="Dismiss" onclick="this.closest('.form-success').remove()" style="margin-left:auto;background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1.1rem;line-height:1;">×</button>
      </div>`;
    // Insert at top of form, but keep inputs intact — only visual message added, inputs are reset not replaced
    form.prepend(success);
    // Auto-dismiss after 6s (form stays, only banner removed)
    setTimeout(()=>{ success.style.opacity='0'; success.style.transition='opacity 300ms'; setTimeout(()=>success.remove(),300); }, 6000);
    // Smooth scroll to success if form is long
    success.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }

  function showToast(title, text) {
    // Remove existing toasts to avoid stacking overflow
    document.querySelectorAll('.toast').forEach(t=>t.remove());
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role','status');
    toast.setAttribute('aria-live','polite');
    toast.innerHTML = `<div style="display:flex;gap:0.75rem;align-items:flex-start;"><span style="flex-shrink:0;width:28px;height:28px;border-radius:50%;background:var(--brass);color:var(--ivory);display:flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg></span><div><div class="toast__title">${title}</div><div class="toast__text">${text}</div></div><button aria-label="Dismiss" onclick="this.closest('.toast').remove()" style="margin-left:auto;background:none;border:none;color:var(--text-muted);cursor:pointer;">×</button></div>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => { toast.classList.remove('visible'); setTimeout(() => toast.remove(), 400); }, 5000);
  }

  return { init, showToast };
})();

/* ── Counter Animation ───────────────────────────── */
const CounterAnimation = (() => {
  function init() {
    const counters = document.querySelectorAll('[data-counter]');
    if (!counters.length) return;

    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { animateCounter(entry.target); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.5 });

    counters.forEach(c => obs.observe(c));
  }

  function animateCounter(el) {
    const target   = parseFloat(el.dataset.counter);
    const suffix   = el.dataset.suffix || '';
    const prefix   = el.dataset.prefix || '';
    const duration = 2000;
    const start    = performance.now();

    function step(now) {
      const p = Math.min((now - start) / duration, 1);
      const v = (1 - Math.pow(1 - p, 3)) * target;
      if(suffix==='star'){ el.innerHTML = prefix + (Number.isInteger(target) ? Math.round(v) : v.toFixed(1)) + '<span style="display:inline-flex;vertical-align:middle;margin-left:2px;color:var(--brass);"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.4"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>'; } else { if(suffix==='star'){ el.innerHTML = prefix + (Number.isInteger(target) ? Math.round(v) : v.toFixed(1)) + '<span style="display:inline-flex;vertical-align:middle;margin-left:2px;color:var(--brass);"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.4"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>'; } else { el.textContent = prefix + (Number.isInteger(target) ? Math.round(v) : v.toFixed(1)) + suffix; } }
      if (p < 1) requestAnimationFrame(step);
      else { if(suffix==='star'){ el.innerHTML = prefix + target + '<span style="display:inline-flex;vertical-align:middle;margin-left:2px;color:var(--brass);"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.4"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>'; } else { el.textContent = prefix + target + suffix; } }
    }

    requestAnimationFrame(step);
  }

  return { init };
})();

/* ── Countdown Timer ─────────────────────────────── */
const Countdown = (() => {
  function init() {
    const el = document.querySelector('[data-countdown]');
    if (!el) return;
    const target = new Date(el.dataset.countdown).getTime();

    function update() {
      const diff = Math.max(0, target - Date.now());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000)  / 60000);
      const s = Math.floor((diff % 60000)    / 1000);
      const pad = n => String(n).padStart(2, '0');
      const dEl = el.querySelector('[data-days]');
      const hEl = el.querySelector('[data-hours]');
      const mEl = el.querySelector('[data-mins]');
      const sEl = el.querySelector('[data-secs]');
      if (dEl?.firstElementChild) dEl.firstElementChild.textContent = pad(d);
      if (hEl?.firstElementChild) hEl.firstElementChild.textContent = pad(h);
      if (mEl?.firstElementChild) mEl.firstElementChild.textContent = pad(m);
      if (sEl?.firstElementChild) sEl.firstElementChild.textContent = pad(s);
    }

    update();
    setInterval(update, 1000);
  }

  return { init };
})();

/* ── Marquee Duplication ─────────────────────────── */
const Marquee = (() => {
  function init() {
    document.querySelectorAll('.marquee-track').forEach(track => {
      track.innerHTML += track.innerHTML;
    });
  }

  return { init };
})();

/* ── Tabs ────────────────────────────────────────── */
const Tabs = (() => {
  function init() {
    document.querySelectorAll('.tabs').forEach(tabs => {
      const btns   = tabs.querySelectorAll('.tab-btn');
      const panels = tabs.querySelectorAll('.tab-panel');
      btns.forEach((btn, i) => {
        btn.addEventListener('click', () => {
          btns.forEach(b => b.classList.remove('active'));
          panels.forEach(p => p.classList.remove('active'));
          btn.classList.add('active');
          panels[i]?.classList.add('active');
        });
      });
    });
  }

  return { init };
})();

/* ── Blog Filter + View More (unified) ─────────── */
const BlogFilter = (() => {
  let visibleCount = 6, step = 3;
  let cards = [], viewMoreBtn, pills, searchInput, searchClear, noResults;
  let currentCategory = 'all', currentSearch = '';
  let initialized = false;
  function init(){
    if(initialized) return;
    initialized = true;
    cards = [...document.querySelectorAll('.blog-grid .blog-card')];
    // also track all filterable (for search/category) including featured/minis
    window._blogAllFilterable = [...document.querySelectorAll('.blog-card, .blog-mini, .blog-featured__main')];
    viewMoreBtn = document.getElementById('view-more-btn');
    pills = document.querySelectorAll('.category-pill');
    searchInput = document.getElementById('blog-search');
    searchClear = document.getElementById('blog-search-clear');
    if(!cards.length && !window._blogAllFilterable.length) return;
    // no-results
    noResults = document.getElementById('filter-no-results');
    if(!noResults){
      const grid = document.querySelector('.blog-grid');
      noResults = document.createElement('div');
      noResults.id = 'filter-no-results';
      noResults.style.cssText = 'display:none; text-align:center; padding:3rem 1rem; color:var(--text-muted); grid-column:1/-1;';
      noResults.innerHTML = '<p style="font-family:var(--font-serif);font-size:1.2rem;color:var(--text-primary);margin-bottom:0.5rem;">No posts found</p><p style="font-size:0.9rem;">Try another search or filter.</p>';
      grid.parentNode.insertBefore(noResults, grid.nextSibling);
    }
    // initial pagination hide beyond 6
    apply();
    // pills
    pills.forEach(pill=>{
      pill.addEventListener('click', ()=>{
        pills.forEach(p=>p.classList.remove('active'));
        pill.classList.add('active');
        currentCategory = (pill.dataset.filter || pill.textContent).trim().toLowerCase();
        visibleCount = 6;
        apply();
      });
    });
    // search
    if(searchInput){
      searchInput.addEventListener('input', ()=>{
        currentSearch = searchInput.value;
        visibleCount = 6;
        if(searchClear) searchClear.style.display = currentSearch ? 'block' : 'none';
        apply();
      });
      searchInput.addEventListener('keydown', e=>{ if(e.key==='Escape'){ searchInput.value=''; currentSearch=''; if(searchClear) searchClear.style.display='none'; visibleCount=6; apply(); searchInput.blur(); } });
      if(searchClear) searchClear.addEventListener('click', ()=>{ searchInput.value=''; currentSearch=''; searchClear.style.display='none'; visibleCount=6; apply(); searchInput.focus(); });
    }
    // view more
    if(viewMoreBtn){
      viewMoreBtn.addEventListener('click', ()=>{
        visibleCount += step;
        apply();
        // scroll to first newly revealed
        const firstNew = cards.filter(c=>c.dataset.matched==='true')[visibleCount - step];
        firstNew?.scrollIntoView({behavior:'smooth', block:'nearest'});
      });
    }
  }
  function normalize(s){ return s.toLowerCase().replace(/&amp;/g,'&').replace('&','and').replace(/[^a-z0-9]/g,' ').replace(/\s+/g,' ').trim(); }
  function matches(card){
    const tag = card.querySelector('.card__tag') ? normalize(card.querySelector('.card__tag').textContent) : '';
    const text = normalize(card.textContent || '');
    const nCat = normalize(currentCategory);
    const isAllCat = nCat==='all' || nCat==='all posts';
    const catMatch = isAllCat || tag.includes(nCat) || nCat.includes(tag);
    const nSearch = normalize(currentSearch);
    const searchMatch = !nSearch || text.includes(nSearch) || tag.includes(nSearch);
    return catMatch && searchMatch;
  }
  function apply(){
    const all = window._blogAllFilterable || cards;
    let matchedAll = [], matchedGrid = [];
    all.forEach(card=>{
      const isMatch = matches(card);
      card.dataset.matched = isMatch ? 'true' : 'false';
      if(isMatch){
        matchedAll.push(card);
        if(cards.includes(card)) matchedGrid.push(card);
      }
    });
    // Apply display: non-grid (featured/minis) show all matched, grid shows first visibleCount matched
    all.forEach(card=>{
      const isMatch = card.dataset.matched==='true';
      if(!isMatch){
        card.style.display='none';
      } else {
        if(cards.includes(card)){
          const idx = matchedGrid.indexOf(card);
          card.style.display = idx < visibleCount ? '' : 'none';
          if(idx < visibleCount) card.style.animation='fadeIn 0.35s ease';
        } else {
          card.style.display = '';
          card.style.animation='fadeIn 0.35s ease';
        }
      }
    });
    if(noResults) noResults.style.display = matchedAll.length===0 ? 'block' : 'none';
    if(viewMoreBtn){
      const remaining = matchedGrid.length - visibleCount;
      viewMoreBtn.style.display = remaining > 0 ? 'inline-flex' : 'none';
      viewMoreBtn.textContent = remaining > 0 ? `View More (${remaining} remaining)` : 'View More';
    }
  }
  return { init, apply };
})();
const CategoryFilter = BlogFilter;
const SearchFilter = BlogFilter;

/* ── TypedText ───────────────────────────────────── */
const TypedText = (() => {
  function init() {
    document.querySelectorAll('[data-typed]').forEach(el => {
      const words = el.dataset.typed.split(',').map(w => w.trim());
      let wIdx = 0, cIdx = 0, deleting = false;

      function type() {
        const word = words[wIdx];
        el.textContent = deleting ? word.substring(0, --cIdx) : word.substring(0, ++cIdx);
        if (!deleting && cIdx === word.length) { deleting = true; setTimeout(type, 1800); return; }
        if (deleting && cIdx === 0)            { deleting = false; wIdx = (wIdx + 1) % words.length; }
        setTimeout(type, deleting ? 50 : 90);
      }

      type();
    });
  }

  return { init };
})();

/* ── Testimonial Slider ──────────────────────────── */
const TestimonialSlider = (() => {
  function init() {
    document.querySelectorAll('.testimonial-slider').forEach(slider => {
      const track  = slider.querySelector('.testimonial-track');
      const items  = slider.querySelectorAll('.testimonial-slide');
      const prevBtn= slider.querySelector('.t-prev');
      const nextBtn= slider.querySelector('.t-next');
      if (!track || !items.length) return;

      let current = 0;

      function go(idx) {
        current = ((idx % items.length) + items.length) % items.length;
        track.style.transform = `translateX(-${current * 100}%)`;
        slider.querySelectorAll('.t-dot').forEach((d, i) => d.classList.toggle('active', i === current));
      }

      prevBtn?.addEventListener('click', () => go(current - 1));
      nextBtn?.addEventListener('click', () => go(current + 1));
      slider.querySelectorAll('.t-dot').forEach((d, i) => d.addEventListener('click', () => go(i)));

      let startX = 0;
      track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
      track.addEventListener('touchend',   e => {
        const diff = startX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) go(diff > 0 ? current + 1 : current - 1);
      });

      setInterval(() => go(current + 1), 6000);
    });
  }

  return { init };
})();

/* ── Anchor Scroll ───────────────────────────────── */
function initAnchorScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        const navH = 80;
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - navH, behavior: 'smooth' });
      }
    });
  });
}

/* ── Init All ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  PageTransition.init();
  Navbar.init();
  HeroSlider.init();
  ScrollReveal.init();
  BeforeAfterSlider.init();
  FAQ.init();
  Lightbox.init();
  BackToTop.init();
  FormValidator.init();
  CounterAnimation.init();
  Countdown.init();
  Marquee.init();
  Tabs.init();
  BlogFilter.init();
  TypedText.init();
  TestimonialSlider.init();
  initAnchorScroll();
});
