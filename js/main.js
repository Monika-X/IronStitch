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

  function init() {
    overlay = document.createElement('div');
    overlay.className = 'page-transition';
    document.body.appendChild(overlay);

    overlay.classList.add('leaving');
    overlay.addEventListener('animationend', () => {
      overlay.className = 'page-transition';
    }, { once: true });

    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http') || a.target === '_blank') return;

      a.addEventListener('click', e => {
        e.preventDefault();
        const dest = a.href;
        overlay.classList.add('entering');
        overlay.addEventListener('animationend', () => {
          window.location.href = dest;
        }, { once: true });
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
    document.querySelectorAll('.navbar__nav a, .mobile-menu a').forEach(a => {
      const href = a.getAttribute('href');
      if (href && (href === currentPath || href.includes(currentPath))) {
        a.classList.add('active');
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && menuOpen) closeMenu();
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

  function toggleMenu() { menuOpen ? closeMenu() : openMenu(); }

  function openMenu() {
    menuOpen = true;
    hamburger?.classList.add('open');
    mobileMenu?.classList.add('open');
    overlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    menuOpen = false;
    hamburger?.classList.remove('open');
    mobileMenu?.classList.remove('open');
    overlay?.classList.remove('open');
    document.body.style.overflow = '';
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
      form.addEventListener('submit', e => {
        e.preventDefault();
        let valid = true;

        form.querySelectorAll('[data-required]').forEach(field => {
          const err = field.parentElement.querySelector('.form-error');
          if (!field.value.trim()) {
            field.classList.add('error');
            if (err) { err.textContent = err.dataset.msg || 'This field is required.'; err.classList.add('visible'); }
            valid = false;
          } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
            field.classList.add('error');
            if (err) { err.textContent = 'Please enter a valid email address.'; err.classList.add('visible'); }
            valid = false;
          } else {
            field.classList.remove('error');
            if (err) err.classList.remove('visible');
          }
        });

        if (valid) {
          const btn = form.querySelector('[type="submit"]');
          const orig = btn?.textContent;
          if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }
          setTimeout(() => {
            showToast('✓ Message Sent!', "We'll get back to you within 24 hours.");
            form.reset();
            if (btn) { btn.textContent = orig; btn.disabled = false; }
          }, 1500);
        }
      });

      form.querySelectorAll('[data-required]').forEach(field => {
        field.addEventListener('input', () => {
          const err = field.parentElement.querySelector('.form-error');
          if (field.value.trim()) {
            field.classList.remove('error');
            if (err) err.classList.remove('visible');
          }
        });
      });
    });
  }

  function showToast(title, text) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<div class="toast__title">${title}</div><div class="toast__text">${text}</div>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => { toast.classList.remove('visible'); setTimeout(() => toast.remove(), 400); }, 4000);
  }

  return { init };
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
      el.textContent = prefix + (Number.isInteger(target) ? Math.round(v) : v.toFixed(1)) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = prefix + target + suffix;
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
  TypedText.init();
  TestimonialSlider.init();
  initAnchorScroll();
});
