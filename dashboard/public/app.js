// FreeMatch local dashboard — frontend logic.
// Talks only to the same-origin local Express server (/api/*), which proxies to
// production. Password is never stored. The JWT is kept in sessionStorage so a
// refresh (F5) keeps you logged in; it clears when the tab/browser closes.

const TOKEN_KEY = 'fmDashToken';

const $ = (id) => document.getElementById(id);
const state = { token: null, summaryChart: null, seriesChart: null, hasSeries: null };

function loadToken() { return sessionStorage.getItem(TOKEN_KEY); }
function saveToken(t) { sessionStorage.setItem(TOKEN_KEY, t); state.token = t; }
function clearToken() { sessionStorage.removeItem(TOKEN_KEY); state.token = null; }

// Event metadata used to render consistently. Add new stats here and they'll
// show up automatically if the API returns them.
const EVENT_META = {
  register:     { label: 'Registros',       color: '#6fcf97', kpi: true,  kpiLab: 'Registros' },
  login:        { label: 'Logins',          color: '#4ea1ff', kpi: true,  kpiLab: 'Logins' },
  app_open:     { label: 'Aperturas',       color: '#f2c14e', kpi: false, kpiLab: '' },
  activeUsers:  { label: 'Usuarios activos', color: '#b06bff', kpi: true, kpiLab: 'Activos' },
  match:        { label: 'Matches',         color: '#ff7a86', kpi: true,  kpiLab: 'Matches' },
};

// Human label for any key not in EVENT_META (keeps it modular).
function meta(key) { return EVENT_META[key] || { label: key, color: '#9aa0b0', kpi: false }; }

// ---------- Navigation / auth ----------
function show(view) {
  $('loginView').classList.toggle('hidden', view !== 'login');
  $('dashView').classList.toggle('hidden', view !== 'dash');
}
function setConn(text, cls) {
  const c = $('conn'); c.textContent = text; c.className = 'conn ' + (cls || '');
  c.classList.toggle('muted', !cls);
}

async function login(email, password) {
  const res = await fetch('/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) throw new Error(data.error || 'Login failed');
  saveToken(data.token);
  setConn('Conectado', 'ok');
}

async function apiCall(path, extra = {}) {
  const res = await fetch(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: state.token, ...extra }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ---------- Rendering ----------
function renderKpis(summary) {
  const wrap = $('kpis'); wrap.innerHTML = '';
  const order = ['activeUsers', 'match', 'register', 'login', 'app_open'];
  order.forEach((key) => {
    const m = meta(key);
    if (summary[key] === undefined) return;
    const unit = key === 'activeUsers' ? 'usuarios únicos' : 'en el período';
    const el = document.createElement('div');
    el.className = 'kpi';
    el.innerHTML = `
      <div class="val" style="color:${m.color}">${summary[key]}</div>
      <div class="lab">${m.label}</div>
      <div class="sub">${unit}</div>`;
    wrap.appendChild(el);
  });
}

function renderSummaryChart(summary) {
  const labels = [], vals = [], colors = [];
  Object.keys(summary).forEach((k) => {
    if (k === 'periodDays') return;
    const v = summary[k]; if (v === undefined) return;
    const m = meta(k);
    labels.push(m.label); vals.push(Number(v)); colors.push(m.color);
  });
  const ctx = $('summaryChart');
  if (state.summaryChart) state.summaryChart.destroy();
  state.summaryChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data: vals, backgroundColor: colors, borderRadius: 6 }] },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

function renderSeries(series) {
  // series: { labels: ["2026-09-02", ...], events: { match: [0,1,...], login: [...], ... } }
  $('seriesNote').textContent = '';
  $('rawCard').classList.add('hidden');
  if (!series || !series.labels) { renderSeriesUnavailable(); return; }
  const ctx = $('seriesChart');
  if (state.seriesChart) state.seriesChart.destroy();
  const datasets = Object.keys(series.events || {}).map((ev) => {
    const m = meta(ev);
    const data = series.events[ev].map((x) => Number(x));
    return { label: m.label, data, borderColor: m.color, backgroundColor: m.color + '22', fill: true, tension: 0.25, spanGaps: true };
  });
  state.seriesChart = datasets.length
    ? new Chart(ctx, {
        type: 'line',
        data: { labels: series.labels, datasets },
        options: {
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { labels: { color: '#e8eaed' } } },
          scales: {
            x: { ticks: { color: '#9aa0b0', maxTicksLimit: 12 } },
            y: { beginAtZero: true, ticks: { color: '#9aa0b0', precision: 0 } },
          },
        },
      })
    : null;
  if (!datasets.length) renderSeriesUnavailable('No hay eventos en el período.');
}

function renderSeriesUnavailable(msg) {
  $('seriesNote').textContent = msg || 'El backend de datos todavía no expone la serie temporal (/api/analytics/series). Se muestra solo el resumen agregado.';
  $('seriesChart').width = 0; $('seriesChart').height = 0;
  if (state.seriesChart) { state.seriesChart.destroy(); state.seriesChart = null; }
}

function renderRaw(obj) {
  $('raw').textContent = JSON.stringify(obj, null, 2);
  $('rawCard').classList.remove('hidden');
}

async function loadDash() {
  const days = parseInt($('days').value) || 7;
  setConn('Cargando…');
  const msg = $('msgDash') || (() => { const p = document.createElement('p'); p.id = 'msgDash'; p.className = 'msg'; $('controls').prepend(p); return p; })();
  try {
    const summary = await apiCall('/api/summary', { days });
    renderKpis(summary);
    renderSummaryChart(summary);
    renderRaw(summary);
    // Time series (evolución diaria). If /series is not deployed yet we degrade
    // gracefully to the aggregate summary and stop retrying every refresh.
    if (state.hasSeries !== false) {
      try {
        const ser = await apiCall('/api/series', { days });
        if (ser && ser.events) { state.hasSeries = true; renderSeries(ser); }
        else renderSeriesUnavailable();
      } catch (e2) {
        if (e2.status === 401) { logout();
          msg.className = 'msg err'; msg.textContent = 'La sesión expiró. Ingresa de nuevo.'; return; }
        if (e2.status === 404 || (e2.message || '').includes('series')) state.hasSeries = false;
        renderSeriesUnavailable();
      }
    } else {
      renderSeriesUnavailable();
    }
    msg.textContent = ''; setConn('Conectado', 'ok');
  } catch (e) {
    if (e.status === 401) {
      clearToken(); show('login');
      const lm = $('loginMsg'); lm.className = 'msg err'; lm.textContent = 'La sesión expiró. Ingresa de nuevo.';
    } else {
      msg.className = 'msg err'; msg.textContent = e.message;
      setConn('Error de conexión', 'err');
    }
  }
}

// ---------- Wiring ----------
$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('loginMsg'); msg.className = 'msg'; msg.textContent = 'Ingresando…';
  try {
    await login($('email').value.trim(), $('password').value);
    $('password').value = '';
    msg.className = 'msg ok'; msg.textContent = 'Sesión iniciada.';
    show('dash'); loadDash();
  } catch (err) {
    msg.className = 'msg err'; msg.textContent = err.message;
  }
});

$('refresh').addEventListener('click', loadDash);
$('days').addEventListener('change', loadDash);

function logout() {
  clearToken();
  show('login');
}
$('logout').addEventListener('click', logout);

// Auto-login: if we still have a valid-looking token from a previous page view
// (refresh), skip the login screen. The token clears on browser close, so a
// fresh open asks to log in again.
(function init() {
  const t = loadToken();
  if (t) {
    state.token = t;
    show('dash');
    loadDash();
  } else {
    show('login');
  }
})();
