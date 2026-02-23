/**
 * stats.js — Lógica da página de estatísticas
 * Realiza múltiplas chamadas GET à API para obter dados de estatísticas
 */

import {
  getStats, getTickets,
  priorityLabel, statusBadgeClass, priorityBadgeClass, formatDate,
} from './api.js';

const toastContainer = document.getElementById('toast-container');
const navToggle = document.getElementById('nav-toggle');
const navLinks  = document.getElementById('nav-links');

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const icons = { success: '✔', error: '✖', info: 'ℹ' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type] ?? 'ℹ'}</span><span>${msg}</span>`;
  toastContainer.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ── Spinner helper ─────────────────────────────────────────────────────────
function setLoading(el, msg = 'A carregar...') {
  el.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--txt-muted)">
    <div class="spinner" style="margin:0 auto .75rem"></div>${msg}</div>`;
}

// ── Render stat totals ─────────────────────────────────────────────────────
function renderTotals(totals) {
  document.getElementById('stat-total').textContent   = totals.total  ?? 0;
  document.getElementById('stat-open').textContent    = totals.open   ?? 0;
  document.getElementById('stat-closed').textContent  = totals.closed ?? 0;
}

// ── Render bar chart ───────────────────────────────────────────────────────
function renderBarChart(containerId, items, labelFn, colorClass = '') {
  const container = document.getElementById(containerId);
  if (!items || !items.length) {
    container.innerHTML = '<p style="color:var(--txt-muted);font-size:.85rem;">Sem dados.</p>';
    return;
  }

  const max = Math.max(...items.map(i => Number(i.count)));
  container.innerHTML = '';

  items.forEach(item => {
    const label = labelFn ? labelFn(item) : (item.status ?? item.priority ?? '—');
    const count = Number(item.count ?? 0);
    const pct   = max > 0 ? Math.round((count / max) * 100) : 0;

    const el = document.createElement('div');
    el.className = 'bar-item';
    el.innerHTML = `
      <div class="bar-item__label">
        <span>${escHtml(label)}</span>
        <strong>${count}</strong>
      </div>
      <div class="bar-track">
        <div class="bar-fill ${colorClass}" style="width: 0%" data-target="${pct}"></div>
      </div>`;
    container.appendChild(el);
  });

  // Animate bars after paint
  requestAnimationFrame(() => {
    container.querySelectorAll('.bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.target + '%';
    });
  });
}

// ── Render recent tickets (GET com filtro de data) ─────────────────────────
async function loadRecentTickets() {
  const container = document.getElementById('recent-list');
  setLoading(container, 'A carregar tickets recentes...');

  try {
    // GET /api/tickets — ordenados por created_at desc, últimos 7 dias
    const result = await getTickets({
      limit: 10,
      sort_by: 'created_at',
      sort_dir: 'desc',
    });

    const tickets = result.data ?? [];

    // Filtrar últimos 7 dias no cliente (a API não tem filtro de data)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const recent = tickets.filter(t => {
      if (!t.Open_Time && !t.created_at) return true; // inclui se sem data
      const d = new Date(t.Open_Time ?? t.created_at);
      return d >= cutoff;
    });

    // Guarda total recente no card
    document.getElementById('stat-recent').textContent = recent.length;

    if (!recent.length) {
      container.innerHTML = '<p style="color:var(--txt-muted);font-size:.85rem;">Nenhum ticket nos últimos 7 dias.</p>';
      return;
    }

    container.innerHTML = '';
    recent.forEach(t => {
      const item = document.createElement('div');
      item.className = 'recent-item';
      item.innerHTML = `
        <span class="recent-item__id">#${t.id}</span>
        <span class="recent-item__name">${escHtml(t.CI_Name ?? '—')}</span>
        <span class="badge ${statusBadgeClass(t.Status)}" style="font-size:.7rem">${escHtml(t.Status ?? '—')}</span>
        <span class="recent-item__date">${formatDate(t.Open_Time ?? t.created_at)}</span>`;
      container.appendChild(item);
    });
  } catch (err) {
    container.innerHTML = `<p style="color:var(--red)">Erro: ${err.message}</p>`;
    showToast('Erro ao carregar tickets recentes.', 'error');
  }
}

// ── Carregar todas as estatísticas ─────────────────────────────────────────
async function loadStats() {
  // Mostra loading nos gráficos
  setLoading(document.getElementById('chart-status'), 'A carregar...');
  setLoading(document.getElementById('chart-priority'), 'A carregar...');

  try {
    // Chamada 1: GET /api/stats/tickets — totais, por status, por prioridade
    const statsResult = await getStats();
    const stats = statsResult.data;

    renderTotals(stats.totals);

    // Chamada 2: Renderiza gráfico de status
    renderBarChart(
      'chart-status',
      stats.by_status,
      (item) => item.status ?? '—',
      'blue',
    );

    // Chamada 3: Renderiza gráfico de prioridade
    renderBarChart(
      'chart-priority',
      stats.by_priority,
      (item) => priorityLabel(item.priority),
      'red',
    );

    showToast('Estatísticas carregadas.', 'success');
  } catch (err) {
    showToast('Erro ao carregar estatísticas: ' + err.message, 'error');
    document.getElementById('chart-status').innerHTML =
      `<p style="color:var(--red)">Erro: ${err.message}</p>`;
    document.getElementById('chart-priority').innerHTML =
      `<p style="color:var(--red)">Erro: ${err.message}</p>`;
  }
}

// ── Navbar mobile toggle ───────────────────────────────────────────────────
navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));

// ── Escape ─────────────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') navLinks.classList.remove('open');
});

// ── Utilidades ─────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Init ───────────────────────────────────────────────────────────────────
loadStats();
loadRecentTickets();
