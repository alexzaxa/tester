(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  const failOpen = () => {
    root.classList.add('js-fallback');
    const body = document.body;
    if (!body) return;
    body.classList.remove('page-loading', 'page-leaving');
    body.classList.add('page-ready');
    const loader = document.querySelector('[data-page-loader]');
    if (loader) loader.setAttribute('aria-hidden', 'true');
  };

  const exposeLoader = () => {
    const loader = document.querySelector('[data-page-loader]');
    if (loader && document.body?.classList.contains('page-loading')) {
      loader.setAttribute('aria-hidden', 'false');
    }
  };

  window.__moreThanKioskFailOpen = failOpen;
  window.__moreThanKioskLoaderFailSafe = window.setTimeout(failOpen, 2200);

  window.addEventListener('error', (event) => {
    const target = event.target;
    const failedScript = target instanceof HTMLScriptElement;
    const runtimeScriptError = typeof event.filename === 'string' && /\/js\//.test(event.filename);
    if (failedScript || runtimeScriptError) failOpen();
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', exposeLoader, { once: true });
  } else {
    exposeLoader();
  }
})();
