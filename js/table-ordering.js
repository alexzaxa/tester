(() => {
  'use strict';
  const config = window.MTAK_SUPABASE || {};
  const params = new URLSearchParams(location.search);
  const qrToken = params.get('qr');
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { session: null, items: [], submittedTotal: 0, orders: [], poller: 0 };
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

  function setPanel(open) {
    $('[data-order-panel]').hidden = !open;
    $('[data-order-backdrop]').hidden = !open;
    $('[data-order-cart-button]').setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('order-panel-open', open);
  }

  function parseItem(row) {
    const name = $('strong', row)?.textContent.trim();
    const priceText = $(':scope > span', row)?.textContent.trim() || '';
    const match = priceText.replace(',', '.').match(/\d+(?:\.\d{1,2})?/);
    if (!name || !match) return null;
    return { name, price: Number(match[0]) };
  }

  const statusLabels = { new: 'Ελήφθη', preparing: 'Ετοιμάζεται', ready: 'Έτοιμη', delivered: 'Παραδόθηκε', cancelled: 'Ακυρώθηκε' };
  function renderOrderHistory() {
    const host = $('[data-customer-orders]'); host.replaceChildren(); host.hidden = !state.orders.length;
    state.orders.forEach(order => {
      const row = document.createElement('article'); row.className = 'customer-order-round';
      const head = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = `Παραγγελία #${order.order_number}`;
      const status = document.createElement('span'); status.className = `customer-order-status ${order.status}`; status.textContent = statusLabels[order.status] || order.status;
      const items = document.createElement('small'); items.textContent = (order.items || []).map(item => `${item.quantity}× ${item.name}`).join(' · ');
      const total = document.createElement('b'); total.textContent = money.format(Number(order.total));
      head.append(title, status); row.append(head, items, total); host.append(row);
    });
  }

  async function refreshSession() {
    if (!state.session?.session_token) return;
    const summary = await rpc('customer_session_summary', { p_session_token: state.session.session_token });
    state.session = { ...state.session, ...summary }; state.orders = summary.orders || [];
    state.submittedTotal = state.orders.filter(o => o.status !== 'cancelled').reduce((sum,o) => sum + Number(o.total), 0);
    renderOrderHistory(); render();
  }

  async function addCustomerTools() {
    const popular = await rpc('customer_popular_items', {}).catch(() => []);
    const popularNames = new Set(popular.slice(0, 6).map(item => item.name));
    $$('.menu-price-list > li').forEach(row => { const item=parseItem(row); if(item && popularNames.has(item.name)){ const badge=document.createElement('em'); badge.className='popular-badge'; badge.textContent='Δημοφιλές'; row.append(badge); } });
    const intro = $('.official-menu-intro'); if (!intro || $('[data-menu-search]')) return;
    const search = document.createElement('label'); search.className='customer-menu-search'; search.innerHTML='<span>Αναζήτηση στον κατάλογο</span><input data-menu-search type="search" placeholder="Καφές, cocktail, αναψυκτικό…">'; intro.after(search);
    $('input',search).addEventListener('input', event => { const term=event.target.value.trim().toLocaleLowerCase('el'); $$('.menu-price-list > li').forEach(row => { row.hidden=Boolean(term)&&!row.textContent.toLocaleLowerCase('el').includes(term); }); });
  }

  function render() {
    const host = $('[data-order-items]');
    const pendingTotal = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = state.submittedTotal + pendingTotal;
    $('[data-cart-count]').textContent = state.items.reduce((sum, item) => sum + item.quantity, 0);
    $('[data-order-total]').textContent = money.format(total);
    $('[data-cart-button-total]').textContent = money.format(total);
    $('[data-submitted-total]').textContent = money.format(state.submittedTotal);
    $('[data-pending-total]').textContent = money.format(pendingTotal);
    $('[data-clear-order]').disabled = !state.items.length;
    $('[data-submit-order]').disabled = !state.items.length;
    renderOrderHistory();
    host.replaceChildren();
    if (!state.items.length) {
      const empty = document.createElement('p'); empty.className = 'order-empty';
      empty.textContent = state.submittedTotal > 0
        ? `Έχουν σταλεί προϊόντα αξίας ${money.format(state.submittedTotal)}. Μπορείτε να προσθέσετε κι άλλα.`
        : 'Δεν έχετε προσθέσει προϊόντα.';
      host.append(empty); return;
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
        button.classList.remove('just-added'); void button.offsetWidth; button.classList.add('just-added');
        $('[data-order-cart-button]').classList.remove('cart-bump'); void $('[data-order-cart-button]').offsetWidth; $('[data-order-cart-button]').classList.add('cart-bump');
        if (wasEmpty) setPanel(true);
      });
      row.append(button);
    });
    render();
  }

  async function submit() {
    if (!state.items.length) return setStatus('Προσθέστε τουλάχιστον ένα προϊόν.', 'error');
    const button = $('[data-submit-order]'); button.disabled = true; button.textContent = 'Αποστολή…';
    try {
      const submittedAmount = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const result = await rpc('place_table_order', { p_session_token: state.session.session_token, p_items: state.items, p_notes: $('[data-order-notes]').value.trim() || null });
      state.submittedTotal += submittedAmount;
      state.items = []; $('[data-order-notes]').value = ''; render();
      setPanel(false);
      setStatus(`Η παραγγελία #${result.order_number} στάλθηκε στο τραπέζι ${state.session.table_label}.`, 'success');
      await refreshSession().catch(() => {});
    } catch (error) { setStatus(error.message, 'error'); }
    finally { button.disabled = !state.items.length; button.textContent = 'Αποστολή παραγγελίας'; }
  }

  async function init() {
    if (!qrToken) return;
    if (!config.url || !config.anonKey) return setStatus('Η παραγγελία τραπεζιού δεν έχει ακόμη συνδεθεί με τον διακομιστή.', 'error');
    setStatus('Έλεγχος QR τραπεζιού…');
    try {
      const storageKey = `mtak-session-${qrToken.slice(0,12)}`;
      const savedToken = sessionStorage.getItem(storageKey);
      if (savedToken) state.session = await rpc('customer_session_summary', { p_session_token: savedToken }).catch(() => null);
      if (!state.session) { state.session = await rpc('start_table_session', { p_qr_token: qrToken }); sessionStorage.setItem(storageKey, state.session.session_token); }
      state.orders = state.session.orders || [];
      state.submittedTotal = state.orders.filter(o => o.status !== 'cancelled').reduce((sum,o) => sum + Number(o.total), 0);
      history.replaceState(null, '', `${location.pathname}#menu`);
      setStatus(`Παραγγελία ενεργή για το τραπέζι ${state.session.table_label}.`, 'success'); enableOrdering(); await addCustomerTools();
      clearInterval(state.poller); state.poller = setInterval(() => refreshSession().catch(() => {}), 7000);
    } catch (error) { setStatus(error.message, 'error'); }
  }

  $('[data-order-cart-button]')?.addEventListener('click', () => setPanel($('[data-order-panel]').hidden));
  $('[data-close-order]')?.addEventListener('click', () => setPanel(false));
  $('[data-order-backdrop]')?.addEventListener('click', () => setPanel(false));
  $('[data-clear-order]')?.addEventListener('click', () => { if (!state.items.length || !confirm('Να αφαιρεθούν όλα τα νέα προϊόντα;')) return; state.items = []; render(); });
  $('[data-call-waiter]')?.addEventListener('click', async event => { const button=event.currentTarget; button.disabled=true; try { await rpc('call_waiter',{p_session_token:state.session.session_token}); setStatus('Ειδοποιήσαμε τον σερβιτόρο.', 'success'); } catch(error){setStatus(error.message,'error');} finally { setTimeout(()=>button.disabled=false,5000); } });
  $('[data-submit-order]')?.addEventListener('click', submit);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('[data-order-panel]').hidden) setPanel(false); });
  document.addEventListener('DOMContentLoaded', init);
})();
