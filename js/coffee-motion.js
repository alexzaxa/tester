(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 760px)');
  const body = document.body;
  if (!body) return;

  const random = (min, max) => Math.random() * (max - min) + min;

  function addAosAttributes() {
    const groups = [...document.querySelectorAll('.catalog-group')];
    groups.forEach((element, index) => {
      if (!element.dataset.aos) element.dataset.aos = 'fade-up';
      element.dataset.aosDuration = String(560 + (index % 3) * 70);
      element.dataset.aosDelay = String(Math.min((index % 3) * 65, 130));
    });

    const selectors = [
      '.quick-card', '.story-card', '.story-copy', '.kiosk-category-card',
      '.mosaic-photo', '.info-card', '.map-card', '.offer-card',
      '.contact-visual', '.bottle-pricing', '.official-menu-note'
    ];

    document.querySelectorAll(selectors.join(',')).forEach((element, index) => {
      if (!element.dataset.aos) element.dataset.aos = index % 2 ? 'fade-up' : 'zoom-in-up';
      element.dataset.aosDuration = element.dataset.aosDuration || '720';
      element.dataset.aosDelay = element.dataset.aosDelay || String(Math.min((index % 4) * 55, 165));
    });
  }

  function initAos() {
    if (reducedMotion.matches || !window.AOS) return;
    document.documentElement.classList.add('aos-ready');
    window.AOS.init({
      once: true,
      mirror: false,
      offset: 54,
      duration: 720,
      easing: 'ease-out-cubic',
      anchorPlacement: 'top-bottom'
    });
  }

  function createCoffeeBeanField() {
    if (body.dataset.page !== 'menu' || reducedMotion.matches) return;

    const field = document.createElement('div');
    field.className = 'coffee-bean-field';
    field.setAttribute('aria-hidden', 'true');
    const count = mobile.matches ? 8 : 15;

    for (let index = 0; index < count; index += 1) {
      const bean = document.createElement('span');
      bean.className = 'coffee-bean';
      bean.style.setProperty('--bean-left', `${random(1, 98).toFixed(2)}%`);
      bean.style.setProperty('--bean-size', `${random(11, mobile.matches ? 19 : 24).toFixed(1)}px`);
      bean.style.setProperty('--bean-opacity', random(.055, .14).toFixed(3));
      bean.style.setProperty('--bean-rotate', `${random(-80, 80).toFixed(0)}deg`);
      bean.style.setProperty('--bean-duration', `${random(9, 16).toFixed(2)}s`);
      bean.style.setProperty('--bean-delay', `${random(-15, 0).toFixed(2)}s`);
      bean.style.setProperty('--bean-drift', `${random(-80, 80).toFixed(0)}px`);
      field.appendChild(bean);
    }

    body.appendChild(field);

    if (!window.anime) {
      field.classList.add('is-css-fallback');
      return;
    }

    field.querySelectorAll('.coffee-bean').forEach((bean, index) => {
      const startY = random(-140, -30);
      const endY = window.innerHeight + random(80, 260);
      window.anime({
        targets: bean,
        translateY: [startY, endY],
        translateX: [random(-28, 28), random(-100, 100)],
        rotate: [random(-120, 120), random(380, 760)],
        duration: random(9000, 17000),
        delay: index * 240 + random(0, 2200),
        easing: 'linear',
        loop: true
      });
    });
  }

  function addCoffeeSteam() {
    if (body.dataset.page !== 'menu') return;
    const coffeeHeader = document.querySelector('#coffee .catalog-panel-head');
    if (!coffeeHeader || coffeeHeader.querySelector('.coffee-steam')) return;
    const steam = document.createElement('div');
    steam.className = 'coffee-steam';
    steam.setAttribute('aria-hidden', 'true');
    steam.innerHTML = '<span></span><span></span><span></span>';
    coffeeHeader.appendChild(steam);
  }

  function animateMenuItems() {
    if (body.dataset.page !== 'menu' || reducedMotion.matches || !window.anime || !('IntersectionObserver' in window)) return;
    body.classList.add('motion-enhanced');
    const groups = [...document.querySelectorAll('.catalog-group')];
    const observer = new IntersectionObserver((entries, activeObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const items = [...entry.target.querySelectorAll('.menu-price-list > li')];
        items.forEach((item) => item.classList.add('motion-stagger-item'));
        window.anime({
          targets: items,
          opacity: [0, 1],
          translateX: [-13, 0],
          delay: window.anime.stagger(34),
          duration: 460,
          easing: 'easeOutQuad'
        });
        activeObserver.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
    groups.forEach((group) => observer.observe(group));
  }

  function animateBrandMoments() {
    if (reducedMotion.matches || !window.anime) return;
    const logoTargets = document.querySelectorAll('.hero-logo-badge, .official-menu-brand-lockup');
    if (logoTargets.length) {
      window.anime({
        targets: logoTargets,
        opacity: [0, 1],
        scale: [.72, 1],
        rotate: [-8, 0],
        duration: 1050,
        delay: 320,
        easing: 'easeOutElastic(1, .72)'
      });
    }

    const badge = document.querySelector('.hero-logo-badge');
    if (badge) {
      window.anime({
        targets: badge,
        translateY: [-4, 5],
        rotate: [-1.5, 1.5],
        direction: 'alternate',
        duration: 3100,
        easing: 'easeInOutSine',
        loop: true
      });
    }
  }

  function addPointerTilt() {
    if (reducedMotion.matches || mobile.matches || !window.anime) return;
    document.querySelectorAll('.catalog-group, .kiosk-category-card').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const bounds = card.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - .5;
        const y = (event.clientY - bounds.top) / bounds.height - .5;
        window.anime.remove(card);
        window.anime({
          targets: card,
          rotateY: x * 2.2,
          rotateX: y * -2.2,
          translateY: -2,
          duration: 260,
          easing: 'easeOutQuad'
        });
      });
      card.addEventListener('pointerleave', () => {
        window.anime.remove(card);
        window.anime({
          targets: card,
          rotateY: 0,
          rotateX: 0,
          translateY: 0,
          duration: 420,
          easing: 'easeOutElastic(1, .75)'
        });
      });
    });
  }

  function init() {
    addAosAttributes();
    addCoffeeSteam();
    initAos();
    createCoffeeBeanField();
    animateMenuItems();
    animateBrandMoments();
    addPointerTilt();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
