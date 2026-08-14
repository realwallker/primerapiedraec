(function () {
  "use strict";

  const SOCIAL_KEY = "pp-ep03-social-route-v1";
  const startedAt = Date.now();
  const visits = { youtube: false, instagram: false, tiktok: false, ...readVisits() };
  const sections = ["upcoming", "open", "closed", "published"];
  const form = document.getElementById("entry-form");
  const fieldset = form?.querySelector("fieldset");
  const formStatus = document.getElementById("form-status");
  let serviceConfig = null;
  let state = null;
  let turnstileToken = "";
  let countdownTimer = null;

  const messages = {
    CAMPAIGN_NOT_OPEN: "El registro todavía no está abierto o ya finalizó.",
    DUPLICATE_ENTRY: "Ya existe una participación con ese usuario o contacto.",
    INVALID_NAME: "Escribe tu nombre y apellido.",
    INVALID_CITY: "Revisa la ciudad ingresada.",
    INVALID_HANDLE: "Revisa tu usuario de Instagram o TikTok.",
    INVALID_CONTACT: "Revisa el dato de contacto.",
    CONSENT_REQUIRED: "Necesitamos todas las confirmaciones para registrar tu participación.",
    SOCIAL_ROUTE_REQUIRED: "Completa primero el recorrido por las tres redes.",
    ANTI_BOT_FAILED: "No pudimos validar el control de seguridad. Intenta nuevamente.",
    ANTI_ABUSE_NOT_CONFIGURED: "El registro está temporalmente en preparación.",
    TOO_MANY_REQUESTS: "Este dispositivo alcanzó el límite temporal de registros.",
    SUBMISSION_TOO_FAST: "Espera un momento y revisa tus datos antes de enviar.",
    SERVICE_NOT_CONFIGURED: "Este Preview aún no tiene conectada la base de participantes.",
    UNEXPECTED_ERROR: "No pudimos completar el registro. Intenta nuevamente en unos minutos.",
  };

  function readVisits() {
    try { return JSON.parse(localStorage.getItem(SOCIAL_KEY) || "{}"); } catch (_) { return {}; }
  }

  function saveVisits() {
    try { localStorage.setItem(SOCIAL_KEY, JSON.stringify(visits)); } catch (_) {}
  }

  function icon(name) {
    return `<svg aria-hidden="true"><use href="#${name}"></use></svg>`;
  }

  function allVisited() {
    return visits.youtube && visits.instagram && visits.tiktok;
  }

  function updateSocialProgress() {
    let count = 0;
    document.querySelectorAll("[data-social]").forEach((link) => {
      const done = Boolean(visits[link.dataset.social]);
      if (done) count += 1;
      link.classList.toggle("done", done);
      const result = link.querySelector(".social-result");
      if (result) result.innerHTML = icon(done ? "check" : "arrow");
    });
    const progress = document.getElementById("social-progress");
    if (progress) {
      progress.classList.toggle("complete", count === 3);
      progress.querySelector(":scope > span").textContent = `${count}/3`;
      progress.querySelector("b").textContent = count === 3 ? "Registro desbloqueado" : "Completa el recorrido";
      progress.querySelector("small").textContent = count === 3 ? "Ya puedes dejar tus datos." : "Después se habilita el registro.";
    }
    if (form && fieldset) {
      const ready = count === 3;
      form.classList.toggle("is-locked", !ready);
      form.classList.toggle("is-ready", ready);
      fieldset.disabled = !ready || serviceConfig?.configured === false;
      document.getElementById("form-lock").hidden = ready;
    }
  }

  function setStatus(type, text) {
    if (!formStatus) return;
    formStatus.hidden = false;
    formStatus.className = `form-status ${type}`;
    formStatus.textContent = text;
  }

  function renderStage(stage) {
    sections.forEach((name) => {
      const element = document.getElementById(`state-${name}`);
      if (element) element.hidden = name !== stage;
    });
    document.documentElement.dataset.giveawayStage = stage;
    if (stage === "upcoming") startCountdown(state?.opensAt);
    else if (countdownTimer) clearInterval(countdownTimer);
    if (stage === "published") renderWinners(state?.winners || []);
  }

  function startCountdown(target) {
    if (!target) return;
    const update = () => {
      const distance = Math.max(0, Date.parse(target) - Date.now());
      const values = {
        days: Math.floor(distance / 86400000),
        hours: Math.floor((distance / 3600000) % 24),
        minutes: Math.floor((distance / 60000) % 60),
        seconds: Math.floor((distance / 1000) % 60),
      };
      Object.entries(values).forEach(([key, value]) => {
        const element = document.querySelector(`[data-time="${key}"]`);
        if (element) element.textContent = String(value).padStart(2, "0");
      });
      if (distance === 0 && state?.stage === "upcoming") location.reload();
    };
    update();
    countdownTimer = setInterval(update, 1000);
  }

  function renderWinners(winners) {
    const container = document.getElementById("public-winners");
    if (!container) return;
    container.replaceChildren();
    winners.forEach((winner, index) => {
      const article = document.createElement("article");
      const label = document.createElement("span");
      const name = document.createElement("b");
      const handle = document.createElement("small");
      label.textContent = `GANADOR ${String(index + 1).padStart(2, "0")}`;
      name.textContent = winner.displayName || "Ganador confirmado";
      handle.textContent = winner.socialHandle || winner.registrationCode || "";
      article.append(label, name, handle);
      container.append(article);
    });
  }

  function loadTurnstile() {
    if (!serviceConfig?.turnstileSiteKey || !document.getElementById("turnstile-box")) return;
    window.onTurnstileReady = function () {
      window.turnstile.render("#turnstile-box", {
        sitekey: serviceConfig.turnstileSiteKey,
        theme: "light",
        callback: (token) => { turnstileToken = token; },
        "expired-callback": () => { turnstileToken = ""; },
      });
    };
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileReady&render=explicit";
    script.async = true;
    script.defer = true;
    document.head.append(script);
  }

  async function initialize() {
    try {
      const [configResponse, stateResponse] = await Promise.all([
        fetch("/api/sorteo/config", { cache: "no-store" }),
        fetch("/api/sorteo/estado", { cache: "no-store" }),
      ]);
      serviceConfig = await configResponse.json();
      state = await stateResponse.json();
    } catch (_) {
      serviceConfig = { configured: false, environment: "unknown" };
      state = { stage: "upcoming", opensAt: "2026-08-18T07:00:00-05:00", winners: [] };
    }

    const override = new URLSearchParams(location.search).get("preview");
    if (serviceConfig.environment === "preview" && sections.includes(override)) state.stage = override;
    renderStage(sections.includes(state.stage) ? state.stage : "upcoming");

    if (!serviceConfig.configured) {
      const banner = document.getElementById("service-banner");
      banner.hidden = false;
      banner.textContent = serviceConfig.environment === "preview"
        ? "Preview visual · La conexión de participantes se habilitará antes de la prueba funcional."
        : "El registro está temporalmente en preparación.";
    }
    updateSocialProgress();
    loadTurnstile();
  }

  document.querySelectorAll("[data-social]").forEach((link) => {
    link.addEventListener("click", () => {
      visits[link.dataset.social] = true;
      saveVisits();
      updateSocialProgress();
    });
  });

  const contactType = document.getElementById("contact-type");
  contactType?.addEventListener("change", () => {
    const email = contactType.value === "email";
    const input = document.getElementById("contact-value");
    document.getElementById("contact-label").textContent = email ? "Correo electrónico" : "Número de WhatsApp";
    input.type = email ? "email" : "tel";
    input.autocomplete = email ? "email" : "tel";
    input.placeholder = email ? "nombre@correo.com" : "+593 99 000 0000";
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!allVisited()) return setStatus("error", messages.SOCIAL_ROUTE_REQUIRED);
    if (!serviceConfig?.configured) return setStatus("error", messages.SERVICE_NOT_CONFIGURED);
    if (!form.reportValidity()) return;
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    setStatus("success", "Validando tu participación…");
    const values = new FormData(form);
    const payload = {
      fullName: values.get("fullName"),
      city: values.get("city"),
      socialNetwork: values.get("socialNetwork"),
      socialHandle: values.get("socialHandle"),
      contactType: values.get("contactType"),
      contactValue: values.get("contactValue"),
      socialDeclaration: values.has("socialDeclaration"),
      ageConfirmed: values.has("ageConfirmed"),
      ecuadorResident: values.has("ecuadorResident"),
      pickupConfirmed: values.has("pickupConfirmed"),
      privacyConfirmed: values.has("privacyConfirmed"),
      publicAnnouncementConfirmed: values.has("publicAnnouncementConfirmed"),
      termsConfirmed: values.has("termsConfirmed"),
      website: values.get("website"),
      socialVisits: visits,
      turnstileToken,
      elapsedMs: Date.now() - startedAt,
    };
    try {
      const response = await fetch("/api/sorteo/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "UNEXPECTED_ERROR");
      form.classList.add("is-complete");
      fieldset.disabled = true;
      setStatus("success", `¡Listo! Tu código de participación es ${result.registrationCode}. Guárdalo.`);
    } catch (error) {
      setStatus("error", messages[error.message] || messages.UNEXPECTED_ERROR);
      submit.disabled = false;
      if (window.turnstile) window.turnstile.reset();
      turnstileToken = "";
    }
  });

  initialize();
})();
