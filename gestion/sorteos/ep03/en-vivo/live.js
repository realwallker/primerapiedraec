(function () {
  "use strict";

  const SESSION_KEY = "pp-giveaway-admin-session-v1";
  let session;
  try { session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch (_) { session = null; }
  let data = null;

  function showError(text) {
    const box = document.getElementById("live-error");
    box.hidden = false;
    box.textContent = text;
  }

  async function api(path, options = {}) {
    const response = await fetch(path, { ...options, headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${session?.accessToken || ""}` } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "REQUEST_FAILED");
    return payload;
  }

  async function action(name) {
    return api("/api/sorteo/admin/accion", { method: "POST", body: JSON.stringify({ action: name }) });
  }

  function render() {
    const snapshot = data?.snapshot;
    const draw = data?.draw;
    document.getElementById("no-snapshot").hidden = Boolean(snapshot);
    document.getElementById("draw-ready").hidden = !snapshot || Boolean(draw);
    document.getElementById("draw-results").hidden = !draw;
    if (snapshot && !draw) {
      document.getElementById("ready-copy").textContent = `${snapshot.entryCount} participaciones válidas, congeladas antes de la selección.`;
      document.getElementById("audit-count").textContent = `${snapshot.entryCount} REGISTROS VÁLIDOS`;
      document.getElementById("audit-hash").textContent = `HUELLA ${snapshot.fingerprint.slice(0, 12).toUpperCase()}`;
    }
    if (draw) renderResults(draw, snapshot);
  }

  function renderResults(draw, snapshot) {
    const winners = document.getElementById("winner-cards");
    winners.replaceChildren();
    (draw.winners || []).forEach((winner, index) => {
      const card = document.createElement("article");
      const label = document.createElement("span");
      const name = document.createElement("b");
      const detail = document.createElement("p");
      const code = document.createElement("small");
      label.textContent = `GANADOR ${String(index + 1).padStart(2, "0")}`;
      name.textContent = winner.fullName;
      detail.textContent = `${winner.socialHandle} · ${winner.city}`;
      code.textContent = winner.registrationCode;
      card.append(label, name, detail, code);
      winners.append(card);
    });
    const alternates = document.getElementById("alternate-row");
    alternates.querySelectorAll("p").forEach((element) => element.remove());
    (draw.alternates || []).forEach((alternate, index) => {
      const item = document.createElement("p");
      const label = document.createElement("b");
      const detail = document.createElement("small");
      label.textContent = `A${index + 1} · ${alternate.fullName}`;
      detail.textContent = `${alternate.socialHandle} · ${alternate.registrationCode}`;
      item.append(label, detail);
      alternates.append(item);
    });
    document.getElementById("result-hash").textContent = `HUELLA ${snapshot?.fingerprint?.slice(0, 16).toUpperCase() || "—"}`;
    document.getElementById("result-date").textContent = new Intl.DateTimeFormat("es-EC", { dateStyle: "long", timeStyle: "short", timeZone: "America/Guayaquil" }).format(new Date(draw.createdAt));
    const published = Boolean(draw.publishedAt);
    document.getElementById("publish-button").hidden = published;
    document.getElementById("published-note").hidden = !published;
  }

  document.getElementById("draw-button").addEventListener("click", async () => {
    if (!confirm("¿Realizar ahora la selección definitiva de 2 ganadores y 2 alternos?")) return;
    const page = document.getElementById("live-page");
    const button = document.getElementById("draw-button");
    button.disabled = true;
    page.classList.add("is-drawing");
    try {
      const result = await action("draw");
      await new Promise((resolve) => setTimeout(resolve, 2200));
      data.draw = result;
      render();
    } catch (error) {
      showError(error.message === "SNAPSHOT_REQUIRED" ? "Primero debes congelar la lista final." : "No se pudo completar la selección.");
      button.disabled = false;
    } finally { page.classList.remove("is-drawing"); }
  });

  document.getElementById("publish-button").addEventListener("click", async () => {
    if (!confirm("¿Publicar los nombres y usuarios de los ganadores en la página pública?")) return;
    const button = document.getElementById("publish-button");
    button.disabled = true;
    try {
      const result = await action("publish");
      data.draw.publishedAt = result.publishedAt;
      render();
    } catch (_) { showError("No se pudo publicar el resultado."); button.disabled = false; }
  });

  async function initialize() {
    if (!session?.accessToken) { location.replace("/gestion/sorteos/ep03"); return; }
    try { data = await api("/api/sorteo/admin/participantes"); render(); }
    catch (_) { sessionStorage.removeItem(SESSION_KEY); location.replace("/gestion/sorteos/ep03"); }
  }

  initialize();
})();
