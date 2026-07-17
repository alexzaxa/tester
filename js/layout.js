(() => {
  const icon = (name) => `<span class="svg-icon" aria-hidden="true">${window.MTAK_ICONS[name] || ''}</span>`;
  const page = document.body.dataset.page || 'home';
  const homeHref = page === 'home' ? '#home' : 'index.html';
  const navItems = [
    { key: 'home', label: 'Αρχική', href: homeHref },
    { key: 'menu', label: 'Κατάλογος', href: 'menu.html' },
    { key: 'coffee', label: 'Καφές', href: 'coffee-chalkoutsi.html' },
    { key: 'cocktails', label: 'Cocktails', href: 'cocktails-chalkoutsi.html' },
    { key: 'directions', label: 'Οδηγίες', href: 'directions.html' },
    { key: 'contact', label: 'Επικοινωνία', href: 'contact.html' }
  ];
  const activeKey = ['home', 'menu', 'coffee', 'cocktails', 'kiosk', 'directions', 'contact', 'privacy'].includes(page) ? page : '';
  const catalogActive = ['menu', 'coffee', 'cocktails', 'kiosk'].includes(page);
  const navMarkup = navItems.map((item) => `<a${item.key === activeKey ? ' class="active" aria-current="page"' : ''} href="${item.href}">${item.label}</a>`).join('');
  const logoMarkup = `
    <img src="assets/images/brand/more-than-kiosk-logo.webp" alt="" width="1000" height="1000">
    <span class="brand-copy"><strong>More Than a Kiosk</strong><small>Χαλκούτσι · Καφέ &amp; Kiosk</small></span>`;

  document.querySelector('[data-shared-banner]')?.remove();

  const header = document.querySelector('[data-shared-header]');
  if (header) header.innerHTML = `
    <header class="site-header">
      <div class="container header-row">
        <a class="brand kiosk-brand" href="index.html" aria-label="More Than a Kiosk — Αρχική">${logoMarkup}</a>
        <nav class="desktop-nav" aria-label="Κύρια πλοήγηση">${navMarkup}</nav>
        <div class="header-actions">
          <a class="header-phone" href="tel:+302295071211">${icon('phone')}<span>22950 71211</span></a>
          <button class="menu-toggle" type="button" data-open-menu aria-controls="mobileMenu" aria-expanded="false" aria-label="Άνοιγμα μενού">${icon('menu')}</button>
        </div>
      </div>
    </header>`;

  const drawer = document.querySelector('[data-shared-drawer]');
  if (drawer) drawer.innerHTML = `
    <div class="mobile-menu" id="mobileMenu" aria-hidden="true">
      <button class="dialog-backdrop" type="button" data-close-menu aria-label="Κλείσιμο μενού"></button>
      <aside class="mobile-menu-panel" role="dialog" aria-modal="true" aria-labelledby="mobileMenuTitle" tabindex="-1">
        <div class="mobile-menu-head">
          <div class="mobile-menu-brand">${logoMarkup}</div>
          <button class="icon-button" type="button" data-close-menu aria-label="Κλείσιμο μενού">${icon('close')}</button>
        </div>
        <h2 class="sr-only" id="mobileMenuTitle">Μενού More Than a Kiosk</h2>
        <nav class="mobile-menu-links" aria-label="Μενού κινητού">${navMarkup}<a${activeKey === 'privacy' ? ' class="active" aria-current="page"' : ''} href="privacy.html">Απόρρητο</a></nav>
        <div class="mobile-menu-actions">
          <a class="primary-button" href="tel:+302295071211">${icon('phone')}Κάλεσε τώρα</a>
          <a class="secondary-button" href="https://maps.app.goo.gl/wuxAspR66vvUeKUTA" target="_blank" rel="noopener noreferrer">${icon('pin')}Οδηγίες</a>
        </div>
        <div class="mobile-social-links" aria-label="Social media">
          <a href="https://www.instagram.com/more_than_coffee_and_cocktail/" target="_blank" rel="noopener noreferrer me" aria-label="Instagram">${icon('instagram')}<span>Instagram</span></a>
          <a href="https://www.facebook.com/share/187zwPH4FL/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer me" aria-label="Facebook">${icon('facebook')}<span>Facebook</span></a>
        </div>
      </aside>
    </div>`;

  const footer = document.querySelector('[data-shared-footer]');
  if (footer) footer.innerHTML = `
    <footer class="site-footer kiosk-footer">
      <div class="footer-rainbow" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
      <div class="container footer-grid">
        <div class="footer-brand">
          <a class="footer-logo" href="index.html">${logoMarkup}</a>
          <p>Καφές, ροφήματα, cocktails και επιλεγμένα ποτά στην Ποσειδώνος 13, Χαλκούτσι.</p>
          <div class="footer-social-links" aria-label="Social media">
            <a href="https://www.instagram.com/more_than_coffee_and_cocktail/" target="_blank" rel="noopener noreferrer me" aria-label="Instagram">${icon('instagram')}<span>Instagram</span></a>
            <a href="https://www.facebook.com/share/187zwPH4FL/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer me" aria-label="Facebook">${icon('facebook')}<span>Facebook</span></a>
          </div>
        </div>
        <div class="footer-column"><h3>Πλοήγηση</h3>${navMarkup}<a${activeKey === 'kiosk' ? ' class="active" aria-current="page"' : ''} href="kiosk-chalkoutsi.html">Περίπτερο στο Χαλκούτσι</a></div>
        <div class="footer-column"><h3>Επικοινωνία</h3><a href="tel:+302295071211">22950 71211</a><a href="https://maps.app.goo.gl/wuxAspR66vvUeKUTA" target="_blank" rel="noopener noreferrer">Ποσειδώνος 13<br>Χαλκούτσι, Αττική ${icon('external')}</a><a href="https://www.instagram.com/more_than_coffee_and_cocktail/" target="_blank" rel="noopener noreferrer me">${icon('instagram')}Instagram</a><a href="https://www.facebook.com/share/187zwPH4FL/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer me">${icon('facebook')}Facebook</a></div>
        <div class="footer-column"><h3>Ωράριο</h3><p>Κυρ–Πεμ<br><strong>06:00–01:00</strong></p><p>Παρ–Σαβ<br><strong>06:00–01:30</strong></p></div>
      </div>
      <div class="container footer-bottom"><span>© 2026 More Than a Kiosk</span><a href="privacy.html">Πολιτική απορρήτου</a></div>
    </footer>`;

  const bottom = document.querySelector('[data-shared-bottom-nav]');
  if (bottom) bottom.innerHTML = `
    <div class="mobile-bottom-nav-spacer" aria-hidden="true"></div>
    <nav class="mobile-bottom-nav" aria-label="Γρήγορη πλοήγηση">
      <a${activeKey === 'home' ? ' class="active" aria-current="page"' : ''} href="${homeHref}">${icon('home')}<span>Αρχική</span></a>
      <a${catalogActive ? ' class="active" aria-current="page"' : ''} href="menu.html">${icon('catalog')}<span>Κατάλογος</span></a>
      <a${activeKey === 'directions' ? ' class="active" aria-current="page"' : ''} href="directions.html">${icon('pin')}<span>Οδηγίες</span></a>
      <a${activeKey === 'contact' ? ' class="active" aria-current="page"' : ''} href="contact.html">${icon('contact')}<span>Επικοινωνία</span></a>
    </nav>`;

  const lightbox = document.querySelector('[data-gallery-lightbox]');
  if (lightbox) lightbox.innerHTML = `
    <div class="lightbox" id="galleryLightbox" aria-hidden="true">
      <button class="dialog-backdrop" type="button" data-close-lightbox aria-label="Κλείσιμο φωτογραφίας"></button>
      <figure class="lightbox-dialog" role="dialog" aria-modal="true" aria-labelledby="lightboxCaption" tabindex="-1">
        <button class="icon-button lightbox-close" type="button" data-close-lightbox aria-label="Κλείσιμο φωτογραφίας">${icon('close')}</button>
        <img id="lightboxImage" src="assets/images/licensed-stock/cafe-interior.jpg" alt="" width="1600" height="1067">
        <figcaption id="lightboxCaption"></figcaption>
      </figure>
    </div>`;
})();
