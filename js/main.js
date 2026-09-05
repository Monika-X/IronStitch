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
  let observer = null;

  function init() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => el.classList.add('revealed'));
      return;
    }

    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    observeAll();
  }

  function observeAll(container = document) {
    const elements = container.querySelectorAll('.reveal:not(.revealed), .reveal-left:not(.revealed), .reveal-right:not(.revealed), .reveal-scale:not(.revealed)');
    elements.forEach(el => {
      if (observer) {
        observer.observe(el);
      } else {
        el.classList.add('revealed');
      }
    });
  }

  return { init, observeAll };
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
          // Show only ONE success to avoid duplicate (toast for newsletters, inline for main forms)
          if (isNewsletter || isNotify) {
            showToast(title, text);
          } else {
            showInlineSuccess(form, title, text);
          }
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

/* ── Article Social Share & Copy Link ───────────── */
function copyArticleLink(btn) {
  if (!btn) return;
  const originalHTML = btn.innerHTML;
  const currentUrl = window.location.href;
  
  const showSuccess = () => {
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg> <span>Copied!</span>`;
    btn.classList.add('copied');
    if (typeof FormValidator !== 'undefined' && FormValidator.showToast) {
      FormValidator.showToast('Link Copied', 'Article link copied to your clipboard.');
    }
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove('copied');
    }, 2500);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(currentUrl).then(showSuccess).catch(() => {
      fallbackCopy(currentUrl, showSuccess);
    });
  } else {
    fallbackCopy(currentUrl, showSuccess);
  }
}

function fallbackCopy(text, cb) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    if (cb) cb();
  } catch(e) {
    prompt('Copy link manually:', text);
  }
  document.body.removeChild(ta);
}

window.copyArticleLink = copyArticleLink;

/* ── Related Articles (Fetched dynamically from existing articles) ── */
const RelatedArticles = (() => {
  const ARTICLES = [
  {
    "slug": "blog-details-autumn-prep.html",
    "title": "Autumn Prep: Waterproof Your Shoes Before the Rains Come",
    "category": "Seasonal",
    "date": "1 Oct 2024",
    "readTime": "5 min",
    "author": "George Abbott",
    "image": "https://i.pinimg.com/1200x/9b/f5/26/9bf526abf5cd1821c5d24a3c226af367.jpg",
    "excerpt": "Protect your leather footwear before the first autumn downpour with our expert step-by-step waterproofing guide."
  },
  {
    "slug": "blog-details-bespoke-insoles.html",
    "title": "Bespoke Insoles: The Hidden Foundation of Footwear Ergonomics",
    "category": "Craft & Technique",
    "date": "12 Nov 2024",
    "readTime": "6 min",
    "author": "Clara Ironsmith",
    "image": "https://images.unsplash.com/photo-1562273138-f46be4ebdf33?w=1000&q=85&fit=crop",
    "excerpt": "Custom cork and veg-tan arch supports sculpted directly to the individual contours of the human foot."
  },
  {
    "slug": "blog-details-conditioning-routine.html",
    "title": "The Essential Leather Conditioning Routine Every Shoe Owner Needs",
    "category": "Leather Care",
    "date": "5 Oct 2024",
    "readTime": "6 min",
    "author": "Clara Ironsmith",
    "image": "https://i.pinimg.com/1200x/22/d6/14/22d614e22f12f5c050d423f64e613281.jpg",
    "excerpt": "How seasonal humidity shifts affect crust leather and why animal-fat conditioners outperform synthetic oils."
  },
  {
    "slug": "blog-details-edge-dressing.html",
    "title": "The Art of Edge Dressing: Perfecting the Sole's Final Frame",
    "category": "Craft & Technique",
    "date": "2 Nov 2024",
    "readTime": "6 min",
    "author": "Clara Ironsmith",
    "image": "https://i.pinimg.com/736x/50/d7/38/50d738b7cf8e7215f61a553440afe62a.jpg",
    "excerpt": "The final 5% that consumes 20% of finishing time — matching edge wax, iron burnishing, and welt seal."
  },
  {
    "slug": "blog-details-heel-harmony.html",
    "title": "Heel Height Harmony: Balancing Comfort and Elegance",
    "category": "Craft & Technique",
    "date": "27 Oct 2024",
    "readTime": "5 min",
    "author": "Clara Ironsmith",
    "image": "https://i.pinimg.com/736x/3e/65/30/3e6530ff830e953b505c1385b448b96d.jpg",
    "excerpt": "Balancing heel breast pitch, stack angle, and gait dynamics for long-lasting posture and foot comfort."
  },
  {
    "slug": "blog-details-history-broguing.html",
    "title": "The History of Broguing: From Irish Bogs to Savile Row Boardrooms",
    "category": "Heritage",
    "date": "16 Sep 2024",
    "readTime": "7 min",
    "author": "Clara Ironsmith",
    "image": "https://i.pinimg.com/1200x/d8/99/59/d8995918b04ec007509427a65980980f.jpg",
    "excerpt": "How Scottish and Irish marsh drainage holes evolved into the benchmark of gentlemen's sartorial footwear."
  },
  {
    "slug": "blog-details-inside-atelier.html",
    "title": "Inside the Atelier: A Day in the Life at IronStitch Jermyn Street",
    "category": "Heritage",
    "date": "10 Aug 2024",
    "readTime": "7 min",
    "author": "Clara Ironsmith",
    "image": "https://i.pinimg.com/1200x/71/55/ea/7155ea5d3ec0cf302ca4093e09152fe5.jpg",
    "excerpt": "Step behind our Jermyn Street atelier doors to witness how three generations of cobbling heritage preserve London's finest bespoke shoe craft."
  },
  {
    "slug": "blog-details-mirror-polish.html",
    "title": "The 7-Step Mirror Polish Method: A Master's Guide",
    "category": "Leather Care",
    "date": "8 Nov 2024",
    "readTime": "6 min",
    "author": "Clara Ironsmith",
    "image": "https://images.unsplash.com/photo-1565814636199-ae8133055c1c?w=1000&q=85&fit=crop",
    "excerpt": "Achieve the fabled 'glace' mirror shine on cap-toes using ice water, pure beeswax and traditional French artisan techniques."
  },
  {
    "slug": "blog-details-northampton-legacy.html",
    "title": "Northampton's Shoemaking Legacy: Why Britain Sets the Global Standard",
    "category": "Heritage",
    "date": "30 Aug 2024",
    "readTime": "9 min",
    "author": "Clara Ironsmith",
    "image": "https://i.pinimg.com/736x/aa/b4/75/aab475db26ab00366b2db424552cc1b6.jpg",
    "excerpt": "A journey through the workshops, tanneries, and guild archives that make Northamptonshire the shoemaking capital of the world."
  },
  {
    "slug": "blog-details-northampton-pilgrimage.html",
    "title": "The Northampton Pilgrimage: A Cobbler's Mecca Revisited",
    "category": "Heritage",
    "date": "14 Sep 2024",
    "readTime": "8 min",
    "author": "Clara Ironsmith",
    "image": "https://i.pinimg.com/1200x/31/6b/ea/316bea77ec995aef5daf3586839222fa.jpg",
    "excerpt": "Visiting the secret factory shops, archive vaults, and bespoke outposts of England's leather capital."
  },
  {
    "slug": "blog-details-patina-perfection.html",
    "title": "Patina Perfection: How Time and Care Create Unrivalled Beauty",
    "category": "Leather Care",
    "date": "7 Nov 2024",
    "readTime": "6 min",
    "author": "Clara Ironsmith",
    "image": "https://i.pinimg.com/736x/1c/1c/2e/1c1c2ebf6434f1e4fc6a4f2ac2173653.jpg",
    "excerpt": "Mastering the multi-layered alcohol dyes, wax resist, and sun bleaching that create museum-grade leather patinas."
  },
  {
    "slug": "blog-details-prewar-brogues.html",
    "title": "From Grandfather's Wardrobe: Restoring Pre-War British Brogues",
    "category": "Heritage",
    "date": "22 Sep 2024",
    "readTime": "10 min",
    "author": "George Abbott",
    "image": "https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?w=1000&q=85&fit=crop",
    "excerpt": "A complete archival restoration of 1938 bespoke Churchill-era Oxfords recovered from a country estate attic."
  },
  {
    "slug": "blog-details-scuffed-leather.html",
    "title": "How to Rescue Badly Scuffed Leather: A Complete Restoration Walkthrough",
    "category": "Restoration",
    "date": "18 Oct 2024",
    "readTime": "7 min",
    "author": "George Abbott",
    "image": "https://i.pinimg.com/1200x/c0/6c/cd/c06ccdd7a959e5d55da242dd20e98f74.jpg",
    "excerpt": "Our colour restoration specialist walks through a complete deep-scuff intervention on a beloved suede loafer."
  },
  {
    "slug": "blog-details-shoe-stretching.html",
    "title": "Bunion, Blister, Bliss: The Truth About Shoe Stretching",
    "category": "Craft & Technique",
    "date": "25 Oct 2024",
    "readTime": "5 min",
    "author": "Clara Ironsmith",
    "image": "https://i.pinimg.com/1200x/42/76/16/4276165007e4665b0647ab9555830f8c.jpg",
    "excerpt": "Understanding leather fiber elasticity, cast-iron bunion lasts, and the realistic physiological limits of mechanical widening."
  },
  {
    "slug": "blog-details-suede-sos.html",
    "title": "Suede SOS: Reviving Matted and Stained Suede",
    "category": "Leather Care",
    "date": "28 Oct 2024",
    "readTime": "6 min",
    "author": "Clara Ironsmith",
    "image": "https://i.pinimg.com/1200x/fb/2e/b8/fb2eb8d7a340142a5588e71b4ebe70be.jpg",
    "excerpt": "Brass wire brushes, crepe erasers and steam rejuvenation — emergency protocols for reviving soaked suede and nubuck footwear."
  },
  {
    "slug": "blog-details-vibram-dainite.html",
    "title": "Vibram vs. Dainite: Choosing the Right Replacement Sole",
    "category": "Craft & Technique",
    "date": "3 Nov 2024",
    "readTime": "9 min",
    "author": "Clara Ironsmith",
    "image": "https://i.pinimg.com/1200x/98/2a/a7/982aa752b5e8f4c73dbb07f5e5119747.jpg",
    "excerpt": "A definitive breakdown of traction, durability, comfort and aesthetics across the three world-class sole constructions."
  },
  {
    "slug": "blog-details-waterproofing-myths.html",
    "title": "Waterproofing Myths: What Really Keeps Feet Dry",
    "category": "Seasonal",
    "date": "14 Oct 2024",
    "readTime": "6 min",
    "author": "George Abbott",
    "image": "https://i.pinimg.com/1200x/42/71/50/427150bbe609734f43b6b5edf8c0afb0.jpg",
    "excerpt": "Silicone sprays, mineral oils and oven-heating hacks debunked by master cobblers with over 75 combined years at the bench."
  },
  {
    "slug": "blog-details-winter-salt.html",
    "title": "Winter Salt Defense: Protecting Leather from Seasonal Damage",
    "category": "Seasonal",
    "date": "20 Nov 2024",
    "readTime": "8 min",
    "author": "George Abbott",
    "image": "https://i.pinimg.com/1200x/5c/87/cd/5c87cd654c83a538731184b17fae104a.jpg",
    "excerpt": "Why street de-icer crystallises inside calfskin pores and how to neutralise white salt rings before permanent damage."
  },
  {
    "slug": "blog-details.html",
    "title": "The Goodyear Welt: Why the World's Finest Shoes Still Use a 140-Year-Old Method",
    "category": "Craft & Technique",
    "date": "15 Nov 2024",
    "readTime": "8 min",
    "author": "Clara Ironsmith",
    "image": "https://i.pinimg.com/1200x/a2/82/3a/a2823acda6c559a6bda17f3dc37ccdda.jpg",
    "excerpt": "In an era of fast fashion, the Goodyear welt endures — resoleable, repairable and made to last a lifetime. Our master cobbler explains why this Victorian innovation remains unmatched."
  }
];

  function getCurrentSlug() {
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && canonical.href) {
      const match = canonical.href.match(/blog-details[a-z0-9-]*\.html/i);
      if (match) return match[0].toLowerCase();
    }
    const href = window.location.href.split('?')[0].split('#')[0];
    const match = href.match(/blog-details[a-z0-9-]*\.html/i);
    if (match) return match[0].toLowerCase();
    const rawPath = window.location.pathname.replace(/\\/g, '/');
    const filename = rawPath.substring(rawPath.lastIndexOf('/') + 1);
    if (filename && filename.startsWith('blog-details')) return filename.toLowerCase();
    return 'blog-details.html';
  }

  function init() {
    const isBlogDetail = document.querySelector('.article-header, .sidebar-sticky, [data-related-articles], .article-hero') || /blog-details/i.test(window.location.href);
    if (!isBlogDetail) return;

    const currentSlug = getCurrentSlug();
    const currentArticle = ARTICLES.find(a => a.slug.toLowerCase() === currentSlug.toLowerCase());
    const currentCategory = currentArticle ? currentArticle.category : '';
    const pool = ARTICLES.filter(a => a.slug.toLowerCase() !== currentSlug.toLowerCase());
    const sameCat = pool.filter(a => a.category.toLowerCase() === currentCategory.toLowerCase());
    const otherCat = pool.filter(a => a.category.toLowerCase() !== currentCategory.toLowerCase());
    const selected = [...sameCat, ...otherCat].slice(0, 3);

    // 1. Sidebar Related Articles
    const relatedWidget = document.querySelector('[data-related-articles]');
    if (relatedWidget) {
      let listContainer = relatedWidget.querySelector('.related-articles-list');
      if (!listContainer) {
        listContainer = document.createElement('div');
        listContainer.className = 'related-articles-list';
        listContainer.style.cssText = 'display:flex;flex-direction:column;gap:1rem;margin-top:0.75rem;';
        relatedWidget.appendChild(listContainer);
      }
      listContainer.innerHTML = selected.map(a => `
        <a href="${a.slug}" class="related-article-link" style="display:flex;gap:0.75rem;text-decoration:none;align-items:center;padding:0.4rem 0;border-bottom:1px solid rgba(176,141,87,0.12);transition:all 0.2s ease;">
          <img src="${a.image}" alt="${a.title}" style="width:60px;height:60px;border-radius:var(--r-sm);object-fit:cover;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.08);" />
          <div>
            <div style="font-size:0.85rem;font-weight:600;color:var(--text-primary);line-height:1.35;margin-bottom:0.25rem;">${a.title}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);display:flex;gap:0.35rem;align-items:center;">
              <span style="color:var(--brass);font-weight:600;">${a.category}</span>
              <span>·</span>
              <span>${a.date}</span>
            </div>
          </div>
        </a>
      `).join('');
    }

    // 2. Bottom "More from the Journal" section
    const moreSection = document.querySelector('[aria-labelledby="more-posts"]');
    if (moreSection) {
      const blogGrid = moreSection.querySelector('.blog-grid');
      if (blogGrid) {
        const flagshipSlugs = [
          'blog-details.html',
          'blog-details-scuffed-leather.html',
          'blog-details-inside-atelier.html',
          'blog-details-autumn-prep.html',
          'blog-details-mirror-polish.html',
          'blog-details-prewar-brogues.html'
        ];
        const bottomArticles = [];
        for (const slug of flagshipSlugs) {
          if (slug !== currentSlug) {
            const art = ARTICLES.find(a => a.slug === slug);
            if (art && !bottomArticles.some(b => b.slug === art.slug)) bottomArticles.push(art);
            if (bottomArticles.length === 3) break;
          }
        }
        if (bottomArticles.length < 3) {
          for (const a of pool) {
            if (!bottomArticles.some(b => b.slug === a.slug)) bottomArticles.push(a);
            if (bottomArticles.length === 3) break;
          }
        }
        blogGrid.innerHTML = bottomArticles.map((a, idx) => `
          <article class="blog-card reveal revealed delay-${idx + 1}" style="opacity: 1 !important; transform: none !important;">
            <div class="blog-card__image">
              <img src="${a.image}" alt="${a.title}" loading="lazy"/>
            </div>
            <div class="blog-card__body">
              <div class="card__tag">${a.category}</div>
              <div class="blog-card__meta"><span>${a.author}</span><span>${a.date}</span><span>${a.readTime}</span></div>
              <h3 class="blog-card__title"><a href="${a.slug}">${a.title}</a></h3>
              <p class="blog-card__excerpt">${a.excerpt}</p>
              <a href="${a.slug}" class="blog-card__link">Read More <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></svg></a>
            </div>
          </article>
        `).join('');

        if (typeof ScrollReveal !== 'undefined' && ScrollReveal.observeAll) {
          ScrollReveal.observeAll(blogGrid);
        }
      }
    }
  }

  return { init, ARTICLES };
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
  RelatedArticles.init();
});
