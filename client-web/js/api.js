/* client-web/js/api.js */
import { apiRequest } from "./common.js";

export async function listTickets({ status, priority, q } = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (priority) params.set("priority", priority);
  if (q) params.set("q", q);

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const res = await apiRequest(`/tickets${suffix}`);
  return res?.data ?? [];
}

export async function createTicket(ticket) {
  const res = await apiRequest("/tickets", { method: "POST", body: JSON.stringify(ticket) });
  return res?.data;
}

export async function updateTicket(id, patch) {
  const res = await apiRequest(`/tickets/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  return res?.data;
}

export async function deleteTicket(id) {
  await apiRequest(`/tickets/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getStats() {
  const res = await apiRequest("/stats");
  return res?.data;
}
