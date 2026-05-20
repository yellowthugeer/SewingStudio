/* ============================================================
   SewingStudio CRM — main app
   ============================================================ */

let currentUser = null;
let cache = { roles: [], statuses: [], clients: [], users: [], orders: [] };

// ── Helpers ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const show = id => $(id).classList.remove('hidden');
const hide = id => $(id).classList.add('hidden');

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU');
}
function fmtMoney(n) {
  return Number(n).toLocaleString('ru-RU') + ' ₽';
}
function stars(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}
function statusBadge(name) {
  const map = {
    'Новый':           'badge-new',
    'В работе':        'badge-active',
    'Готов к выдаче':  'badge-ready',
    'Завершён':        'badge-done',
    'Отменён':         'badge-cancel',
    'Оплачено':        'badge-paid',
    'Ожидает':         'badge-pending',
  };
  const cls = map[name] || 'badge-new';
  return `<span class="badge ${cls}">${name}</span>`;
}

// ── Toast notifications ───────────────────────────────────────
function toast(msg, type = 'error') {
  const icons = { error: '❌', success: '✅', info: 'ℹ️' };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span class="toast-icon">${icons[type] || '❌'}</span><span>${msg}</span>`;
  $('toast-container').appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, 3500);
}
function showError(msg) { toast(msg, 'error'); }

// ── Custom confirm dialog ─────────────────────────────────────
function confirmDialog(message, okLabel = 'Удалить', danger = true) {
  return new Promise(resolve => {
    $('confirm-msg').textContent = message;
    $('confirm-ok-btn').textContent = okLabel;
    $('confirm-ok-btn').className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
    show('confirm-overlay');

    const cleanup = () => {
      $('confirm-ok-btn').removeEventListener('click', onOk);
      $('confirm-cancel-btn').removeEventListener('click', onCancel);
      $('confirm-overlay').removeEventListener('click', onBg);
    };
    const onOk     = () => { hide('confirm-overlay'); cleanup(); resolve(true);  };
    const onCancel = () => { hide('confirm-overlay'); cleanup(); resolve(false); };
    const onBg     = e  => { if (e.target === $('confirm-overlay')) onCancel(); };

    $('confirm-ok-btn').addEventListener('click', onOk);
    $('confirm-cancel-btn').addEventListener('click', onCancel);
    $('confirm-overlay').addEventListener('click', onBg);
  });
}

// ── Navigation ───────────────────────────────────────────────
function activatePage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
  const el = $(`page-${page}`);
  if (el) el.classList.add('active');
  const nav = document.querySelector(`[data-page="${page}"]`);
  if (nav) nav.classList.add('active');
  loadPage(page);
}

document.querySelectorAll('.nav-item').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    activatePage(a.dataset.page);
  });
});

// ── Login ────────────────────────────────────────────────────
$('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  hide('login-error');
  try {
    const user = await api.login({
      login: $('login-input').value.trim(),
      password: $('password-input').value.trim()
    });
    currentUser = user;
    $('current-user-info').innerHTML = `<strong>${user.login}</strong><br>${user.roleName}`;
    hide('login-screen');
    show('app');
    applyRoleAccess(user.roleName);
    await preloadCache();
    const startPage = user.roleName === 'Клиент' ? 'portal' : 'dashboard';
    activatePage(startPage);
  } catch (err) {
    const el = $('login-error');
    el.textContent = err.message;
    el.classList.remove('hidden');
  }
});

// ── Login ↔ Register navigation ──────────────────────────────
$('go-to-register').addEventListener('click', async e => {
  e.preventDefault();
  hide('login-screen');
  // Загружаем роли сотрудников (исключаем «Клиент»)
  try {
    const roles = await api.getRoles();
    const staffRoles = roles.filter(r => r.roleName !== 'Клиент');
    $('re-role').innerHTML = staffRoles
      .map(r => `<option value="${r.id}">${r.roleName}</option>`)
      .join('');
  } catch (_) {}
  resetRegisterScreen();
  show('register-screen');
});

$('go-to-login').addEventListener('click', e => {
  e.preventDefault();
  hide('register-screen');
  show('login-screen');
});

// ── Register — tab switching ──────────────────────────────────
document.querySelectorAll('.reg-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.reg-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    if (tab === 'client') {
      show('reg-client-form');
      hide('reg-employee-form');
    } else {
      hide('reg-client-form');
      show('reg-employee-form');
    }
    hide('reg-success');
  });
});

function resetRegisterScreen() {
  // показать формы, скрыть success
  show('reg-client-form');
  hide('reg-employee-form');
  hide('reg-success');
  // активировать первый таб
  document.querySelectorAll('.reg-tab').forEach((b, i) => b.classList.toggle('active', i === 0));
  // очистить поля
  ['rc-firstName','rc-lastName','rc-phone','rc-email','rc-login','rc-password',
   're-login','re-password','re-phone','re-code'].forEach(id => { const el = $(id); if (el) el.value = ''; });
  hide('reg-client-error');
  hide('reg-employee-error');
}

// ── Register — клиент ─────────────────────────────────────────
const STAFF_CODE = 'ATELIER123';   // код регистрации для сотрудников

$('reg-client-form').addEventListener('submit', async e => {
  e.preventDefault();
  hide('reg-client-error');

  const firstName = $('rc-firstName').value.trim();
  const lastName  = $('rc-lastName').value.trim();
  const phone     = $('rc-phone').value.trim();
  const email     = $('rc-email').value.trim() || null;
  const login     = $('rc-login').value.trim();
  const password  = $('rc-password').value.trim();

  if (!firstName || !lastName || !phone || !login || !password) {
    return showRegError('reg-client-error', 'Заполните все обязательные поля (*)');
  }
  if (password.length < 4) {
    return showRegError('reg-client-error', 'Пароль должен содержать минимум 4 символа');
  }

  try {
    await api.registerClient({ firstName, lastName, phone, email, login, password });
    hide('reg-client-form');
    showRegSuccess(
      'Регистрация прошла успешно!',
      `${firstName}, добро пожаловать! Войдите с логином «${login}» чтобы отслеживать свои заказы.`
    );
  } catch (err) {
    showRegError('reg-client-error', err.message);
  }
});

// ── Register — сотрудник ──────────────────────────────────────
$('reg-employee-form').addEventListener('submit', async e => {
  e.preventDefault();
  hide('reg-employee-error');

  const login    = $('re-login').value.trim();
  const password = $('re-password').value.trim();
  const phone    = $('re-phone').value.trim();
  const roleId   = Number($('re-role').value);
  const code     = $('re-code').value.trim();

  if (!login || !password || !phone || !roleId) {
    return showRegError('reg-employee-error', 'Заполните все обязательные поля (*)');
  }
  if (password.length < 4) {
    return showRegError('reg-employee-error', 'Пароль должен содержать минимум 4 символа');
  }
  if (code !== STAFF_CODE) {
    return showRegError('reg-employee-error', 'Неверный код регистрации. Обратитесь к администратору');
  }

  try {
    await api.createUser({ roleId, login, password, phoneNumber: phone });
    hide('reg-employee-form');
    showRegSuccess(
      'Аккаунт создан!',
      `Сотрудник «${login}» успешно зарегистрирован. Теперь вы можете войти в систему.`
    );
  } catch (err) {
    showRegError('reg-employee-error', err.message);
  }
});

function showRegError(elId, msg) {
  const el = $(elId);
  el.textContent = msg;
  el.classList.remove('hidden');
}

function showRegSuccess(title, text) {
  $('reg-success-title').textContent = title;
  $('reg-success-text').textContent  = text;
  show('reg-success');
}

$('logout-btn').addEventListener('click', () => {
  currentUser = null;
  resetRoleAccess();
  hide('app');
  show('login-screen');
  $('login-input').value = '';
  $('password-input').value = '';
});

// ── Role-based access control ─────────────────────────────────
const ROLE_PAGES = {
  'Администратор': ['dashboard', 'clients', 'orders', 'payments', 'reviews', 'users', 'profile'],
  'Швея/Мастер':   ['dashboard', 'orders', 'profile'],
  'Бухгалтер':     ['dashboard', 'orders', 'payments', 'profile'],
  'Клиент':        ['portal', 'profile'],
};

function applyRoleAccess(roleName) {
  const allowed = ROLE_PAGES[roleName] || ['dashboard'];
  const isClient = roleName === 'Клиент';
  document.querySelectorAll('.nav-item[data-page]').forEach(a => {
    const page = a.dataset.page;
    if (a.classList.contains('nav-client-only')) {
      a.classList.toggle('hidden', !isClient);
      return;
    }
    if (a.classList.contains('nav-staff-only')) {
      a.classList.toggle('hidden', isClient);
      return;
    }
    a.classList.toggle('hidden', !allowed.includes(page));
  });
}

function resetRoleAccess() {
  document.querySelectorAll('.nav-item[data-page]').forEach(a => {
    if (a.classList.contains('nav-client-only')) a.classList.add('hidden');
    else if (a.classList.contains('nav-staff-only')) a.classList.remove('hidden');
    else a.classList.remove('hidden');
  });
}

// ── Cache ────────────────────────────────────────────────────
async function preloadCache() {
  const [roles, statuses, clients, users, orders] = await Promise.all([
    api.getRoles(), api.getStatuses(), api.getClients(), api.getUsers(),
    api.getOrders()
  ]);
  cache.roles    = roles    || [];
  cache.statuses = statuses || [];
  cache.clients  = clients  || [];
  cache.users    = users    || [];
  cache.orders   = orders   || [];
}

// ── Page router ──────────────────────────────────────────────
async function loadPage(page) {
  switch (page) {
    case 'dashboard': return loadDashboard();
    case 'clients':   return loadClients();
    case 'orders':    return loadOrders();
    case 'payments':  return loadPayments();
    case 'reviews':   return loadReviews();
    case 'users':     return loadUsers();
    case 'portal':    return loadPortal();
    case 'profile':   return loadProfile();
  }
}

// ══════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════
async function loadDashboard() {
  try {
    const [orders, clients, payments] = await Promise.all([
      api.getOrders(), api.getClients(), api.getPayments()
    ]);

    // Топ-статистика
    $('stat-orders').textContent  = orders.length;
    $('stat-clients').textContent = clients.length;
    const active = orders.filter(o => o.statusName === 'В работе' || o.statusName === 'Новый');
    $('stat-active').textContent  = active.length;
    const revenue = payments
      .filter(p => p.status === 'Оплачено')
      .reduce((s, p) => s + Number(p.amount), 0);
    $('stat-revenue').textContent = revenue.toLocaleString('ru-RU');

    // Разбивка по статусам
    const fillClass = { 'Новый':'fill-new','В работе':'fill-active','Готов к выдаче':'fill-ready','Завершён':'fill-done','Отменён':'fill-cancel' };
    const statusCounts = {};
    cache.statuses.forEach(s => { statusCounts[s.statusName] = 0; });
    orders.forEach(o => { if (statusCounts[o.statusName] !== undefined) statusCounts[o.statusName]++; });
    const maxCount = Math.max(1, ...Object.values(statusCounts));

    $('status-breakdown').innerHTML = `<div class="status-breakdown-grid">
      ${cache.statuses.map(s => {
        const count = statusCounts[s.statusName] || 0;
        const pct   = Math.round((count / maxCount) * 100);
        const cls   = fillClass[s.statusName] || 'fill-active';
        return `<div class="status-bar-item">
          <div class="status-bar-label">
            <span>${s.statusName}</span>
            <span class="status-bar-count">${count}</span>
          </div>
          <div class="status-bar-track">
            <div class="status-bar-fill ${cls}" style="width:${pct}%"></div>
          </div>
        </div>`;
      }).join('')}
    </div>`;

    // Последние заказы
    const recent = [...orders].reverse().slice(0, 8);
    $('dashboard-orders-body').innerHTML = recent.length === 0
      ? `<tr><td colspan="5" class="empty-row">Заказов пока нет</td></tr>`
      : recent.map(o => `
        <tr>
          <td>#${o.id}</td>
          <td>${o.clientFullName}</td>
          <td>${o.description || '—'}</td>
          <td>${fmtMoney(o.price)}</td>
          <td>${statusBadge(o.statusName)}</td>
        </tr>`).join('');

    // Последние платежи
    const recentPay = [...payments].reverse().slice(0, 6);
    $('dashboard-payments-list').innerHTML = recentPay.length === 0
      ? `<p style="color:var(--text-muted);font-size:13px;padding:8px 0">Платежей нет</p>`
      : recentPay.map(p => `
        <div class="payment-mini-item">
          <div>
            <div class="payment-mini-order">Заказ #${p.orderId}</div>
            <div>${fmtDate(p.paymentDate)}</div>
          </div>
          <div class="payment-mini-amount">${fmtMoney(p.amount)}</div>
        </div>`).join('');

  } catch (err) { showError(err.message); }
}

// ══════════════════════════════════════════════════════════════
//  CLIENTS
// ══════════════════════════════════════════════════════════════
let allClients = [];

async function loadClients() {
  try {
    allClients = await api.getClients();
    cache.clients = allClients;
    renderClients(allClients);
  } catch (err) { showError(err.message); }
}

function renderClients(list) {
  $('clients-tbody').innerHTML = list.map(c => `
    <tr>
      <td>${c.id}</td>
      <td>${c.firstName}</td>
      <td>${c.lastName}</td>
      <td>${c.phone}</td>
      <td>${c.email || '—'}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-brown" onclick="editClient(${c.id})">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deleteClient(${c.id})">🗑️</button>
        </div>
      </td>
    </tr>`).join('');
}

$('client-search').addEventListener('input', function () {
  const q = this.value.toLowerCase();
  renderClients(allClients.filter(c =>
    (c.firstName + ' ' + c.lastName).toLowerCase().includes(q) ||
    c.phone.includes(q)
  ));
});

$('add-client-btn').addEventListener('click', () => openClientModal(null));

function openClientModal(c) {
  openModal(c ? 'Редактировать клиента' : 'Новый клиент', `
    <div class="form-group"><label>Имя</label>
      <input id="f-firstName" value="${c?.firstName || ''}" /></div>
    <div class="form-group"><label>Фамилия</label>
      <input id="f-lastName" value="${c?.lastName || ''}" /></div>
    <div class="form-group"><label>Телефон</label>
      <input id="f-phone" value="${c?.phone || ''}" /></div>
    <div class="form-group"><label>Email</label>
      <input id="f-email" value="${c?.email || ''}" /></div>
  `, async () => {
    const dto = {
      firstName: $('f-firstName').value.trim(),
      lastName:  $('f-lastName').value.trim(),
      phone:     $('f-phone').value.trim(),
      email:     $('f-email').value.trim() || null
    };
    if (!dto.firstName || !dto.lastName || !dto.phone)
      throw new Error('Заполните обязательные поля: Имя, Фамилия, Телефон');
    if (c) await api.updateClient(c.id, dto);
    else   await api.createClient(dto);
    await loadClients();
    toast(c ? 'Клиент обновлён' : 'Клиент добавлен', 'success');
  });
}

async function editClient(id) {
  const c = await api.getClient(id);
  openClientModal(c);
}

async function deleteClient(id) {
  if (!await confirmDialog('Удалить этого клиента? Действие необратимо.')) return;
  try { await api.deleteClient(id); await loadClients(); toast('Клиент удалён', 'info'); }
  catch (err) { showError(err.message); }
}

// ══════════════════════════════════════════════════════════════
//  ORDERS
// ══════════════════════════════════════════════════════════════
let allOrders = [];

async function loadOrders() {
  try {
    // Швея/Мастер видит только свои заказы
    allOrders = currentUser.roleName === 'Швея/Мастер'
      ? await api.getOrdersByUser(currentUser.id)
      : await api.getOrders();
    cache.orders = allOrders;

    const sel = $('order-status-filter');
    sel.innerHTML = '<option value="">Все статусы</option>' +
      cache.statuses.map(s => `<option value="${s.id}">${s.statusName}</option>`).join('');

    // Кнопка "Новый заказ" — только для Администратора
    const addBtn = $('add-order-btn');
    addBtn.classList.toggle('hidden', currentUser.roleName === 'Швея/Мастер');

    renderOrders(allOrders);
  } catch (err) { showError(err.message); }
}

function renderOrders(list) {
  const isAdmin = currentUser.roleName === 'Администратор';
  const isSeamstress = currentUser.roleName === 'Швея/Мастер';
  $('orders-tbody').innerHTML = list.length === 0
    ? `<tr><td colspan="8" class="empty-row">Заказы не найдены</td></tr>`
    : list.map(o => `
    <tr>
      <td>#${o.id}</td>
      <td>${fmtDate(o.data)}</td>
      <td>${o.clientFullName}</td>
      <td>${o.userLogin}</td>
      <td>${o.description || '—'}</td>
      <td>${fmtMoney(o.price)}</td>
      <td>
        ${isAdmin
          ? `<select class="status-select" onchange="quickStatusChange(${o.id}, this.value, this)">
               ${cache.statuses.map(s => `<option value="${s.id}" ${s.id === o.statusId ? 'selected' : ''}>${s.statusName}</option>`).join('')}
             </select>`
          : statusBadge(o.statusName)}
      </td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-outline" onclick="showOrderDetail(${o.id})" title="Детали">👁️</button>
          ${!isSeamstress ? `<button class="btn btn-sm btn-brown" onclick="editOrder(${o.id})" title="Редактировать">✏️</button>` : ''}
          ${isAdmin      ? `<button class="btn btn-sm btn-danger" onclick="deleteOrder(${o.id})" title="Удалить">🗑️</button>` : ''}
        </div>
      </td>
    </tr>`).join('');
}

$('order-status-filter').addEventListener('change', applyOrderFilters);
$('order-search').addEventListener('input', applyOrderFilters);
$('order-date-from').addEventListener('change', applyOrderFilters);
$('order-date-to').addEventListener('change', applyOrderFilters);
$('order-reset-filters').addEventListener('click', () => {
  $('order-status-filter').value = '';
  $('order-search').value  = '';
  $('order-date-from').value = '';
  $('order-date-to').value   = '';
  renderOrders(allOrders);
});

function applyOrderFilters() {
  const statusId = $('order-status-filter').value;
  const q        = $('order-search').value.toLowerCase();
  const dateFrom = $('order-date-from').value ? new Date($('order-date-from').value) : null;
  const dateTo   = $('order-date-to').value   ? new Date($('order-date-to').value + 'T23:59:59') : null;

  let list = allOrders;
  if (statusId) list = list.filter(o => String(o.statusId) === statusId);
  if (dateFrom) list = list.filter(o => new Date(o.data) >= dateFrom);
  if (dateTo)   list = list.filter(o => new Date(o.data) <= dateTo);
  if (q) list = list.filter(o =>
    o.clientFullName.toLowerCase().includes(q) ||
    (o.description || '').toLowerCase().includes(q)
  );
  renderOrders(list);
}

async function quickStatusChange(orderId, newStatusId, selectEl) {
  try {
    await api.updateOrderStatus(orderId, Number(newStatusId));
    const statusName = cache.statuses.find(s => s.id === Number(newStatusId))?.statusName || '';
    // Обновляем локальный массив без перезагрузки
    const order = allOrders.find(o => o.id === orderId);
    if (order) { order.statusId = Number(newStatusId); order.statusName = statusName; }
    toast(`Статус заказа #${orderId} изменён на «${statusName}»`, 'success');
  } catch (err) {
    showError(err.message);
    // Откатываем select
    const order = allOrders.find(o => o.id === orderId);
    if (order && selectEl) selectEl.value = String(order.statusId);
  }
}

$('add-order-btn').addEventListener('click', () => openOrderModal(null));

function clientOptions(selId) {
  return cache.clients.map(c =>
    `<option value="${c.id}" ${c.id === selId ? 'selected' : ''}>${c.firstName} ${c.lastName}</option>`
  ).join('');
}
function userOptions(selId) {
  return cache.users.map(u =>
    `<option value="${u.id}" ${u.id === selId ? 'selected' : ''}>${u.login} (${u.roleName})</option>`
  ).join('');
}
function statusOptions(selId) {
  return cache.statuses.map(s =>
    `<option value="${s.id}" ${s.id === selId ? 'selected' : ''}>${s.statusName}</option>`
  ).join('');
}

function openOrderModal(o) {
  const dateVal = o ? new Date(o.data).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  openModal(o ? 'Редактировать заказ' : 'Новый заказ', `
    <div class="form-group"><label>Дата</label>
      <input type="date" id="f-data" value="${dateVal}" /></div>
    <div class="form-group"><label>Клиент</label>
      <select id="f-client">${clientOptions(o?.idClient)}</select></div>
    <div class="form-group"><label>Сотрудник</label>
      <select id="f-user">${userOptions(o?.idUser)}</select></div>
    <div class="form-group"><label>Цена (руб.)</label>
      <input type="number" id="f-price" value="${o?.price || ''}" min="0" step="0.01" /></div>
    <div class="form-group"><label>Описание</label>
      <textarea id="f-desc">${o?.description || ''}</textarea></div>
    <div class="form-group"><label>Статус</label>
      <select id="f-status">${statusOptions(o?.statusId)}</select></div>
  `, async () => {
    const dto = {
      data:        new Date($('f-data').value).toISOString(),
      idClient:    Number($('f-client').value),
      idUser:      Number($('f-user').value),
      price:       Number($('f-price').value),
      description: $('f-desc').value.trim() || null,
      statusId:    Number($('f-status').value)
    };
    if (!dto.price) throw new Error('Укажите цену');
    if (o) await api.updateOrder(o.id, dto);
    else   await api.createOrder(dto);
    await loadOrders();
    await loadDashboardStats();
    toast(o ? 'Заказ обновлён' : 'Заказ создан', 'success');
  });
}

async function editOrder(id) {
  const o = await api.getOrder(id);
  openOrderModal(o);
}

async function deleteOrder(id) {
  if (!await confirmDialog('Удалить заказ #' + id + '? Все связанные платежи и отзывы будут удалены.')) return;
  try { await api.deleteOrder(id); await loadOrders(); toast('Заказ удалён', 'info'); }
  catch (err) { showError(err.message); }
}

async function loadDashboardStats() {
  try {
    const orders = await api.getOrders();
    $('stat-orders').textContent = orders.length;
  } catch (_) {}
}

// ══════════════════════════════════════════════════════════════
//  PAYMENTS
// ══════════════════════════════════════════════════════════════
let allPayments = [];

async function loadPayments() {
  try {
    allPayments = await api.getPayments();
    renderPayments(allPayments);
  } catch (err) { showError(err.message); }
}

function renderPayments(list) {
  $('payments-tbody').innerHTML = list.length === 0
    ? `<tr><td colspan="8" class="empty-row">Платежей пока нет</td></tr>`
    : list.map(p => {
        const ord = cache.orders.find(o => o.id === p.orderId);
        const clientName = ord ? ord.clientFullName : '—';
        return `<tr>
          <td>${p.id}</td>
          <td><a href="#" onclick="showOrderDetail(${p.orderId});return false" class="order-link">#${p.orderId}</a></td>
          <td>${clientName}</td>
          <td>${fmtMoney(p.amount)}</td>
          <td>${fmtDate(p.paymentDate)}</td>
          <td>${p.paymentMethod || '—'}</td>
          <td>${statusBadge(p.status || 'Ожидает')}</td>
          <td>
            <div class="action-btns">
              <button class="btn btn-sm btn-brown" onclick="editPayment(${p.id})">✏️</button>
              <button class="btn btn-sm btn-danger" onclick="deletePayment(${p.id})">🗑️</button>
            </div>
          </td>
        </tr>`;
      }).join('');
}

$('add-payment-btn').addEventListener('click', () => openPaymentModal(null));

function openPaymentModal(p) {
  const src = cache.orders.length ? cache.orders : allOrders;
  if (!src.length) { showError('Сначала создайте хотя бы один заказ'); return; }
  const orderOpts = src.map(o =>
    `<option value="${o.id}" ${o.id === p?.orderId ? 'selected' : ''}>
      #${o.id} — ${o.clientFullName}
    </option>`).join('');
  const methods = ['Наличные', 'Карта', 'Перевод', 'Онлайн'];
  const methodOpts = methods.map(m =>
    `<option ${m === p?.paymentMethod ? 'selected' : ''}>${m}</option>`).join('');
  const statusOpts = ['Ожидает', 'Оплачено', 'Отклонено'].map(s =>
    `<option ${s === p?.status ? 'selected' : ''}>${s}</option>`).join('');
  const dateVal = p?.paymentDate ? new Date(p.paymentDate).toISOString().slice(0,10) : new Date().toISOString().slice(0,10);

  openModal(p ? 'Редактировать платёж' : 'Новый платёж', `
    <div class="form-group"><label>Заказ</label>
      <select id="f-order">${orderOpts}</select></div>
    <div class="form-group"><label>Сумма (руб.)</label>
      <input type="number" id="f-amount" value="${p?.amount || ''}" min="0" step="0.01" /></div>
    <div class="form-group"><label>Дата оплаты</label>
      <input type="date" id="f-paydate" value="${dateVal}" /></div>
    <div class="form-group"><label>Метод оплаты</label>
      <select id="f-method">${methodOpts}</select></div>
    <div class="form-group"><label>Статус</label>
      <select id="f-pstatus">${statusOpts}</select></div>
  `, async () => {
    const amount = Number($('f-amount').value);
    if (!amount) throw new Error('Укажите сумму');
    if (p) {
      await api.updatePayment(p.id, {
        amount,
        paymentDate:   new Date($('f-paydate').value).toISOString(),
        paymentMethod: $('f-method').value,
        transactionId: p.transactionId,
        status:        $('f-pstatus').value
      });
    } else {
      await api.createPayment({
        orderId:       Number($('f-order').value),
        amount,
        paymentDate:   new Date($('f-paydate').value).toISOString(),
        paymentMethod: $('f-method').value,
        status:        $('f-pstatus').value
      });
    }
    await loadPayments();
    // обновляем кеш заказов для дашборда
    cache.orders = await api.getOrders();
    toast(p ? 'Платёж обновлён' : 'Платёж добавлен', 'success');
  });
}

async function editPayment(id) {
  const p = allPayments.find(x => x.id === id);
  if (!p) return;
  openPaymentModal(p);
}

async function deletePayment(id) {
  if (!await confirmDialog('Удалить этот платёж?')) return;
  try { await api.deletePayment(id); await loadPayments(); toast('Платёж удалён', 'info'); }
  catch (err) { showError(err.message); }
}

// ══════════════════════════════════════════════════════════════
//  REVIEWS
// ══════════════════════════════════════════════════════════════
let allReviews = [];

async function loadReviews() {
  try {
    allReviews = await api.getReviews();
    renderReviews(allReviews);
  } catch (err) { showError(err.message); }
}

function renderReviews(list) {
  $('reviews-tbody').innerHTML = list.length === 0
    ? `<tr><td colspan="6" class="empty-row">Отзывов пока нет</td></tr>`
    : list.map(r => {
        const ord = cache.orders.find(o => o.id === r.orderId);
        const clientName = ord ? ord.clientFullName : '—';
        return `<tr>
          <td>${r.id}</td>
          <td><a href="#" onclick="showOrderDetail(${r.orderId});return false" class="order-link">#${r.orderId}</a></td>
          <td>${clientName}</td>
          <td><span class="stars">${stars(r.rating)}</span> <strong>${r.rating}/5</strong></td>
          <td>${r.comment || '—'}</td>
          <td>
            <div class="action-btns">
              <button class="btn btn-sm btn-brown" onclick="editReview(${r.id})">✏️</button>
              <button class="btn btn-sm btn-danger" onclick="deleteReview(${r.id})">🗑️</button>
            </div>
          </td>
        </tr>`;
      }).join('');
}

$('add-review-btn').addEventListener('click', () => openReviewModal(null));

function openReviewModal(r) {
  const src = cache.orders.length ? cache.orders : allOrders;
  if (!src.length) { showError('Сначала создайте хотя бы один заказ'); return; }
  const orderOpts = src.map(o =>
    `<option value="${o.id}" ${o.id === r?.orderId ? 'selected' : ''}>#${o.id} — ${o.clientFullName}</option>`
  ).join('');
  openModal(r ? 'Редактировать отзыв' : 'Новый отзыв', `
    <div class="form-group"><label>Заказ</label>
      <select id="f-rev-order">${orderOpts}</select></div>
    <div class="form-group"><label>Рейтинг (1–5)</label>
      <select id="f-rating">
        ${[1,2,3,4,5].map(n => `<option value="${n}" ${n === r?.rating ? 'selected' : ''}>${stars(n)} (${n})</option>`).join('')}
      </select></div>
    <div class="form-group"><label>Комментарий</label>
      <textarea id="f-comment">${r?.comment || ''}</textarea></div>
  `, async () => {
    const dto = {
      orderId: Number($('f-rev-order').value),
      rating:  Number($('f-rating').value),
      comment: $('f-comment').value.trim() || null
    };
    if (r) await api.updateReview(r.id, { rating: dto.rating, comment: dto.comment });
    else   await api.createReview(dto);
    await loadReviews();
    toast(r ? 'Отзыв обновлён' : 'Отзыв добавлен', 'success');
  });
}

function editReview(id) {
  const r = allReviews.find(x => x.id === id);
  if (r) openReviewModal(r);
}

async function deleteReview(id) {
  if (!await confirmDialog('Удалить этот отзыв?')) return;
  try { await api.deleteReview(id); await loadReviews(); toast('Отзыв удалён', 'info'); }
  catch (err) { showError(err.message); }
}

// ══════════════════════════════════════════════════════════════
//  USERS (employees)
// ══════════════════════════════════════════════════════════════
async function loadUsers() {
  try {
    const users = await api.getUsers();
    cache.users = users;
    $('users-tbody').innerHTML = users.map(u => `
      <tr>
        <td>${u.id}</td>
        <td>${u.login}</td>
        <td>${u.roleName}</td>
        <td>${u.phoneNumber}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-sm btn-brown" onclick="editUser(${u.id})">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})">🗑️</button>
          </div>
        </td>
      </tr>`).join('');
  } catch (err) { showError(err.message); }
}

$('add-user-btn').addEventListener('click', () => openUserModal(null));

function openUserModal(u) {
  const roleOpts = cache.roles.map(r =>
    `<option value="${r.id}" ${r.id === u?.roleId ? 'selected' : ''}>${r.roleName}</option>`
  ).join('');
  openModal(u ? 'Редактировать сотрудника' : 'Новый сотрудник', `
    <div class="form-group"><label>Логин</label>
      <input id="f-login" value="${u?.login || ''}" /></div>
    ${!u ? `<div class="form-group"><label>Пароль</label>
      <input type="password" id="f-pass" /></div>` : `
    <div class="form-group"><label>Новый пароль (оставьте пустым, чтобы не менять)</label>
      <input type="password" id="f-pass" /></div>`}
    <div class="form-group"><label>Роль</label>
      <select id="f-role">${roleOpts}</select></div>
    <div class="form-group"><label>Телефон</label>
      <input id="f-phone-u" value="${u?.phoneNumber || ''}" /></div>
  `, async () => {
    const login = $('f-login').value.trim();
    const pass  = $('f-pass').value.trim();
    if (!login) throw new Error('Введите логин');
    if (!u && !pass) throw new Error('Введите пароль');
    if (u) {
      await api.updateUser(u.id, {
        roleId:      Number($('f-role').value),
        login,
        phoneNumber: $('f-phone-u').value.trim(),
        password:    pass || undefined
      });
    } else {
      await api.createUser({
        roleId:      Number($('f-role').value),
        login,
        password:    pass,
        phoneNumber: $('f-phone-u').value.trim()
      });
    }
    await loadUsers();
    toast(u ? 'Сотрудник обновлён' : 'Сотрудник добавлен', 'success');
  });
}

async function editUser(id) {
  const u = await api.getUser(id);
  openUserModal(u);
}

async function deleteUser(id) {
  if (currentUser && currentUser.id === id) {
    alert('Нельзя удалить текущего пользователя');
    return;
  }
  if (!await confirmDialog('Удалить сотрудника? Это действие необратимо.')) return;
  try { await api.deleteUser(id); await loadUsers(); toast('Сотрудник удалён', 'info'); }
  catch (err) { showError(err.message); }
}

// ══════════════════════════════════════════════════════════════
//  MODAL engine
// ══════════════════════════════════════════════════════════════
let modalSaveHandler = null;

function openModal(title, bodyHtml, onSave) {
  $('modal-title').textContent = title;
  $('modal-body').innerHTML    = bodyHtml;
  modalSaveHandler             = onSave;
  show('modal-overlay');
}

function closeModal() {
  hide('modal-overlay');
  modalSaveHandler = null;
}

$('modal-close-btn').addEventListener('click', closeModal);
$('modal-cancel-btn').addEventListener('click', closeModal);
$('modal-overlay').addEventListener('click', e => {
  if (e.target === $('modal-overlay')) closeModal();
});

$('modal-save-btn').addEventListener('click', async () => {
  if (!modalSaveHandler) return;
  try {
    await modalSaveHandler();
    closeModal();
  } catch (err) {
    showError(err.message);
  }
});

// ══════════════════════════════════════════════════════════════
//  ORDER DETAIL
// ══════════════════════════════════════════════════════════════
async function showOrderDetail(id) {
  try {
    const [order, payments, allRevs] = await Promise.all([
      api.getOrder(id),
      api.getPaymentsByOrder(id),
      api.getReviews()
    ]);
    const reviews = allRevs.filter(r => r.orderId === id);

    $('detail-title').textContent = `Заказ #${order.id}`;
    $('detail-body').innerHTML = `
      <div class="detail-section">
        <div class="detail-section-title">Информация о заказе</div>
        <div class="detail-grid">
          <div class="detail-item"><label>Клиент</label><span>${order.clientFullName}</span></div>
          <div class="detail-item"><label>Сотрудник</label><span>${order.userLogin}</span></div>
          <div class="detail-item"><label>Дата</label><span>${fmtDate(order.data)}</span></div>
          <div class="detail-item"><label>Стоимость</label><span>${fmtMoney(order.price)}</span></div>
          <div class="detail-item"><label>Статус</label><span>${statusBadge(order.statusName)}</span></div>
          <div class="detail-item"><label>Описание</label><span>${order.description || '—'}</span></div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Платежи (${payments.length})</div>
        ${payments.length === 0 ? '<p style="color:var(--text-muted);font-size:13px">Платежей нет</p>' : `
        <table class="table">
          <thead><tr><th>#</th><th>Сумма</th><th>Дата</th><th>Метод</th><th>Статус</th></tr></thead>
          <tbody>${payments.map(p => `
            <tr>
              <td>${p.id}</td>
              <td>${fmtMoney(p.amount)}</td>
              <td>${fmtDate(p.paymentDate)}</td>
              <td>${p.paymentMethod || '—'}</td>
              <td>${statusBadge(p.status || 'Ожидает')}</td>
            </tr>`).join('')}
          </tbody>
        </table>`}
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Отзывы (${reviews.length})</div>
        ${reviews.length === 0 ? '<p style="color:var(--text-muted);font-size:13px">Отзывов нет</p>' : `
        <table class="table">
          <thead><tr><th>Рейтинг</th><th>Комментарий</th></tr></thead>
          <tbody>${reviews.map(r => `
            <tr>
              <td><span class="stars">${stars(r.rating)}</span> ${r.rating}/5</td>
              <td>${r.comment || '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>`}
      </div>

      ${currentUser.roleName === 'Клиент' && order.statusName === 'Завершён' && reviews.length === 0 ? `
      <div class="detail-section portal-review-form">
        <div class="detail-section-title">✍️ Оставить отзыв</div>
        <div class="form-group">
          <label>Рейтинг</label>
          <select id="portal-rating">
            ${[5,4,3,2,1].map(n => `<option value="${n}">${stars(n)} (${n})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Комментарий</label>
          <textarea id="portal-comment" rows="3" placeholder="Расскажите о вашем впечатлении..."></textarea>
        </div>
        <button class="btn btn-primary" onclick="submitPortalReview(${order.id})">Отправить отзыв</button>
      </div>` : ''}`;

    show('detail-overlay');
  } catch (err) { showError(err.message); }
}

$('detail-close-btn').addEventListener('click',  () => hide('detail-overlay'));
$('detail-close-btn2').addEventListener('click', () => hide('detail-overlay'));
$('detail-overlay').addEventListener('click', e => { if (e.target === $('detail-overlay')) hide('detail-overlay'); });

async function submitPortalReview(orderId) {
  const ratingEl  = $('portal-rating');
  const commentEl = $('portal-comment');
  if (!ratingEl) return;
  try {
    await api.createReview({
      orderId,
      rating:  Number(ratingEl.value),
      comment: commentEl?.value.trim() || null
    });
    hide('detail-overlay');
    toast('Спасибо за ваш отзыв!', 'success');
  } catch (err) {
    showError(err.message);
  }
}

// ══════════════════════════════════════════════════════════════
//  PROFILE PAGE
// ══════════════════════════════════════════════════════════════
function loadProfile() {
  if (!currentUser) return;
  $('p-login').value = currentUser.login;
  $('p-phone').value = currentUser.phoneNumber;
  $('p-role').value  = currentUser.roleName;
  $('p-pass').value  = '';
  $('p-pass2').value = '';
  hide('profile-error');
  $('profile-header').innerHTML = `
    <div class="profile-avatar-lg">👤</div>
    <div>
      <div class="profile-name">${currentUser.login}</div>
      <div class="profile-role">${currentUser.roleName}</div>
    </div>`;
}

$('profile-form').addEventListener('submit', async e => {
  e.preventDefault();
  hide('profile-error');

  const login = $('p-login').value.trim();
  const phone = $('p-phone').value.trim();
  const pass  = $('p-pass').value.trim();
  const pass2 = $('p-pass2').value.trim();

  if (!login || !phone) {
    $('profile-error').textContent = 'Логин и телефон обязательны';
    show('profile-error');
    return;
  }
  if (pass && pass !== pass2) {
    $('profile-error').textContent = 'Пароли не совпадают';
    show('profile-error');
    return;
  }
  if (pass && pass.length < 4) {
    $('profile-error').textContent = 'Пароль минимум 4 символа';
    show('profile-error');
    return;
  }

  try {
    await api.updateUser(currentUser.id, {
      roleId:      currentUser.roleId,
      login,
      phoneNumber: phone,
      password:    pass || undefined
    });
    currentUser.login       = login;
    currentUser.phoneNumber = phone;
    $('current-user-info').innerHTML = `<strong>${login}</strong><br>${currentUser.roleName}`;
    loadProfile();
    toast('Профиль успешно сохранён', 'success');
  } catch (err) {
    $('profile-error').textContent = err.message;
    show('profile-error');
  }
});

// ══════════════════════════════════════════════════════════════
//  CLIENT PORTAL — только для роли «Клиент»
// ══════════════════════════════════════════════════════════════
async function loadPortal() {
  if (!currentUser) return;

  // Приветствие
  const name = currentUser.login;
  $('portal-welcome').innerHTML = `
    <div class="portal-greeting">
      <span class="portal-avatar">👤</span>
      <div>
        <div class="portal-name">Добро пожаловать, <strong>${name}</strong>!</div>
        <div class="portal-hint">Здесь вы можете отслеживать статус ваших заказов в ателье «Стиль».</div>
      </div>
    </div>`;

  try {
    const orders = await api.getMyOrders(currentUser.id);
    if (orders.length === 0) {
      $('portal-orders-tbody').innerHTML = `
        <tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">
          У вас пока нет заказов. Обратитесь к администратору ателье.
        </td></tr>`;
      return;
    }
    $('portal-orders-tbody').innerHTML = orders.map(o => `
      <tr>
        <td>#${o.id}</td>
        <td>${fmtDate(o.data)}</td>
        <td>${o.description || '—'}</td>
        <td>${fmtMoney(o.price)}</td>
        <td>${statusBadge(o.statusName)}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="showOrderDetail(${o.id})">👁️ Детали</button>
        </td>
      </tr>`).join('');
  } catch (err) {
    $('portal-orders-tbody').innerHTML = `
      <tr><td colspan="5" style="text-align:center;color:var(--danger);padding:16px">
        ${err.message}
      </td></tr>`;
  }
}
