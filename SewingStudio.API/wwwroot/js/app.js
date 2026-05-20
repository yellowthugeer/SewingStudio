/* ============================================================
   SewingStudio CRM — main app
   ============================================================ */

let currentUser = null;
let cache = { roles: [], statuses: [], clients: [], users: [] };

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

// ── Alert / confirm helpers ──────────────────────────────────
function showError(msg) { alert('Ошибка: ' + msg); }

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
  'Администратор': ['dashboard', 'clients', 'orders', 'payments', 'reviews', 'users'],
  'Швея/Мастер':   ['dashboard', 'orders'],
  'Бухгалтер':     ['dashboard', 'orders', 'payments'],
  'Клиент':        ['portal'],
};

function applyRoleAccess(roleName) {
  const allowed = ROLE_PAGES[roleName] || ['dashboard'];
  document.querySelectorAll('.nav-item[data-page]').forEach(a => {
    const page = a.dataset.page;
    // Клиентский портал — отдельная логика
    if (a.classList.contains('nav-client-only')) {
      a.classList.toggle('hidden', roleName !== 'Клиент');
      return;
    }
    a.classList.toggle('hidden', !allowed.includes(page));
  });
}

function resetRoleAccess() {
  document.querySelectorAll('.nav-item[data-page]').forEach(a => {
    if (!a.classList.contains('nav-client-only')) a.classList.remove('hidden');
    else a.classList.add('hidden');
  });
}

// ── Cache ────────────────────────────────────────────────────
async function preloadCache() {
  const [roles, statuses, clients, users] = await Promise.all([
    api.getRoles(), api.getStatuses(), api.getClients(), api.getUsers()
  ]);
  cache.roles    = roles    || [];
  cache.statuses = statuses || [];
  cache.clients  = clients  || [];
  cache.users    = users    || [];
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
  }
}

// ══════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════
async function loadDashboard() {
  try {
    const [orders, clients] = await Promise.all([api.getOrders(), api.getClients()]);
    $('stat-orders').textContent  = orders.length;
    $('stat-clients').textContent = clients.length;
    const active = orders.filter(o => o.statusName === 'В работе' || o.statusName === 'Новый');
    $('stat-active').textContent  = active.length;
    const revenue = orders
      .filter(o => o.statusName === 'Завершён')
      .reduce((s, o) => s + Number(o.price), 0);
    $('stat-revenue').textContent = revenue.toLocaleString('ru-RU');

    const recent = [...orders].reverse().slice(0, 8);
    $('dashboard-orders-body').innerHTML = recent.map(o => `
      <tr>
        <td>#${o.id}</td>
        <td>${o.clientFullName}</td>
        <td>${o.description || '—'}</td>
        <td>${fmtMoney(o.price)}</td>
        <td>${statusBadge(o.statusName)}</td>
      </tr>`).join('');
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
  });
}

async function editClient(id) {
  const c = await api.getClient(id);
  openClientModal(c);
}

async function deleteClient(id) {
  if (!confirm('Удалить клиента?')) return;
  try { await api.deleteClient(id); await loadClients(); }
  catch (err) { showError(err.message); }
}

// ══════════════════════════════════════════════════════════════
//  ORDERS
// ══════════════════════════════════════════════════════════════
let allOrders = [];

async function loadOrders() {
  try {
    allOrders = await api.getOrders();
    // populate status filter
    const sel = $('order-status-filter');
    sel.innerHTML = '<option value="">Все статусы</option>' +
      cache.statuses.map(s => `<option value="${s.id}">${s.statusName}</option>`).join('');
    renderOrders(allOrders);
  } catch (err) { showError(err.message); }
}

function renderOrders(list) {
  $('orders-tbody').innerHTML = list.map(o => `
    <tr>
      <td>#${o.id}</td>
      <td>${fmtDate(o.data)}</td>
      <td>${o.clientFullName}</td>
      <td>${o.userLogin}</td>
      <td>${o.description || '—'}</td>
      <td>${fmtMoney(o.price)}</td>
      <td>${statusBadge(o.statusName)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-brown" onclick="editOrder(${o.id})">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deleteOrder(${o.id})">🗑️</button>
        </div>
      </td>
    </tr>`).join('');
}

$('order-status-filter').addEventListener('change', async function () {
  if (!this.value) { renderOrders(allOrders); return; }
  try {
    const filtered = await api.getOrdersByStatus(this.value);
    renderOrders(filtered);
  } catch (err) { showError(err.message); }
});

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
  });
}

async function editOrder(id) {
  const o = await api.getOrder(id);
  openOrderModal(o);
}

async function deleteOrder(id) {
  if (!confirm('Удалить заказ?')) return;
  try { await api.deleteOrder(id); await loadOrders(); }
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
  $('payments-tbody').innerHTML = list.map(p => `
    <tr>
      <td>${p.id}</td>
      <td>#${p.orderId}</td>
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
    </tr>`).join('');
}

$('add-payment-btn').addEventListener('click', () => openPaymentModal(null));

function openPaymentModal(p) {
  const orderOpts = allOrders.map(o =>
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
  });
}

async function editPayment(id) {
  const p = allPayments.find(x => x.id === id);
  if (!p) return;
  openPaymentModal(p);
}

async function deletePayment(id) {
  if (!confirm('Удалить платёж?')) return;
  try { await api.deletePayment(id); await loadPayments(); }
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
  $('reviews-tbody').innerHTML = list.map(r => `
    <tr>
      <td>${r.id}</td>
      <td>#${r.orderId}</td>
      <td><span class="stars">${stars(r.rating)}</span> ${r.rating}/5</td>
      <td>${r.comment || '—'}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-brown" onclick="editReview(${r.id})">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deleteReview(${r.id})">🗑️</button>
        </div>
      </td>
    </tr>`).join('');
}

$('add-review-btn').addEventListener('click', () => openReviewModal(null));

function openReviewModal(r) {
  const orderOpts = allOrders.map(o =>
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
  });
}

function editReview(id) {
  const r = allReviews.find(x => x.id === id);
  if (r) openReviewModal(r);
}

async function deleteReview(id) {
  if (!confirm('Удалить отзыв?')) return;
  try { await api.deleteReview(id); await loadReviews(); }
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
  if (!confirm('Удалить сотрудника?')) return;
  try { await api.deleteUser(id); await loadUsers(); }
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
      </tr>`).join('');
  } catch (err) {
    $('portal-orders-tbody').innerHTML = `
      <tr><td colspan="5" style="text-align:center;color:var(--danger);padding:16px">
        ${err.message}
      </td></tr>`;
  }
}
