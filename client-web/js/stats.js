/* client-web/js/stats.js */
import { getStats } from "./api.js";
import { API_BASE_URL, $, toast, formatDateTime } from "./common.js";

const els = {
  totalsRow: $("#totalsRow"),
  byStatus: $("#byStatus"),
  byPriority: $("#byPriority"),
  recentRow: $("#recentRow"),
  recentTbody: $("#recentTbody"),

  apiBaseUrlInput: $("#apiBaseUrlInput"),
  saveApiBtn: $("#saveApiBtn"),
  reloadBtn: $("#reloadBtn"),
  loading: $("#loading"),
};

function setLoading(isLoading) {
  els.loading.style.display = isLoading ? "inline-flex" : "none";
  els.saveApiBtn.disabled = isLoading;
  els.reloadBtn.disabled = isLoading;
}

function card(label, value) {
  const el = document.createElement("div");
  el.className = "card";
  el.style.flex = "1 1 220px";
  el.style.boxShadow = "none";
  el.innerHTML = `
    <div class="bd">
      <div class="small">${label}</div>
      <div style="font-size:28px; font-weight:900; margin-top:6px;">${value}</div>
    </div>
  `;
  return el;
}

function pill(label, value) {
  const el = document.createElement("div");
  el.className = "badge";
  el.innerHTML = `<strong style="color:var(--text)">${label}:</strong> ${value}`;
  return el;
}

function renderStats(data) {
  els.totalsRow.innerHTML = "";
  els.byStatus.innerHTML = "";
  els.byPriority.innerHTML = "";
  els.recentRow.innerHTML = "";
  els.recentTbody.innerHTML = "";

  els.totalsRow.appendChild(card("Total", data?.totals?.total ?? 0));
  els.totalsRow.appendChild(card("Abertos", data?.totals?.open ?? 0));
  els.totalsRow.appendChild(card("Fechados", data?.totals?.closed ?? 0));

  (data?.by_status ?? []).forEach((x) => els.byStatus.appendChild(pill(x.status ?? "—", x.count ?? 0)));
  (data?.by_priority ?? []).forEach((x) => els.byPriority.appendChild(pill(x.priority ?? "—", x.count ?? 0)));

  const recent = data?.recent_7_days ?? { count: 0, tickets: [] };
  els.recentRow.appendChild(card("Criados (7 dias)", recent.count ?? 0));

  (recent.tickets ?? []).forEach((t) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.id}</td>
      <td>${t.ciName || "—"}</td>
      <td>${t.status || "—"}</td>
      <td>${t.priority ?? "—"}</td>
      <td>${formatDateTime(t.createdAt)}</td>
    `;
    els.recentTbody.appendChild(tr);
  });
}

async function load() {
  setLoading(true);
  try {
    const data = await getStats();
    renderStats(data);
  } catch (e) {
    toast("err", e.message || "Falha a obter estatísticas");
  } finally {
    setLoading(false);
  }
}

function wire() {
  els.apiBaseUrlInput.value = API_BASE_URL;

  els.saveApiBtn.addEventListener("click", () => {
    const url = els.apiBaseUrlInput.value.trim();
    if (!url) return toast("warn", "Indica um API Base URL válido");
    localStorage.setItem("apiBaseUrl", url);
    toast("ok", "API Base URL guardado. Recarrega a página.");
  });

  els.reloadBtn.addEventListener("click", load);
}

wire();
load();
