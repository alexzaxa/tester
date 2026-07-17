(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  let lastFocused = null;

  const pageLoadStartedAt = performance.now();
  const arrivedFromPageTransition = (() => {
    try {
      const active = sessionStorage.getItem('more-than-kiosk-page-transition') === '1';
      sessionStorage.removeItem('more-than-kiosk-page-transition');
      return active;
    } catch {
      return false;
    }
  })();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileNavMedia = window.matchMedia('(max-width: 760px)');
  const coarsePointerMedia = window.matchMedia('(pointer: coarse)');
  let pageLoadFinished = false;
  let pageReadyApplied = false;
  let pageNavigationPending = false;
  let bottomNavObserver = null;
  let revealObserver = null;
  let heroMotionFrame = 0;

  function markPageReady() {
    if (pageLoadFinished) return;
    pageLoadFinished = true;
    if (window.__moreThanKioskLoaderFailSafe) window.clearTimeout(window.__moreThanKioskLoaderFailSafe);
    document.documentElement.classList.remove('js-fallback');
    const minimumDisplayTime = prefersReducedMotion.matches || arrivedFromPageTransition ? 0 : 380;
    const delay = Math.max(0, minimumDisplayTime - (performance.now() - pageLoadStartedAt));
    window.setTimeout(() => {
      const loader = $('[data-page-loader]');
      document.body.classList.remove('page-loading', 'page-leaving');
      document.body.classList.add('page-ready');
      loader?.setAttribute('aria-hidden', 'true');
      pageReadyApplied = true;
      syncBottomNavClearance();
    }, delay);
  }

  function setupPageLoading() {
    if (document.readyState === 'complete') markPageReady();
    else window.addEventListener('load', markPageReady, { once: true });

    // Never leave visitors behind a loader if a third-party resource stalls.
    window.setTimeout(markPageReady, 1800);
    window.addEventListener('pageshow', (event) => {
      pageNavigationPending = false;
      document.body.classList.remove('page-leaving');
      if (event.persisted || pageReadyApplied) {
        pageLoadFinished = true;
        pageReadyApplied = true;
        document.body.classList.remove('page-loading');
        document.body.classList.add('page-ready');
        $('[data-page-loader]')?.setAttribute('aria-hidden', 'true');
      }
      syncBottomNavClearance();
    });
  }

  function isInternalNavigation(link, url) {
    if (link.target && link.target !== '_self') return false;
    if (link.hasAttribute('download')) return false;
    if (!['http:', 'https:', 'file:'].includes(url.protocol)) return false;
    if (url.protocol === 'file:') return window.location.protocol === 'file:';
    return url.origin === window.location.origin;
  }

  function setupPageTransitions() {
    document.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest('a[href]');
      if (!link || pageNavigationPending) return;

      const rawHref = link.getAttribute('href');
      if (!rawHref || rawHref.startsWith('javascript:')) return;

      const url = new URL(link.href, window.location.href);
      if (!isInternalNavigation(link, url)) return;

      const sameDocument = url.pathname === window.location.pathname && url.search === window.location.search;
      if (sameDocument && (url.hash || url.href === window.location.href)) return;

      event.preventDefault();
      pageNavigationPending = true;
      const loader = $('[data-page-loader]');
      const label = $('.page-loader-label', loader || document);
      if (label) label.textContent = 'Μετάβαση στη σελίδα';
      loader?.setAttribute('aria-hidden', 'false');
      document.body.classList.remove('page-loading', 'page-ready');
      document.body.classList.add('page-leaving');

      const navigate = () => {
        try { sessionStorage.setItem('more-than-kiosk-page-transition', '1'); } catch {}
        window.location.href = url.href;
      };
      if (prefersReducedMotion.matches) navigate();
      else window.setTimeout(navigate, 260);
    });
  }

  function syncBottomNavClearance() {
    const root = document.documentElement;
    const nav = $('.mobile-bottom-nav');
    if (!nav || !mobileNavMedia.matches || getComputedStyle(nav).display === 'none') {
      root.style.setProperty('--mobile-bottom-nav-clearance', '0px');
      return;
    }

    const rect = nav.getBoundingClientRect();
    const viewportHeight = window.innerHeight || root.clientHeight;
    const bottomOffset = Math.max(0, viewportHeight - rect.bottom);
    const contentGap = Number.parseFloat(getComputedStyle(root).getPropertyValue('--mobile-nav-content-gap')) || 0;
    const clearance = Math.ceil(rect.height + bottomOffset + contentGap);
    root.style.setProperty('--mobile-bottom-nav-clearance', `${clearance}px`);
  }

  function setupBottomNavClearance() {
    syncBottomNavClearance();
    const nav = $('.mobile-bottom-nav');
    if ('ResizeObserver' in window && nav) {
      bottomNavObserver = new ResizeObserver(syncBottomNavClearance);
      bottomNavObserver.observe(nav);
    }
    window.addEventListener('resize', syncBottomNavClearance, { passive: true });
    window.addEventListener('orientationchange', syncBottomNavClearance, { passive: true });
    window.visualViewport?.addEventListener('resize', syncBottomNavClearance, { passive: true });
    mobileNavMedia.addEventListener?.('change', syncBottomNavClearance);
    document.fonts?.ready.then(syncBottomNavClearance).catch(() => {});
  }

  function motionIsLimited() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return Boolean(prefersReducedMotion.matches || connection?.saveData || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4));
  }

  function inferRevealKind(element) {
    if (element.classList.contains('product-card')) return 'card';
    if (element.classList.contains('gallery-item')) return 'scale';
    if (element.classList.contains('story-card') || element.classList.contains('info-card')) return 'left';
    if (element.classList.contains('map-card')) return 'right';
    if (element.matches('.story-grid > .reveal:not(.story-card)')) return 'right';
    return element.dataset.revealKind || 'up';
  }

  function prepareRevealElement(element, order = 0) {
    if (!element.dataset.revealKind) element.dataset.revealKind = inferRevealKind(element);
    const step = mobileNavMedia.matches ? 46 : 68;
    const cap = mobileNavMedia.matches ? 276 : 408;
    element.style.setProperty('--reveal-delay', `${Math.min(order * step, cap)}ms`);
  }

  function prepareStaticMotionTargets() {
    const selectors = [
      '.quick-card',
      '.section-head',
      '.story-point',
      '.catalog-summary',
      '.map-footer',
      '.footer-grid > *'
    ];
    $$(selectors.join(',')).forEach((element) => element.classList.add('reveal'));

    const groups = [
      '.quick-grid',
      '.story-points',
      '.featured-grid',
      '.product-grid',
      '.gallery-grid',
      '.info-grid',
      '.footer-grid'
    ];
    groups.forEach((selector) => {
      $$(selector).forEach((group) => {
        $$('.reveal', group).forEach((element, index) => prepareRevealElement(element, index));
      });
    });
  }

  function setupHeroMotion() {
    const hero = $('.hero');
    if (!hero || motionIsLimited()) return;
    const media = $('.hero-media', hero);
    if (!media) return;

    const update = () => {
      heroMotionFrame = 0;
      const rect = hero.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
      const distance = mobileNavMedia.matches ? 18 : 34;
      media.style.setProperty('--hero-shift', `${Math.round(progress * distance)}px`);
    };
    const requestUpdate = () => {
      if (!heroMotionFrame) heroMotionFrame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
  }

  function setupMotionSystem() {
    const root = document.documentElement;
    root.classList.add('motion-ready');
    root.classList.toggle('coarse-pointer', coarsePointerMedia.matches);
    root.classList.toggle('motion-lite', motionIsLimited());
    coarsePointerMedia.addEventListener?.('change', (event) => root.classList.toggle('coarse-pointer', event.matches));
    prepareStaticMotionTargets();
    setupHeroMotion();
  }

  function bindMobileSheetGesture(root) {
    const dialog = $('.product-dialog', root);
    const handle = $('[data-sheet-handle]', root);
    if (!dialog || !handle || !coarsePointerMedia.matches || !mobileNavMedia.matches) return;

    let pointerId = null;
    let startY = 0;
    let lastY = 0;
    let lastTime = 0;
    let velocity = 0;

    const reset = () => {
      pointerId = null;
      root.classList.remove('dragging');
      dialog.style.removeProperty('--sheet-drag');
      $('.dialog-backdrop', root)?.style.removeProperty('opacity');
    };

    handle.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'touch' || !root.classList.contains('open') || dialog.scrollTop > 0) return;
      pointerId = event.pointerId;
      startY = lastY = event.clientY;
      lastTime = performance.now();
      velocity = 0;
      handle.setPointerCapture?.(pointerId);
      root.classList.add('dragging');
    });

    handle.addEventListener('pointermove', (event) => {
      if (event.pointerId !== pointerId) return;
      const now = performance.now();
      const delta = Math.max(0, event.clientY - startY);
      const elapsed = Math.max(1, now - lastTime);
      velocity = (event.clientY - lastY) / elapsed;
      lastY = event.clientY;
      lastTime = now;
      dialog.style.setProperty('--sheet-drag', `${delta}px`);
      const backdrop = $('.dialog-backdrop', root);
      if (backdrop) backdrop.style.opacity = String(Math.max(0, 1 - delta / 420));
    });

    const finish = (event) => {
      if (event.pointerId !== pointerId) return;
      const delta = Math.max(0, event.clientY - startY);
      handle.releasePointerCapture?.(pointerId);
      if (delta > Math.min(130, dialog.offsetHeight * .2) || velocity > .7) {
        reset();
        closeDialog(root);
        return;
      }
      root.classList.add('sheet-snapback');
      dialog.style.setProperty('--sheet-drag', '0px');
      $('.dialog-backdrop', root)?.style.removeProperty('opacity');
      window.setTimeout(() => {
        root.classList.remove('sheet-snapback');
        reset();
      }, 280);
    };

    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', reset);
  }

  function focusables(root) {
    return $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', root)
      .filter((element) => !element.hidden && element.getClientRects().length > 0);
  }

  function setBackgroundInert(activeDialog, inert) {
    const activeHost = activeDialog.closest('body > *') || activeDialog;
    [...document.body.children].forEach((child) => {
      if (child === activeHost || child.tagName === 'SCRIPT') return;
      if (inert) child.setAttribute('inert', '');
      else child.removeAttribute('inert');
    });
  }

  function openDialog(root, opener) {
    if (!root) return;
    if (root._closeTimer) window.clearTimeout(root._closeTimer);
    root.classList.remove('closing', 'sheet-snapback', 'dragging');
    $('.product-dialog', root)?.style.removeProperty('--sheet-drag');
    $('.dialog-backdrop', root)?.style.removeProperty('opacity');
    lastFocused = opener || document.activeElement;
    root.classList.add('open');
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    setBackgroundInert(root, true);
    const dialog = $('[role="dialog"]', root);
    requestAnimationFrame(() => (focusables(dialog)[0] || dialog).focus());
  }

  function closeDialog(root) {
    if (!root || !root.classList.contains('open')) return;
    root.classList.add('closing');
    root.classList.remove('open', 'dragging', 'sheet-snapback');
    $('.product-dialog', root)?.style.removeProperty('--sheet-drag');
    $('.dialog-backdrop', root)?.style.removeProperty('opacity');
    const delay = prefersReducedMotion.matches ? 0 : (mobileNavMedia.matches ? 360 : 280);
    root._closeTimer = window.setTimeout(() => {
      root.classList.remove('closing');
      root.setAttribute('aria-hidden', 'true');
      setBackgroundInert(root, false);
      document.body.classList.remove('no-scroll');
      if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
      lastFocused = null;
    }, delay);
  }

  function trapDialog(event, root) {
    if (!root?.classList.contains('open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialog(root);
      return;
    }
    if (event.key !== 'Tab') return;
    const dialog = $('[role="dialog"]', root);
    const items = focusables(dialog);
    if (!items.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function revealElements(root = document) {
    const elements = $$('.reveal:not(.visible)', root);
    elements.forEach((element, index) => prepareRevealElement(element, index));
    if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('visible'));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    }
    elements.forEach((element) => revealObserver.observe(element));
  }

  function bindMobileMenu() {
    const menu = $('#mobileMenu');
    const opener = $('[data-open-menu]');
    if (!menu || !opener) return;
    const open = () => {
      opener.setAttribute('aria-expanded', 'true');
      openDialog(menu, opener);
    };
    const close = () => {
      opener.setAttribute('aria-expanded', 'false');
      closeDialog(menu);
    };
    opener.addEventListener('click', open);
    $$('[data-close-menu]', menu).forEach((button) => button.addEventListener('click', close));
    $$('.mobile-menu-links a', menu).forEach((link) => link.addEventListener('click', close));
    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') opener.setAttribute('aria-expanded', 'false');
      trapDialog(event, menu);
    });
  }

  function bindGallery() {
    const lightbox = $('#galleryLightbox');
    if (!lightbox) return;
    $$('[data-lightbox]').forEach((button) => {
      button.addEventListener('click', () => {
        const image = $('#lightboxImage');
        image.src = button.dataset.lightbox;
        image.alt = button.dataset.caption || '';
        $('#lightboxCaption').textContent = button.dataset.caption || '';
        openDialog(lightbox, button);
      });
    });
    $$('[data-close-lightbox]', lightbox).forEach((button) => button.addEventListener('click', () => closeDialog(lightbox)));
    lightbox.addEventListener('keydown', (event) => trapDialog(event, lightbox));
  }

  function bindMapConsent() {
    const host = $('[data-map-host]');
    const button = $('[data-load-map]', host || document);
    if (!host || !button) return;

    button.addEventListener('click', () => {
      if (host.classList.contains('is-loaded')) return;
      button.disabled = true;
      button.textContent = 'Φόρτωση…';

      const iframe = document.createElement('iframe');
      iframe.title = 'Χάρτης για το More Than a Kiosk';
      iframe.loading = 'eager';
      iframe.referrerPolicy = 'no-referrer';
      iframe.allowFullscreen = true;
      iframe.src = host.dataset.mapSrc;
      iframe.addEventListener('load', () => host.setAttribute('aria-busy', 'false'), { once: true });

      host.setAttribute('aria-busy', 'true');
      host.classList.add('is-loaded');
      host.replaceChildren(iframe);
    });
  }

  function bindPageUtilities() {
    const feedback = $('[data-action-feedback]');
    $('[data-copy-address]')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText('Ποσειδώνος 13, Χαλκούτσι, Αττική');
        if (feedback) feedback.textContent = 'Η διεύθυνση αντιγράφηκε.';
      } catch { if (feedback) feedback.textContent = 'Δεν ήταν δυνατή η αντιγραφή. Κράτησε πατημένη τη διεύθυνση για αντιγραφή.'; }
    });
    $('[data-share-location]')?.addEventListener('click', async () => {
      const data = { title: 'More Than a Kiosk', text: 'Ποσειδώνος 13, Χαλκούτσι', url: 'https://maps.app.goo.gl/wuxAspR66vvUeKUTA' };
      try {
        if (navigator.share) await navigator.share(data);
        else { await navigator.clipboard.writeText(data.url); if (feedback) feedback.textContent = 'Ο σύνδεσμος τοποθεσίας αντιγράφηκε.'; }
      } catch (error) { if (error?.name !== 'AbortError' && feedback) feedback.textContent = 'Η κοινοποίηση δεν ολοκληρώθηκε.'; }
    });
  }

  function hydrateInlineIcons() {
    $$('[data-inline-icon]').forEach((element) => {
      const name = element.dataset.inlineIcon;
      element.innerHTML = window.MTAK_ICONS[name] || '';
      element.setAttribute('aria-hidden', 'true');
    });
  }

  function setupMenuCategoryFab() {
    const toggle = $('[data-menu-category-toggle]');
    const nav = $('#menuCategoryNav');
    const backdrop = $('[data-menu-category-close]');
    if (!toggle || !nav || !backdrop) return;

    const setOpen = (open) => {
      document.body.classList.toggle('menu-category-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Κλείσιμο κατηγοριών καταλόγου' : 'Άνοιγμα κατηγοριών καταλόγου');
      nav.setAttribute('aria-hidden', String(!open));
      backdrop.hidden = !open;
    };

    toggle.addEventListener('click', () => setOpen(!document.body.classList.contains('menu-category-open')));
    backdrop.addEventListener('click', () => setOpen(false));
    nav.addEventListener('click', (event) => { if (event.target.closest('a[href^="#"]')) setOpen(false); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setOpen(false); });
  }

  function bindHeader() {
    const header = $('.site-header');
    if (!header) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      header.classList.toggle('scrolled', window.scrollY > 12);
    };
    const requestUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
  }

  setupPageLoading();
  setupPageTransitions();

  document.addEventListener('DOMContentLoaded', () => {
    hydrateInlineIcons();
    setupMotionSystem();
    setupBottomNavClearance();
    setupMenuCategoryFab();
    bindHeader();
    bindMobileMenu();
    bindGallery();
    bindMapConsent();
    bindPageUtilities();

    revealElements();
    window.__MTAK_APP_INITIALIZED = true;
  });
})();
