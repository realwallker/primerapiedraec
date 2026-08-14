(function () {
  "use strict";

  const config = window.PRIMERA_PIEDRA_CONFIG || {};
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  const spotlightSessionKey = "pp-giveaway-spotlight-ep03";
  const waitlistLocalKey = "pp-giveaway-waitlist-ep03-v1";
  let spotlightTimer;

  const year = document.getElementById("current-year");
  if (year) year.textContent = String(new Date().getFullYear());

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element && value) element.textContent = value;
  }

  function applyEpisodeState(state) {
    if (!state || !state.episode) return;
    const episode = state.episode;
    document.documentElement.dataset.episodeState = state.stage || "teaser";
    setText("episode-status", episode.status);
    setText("episode-title", episode.title);
    setText("episode-summary", episode.summary);
    setText("youtube-label", episode.youtubeLabel);
    setText("youtube-subtitle", episode.youtubeSubtitle);

    const card = document.getElementById("episode-card");
    const youtube = document.querySelector('[data-platform="youtube"]');
    const spotify = document.querySelector('[data-platform="spotify"]');
    if (card && episode.cardUrl) card.href = episode.cardUrl;
    if (youtube && episode.youtubeUrl) youtube.href = episode.youtubeUrl;
    if (spotify && episode.spotifyUrl) spotify.href = episode.spotifyUrl;

    if (episode.pageTitle) document.title = episode.pageTitle;
    if (episode.metaDescription) {
      const description = document.querySelector('meta[name="description"]');
      if (description) description.content = episode.metaDescription;
    }

    const giveaway = state.giveaway;
    const giveawayCard = document.getElementById("giveaway-card");
    if (giveaway && giveawayCard) {
      giveawayCard.dataset.stage = giveaway.stage || "teaser";
      if (giveaway.url) giveawayCard.href = giveaway.url;
      setText("giveaway-kicker", giveaway.kicker);
      setText("giveaway-title", giveaway.title);
      setText("giveaway-summary", giveaway.summary);
      setText("giveaway-action", giveaway.action);
      setupGiveawaySpotlight(giveaway.stage || "teaser", giveaway.url);
    }
  }

  function currentSpotlightStage() {
    return document.getElementById("giveaway-card")?.dataset.stage || "teaser";
  }

  function setSpotlightSessionSeen(stage = currentSpotlightStage()) {
    try { sessionStorage.setItem(`${spotlightSessionKey}-${stage}`, "1"); } catch (_) {}
  }

  function hasSeenSpotlight(stage) {
    try { return sessionStorage.getItem(`${spotlightSessionKey}-${stage}`) === "1"; } catch (_) { return false; }
  }

  function isOnWaitlist() {
    try { return localStorage.getItem(waitlistLocalKey) === "1"; } catch (_) { return false; }
  }

  function hideGiveawaySpotlight(options = {}) {
    clearTimeout(spotlightTimer);
    const card = document.getElementById("giveaway-card");
    const coachmark = document.getElementById("giveaway-coachmark");
    const scrim = document.getElementById("giveaway-spotlight-scrim");
    document.documentElement.classList.remove("giveaway-spotlight-active");
    delete document.documentElement.dataset.spotlightMode;
    if (card) card.classList.remove("is-spotlighted");
    if (coachmark) coachmark.hidden = true;
    if (scrim) scrim.hidden = true;
    if (options.remember !== false) setSpotlightSessionSeen();
  }

  function showGiveawaySpotlight(stage) {
    const card = document.getElementById("giveaway-card");
    const coachmark = document.getElementById("giveaway-coachmark");
    const scrim = document.getElementById("giveaway-spotlight-scrim");
    const focusTarget = stage === "open" ? document.getElementById("giveaway-coachmark-cta") : document.getElementById("giveaway-reminder-start");
    if (!card || !coachmark || !scrim || card.dataset.stage !== stage) return;

    const reveal = () => {
      coachmark.hidden = false;
      scrim.hidden = false;
      document.documentElement.dataset.spotlightMode = stage === "open" ? "open" : "waitlist";
      document.documentElement.classList.add("giveaway-spotlight-active");
      card.classList.add("is-spotlighted");
      requestAnimationFrame(() => focusTarget && focusTarget.focus({ preventScroll: true }));
    };

    const bounds = card.getBoundingClientRect();
    const isComfortablyVisible = bounds.top > 110 && bounds.bottom < innerHeight - 220;
    if (!isComfortablyVisible) {
      card.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      spotlightTimer = setTimeout(reveal, reduceMotion ? 80 : 560);
    } else reveal();
  }

  function configureCoachmark(stage, destination) {
    const coachmarkCta = document.getElementById("giveaway-coachmark-cta");
    const openActions = document.getElementById("giveaway-open-actions");
    const waitlistActions = document.getElementById("giveaway-waitlist-actions");
    const reminderForm = document.getElementById("giveaway-reminder-form");
    const reminderSuccess = document.getElementById("giveaway-reminder-success");
    if (coachmarkCta && destination) coachmarkCta.href = destination;
    if (!openActions || !waitlistActions || !reminderForm || !reminderSuccess) return;
    openActions.hidden = stage !== "open";
    waitlistActions.hidden = stage === "open";
    reminderForm.hidden = true;
    reminderSuccess.hidden = true;
    if (stage === "open") {
      setText("giveaway-coachmark-kicker", "Edición especial · EP. 03");
      setText("giveaway-coachmark-title", "¿Viniste por el sorteo?");
      setText("giveaway-coachmark-summary", "Toca la tarjeta iluminada y participa en menos de un minuto.");
      if (coachmarkCta) coachmarkCta.firstChild.textContent = "Entrar al sorteo ";
    } else if (stage === "reveal") {
      setText("giveaway-coachmark-kicker", "Primera Piedra · falta muy poco");
      setText("giveaway-coachmark-title", "Mañana descubrirás algo especial.");
      setText("giveaway-coachmark-summary", "Entra a la lista y activa el recordatorio para descubrirlo a tiempo.");
    } else {
      setText("giveaway-coachmark-kicker", "Primera Piedra · muy pronto");
      setText("giveaway-coachmark-title", "Estamos construyendo algo especial.");
      setText("giveaway-coachmark-summary", "¿Quieres enterarte antes que nadie? Entra a la lista y activa el recordatorio.");
    }
  }

  function setupGiveawaySpotlight(stage, destination) {
    configureCoachmark(stage, destination);
    if (!new Set(["teaser", "reveal", "open"]).has(stage) || (stage !== "open" && isOnWaitlist())) {
      hideGiveawaySpotlight({ remember: false });
      return;
    }

    const params = new URLSearchParams(location.search);
    const forcePreview = params.get("spotlight") === "force";
    if (!forcePreview && hasSeenSpotlight(stage)) return;
    clearTimeout(spotlightTimer);
    spotlightTimer = setTimeout(() => showGiveawaySpotlight(stage), reduceMotion ? 180 : 780);
  }

  function setupGiveawaySpotlightControls() {
    const close = document.getElementById("giveaway-coachmark-close");
    const dismiss = document.querySelectorAll(".giveaway-coachmark-dismiss");
    const scrim = document.getElementById("giveaway-spotlight-scrim");
    const card = document.getElementById("giveaway-card");
    [close, scrim, ...dismiss].forEach((control) => control && control.addEventListener("click", () => hideGiveawaySpotlight()));
    if (card) card.addEventListener("click", (event) => {
      if (card.dataset.stage === "teaser") {
        event.preventDefault();
        showGiveawaySpotlight("teaser");
        return;
      }
      setSpotlightSessionSeen();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && document.documentElement.classList.contains("giveaway-spotlight-active")) {
        hideGiveawaySpotlight();
        card && card.focus({ preventScroll: true });
      }
    });

    document.getElementById("giveaway-reminder-start")?.addEventListener("click", () => {
      document.getElementById("giveaway-waitlist-actions").hidden = true;
      document.getElementById("giveaway-reminder-form").hidden = false;
      document.getElementById("giveaway-reminder-email")?.focus();
    });

    document.getElementById("giveaway-reminder-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button[type="submit"]');
      const status = document.getElementById("giveaway-reminder-status");
      if (!form.reportValidity()) return;
      button.disabled = true;
      status.hidden = false;
      status.className = "giveaway-reminder-status";
      status.textContent = "Guardando tu recordatorio…";
      const data = new FormData(form);
      try {
        const response = await fetch("/api/sorteo/espera", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.get("email"), consent: data.get("consent") === "on", website: data.get("website") }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "REQUEST_FAILED");
        try { localStorage.setItem(waitlistLocalKey, "1"); } catch (_) {}
        setSpotlightSessionSeen();
        form.hidden = true;
        document.getElementById("giveaway-reminder-success").hidden = false;
      } catch (_) {
        status.className = "giveaway-reminder-status is-error";
        status.textContent = "No pudimos guardarlo todavía. Intenta nuevamente en unos segundos.";
      } finally { button.disabled = false; }
    });
  }

  function setupVideo() {
    const video = document.getElementById("brand-video");
    if (!video || reduceMotion || saveData) return;
    video.querySelectorAll("source[data-src]").forEach((source) => {
      source.src = source.dataset.src;
      source.removeAttribute("data-src");
    });
    video.load();
    const play = () => {
      const promise = video.play();
      if (promise && typeof promise.catch === "function") promise.catch(() => {});
    };
    if ("requestIdleCallback" in window) requestIdleCallback(play, { timeout: 900 });
    else setTimeout(play, 250);
  }

  async function loadEpisodeState() {
    if (location.protocol === "file:") return;
    try {
      const endpoint = new URL(config.episodeStateUrl || "/api/episode-state", location.origin);
      const giveawayPreview = new URLSearchParams(location.search).get("giveaway");
      if (giveawayPreview) endpoint.searchParams.set("giveaway", giveawayPreview);
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) return;
      applyEpisodeState(await response.json());
    } catch (_) {
      // The generic teaser remains visible if the state service is temporarily unavailable.
    }
  }

  function setupTracking() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[data-track]");
      if (!link) return;
      const detail = { name: link.dataset.track, destination: link.href, stage: document.documentElement.dataset.episodeState || "teaser" };
      window.dispatchEvent(new CustomEvent("primerapiedra:click", { detail }));
      if (typeof window.gtag === "function") window.gtag("event", "outbound_click", { link_name: detail.name, link_url: detail.destination, episode_stage: detail.stage });
      if (window.va && typeof window.va.track === "function") window.va.track("Outbound Click", detail);
    }, { passive: true });
  }

  setupVideo();
  setupGiveawaySpotlightControls();
  loadEpisodeState();
  setupTracking();
})();
