(() => {
  'use strict';
  const config = window.MTAK_SUPABASE || {};
  const $ = (s, r = document) => r.querySelector(s);
  const money = new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' });
  const statusLabels = { new: 'Νέα', preparing: 'Ετοιμάζεται', ready: 'Έτοιμη', delivered: 'Παραδόθηκε', cancelled: 'Ακυρώθηκε' };
  let session = null, timer = 0, seenOrders = new Set();

  function message(text) { $('[data-staff-message]').textContent = text; if (text) setTimeout(() => { if ($('[data-staff-message]').textContent === text) $('[data-staff-message]').textContent = ''; }, 3500); }
  async function request(path, options = {}) {
    const headers = { apikey: config.anonKey, 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    const response = await fetch(`${config.url}${path}`, { ...options, headers });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || data?.msg || data?.error_description || 'Η ενέργεια απέτυχε.');
    return data;
  }
  async function rpc(name, body = {}) { return request(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(body) }); }
  function saveSession(value) { session = value; if (value) localStorage.setItem('mtak-staff-session', JSON.stringify(value)); else localStorage.removeItem('mtak-staff-session'); }

  function orderCard(order) {
    const article = document.createElement('article'); article.className = 'staff-order'; article.dataset.status = order.status;
    const header = document.createElement('header');
    const title = document.createElement('div'); title.innerHTML = `<h2>Τραπέζι ${escapeHtml(order.table_label)}</h2><time>${new Date(order.created_at).toLocaleString('el-GR')}</time>`;
    const number = document.createElement('strong'); number.textContent = `#${order.order_number}`; header.append(title, number);
    const list = document.createElement('ul'); (order.items || []).forEach(item => { const li = document.createElement('li'); li.innerHTML = `<span><b>${Number(item.quantity)}×</b> ${escapeHtml(item.name)}</span><strong>${money.format(Number(item.price) * Number(item.quantity))}</strong>`; list.append(li); });
    const notes = document.createElement('p'); notes.className = 'notes'; notes.textContent = order.notes || 'Χωρίς σημειώσεις';
    const total = document.createElement('p'); total.innerHTML = `Σύνολο: <strong>${money.format(order.total)}</strong>`;
    const select = document.createElement('select'); select.setAttribute('aria-label', `Κατάσταση παραγγελίας ${order.order_number}`);
    Object.entries(statusLabels).forEach(([value,label]) => { const option = document.createElement('option'); option.value = value; option.textContent = label; option.selected = value === order.status; select.append(option); });
    select.addEventListener('change', async () => { select.disabled = true; try { await rpc('staff_update_order_status', { p_order_id: order.id, p_status: select.value }); message('Η κατάσταση ενημερώθηκε.'); await loadOrders(false); } catch (e) { message(e.message); select.value = order.status; } finally { select.disabled = false; } });
    article.append(header, list, notes, total, select); return article;
  }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  async function loadOrders(alertNew = true) {
    const orders = await rpc('staff_list_orders');
    const fresh = orders.filter(o => o.status === 'new' && !seenOrders.has(o.id));
    if (alertNew && seenOrders.size && fresh.length) { $('[data-new-order-sound]').play().catch(() => {}); message(`${fresh.length} νέα παραγγελία${fresh.length > 1 ? 'ες' : ''}!`); }
    orders.forEach(o => seenOrders.add(o.id));
    $('[data-new-count]').textContent = orders.filter(o => o.status === 'new').length;
    const host = $('[data-orders]'); host.replaceChildren();
    if (!orders.length) { const empty = document.createElement('p'); empty.className = 'staff-empty'; empty.textContent = 'Δεν υπάρχουν παραγγελίες ακόμα.'; host.append(empty); }
    else orders.forEach(o => host.append(orderCard(o)));
    $('[data-last-update]').textContent = `Ενημέρωση ${new Date().toLocaleTimeString('el-GR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`;
  }
  async function loadTables() {
    const tables = await rpc('staff_list_tables'); const host = $('[data-tables]'); host.replaceChildren();
    tables.forEach(table => { const row = document.createElement('div'); row.className = 'staff-table'; const label = document.createElement('strong'); label.textContent = `Τραπέζι ${table.label}`; const button = document.createElement('button'); button.type = 'button'; button.className = table.enabled ? '' : 'off'; button.textContent = table.enabled ? 'Ενεργό' : 'Κλειστό'; button.addEventListener('click', async () => { button.disabled = true; try { await rpc('staff_set_table_enabled',{p_table_id:table.id,p_enabled:!table.enabled}); await loadTables(); } catch(e){message(e.message);} }); row.append(label,button); host.append(row); });
  }
  async function showApp() {
    let access; try { access = await rpc('staff_check_access'); } catch (e) { await signOut(); throw new Error('Ο λογαριασμός δεν έχει πρόσβαση προσωπικού.'); }
    const tableTab = $('[data-staff-tab="tables"]'); tableTab.hidden = access.role !== 'admin';
    $('[data-login-panel]').hidden = true; $('[data-staff-app]').hidden = false; $('[data-sign-out]').hidden = false;
    await Promise.all([loadOrders(false), loadTables()]); clearInterval(timer); timer = setInterval(() => loadOrders().catch(e => message(e.message)), 5000);
  }
  async function signOut() { clearInterval(timer); if (session?.access_token) request('/auth/v1/logout',{method:'POST'}).catch(()=>{}); saveSession(null); $('[data-login-panel]').hidden=false; $('[data-staff-app]').hidden=true; $('[data-sign-out]').hidden=true; }
  $('[data-login-form]').addEventListener('submit', async event => { event.preventDefault(); const submit = event.submitter; submit.disabled=true; try { const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:$('[data-login-email]').value.trim(),password:$('[data-login-password]').value})}); saveSession(data); await showApp(); } catch(e){message(e.message);} finally{submit.disabled=false;} });
  $('[data-sign-out]').addEventListener('click', signOut); $('[data-refresh]').addEventListener('click',()=>Promise.all([loadOrders(false),loadTables()]).catch(e=>message(e.message)));
  document.querySelectorAll('[data-staff-tab]').forEach(button => button.addEventListener('click',()=>{ document.querySelectorAll('[data-staff-tab]').forEach(b=>b.classList.toggle('active',b===button)); $('[data-orders-view]').hidden=button.dataset.staffTab!=='orders'; $('[data-tables-view]').hidden=button.dataset.staffTab!=='tables'; }));
  try { saveSession(JSON.parse(localStorage.getItem('mtak-staff-session'))); } catch { saveSession(null); }
  if (session?.access_token) showApp().catch(e=>message(e.message));
})();
