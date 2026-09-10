const PROFILE_KEY = 'trackfi-profile';
const CREDENTIALS_KEY = 'trackfi-credentials';
const THEME_KEY = 'trackfi-theme';
let credentials = JSON.parse(localStorage.getItem(CREDENTIALS_KEY) || 'null');

if (localStorage.getItem(PROFILE_KEY)) {
  window.location.replace('index.html');
}

function setupPasswordToggles() {
  document.querySelectorAll('[data-password-toggle]').forEach(toggle => {
    toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="eye-shape" d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle><path class="eye-slash" d="M3 3 21 21"></path></svg>';
    toggle.addEventListener('click', () => {
      const input = toggle.parentElement.querySelector('input');
      const isVisible = input.type === 'text';
      input.type = isVisible ? 'password' : 'text';
      toggle.classList.toggle('active', !isVisible);
      toggle.setAttribute('aria-label', isVisible ? 'Mostrar contraseña' : 'Ocultar contraseña');
    });
  });
}

document.querySelector('#loginForm').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const name = data.get('name').trim();
  const password = data.get('password');
  const error = document.querySelector('#loginError');

  if (credentials && (credentials.name.toLowerCase() !== name.toLowerCase() || credentials.password !== password)) {
    error.textContent = 'El nombre o la contraseña no son correctos.';
    return;
  }

  if (!credentials) {
    credentials = { name, password };
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
  }

  localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: credentials.name }));
  window.location.href = 'index.html';
});

const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
document.body.classList.toggle('dark-theme', savedTheme === 'dark');
setupPasswordToggles();
document.querySelector('#loginName').focus();
