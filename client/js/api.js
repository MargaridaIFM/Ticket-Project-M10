/**
 * api.js — Módulo de comunicação com a API de tickets
 * Base URL: http://localhost:3001
 */

const API_BASE = 'http://localhost:3001';

/**
 * Wrapper central para fetch com async/await.
 * Lança erro com mensagem legível se a resposta não for OK.
 * @param {string} path  — endpoint relativo (ex: '/api/tickets')
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const defaultHeaders = { 'Content-Type': 'application/json' };

  const response = await fetch(url, {
    ...options,
    headers: { ...defaultHeaders, ...(options.headers ?? {}) },
  });

  if (!response.ok) {
    let msg = `Erro ${response.status}`;
    try {
      const body = await response.json();
      msg = body.message ?? body.error ?? msg;
    } catch (_) { /* ignora */ }
    const err = new Error(msg);
    err.status = response.status;
    throw err;
  }

  return response.json();
}

// ── Tickets ─────────────────────────────────────────────────────────────────

/**
 * Listar tickets com filtros e paginação.
 * @param {{ status?, priority?, ci_name?, limit?, offset?, sort_by?, sort_dir? }} params
 */
export async function getTickets(params = {}) {
  const query = new URLSearchParams();
  if (params.status)    query.set('status',   params.status);
  if (params.priority)  query.set('priority', params.priority);
  if (params.ci_name)   query.set('ci_name',  params.ci_name);
  if (params.limit)     query.set('limit',    params.limit);
  if (params.offset)    query.set('offset',   params.offset);
  if (params.sort_by)   query.set('sort_by',  params.sort_by);
  if (params.sort_dir)  query.set('sort_dir', params.sort_dir);

  const qs = query.toString();
  return request(`/tickets${qs ? '?' + qs : ''}`);
}

/**
 * Obter um ticket por ID.
 * @param {number} id
 */
export async function getTicketById(id) {
  return request(`/tickets/${id}`);
}

/**
 * Criar um novo ticket (POST).
 * @param {object} data
 */
export async function createTicket(data) {
  return request('/tickets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Atualizar ticket existente (PATCH/PUT).
 * @param {number} id
 * @param {object} data
 */
export async function updateTicket(id, data) {
  return request(`/tickets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Eliminar ticket (DELETE).
 * @param {number} id
 */
export async function deleteTicket(id) {
  return request(`/tickets/${id}`, { method: 'DELETE' });
}

// ── Stats ────────────────────────────────────────────────────────────────────

/**
 * Obter estatísticas de tickets (status, prioridade, totais).
 */
export async function getStats() {
  return request('/stats/tickets');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Mapeia prioridade numérica para label legível */
export function priorityLabel(p) {
  const map = { '1': 'Crítica', '2': 'Alta', '3': 'Média', '4': 'Baixa' };
  return map[String(p)] ?? `P${p}`;
}

/** Retorna a classe CSS para badge de prioridade */
export function priorityBadgeClass(p) {
  const map = { '1': 'badge-p1', '2': 'badge-p2', '3': 'badge-p3', '4': 'badge-p4' };
  return map[String(p)] ?? 'badge-default';
}

/** Retorna a classe CSS para badge de status */
export function statusBadgeClass(s) {
  if (!s) return 'badge-default';
  const lower = s.toLowerCase();
  if (lower.includes('progress') || lower.includes('work')) return 'badge-wip';
  if (lower.includes('resolved'))  return 'badge-resolved';
  if (lower.includes('closed'))    return 'badge-closed';
  if (lower.includes('open'))      return 'badge-open';
  return 'badge-default';
}

/** Formata uma data ISO para apresentação */
// DEPOIS
export function formatDate(str) {
  if (!str) return '—';
  try {
    let normalized = str;

    // Formato DD-MM-YYYY HH:MM (ex: "29-03-2012 12:36")
    const dmyDash = /^(\d{1,2})-(\d{1,2})-(\d{4})(.*)$/;
    if (dmyDash.test(str)) {
      normalized = str.replace(dmyDash, '$3-$2-$1$4'); // converte para YYYY-MM-DD
    }

    // Formato M/D/YYYY HH:MM (ex: "5/2/2012 13:32")
    const mdySlash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/;
    if (mdySlash.test(str)) {
      normalized = str.replace(mdySlash, '$3-$1-$2$4'); // converte para YYYY-M-D
    }

    const d = new Date(normalized);
    if (isNaN(d.getTime())) return str; // se ainda falhar, mostra o original
    return d.toLocaleDateString('pt-PT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch (_) { return str; }
}

/** Formata datetime para inputs type="datetime-local" */
export function toDatetimeLocal(str) {
  if (!str) return '';
  try {
    const d = new Date(str);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch (_) { return ''; }
}
