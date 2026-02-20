/* client-web/js/common.js */
export const API_BASE_URL = localStorage.getItem("apiBaseUrl") || "http://localhost:3000";

export function setActiveNav() {
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav]").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === path) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

export function setupBurgerMenu() {
  const btn = document.querySelector("[data-burger]");
  const links = document.querySelector("[data-navlinks]");
  if (!btn || !links) return;

  btn.addEventListener("click", () => links.classList.toggle("open"));
  links.addEventListener("click", (e) => {
    if (e.target?.matches("a")) links.classList.remove("open");
  });
}

export function $(selector, root = document) {
  return root.querySelector(selector);
}

export function createToastHost() {
  let host = document.querySelector(".toast");
  if (!host) {
    host = document.createElement("div");
    host.className = "toast";
    document.body.appendChild(host);
  }
  return host;
}

export function toast(type, message) {
  const host = createToastHost();
  const item = document.createElement("div");
  item.className = `item ${type}`;
  const p = document.createElement("p");
  p.className = "msg";
  p.textContent = message;
  item.appendChild(p);
  host.appendChild(item);

  window.setTimeout(() => item.remove(), 3500);
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export async function apiRequest(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = res.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const msg =
      payload?.error?.message ||
      payload?.message ||
      payload?.error ||
      (typeof payload === "string" ? payload : null) ||
      `Erro HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

export function requireNonEmpty(value, fieldLabel) {
  const s = String(value ?? "").trim();
  if (!s) throw new Error(`Campo obrigatório: ${fieldLabel}`);
  return s;
}

export function minLength(value, n, fieldLabel) {
  const s = String(value ?? "").trim();
  if (s.length < n) throw new Error(`${fieldLabel} deve ter pelo menos ${n} caracteres`);
  return s;
}
