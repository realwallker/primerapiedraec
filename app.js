(function () {
  "use strict";

  const config = window.PRIMERA_PIEDRA_CONFIG || {};
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);

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
      const response = await fetch(config.episodeStateUrl || "/api/episode-state", { cache: "no-store" });
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
  loadEpisodeState();
  setupTracking();
})();
