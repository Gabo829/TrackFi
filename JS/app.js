const STORAGE_KEY = 'clara-finance-movements';
const PROFILE_KEY = 'trackfi-profile';
const THEME_KEY = 'trackfi-theme';
const savedProfile = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
const seed = [
  { id: 1, type: 'income', description: 'Proyecto de identidad visual', category: 'Trabajo', date: '2026-09-08', amount: 1250 },
  { id: 2, type: 'loss', description: 'Compra de materiales', category: 'Trabajo', date: '2026-09-06', amount: 180 },
  { id: 3, type: 'income', description: 'Venta de paquete digital', category: 'Ventas', date: '2026-09-02', amount: 420 }
];
let movements = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || seed;
let currentFilter = 'all';
let profile = savedProfile;
const savedTheme = localStorage.getItem(THEME_KEY) || 'light';

const money = value => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value).replace('US$', '$');
const formatDate = date => new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(movements));

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark-theme', isDark);
  const toggle = document.querySelector('#themeToggle');
  toggle.textContent = isDark ? '☀' : '☾';
  toggle.setAttribute('aria-label', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  toggle.setAttribute('title', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
}

function updateProfile() {
  const name = profile?.name || 'Gabriel';
  document.querySelector('#userName').textContent = name;
  document.querySelector('#profileBtn').textContent = name.charAt(0).toUpperCase();
  document.querySelector('#profileBtn').setAttribute('aria-label', `Perfil de ${name}`);
  document.querySelector('#profileMenuName').textContent = name;
}

function render() {
  const income = movements.filter(item => item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0);
  const loss = movements.filter(item => item.type === 'loss').reduce((sum, item) => sum + Number(item.amount), 0);
  document.querySelector('#balanceValue').textContent = money(income - loss);
  document.querySelector('#incomeValue').textContent = money(income);
  document.querySelector('#lossValue').textContent = money(loss);
  document.querySelector('#balanceNote').textContent = income - loss >= 0 ? 'Vas por buen camino' : 'Revisa tus salidas';
  const available = income ? Math.max(0, Math.round(((income - loss) / income) * 100)) : 0;
  const latest = [...movements].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  document.querySelector('#summaryMessage').textContent = income - loss >= 0 ? 'Tu balance está creciendo.' : 'Tus pérdidas superan tus ingresos.';
  document.querySelector('#summaryDetail').textContent = movements.length ? `${movements.length} movimiento${movements.length === 1 ? '' : 's'} registrado${movements.length === 1 ? '' : 's'} hasta ahora.` : 'Cada movimiento cuenta para tener una visión más clara.';
  document.querySelector('#lastMovement').textContent = latest ? latest.description : 'Sin movimientos';
  document.querySelector('#lastMovementDetail').textContent = latest ? `${latest.type === 'income' ? 'Ingreso' : 'Pérdida'} de ${money(latest.amount)} · ${formatDate(latest.date)}` : 'Añade tu primer registro para verlo aquí.';
  document.querySelector('#availablePercent').textContent = `${available}%`;
  document.querySelector('#availableProgress').style.width = `${available}%`;
  renderTransactions();
  renderChart();
}

function renderTransactions() {
  const list = document.querySelector('#transactionsList');
  const visible = movements.filter(item => currentFilter === 'all' || item.type === currentFilter).sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!visible.length) { list.innerHTML = '<div class="empty-list">No hay movimientos en esta vista.</div>'; return; }
  list.innerHTML = visible.map(item => `<div class="transaction"><div class="transaction-icon ${item.type}">${item.type === 'income' ? '↗' : '↘'}</div><div><div class="transaction-title">${escapeHtml(item.description)}</div><div class="transaction-meta">${escapeHtml(item.category)} · ${formatDate(item.date)}</div></div><div class="transaction-amount ${item.type}">${item.type === 'income' ? '+' : '-'}${money(item.amount)}</div><button class="delete-btn" data-id="${item.id}" aria-label="Eliminar movimiento">×</button></div>`).join('');
  list.querySelectorAll('.delete-btn').forEach(button => button.addEventListener('click', () => { movements = movements.filter(item => item.id !== Number(button.dataset.id)); save(); render(); }));
}

function renderChart() {
  const chart = document.querySelector('#chartBars');
  const selected = document.querySelector('#periodSelect').value === 'week' ? [...movements].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 7) : movements;
  const max = Math.max(...selected.map(item => Number(item.amount)), 1);
  if (!selected.length) { chart.innerHTML = '<div class="empty-chart">Agrega movimientos para ver tu actividad.</div>'; return; }
  chart.innerHTML = selected.reverse().map(item => `<div class="bar-group" title="${escapeHtml(item.description)}: ${money(item.amount)}"><div class="bar ${item.type}" style="height:${Math.max(5, (item.amount / max) * 92)}%"></div></div>`).join('');
}

function escapeHtml(value) { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }

document.querySelector('#movementForm').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  movements.push({ id: Date.now(), type: data.get('type'), description: data.get('description').trim(), category: data.get('category'), date: data.get('date'), amount: Number(data.get('amount')) });
  save(); render(); event.currentTarget.reset(); document.querySelector('#dateInput').value = new Date().toISOString().slice(0, 10); document.querySelector('#nuevo').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

document.querySelectorAll('.filter-btn').forEach(button => button.addEventListener('click', () => { currentFilter = button.dataset.filter; document.querySelectorAll('.filter-btn').forEach(item => item.classList.toggle('active', item === button)); renderTransactions(); }));
document.querySelector('#periodSelect').addEventListener('change', renderChart);
document.querySelector('#dateInput').value = new Date().toISOString().slice(0, 10);
document.querySelector('#todayLabel').textContent = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
document.querySelector('#clearBtn').addEventListener('click', () => { if (confirm('¿Borrar todos los movimientos?')) { movements = []; save(); render(); } });
document.querySelector('#exportBtn').addEventListener('click', () => { const blob = new Blob([JSON.stringify(movements, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'trackfi-movimientos.json'; link.click(); URL.revokeObjectURL(link.href); });
document.querySelector('#themeToggle').addEventListener('click', () => {
  const nextTheme = document.body.classList.contains('dark-theme') ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, nextTheme);
  applyTheme(nextTheme);
});
document.querySelector('#loginForm').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  profile = { name: data.get('name').trim() };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  updateProfile();
  document.querySelector('#authOverlay').classList.remove('visible');
  document.querySelector('#authOverlay').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('auth-locked');
});
document.querySelector('#profileBtn').addEventListener('click', () => {
  const menu = document.querySelector('#profileMenu');
  const isOpen = menu.classList.toggle('visible');
  menu.setAttribute('aria-hidden', String(!isOpen));
});
document.querySelector('#logoutBtn').addEventListener('click', () => {
  localStorage.removeItem(PROFILE_KEY);
  profile = null;
  document.querySelector('#profileMenu').classList.remove('visible');
  document.querySelector('#profileMenu').setAttribute('aria-hidden', 'true');
  document.querySelector('#loginForm').reset();
  document.querySelector('#authOverlay').classList.add('visible');
  document.querySelector('#authOverlay').setAttribute('aria-hidden', 'false');
  document.body.classList.add('auth-locked');
  document.querySelector('#loginName').focus();
});
function setView() {
  const viewId = ['resumen', 'movimientos', 'analisis'].includes(window.location.hash.slice(1)) ? window.location.hash.slice(1) : 'resumen';
  document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === viewId));
  document.querySelectorAll('.nav-item').forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${viewId}`));
}
window.addEventListener('hashchange', setView);
setView();
applyTheme(savedTheme);
updateProfile();
if (!profile) {
  document.querySelector('#authOverlay').classList.add('visible');
  document.querySelector('#authOverlay').setAttribute('aria-hidden', 'false');
  document.body.classList.add('auth-locked');
}
render();
