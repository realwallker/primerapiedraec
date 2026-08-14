(function () {
  "use strict";

  const SESSION_KEY = "pp-giveaway-admin-session-v1";
  let session = null;
  let config = null;
  let entries = [];
  let waitlist = [];
  let snapshot = null;
  let draw = null;

  session = readSessionFromHash() || readSession();

  function readSessionFromHash() {
    if (!location.hash.includes("access_token=")) return null;
    const values = new URLSearchParams(location.hash.slice(1));
    const result = {
      accessToken: values.get("access_token"),
      refreshToken: values.get("refresh_token"),
      expiresAt: Date.now() + Number(values.get("expires_in") || 3600) * 1000,
    };
    history.replaceState(null, "", location.pathname);
    saveSession(result);
    return result;
  }

  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch (_) { return null; }
  }

  function saveSession(value) {
    session = value;
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(value)); } catch (_) {}
  }

  function clearSession() {
    session = null;
    try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
  }

  function showMessage(type, text) {
    const box = document.getElementById("admin-status");
    box.hidden = false;
    box.className = `admin-message form-status ${type}`;
    box.textContent = text;
    setTimeout(() => { box.hidden = true; }, 5500);
  }

  async function refreshSessionIfNeeded() {
    if (!session?.refreshToken || !config?.supabaseUrl || Date.now() < Number(session.expiresAt || 0) - 60_000) return;
    const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: config.supabasePublishableKey, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    });
    if (!response.ok) throw new Error("SESSION_EXPIRED");
    const value = await response.json();
    saveSession({ accessToken: value.access_token, refreshToken: value.refresh_token, expiresAt: Date.now() + value.expires_in * 1000 });
  }

  async function api(path, options = {}) {
    await refreshSessionIfNeeded();
    const response = await fetch(path, {
      ...options,
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${session?.accessToken || ""}`, ...(options.headers || {}) },
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "REQUEST_FAILED");
    return payload;
  }

  async function loadDashboard() {
    const data = await api("/api/sorteo/admin/participantes");
    entries = data.entries || [];
    waitlist = data.waitlist || [];
    snapshot = data.snapshot || null;
    draw = data.draw || null;
    render();
  }

  function render() {
    const counts = entries.reduce((result, entry) => ({ ...result, [entry.status]: (result[entry.status] || 0) + 1 }), {});
    document.getElementById("stat-total").textContent = entries.length;
    document.getElementById("stat-valid").textContent = counts.valid || 0;
    document.getElementById("stat-review").textContent = counts.review || 0;
    document.getElementById("stat-invalid").textContent = counts.invalid || 0;
    document.getElementById("stat-waitlist").textContent = waitlist.length;
    const waitlistBody = document.getElementById("waitlist-body");
    waitlistBody.replaceChildren();
    waitlist.forEach((person) => {
      const row = document.createElement("tr");
      const email = document.createElement("td");
      const date = document.createElement("td");
      email.textContent = person.email;
      date.textContent = new Intl.DateTimeFormat("es-EC", { dateStyle: "short", timeStyle: "short", timeZone: "America/Guayaquil" }).format(new Date(person.createdAt));
      row.append(email, date);
      waitlistBody.append(row);
    });
    document.getElementById("waitlist-empty").hidden = waitlist.length > 0;
    const body = document.getElementById("entries-body");
    body.replaceChildren();
    entries.forEach((entry) => {
      const row = document.createElement("tr");
      const name = document.createElement("td");
      const social = document.createElement("td");
      const contact = document.createElement("td");
      const date = document.createElement("td");
      const status = document.createElement("td");
      const strong = document.createElement("b");
      const code = document.createElement("small");
      strong.textContent = entry.fullName;
      code.textContent = `${entry.registrationCode} · ${entry.city}`;
      name.append(strong, code);
      social.textContent = `${entry.socialNetwork} · ${entry.socialHandle}`;
      contact.textContent = `${entry.contactType}: ${entry.contactValue}`;
      date.textContent = new Intl.DateTimeFormat("es-EC", { dateStyle: "short", timeStyle: "short", timeZone: "America/Guayaquil" }).format(new Date(entry.createdAt));
      const select = document.createElement("select");
      select.className = "status-select";
      select.dataset.entryId = entry.id;
      select.dataset.status = entry.status;
      [["valid", "Válido"], ["review", "Revisar"], ["invalid", "Invalidado"]].forEach(([value, label]) => {
        const option = document.createElement("option"); option.value = value; option.textContent = label; option.selected = value === entry.status; select.append(option);
      });
      select.disabled = Boolean(snapshot);
      status.append(select);
      row.append(name, social, contact, date, status);
      body.append(row);
    });
    document.getElementById("entries-empty").hidden = entries.length > 0;
    document.getElementById("freeze-ready").hidden = Boolean(snapshot);
    document.getElementById("snapshot-ready").hidden = !snapshot;
    if (snapshot) {
      document.getElementById("snapshot-count").textContent = `${snapshot.entryCount} participantes`;
      document.getElementById("snapshot-hash").textContent = snapshot.fingerprint;
      document.getElementById("snapshot-date").textContent = new Intl.DateTimeFormat("es-EC", { dateStyle: "long", timeStyle: "short", timeZone: "America/Guayaquil" }).format(new Date(snapshot.createdAt));
    }
    document.getElementById("campaign-label").textContent = draw ? "Sorteo realizado" : snapshot ? "Lista congelada" : entries.length ? "Recibiendo registros" : waitlist.length ? "Expectativa activa" : "Lista de espera lista";
  }

  async function action(actionName, extra = {}) {
    return api("/api/sorteo/admin/accion", { method: "POST", body: JSON.stringify({ action: actionName, ...extra }) });
  }

  document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.getElementById("login-status");
    const button = event.currentTarget.querySelector("button");
    button.disabled = true;
    try {
      const email = new FormData(event.currentTarget).get("email");
      const response = await fetch("/api/sorteo/admin/acceso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      if (!response.ok) throw new Error();
      status.hidden = false; status.className = "form-status success"; status.textContent = "Si el correo está autorizado, recibirás un enlace seguro en unos instantes.";
    } catch (_) {
      status.hidden = false; status.className = "form-status error"; status.textContent = "No pudimos enviar el acceso. Intenta nuevamente.";
    } finally { button.disabled = false; }
  });

  document.getElementById("entries-body").addEventListener("change", async (event) => {
    const select = event.target.closest("select[data-entry-id]");
    if (!select) return;
    const previous = select.dataset.status;
    select.disabled = true;
    try { await action("status", { entryId: select.dataset.entryId, status: select.value }); await loadDashboard(); showMessage("success", "Estado actualizado."); }
    catch (_) { select.value = previous; select.disabled = false; showMessage("error", "No se pudo actualizar el registro."); }
  });

  document.getElementById("refresh-button").addEventListener("click", () => loadDashboard().catch(() => showMessage("error", "No se pudo actualizar.")));
  document.getElementById("freeze-button").addEventListener("click", async () => {
    if (!confirm("¿Congelar la lista válida? Después no podrás cambiar el estado de los registros.")) return;
    try { await action("freeze"); await loadDashboard(); showMessage("success", "Lista final congelada correctamente."); }
    catch (error) { showMessage("error", error.message === "NOT_ENOUGH_VALID_ENTRIES" ? "Se necesitan al menos 4 registros válidos para definir ganadores y alternos." : "No se pudo congelar la lista."); }
  });
  document.getElementById("export-button").addEventListener("click", () => {
    const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const header = ["codigo", "nombre", "ciudad", "red", "usuario", "tipo_contacto", "contacto", "estado", "fecha"];
    const rows = entries.map((entry) => [entry.registrationCode, entry.fullName, entry.city, entry.socialNetwork, entry.socialHandle, entry.contactType, entry.contactValue, entry.status, entry.createdAt]);
    const csv = [header, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" })); link.download = "participantes-sorteo-ep03.csv"; link.click(); URL.revokeObjectURL(link.href);
  });
  document.getElementById("export-waitlist-button").addEventListener("click", () => {
    const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = [["correo", "fecha"], ...waitlist.map((person) => [person.email, person.createdAt])];
    const csv = rows.map((row) => row.map(escape).join(",")).join("\r\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" })); link.download = "lista-espera-ep03.csv"; link.click(); URL.revokeObjectURL(link.href);
  });
  document.getElementById("logout-button").addEventListener("click", () => { clearSession(); location.reload(); });

  async function initialize() {
    config = await fetch("/api/sorteo/config", { cache: "no-store" }).then((response) => response.json()).catch(() => ({ configured: false }));
    if (!session?.accessToken) return;
    try {
      await loadDashboard();
      document.getElementById("login-view").hidden = true;
      document.getElementById("dashboard-view").hidden = false;
      document.getElementById("logout-button").hidden = false;
    } catch (_) {
      clearSession();
      const status = document.getElementById("login-status");
      status.hidden = false; status.className = "form-status error"; status.textContent = "El acceso no es válido o este correo no está autorizado.";
    }
  }

  initialize();
})();
