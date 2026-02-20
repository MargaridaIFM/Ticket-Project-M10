/* client-web/js/index.js */
import { listTickets, createTicket, updateTicket, deleteTicket } from "./api.js";
import { $, toast, formatDateTime, requireNonEmpty, minLength } from "./common.js";

const els = {
  list: $("#ticketList"),
  tbody: $("#ticketTbody"),
  count: $("#countBadge"),
  loading: $("#loading"),
  refreshBtn: $("#refreshBtn"),
  q: $("#q"),
  statusFilter: $("#statusFilter"),
  priorityFilter: $("#priorityFilter"),

  form: $("#ticketForm"),
  formTitle: $("#formTitle"),
  ticketId: $("#ticketId"),
  ciName: $("#ciName"),
  ciCat: $("#ciCat"),
  status: $("#status"),
  priority: $("#priority"),
  openTime: $("#openTime"),
  closeTime: $("#closeTime"),
  submitBtn: $("#submitBtn"),
  deleteBtn: $("#deleteBtn"),
  resetBtn: $("#resetBtn"),

  confirmBar: $("#confirmBar"),
  confirmText: $("#confirmText"),
  confirmNo: $("#confirmNo"),
  confirmYes: $("#confirmYes"),
};

let currentTickets = [];
let pendingDelete = null;

function setLoading(isLoading) {
  els.loading.style.display = isLoading ? "inline-flex" : "none";
  els.refreshBtn.disabled = isLoading;
  els.submitBtn.disabled = isLoading;
}

function getFilters() {
  return {
    status: els.statusFilter.value || undefined,
    priority: els.priorityFilter.value || undefined,
    q: els.q.value.trim() || undefined,
  };
}

function ticketToCard(ticket) {
  const el = document.createElement("article");
  el.className = "ticket";
  el.innerHTML = `
    <div class="top">
      <div>
        <p class="title">#${ticket.id} • ${ticket.ciName || "—"}</p>
        <p class="sub">${ticket.ciCat || "—"} • criado: ${formatDateTime(ticket.createdAt || ticket.created_at)}</p>
      </div>
      <div class="actions" style="gap:8px;">
        <button class="btn" data-edit="${ticket.id}">Editar</button>
        <button class="btn danger" data-del="${ticket.id}">Apagar</button>
      </div>
    </div>
    <div class="meta">
      <span class="badge">Status: ${ticket.status || "—"}</span>
      <span class="badge">Prioridade: ${ticket.priority ?? "—"}</span>
    </div>
  `;
  return el;
}

function ticketToRow(ticket) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${ticket.id}</td>
    <td>${ticket.ciName || "—"}</td>
    <td>${ticket.ciCat || "—"}</td>
    <td>${ticket.status || "—"}</td>
    <td>${ticket.priority ?? "—"}</td>
    <td>${formatDateTime(ticket.createdAt || ticket.created_at)}</td>
    <td>
      <button class="btn" data-edit="${ticket.id}">Editar</button>
      <button class="btn danger" data-del="${ticket.id}">Apagar</button>
    </td>
  `;
  return tr;
}

function renderTickets(tickets) {
  els.list.innerHTML = "";
  els.tbody.innerHTML = "";
  tickets.forEach((t) => {
    els.list.appendChild(ticketToCard(t));
    els.tbody.appendChild(ticketToRow(t));
  });
  els.count.textContent = String(tickets.length);
}

function fillForm(ticket) {
  els.ticketId.value = ticket?.id ?? "";
  els.ciName.value = ticket?.ciName ?? "";
  els.ciCat.value = ticket?.ciCat ?? "";
  els.status.value = ticket?.status ?? "Work In Progress";
  els.priority.value = ticket?.priority ?? "";
  els.openTime.value = ticket?.openTime ?? "";
  els.closeTime.value = ticket?.closeTime ?? "";

  const editing = Boolean(els.ticketId.value);
  els.formTitle.textContent = editing ? `Editar ticket #${els.ticketId.value}` : "Criar ticket";
  els.deleteBtn.style.display = editing ? "inline-flex" : "none";
  els.resetBtn.style.display = editing ? "inline-flex" : "none";
}

function resetForm() {
  fillForm(null);
}

async function refresh() {
  setLoading(true);
  try {
    currentTickets = await listTickets(getFilters());
    renderTickets(currentTickets);
  } catch (e) {
    toast("err", e.message || "Falha ao listar tickets");
  } finally {
    setLoading(false);
  }
}

function validateForm() {
  const ciName = minLength(requireNonEmpty(els.ciName.value, "CI Name"), 3, "CI Name");
  const status = requireNonEmpty(els.status.value, "Status");
  const ticket = {
    ciName,
    ciCat: els.ciCat.value.trim(),
    status,
    priority: els.priority.value || null,
    openTime: els.openTime.value.trim() || null,
    closeTime: els.closeTime.value.trim() || null,
  };
  return ticket;
}

async function onSubmit(e) {
  e.preventDefault();
  setLoading(true);
  try {
    const ticket = validateForm();
    const id = els.ticketId.value;

    if (id) {
      await updateTicket(id, ticket);
      toast("ok", `Ticket #${id} atualizado`);
    } else {
      const created = await createTicket(ticket);
      toast("ok", `Ticket criado (#${created?.id ?? "novo"})`);
    }

    resetForm();
    await refresh();
  } catch (err) {
    toast("err", err.message || "Falha ao guardar");
  } finally {
    setLoading(false);
  }
}

function openConfirmDelete(ticket) {
  pendingDelete = ticket;
  els.confirmText.textContent = `#${ticket.id} • ${ticket.ciName || "—"}`;
  els.confirmBar.style.display = "block";
}

function closeConfirmDelete() {
  pendingDelete = null;
  els.confirmBar.style.display = "none";
}

async function doDelete(id) {
  setLoading(true);
  try {
    await deleteTicket(id);
    toast("ok", `Ticket #${id} apagado`);
    resetForm();
    await refresh();
  } catch (err) {
    toast("err", err.message || "Falha ao apagar");
  } finally {
    setLoading(false);
  }
}

function wireEvents() {
  els.refreshBtn.addEventListener("click", refresh);

  [els.q, els.statusFilter, els.priorityFilter].forEach((el) => {
    el.addEventListener("change", () => refresh());
  });

  els.form.addEventListener("submit", onSubmit);
  els.resetBtn.addEventListener("click", resetForm);

  els.deleteBtn.addEventListener("click", () => {
    const id = els.ticketId.value;
    const ticket = currentTickets.find((t) => String(t.id) === String(id));
    if (ticket) openConfirmDelete(ticket);
  });

  document.addEventListener("click", (e) => {
    const editId = e.target?.getAttribute?.("data-edit");
    const delId = e.target?.getAttribute?.("data-del");

    if (editId) {
      const t = currentTickets.find((x) => String(x.id) === String(editId));
      if (t) fillForm(t);
    }

    if (delId) {
      const t = currentTickets.find((x) => String(x.id) === String(delId));
      if (t) openConfirmDelete(t);
    }
  });

  els.confirmNo.addEventListener("click", closeConfirmDelete);
  els.confirmYes.addEventListener("click", async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    closeConfirmDelete();
    await doDelete(id);
  });
}

wireEvents();
resetForm();
refresh();
