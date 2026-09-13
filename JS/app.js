const STORAGE_KEY = 'clara-finance-movements';
const PROFILE_KEY = 'trackfi-profile';
const CREDENTIALS_KEY = 'trackfi-credentials';
const THEME_KEY = 'trackfi-theme';
const savedProfile = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
let credentials = JSON.parse(localStorage.getItem(CREDENTIALS_KEY) || 'null');
if (!savedProfile) {
  window.location.replace('login.html');
}
let movements = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || [];
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
  document.querySelector('#summaryMessage').textContent = income - loss >= 0 ? 'Tu balance está creciendo.' : 'Tus egresos superan tus ingresos.';
  document.querySelector('#summaryDetail').textContent = movements.length ? `${movements.length} movimiento${movements.length === 1 ? '' : 's'} registrado${movements.length === 1 ? '' : 's'} hasta ahora.` : 'Cada movimiento cuenta para tener una visión más clara.';
  document.querySelector('#lastMovement').textContent = latest ? latest.description : 'Sin movimientos';
  document.querySelector('#lastMovementDetail').textContent = latest ? `${latest.type === 'income' ? 'Ingreso' : 'Egreso'} de ${money(latest.amount)} · ${formatDate(latest.date)}` : 'Añade tu primer registro para verlo aquí.';
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
  const scale = document.querySelector('#chartScale');
  const period = document.querySelector('#periodSelect').value;
  const startDate = document.querySelector('#analysisStartDate').value;
  const endDate = document.querySelector('#analysisEndDate').value;
  const currentYear = new Date().getFullYear();
  let selected = period === 'week' ? [...movements].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 7) : movements;
  if (startDate || endDate) {
    selected = movements.filter(item => (!startDate || item.date >= startDate) && (!endDate || item.date <= endDate));
  } else if (period === 'all') {
    selected = movements.filter(item => new Date(`${item.date}T12:00:00`).getFullYear() === currentYear);
  }
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthly = months.map((month, index) => ({
    month,
    index,
    income: selected.filter(item => new Date(`${item.date}T12:00:00`).getMonth() === index && item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0),
    loss: selected.filter(item => new Date(`${item.date}T12:00:00`).getMonth() === index && item.type === 'loss').reduce((sum, item) => sum + Number(item.amount), 0)
  }));
  const highestAmount = Math.max(...monthly.flatMap(item => [item.income, item.loss]), 1);
  const rawStep = highestAmount / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalizedStep = rawStep / magnitude;
  const step = (normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10) * magnitude;
  const max = step * 4;
  scale.innerHTML = [4, 3, 2, 1, 0].map(level => `<span>${money(max * level / 4).replace(/,00$/, '')}</span>`).join('');
  chart.innerHTML = monthly.map(item => `<div class="month-group" title="${item.month}: ingresos ${money(item.income)}, egresos ${money(item.loss)}"><div class="month-bars"><div class="bar income" style="height:${item.income ? Math.max(5, (item.income / max) * 100) : 0}%"></div><div class="bar loss" style="height:${item.loss ? Math.max(5, (item.loss / max) * 100) : 0}%"></div></div></div>`).join('');
  document.querySelector('#chartMonths').innerHTML = monthly.map(item => `<span class="month-label">${item.month}</span>`).join('');
}

function escapeHtml(value) { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }

document.querySelector('#movementForm').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  movements.push({ id: Date.now(), type: data.get('type'), description: data.get('description').trim(), category: data.get('category'), date: data.get('date'), amount: Number(data.get('amount')) });
  save(); render(); event.currentTarget.reset(); document.querySelector('#dateInput').value = new Date().toISOString().slice(0, 10); document.querySelector('#nuevo').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

document.querySelectorAll('.filter-btn').forEach(button => button.addEventListener('click', () => { currentFilter = button.dataset.filter; document.querySelectorAll('.filter-btn').forEach(item => item.classList.toggle('active', item === button)); renderTransactions(); }));
document.querySelector('#periodSelect').addEventListener('change', () => {
  document.querySelector('#analysisStartDate').value = '';
  document.querySelector('#analysisEndDate').value = '';
  document.querySelector('#analysisMessage').textContent = '';
  renderChart();
});
document.querySelector('#applyAnalysisDates').addEventListener('click', () => {
  const startDate = document.querySelector('#analysisStartDate').value;
  const endDate = document.querySelector('#analysisEndDate').value;
  const message = document.querySelector('#analysisMessage');
  if (startDate && endDate && startDate > endDate) {
    message.textContent = 'La fecha inicial debe ser anterior a la fecha final.';
    message.classList.add('error');
    return;
  }
  message.textContent = startDate || endDate ? 'Mostrando el rango seleccionado.' : '';
  message.classList.remove('error');
  document.querySelector('#periodSelect').value = 'all';
  renderChart();
});
document.querySelector('#dateInput').value = new Date().toISOString().slice(0, 10);
document.querySelector('#todayLabel').textContent = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
document.querySelector('#clearBtn').addEventListener('click', () => { if (confirm('¿Borrar todos los movimientos?')) { movements = []; save(); render(); } });
document.querySelector('#exportBtn').addEventListener('click', () => { const blob = new Blob([JSON.stringify(movements, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'trackfi-movimientos.json'; link.click(); URL.revokeObjectURL(link.href); });
document.querySelector('#themeToggle').addEventListener('click', () => {
  const nextTheme = document.body.classList.contains('dark-theme') ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, nextTheme);
  applyTheme(nextTheme);
});
document.querySelectorAll('[data-password-toggle]').forEach(toggle => {
  toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="eye-shape" d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle><path class="eye-slash" d="M3 3 21 21"></path></svg>';
});
document.querySelectorAll('[data-password-toggle]').forEach(toggle => toggle.addEventListener('click', () => {
  const input = toggle.parentElement.querySelector('input');
  const isVisible = input.type === 'text';
  input.type = isVisible ? 'password' : 'text';
  toggle.setAttribute('aria-label', isVisible ? 'Mostrar contraseña' : 'Ocultar contraseña');
  toggle.classList.toggle('active', !isVisible);
}));
document.querySelector('#profileBtn').addEventListener('click', () => {
  const menu = document.querySelector('#profileMenu');
  const isOpen = menu.classList.toggle('visible');
  menu.setAttribute('aria-hidden', String(!isOpen));
});
function resetPasswordVisibility() {
  document.querySelectorAll('[data-password-toggle]').forEach(toggle => {
    const input = toggle.parentElement.querySelector('input');
    input.type = 'password';
    toggle.classList.remove('active');
    toggle.setAttribute('aria-label', 'Mostrar contraseña');
  });
}

function clearPasswordForm() {
  document.querySelector('#passwordForm').reset();
  document.querySelector('#passwordMessage').textContent = '';
  document.querySelector('#passwordMessage').classList.remove('success');
}

document.addEventListener('click', event => {
  const profileWrap = document.querySelector('.profile-menu-wrap');
  const menu = document.querySelector('#profileMenu');
  if (!profileWrap.contains(event.target) && menu.classList.contains('visible')) {
    menu.classList.remove('visible');
    menu.setAttribute('aria-hidden', 'true');
    resetPasswordVisibility();
    clearPasswordForm();
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    const menu = document.querySelector('#profileMenu');
    menu.classList.remove('visible');
    menu.setAttribute('aria-hidden', 'true');
    resetPasswordVisibility();
    clearPasswordForm();
  }
});
document.querySelector('#changePasswordBtn').addEventListener('click', () => {
  document.querySelector('#passwordForm').classList.toggle('visible');
  document.querySelector('#passwordMessage').textContent = '';
});
document.querySelector('#passwordForm').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const message = document.querySelector('#passwordMessage');
  const currentPassword = data.get('currentPassword');
  const newPassword = data.get('newPassword');
  if (!credentials || credentials.password !== currentPassword) {
    message.textContent = 'La clave actual no es correcta.';
    return;
  }
  if (newPassword !== data.get('confirmPassword')) {
    message.textContent = 'Las nuevas claves no coinciden.';
    return;
  }
  credentials.password = newPassword;
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
  message.classList.add('success');
  message.textContent = 'Contraseña actualizada.';
  event.currentTarget.reset();
});
document.querySelector('#logoutBtn').addEventListener('click', () => {
  localStorage.removeItem(PROFILE_KEY);
  profile = null;
  document.querySelector('#profileMenu').classList.remove('visible');
  document.querySelector('#profileMenu').setAttribute('aria-hidden', 'true');
  resetPasswordVisibility();
  clearPasswordForm();
  window.location.href = 'login.html';
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
render();
