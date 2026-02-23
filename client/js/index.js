/**
 * index.js — Lógica da página principal (Gestor de Tickets)
 * Operações: GET (lista), POST (criar), PATCH (editar), DELETE (apagar)
 */

import {
  getTickets, createTicket, updateTicket, deleteTicket,
  priorityLabel, priorityBadgeClass, statusBadgeClass, formatDate, toDatetimeLocal,
} from './api.js';

// ── Estado ─────────────────────────────────────────────────────────────────
const state = {
  tickets: [],
  total: 0,
  page: 1,
  limit: 10,
  editingId: null,
  filters: { status: '', priority: '', ci_name: '' },
};

// ── Elementos DOM ──────────────────────────────────────────────────────────
const tbody          = document.getElementById('tickets-tbody');
const paginationEl   = document.getElementById('pagination');
const paginationInfo = document.getElementById('pagination-info');
const filterSearch   = document.getElementById('filter-search');
const filterStatus   = document.getElementById('filter-status');
const filterPriority = document.getElementById('filter-priority');
const modalOverlay   = document.getElementById('modal-overlay');
const modalTitle     = document.getElementById('modal-title');
const formTicket     = document.getElementById('form-ticket');
const btnNewTicket   = document.getElementById('btn-new-ticket');
const btnModalClose  = document.getElementById('btn-modal-close');
const btnFormCancel  = document.getElementById('btn-form-cancel');
const confirmOverlay = document.getElementById('confirm-overlay');
const confirmMsg     = document.getElementById('confirm-message');
const btnConfirmYes  = document.getElementById('btn-confirm-yes');
const btnConfirmNo   = document.getElementById('btn-confirm-no');
const toastContainer = document.getElementById('toast-container');
const navToggle      = document.getElementById('nav-toggle');
const navLinks       = document.getElementById('nav-links');

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const icons = { success: '✔', error: '✖', info: 'ℹ' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type] ?? 'ℹ'}</span><span>${msg}</span>`;
  toastContainer.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ── Loading / empty rows ───────────────────────────────────────────────────
function setLoadingRow() {
  tbody.innerHTML = `<tr class="loading-row"><td colspan="7"><div class="spinner"></div> A carregar...</td></tr>`;
}
function setEmptyRow() {
  tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Nenhum ticket encontrado.</td></tr>`;
}

// ── Render tabela ──────────────────────────────────────────────────────────
function renderRow(t) {
  const tr = document.createElement('tr');
  tr.dataset.id = t.id;

  tr.innerHTML = `
    <td class="col-id" data-label="ID">#${t.id}</td>
    <td class="col-name" data-label="Nome">${escHtml(t.CI_Name ?? '—')}</td>
    <td class="col-cat"  data-label="Cat">${escHtml(t.CI_Cat ?? '—')}</td>
    <td class="col-status" data-label="Status">
      <span class="badge ${statusBadgeClass(t.Status)}">${escHtml(t.Status ?? '—')}</span>
    </td>
    <td class="col-priority" data-label="Prior.">
      <span class="badge ${priorityBadgeClass(t.Priority)}">${priorityLabel(t.Priority)}</span>
    </td>
    <td class="col-date" data-label="Data">${formatDate(t.Open_Time)}</td>
    <td class="col-actions" data-label="Ações">
      <button class="btn btn-secondary btn-sm btn-edit" data-id="${t.id}" title="Editar">✏</button>
      <button class="btn btn-danger btn-sm btn-delete" data-id="${t.id}" title="Apagar">🗑</button>
    </td>`;

  return tr;
}

function renderTickets() {
  tbody.innerHTML = '';
  if (!state.tickets.length) { setEmptyRow(); return; }
  state.tickets.forEach(t => tbody.appendChild(renderRow(t)));
}

// ── Paginação ──────────────────────────────────────────────────────────────
function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(state.total / state.limit));
  paginationInfo.textContent = `${state.total} ticket${state.total !== 1 ? 's' : ''}`;

  paginationEl.innerHTML = '';

  const prev = document.createElement('button');
  prev.textContent = '←';
  prev.disabled = state.page <= 1;
  prev.addEventListener('click', () => { state.page--; loadTickets(); });
  paginationEl.appendChild(prev);

  // Mostra até 5 páginas
  const start = Math.max(1, state.page - 2);
  const end   = Math.min(totalPages, start + 4);
  for (let p = start; p <= end; p++) {
    const btn = document.createElement('button');
    btn.textContent = p;
    if (p === state.page) btn.classList.add('active');
    btn.addEventListener('click', () => { state.page = p; loadTickets(); });
    paginationEl.appendChild(btn);
  }

  const next = document.createElement('button');
  next.textContent = '→';
  next.disabled = state.page >= totalPages;
  next.addEventListener('click', () => { state.page++; loadTickets(); });
  paginationEl.appendChild(next);
}

// ── Carregar tickets (GET) ─────────────────────────────────────────────────
async function loadTickets() {
  setLoadingRow();
  try {
    const result = await getTickets({
      ...state.filters,
      limit: state.limit,
      offset: (state.page - 1) * state.limit,
    });
    state.tickets = result.data ?? [];
    state.total   = result.paging?.total ?? 0;
    renderTickets();
    renderPagination();
  } catch (err) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Erro ao carregar tickets: ${err.message}</td></tr>`;
    showToast('Erro ao carregar tickets: ' + err.message, 'error');
  }
}

// ── Modal helpers ──────────────────────────────────────────────────────────
function openModal(title) {
  modalTitle.textContent = title;
  modalOverlay.classList.add('open');
  document.getElementById('field-ci-name').focus();
}
function closeModal() {
  modalOverlay.classList.remove('open');
  formTicket.reset();
  clearFormErrors();
  state.editingId = null;
}

// ── Validação ──────────────────────────────────────────────────────────────
function clearFormErrors() {
  document.querySelectorAll('.form-error').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}

function validateForm() {
  clearFormErrors();
  let valid = true;

  const ciName = document.getElementById('field-ci-name');
  const openTime = document.getElementById('field-open-time');

  if (!ciName.value.trim() || ciName.value.trim().length < 3) {
    showFieldError(ciName, 'O nome deve ter pelo menos 3 caracteres.');
    valid = false;
  }
  if (!openTime.value.trim()) {
    showFieldError(openTime, 'Data de abertura é obrigatória.');
    valid = false;
  }

  return valid;
}

function showFieldError(input, msg) {
  input.classList.add('error');
  const errEl = input.parentElement.querySelector('.form-error');
  if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
}

// ── Submissão do formulário (POST / PATCH) ─────────────────────────────────
formTicket.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const payload = {
    CI_Name:    document.getElementById('field-ci-name').value.trim(),
    CI_Cat:     document.getElementById('field-ci-cat').value.trim(),
    Status:     document.getElementById('field-status').value,
    Priority:   document.getElementById('field-priority').value,
    Open_Time:  document.getElementById('field-open-time').value,
    Close_Time: document.getElementById('field-close-time').value || null,
  };

  const submitBtn = formTicket.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> A guardar...';

  try {
    if (state.editingId) {
      // PUT / PATCH — atualizar ticket
      await updateTicket(state.editingId, payload);
      showToast('Ticket atualizado com sucesso!', 'success');
    } else {
      // POST — criar ticket
      await createTicket(payload);
      showToast('Ticket criado com sucesso!', 'success');
    }
    closeModal();
    await loadTickets();
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = state.editingId ? 'Atualizar' : 'Criar Ticket';
  }
});

// ── Editar ticket ──────────────────────────────────────────────────────────
async function editTicket(id) {
  try {
    const result = await (async () => {
      // Tentar usar dados já em memória
      const cached = state.tickets.find(t => t.id == id);
      if (cached) return { data: cached };
      const { getTicketById } = await import('./api.js');
      return getTicketById(id);
    })();

    const t = result.data;
    state.editingId = id;

    document.getElementById('field-ci-name').value    = t.CI_Name    ?? '';
    document.getElementById('field-ci-cat').value     = t.CI_Cat     ?? '';
    document.getElementById('field-status').value     = t.Status     ?? 'Work In Progress';
    document.getElementById('field-priority').value   = t.Priority   ?? '3';
    document.getElementById('field-open-time').value  = toDatetimeLocal(t.Open_Time);
    document.getElementById('field-close-time').value = toDatetimeLocal(t.Close_Time);

    const submitBtn = formTicket.querySelector('[type="submit"]');
    submitBtn.textContent = 'Atualizar';
    openModal(`Editar Ticket #${id}`);
  } catch (err) {
    showToast('Erro ao carregar ticket: ' + err.message, 'error');
  }
}

// ── Apagar ticket (DELETE) ─────────────────────────────────────────────────
let pendingDeleteId = null;

function confirmDelete(id) {
  const t = state.tickets.find(t => t.id == id);
  const name = t ? t.CI_Name : `#${id}`;
  confirmMsg.textContent = `Tens a certeza que queres apagar o ticket "${name}"? Esta ação não pode ser revertida.`;
  pendingDeleteId = id;
  confirmOverlay.classList.add('open');
}

btnConfirmYes.addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  confirmOverlay.classList.remove('open');
  try {
    await deleteTicket(pendingDeleteId);
    showToast('Ticket apagado com sucesso.', 'success');

    // Remove da lista sem reload (DOM manipulation)
    const row = tbody.querySelector(`tr[data-id="${pendingDeleteId}"]`);
    if (row) row.remove();
    state.tickets = state.tickets.filter(t => t.id != pendingDeleteId);
    state.total = Math.max(0, state.total - 1);
    renderPagination();
    if (!state.tickets.length) setEmptyRow();
  } catch (err) {
    showToast('Erro ao apagar: ' + err.message, 'error');
  } finally {
    pendingDeleteId = null;
  }
});

btnConfirmNo.addEventListener('click', () => {
  confirmOverlay.classList.remove('open');
  pendingDeleteId = null;
});

// ── Event delegation para editar/apagar ───────────────────────────────────
tbody.addEventListener('click', (e) => {
  const editBtn   = e.target.closest('.btn-edit');
  const deleteBtn = e.target.closest('.btn-delete');
  if (editBtn)   editTicket(editBtn.dataset.id);
  if (deleteBtn) confirmDelete(deleteBtn.dataset.id);
});

// ── Filtros ────────────────────────────────────────────────────────────────
let searchDebounce;
filterSearch.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    state.filters.ci_name = filterSearch.value.trim();
    state.page = 1;
    loadTickets();
  }, 400);
});

filterStatus.addEventListener('change', () => {
  state.filters.status = filterStatus.value;
  state.page = 1;
  loadTickets();
});

filterPriority.addEventListener('change', () => {
  state.filters.priority = filterPriority.value;
  state.page = 1;
  loadTickets();
});

// ── Modal open/close ───────────────────────────────────────────────────────
btnNewTicket.addEventListener('click', () => {
  state.editingId = null;
  const submitBtn = formTicket.querySelector('[type="submit"]');
  submitBtn.textContent = 'Criar Ticket';
  // Preenche Open_Time com agora por defeito
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('field-open-time').value =
    `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  openModal('Novo Ticket');
});

btnModalClose.addEventListener('click', closeModal);
btnFormCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

// ── Navbar mobile toggle ───────────────────────────────────────────────────
navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));

// ── Escape fecha modais ────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    confirmOverlay.classList.remove('open');
  }
});

// ── Utilidades ─────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Inicialização ──────────────────────────────────────────────────────────
loadTickets();
