const ENV = typeof process !== "undefined" && process.env ? process.env : {};

const SCHEDULE = {
  revealAt: new Date("2026-08-17T09:00:00-05:00"),
  publishAt: new Date("2026-08-18T09:00:00-05:00"),
  channelUrl: "https://www.youtube.com/@primerapiedraec",
  spotifyUrl: "https://open.spotify.com/show/033mvQVP3Z24000ll5EqMz",
  premiereUrl: ENV.EPISODE_03_PREMIERE_URL || "https://www.youtube.com/@primerapiedraec",
  episodeUrl: ENV.EPISODE_03_EPISODE_URL || "https://www.youtube.com/@primerapiedraec",
  guestName: ENV.EPISODE_03_GUEST_NAME || "Invitado especial",
  guestRole: ENV.EPISODE_03_GUEST_ROLE || "Una conversación que construye"
};

function teaser() {
  return {
    stage: "teaser",
    episode: {
      status: "EP. 03 · lunes revelamos",
      title: "Una conversación que construye",
      summary: "El martes 18 llega un nuevo episodio.",
      cardUrl: SCHEDULE.channelUrl,
      youtubeUrl: SCHEDULE.channelUrl,
      spotifyUrl: SCHEDULE.spotifyUrl,
      youtubeLabel: "Suscríbete en YouTube",
      youtubeSubtitle: "Recibe el anuncio primero",
      pageTitle: "Primera Piedra EC | Podcast de inversión y negocios"
    }
  };
}

function reveal() {
  return {
    stage: "reveal",
    episode: {
      status: "Estreno · martes 18",
      title: `EP. 03 · ${SCHEDULE.guestName}`,
      summary: SCHEDULE.guestRole,
      cardUrl: SCHEDULE.premiereUrl,
      youtubeUrl: SCHEDULE.premiereUrl,
      spotifyUrl: SCHEDULE.spotifyUrl,
      youtubeLabel: "Activar recordatorio",
      youtubeSubtitle: "Estreno el martes 18",
      pageTitle: `EP. 03 · ${SCHEDULE.guestName} | Primera Piedra EC`,
      metaDescription: `${SCHEDULE.guestName} conversa con Karina Celleri y Rebeca Astudillo en Primera Piedra Podcast. Estreno martes 18.`
    }
  };
}

function live() {
  return {
    stage: "live",
    episode: {
      status: "Último episodio",
      title: `EP. 03 · ${SCHEDULE.guestName}`,
      summary: SCHEDULE.guestRole,
      cardUrl: SCHEDULE.episodeUrl,
      youtubeUrl: SCHEDULE.episodeUrl,
      spotifyUrl: SCHEDULE.spotifyUrl,
      youtubeLabel: "Ver episodio completo",
      youtubeSubtitle: "Ya disponible en YouTube",
      pageTitle: `EP. 03 · ${SCHEDULE.guestName} | Primera Piedra EC`,
      metaDescription: `Mira el nuevo episodio de Primera Piedra Podcast con ${SCHEDULE.guestName}, Karina Celleri y Rebeca Astudillo.`
    }
  };
}

function getEpisodeState(now = new Date()) {
  if (now < SCHEDULE.revealAt) return teaser();
  if (now < SCHEDULE.publishAt) return reveal();
  return live();
}

function handler(request, response) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=60");
  response.statusCode = 200;
  response.end(JSON.stringify(getEpisodeState()));
}

module.exports = handler;
module.exports.getEpisodeState = getEpisodeState;
module.exports.SCHEDULE = SCHEDULE;
