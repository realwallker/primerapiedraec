const SCHEDULE = {
  revealAt: new Date("2026-08-17T09:00:00-05:00"),
  publishAt: new Date("2026-08-18T09:00:00-05:00"),
  channelUrl: "https://www.youtube.com/@primerapiedraec",
  spotifyUrl: "https://open.spotify.com/show/033mvQVP3Z24000ll5EqMz"
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
      title: "EP. 03 · Mañana estrenamos",
      summary: "Una conversación sobre negocios, inversión y visión.",
      cardUrl: SCHEDULE.channelUrl,
      youtubeUrl: SCHEDULE.channelUrl,
      spotifyUrl: SCHEDULE.spotifyUrl,
      youtubeLabel: "Activar recordatorio",
      youtubeSubtitle: "Estreno el martes 18",
      pageTitle: "EP. 03 · Estreno martes 18 | Primera Piedra EC",
      metaDescription: "Una nueva conversación de Primera Piedra Podcast llega el martes 18."
    }
  };
}

function live() {
  return {
    stage: "live",
    episode: {
      status: "Último episodio",
      title: "EP. 03 · Ya disponible",
      summary: "Una conversación sobre negocios, inversión y visión.",
      cardUrl: SCHEDULE.channelUrl,
      youtubeUrl: SCHEDULE.channelUrl,
      spotifyUrl: SCHEDULE.spotifyUrl,
      youtubeLabel: "Ver último episodio",
      youtubeSubtitle: "Ya disponible en YouTube",
      pageTitle: "EP. 03 · Ya disponible | Primera Piedra EC",
      metaDescription: "Mira el nuevo episodio de Primera Piedra Podcast con Karina Celleri y Rebeca Astudillo."
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
