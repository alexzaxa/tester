(() => {
  'use strict';
  const config = window.MTAK_SUPABASE || {};
  const params = new URLSearchParams(location.search);
  const qrToken = params.get('qr');
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { session: null, items: [] };
  const money = new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' });

  async function rpc(name, body) {
    const response = await fetch(`${config.url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: config.anonKey, Authorization: `Bearer ${config.anonKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.message || payload?.hint || 'Η υπηρεσία παραγγελιών δεν είναι διαθέσιμη.');
    return payload;
  }

  function setStatus(message, kind = '') {
    const host = $('[data-table-order-status]');
    host.hidden = !message;
    host.className = `table-order-status ${kind}`;
    host.textContent = message;
  }

  function parseItem(row) {
    const name = $('strong', row)?.textContent.trim();
    const priceText = $(':scope > span', row)?.textContent.trim() || '';
    const match = priceText.replace(',', '.').match(/\d+(?:\.\d{1,2})?/);
    if (!name || !match) return null;
    return { name, price: Number(match[0]) };
  }

  function render() {
    const host = $('[data-order-items]');
    const total = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    $('[data-cart-count]').textContent = state.items.reduce((sum, item) => sum + item.quantity, 0);
    $('[data-order-total]').textContent = money.format(total);
    $('[data-cart-button-total]').textContent = money.format(total);
    host.replaceChildren();
    if (!state.items.length) {
      const empty = document.createElement('p'); empty.className = 'order-empty'; empty.textContent = 'Δεν έχετε προσθέσει προϊόντα.'; host.append(empty); return;
    }
    state.items.forEach((item, index) => {
      const row = document.createElement('div'); row.className = 'order-line';
      const label = document.createElement('span');
      const name = document.createElement('b'); name.textContent = item.name;
      const unitPrice = document.createElement('small'); unitPrice.textContent = `${money.format(item.price)} το ένα`;
      label.append(name, unitPrice);
      const controls = document.createElement('div');
      const minus = document.createElement('button'); minus.type = 'button'; minus.textContent = '−'; minus.setAttribute('aria-label', `Αφαίρεση ${item.name}`);
      const quantity = document.createElement('b'); quantity.textContent = item.quantity;
      const plus = document.createElement('button'); plus.type = 'button'; plus.textContent = '+'; plus.setAttribute('aria-label', `Προσθήκη ${item.name}`);
      const price = document.createElement('strong'); price.textContent = money.format(item.price * item.quantity);
      minus.addEventListener('click', () => { item.quantity -= 1; if (!item.quantity) state.items.splice(index, 1); render(); });
      plus.addEventListener('click', () => { item.quantity += 1; render(); });
      controls.append(minus, quantity, plus); row.append(label, controls, price); host.append(row);
    });
  }

  function enableOrdering() {
    $('[data-table-label]').textContent = `Τραπέζι ${state.session.table_label}`;
    $('[data-order-cart-button]').hidden = false;
    $$('.menu-price-list > li').forEach((row) => {
      const item = parseItem(row); if (!item) return;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'menu-add-button'; button.textContent = '+';
      button.setAttribute('aria-label', `Προσθήκη ${item.name}`);
      button.addEventListener('click', () => {
        const wasEmpty = state.items.length === 0;
        const current = state.items.find((entry) => entry.name === item.name && entry.price === item.price);
        if (current) current.quantity += 1; else state.items.push({ ...item, quantity: 1 });
        render(); setStatus(`${item.name}: προστέθηκε.`, 'success'); window.setTimeout(() => setStatus(''), 1800);
        if (wasEmpty) { $('[data-order-panel]').hidden = false; $('[data-order-cart-button]').setAttribute('aria-expanded', 'true'); }
      });
      row.append(button);
    });
    render();
  }

  async function submit() {
    if (!state.items.length) return setStatus('Προσθέστε τουλάχιστον ένα προϊόν.', 'error');
    const button = $('[data-submit-order]'); button.disabled = true; button.textContent = 'Αποστολή…';
    try {
      const result = await rpc('place_table_order', { p_session_token: state.session.session_token, p_items: state.items, p_notes: $('[data-order-notes]').value.trim() || null });
      state.items = []; $('[data-order-notes]').value = ''; render();
      $('[data-order-panel]').hidden = true; $('[data-order-cart-button]').setAttribute('aria-expanded', 'false');
      setStatus(`Η παραγγελία #${result.order_number} στάλθηκε στο τραπέζι ${state.session.table_label}.`, 'success');
    } catch (error) { setStatus(error.message, 'error'); }
    finally { button.disabled = false; button.textContent = 'Αποστολή παραγγελίας'; }
  }

  async function init() {
    if (!qrToken) return;
    if (!config.url || !config.anonKey) return setStatus('Η παραγγελία τραπεζιού δεν έχει ακόμη συνδεθεί με τον διακομιστή.', 'error');
    setStatus('Έλεγχος QR τραπεζιού…');
    try {
      state.session = await rpc('start_table_session', { p_qr_token: qrToken });
      history.replaceState(null, '', `${location.pathname}#menu`);
      setStatus(`Παραγγελία ενεργή για το τραπέζι ${state.session.table_label}.`, 'success'); enableOrdering();
    } catch (error) { setStatus(error.message, 'error'); }
  }

  $('[data-order-cart-button]')?.addEventListener('click', () => { const panel = $('[data-order-panel]'); panel.hidden = !panel.hidden; $('[data-order-cart-button]').setAttribute('aria-expanded', String(!panel.hidden)); });
  $('[data-close-order]')?.addEventListener('click', () => { $('[data-order-panel]').hidden = true; $('[data-order-cart-button]').setAttribute('aria-expanded', 'false'); });
  $('[data-submit-order]')?.addEventListener('click', submit);
  document.addEventListener('DOMContentLoaded', init);
})();
