const SCHEDULE = {
  revealAt: new Date("2026-08-17T09:00:00-05:00"),
  publishAt: new Date("2026-08-18T09:00:00-05:00"),
  giveawayOpensAt: new Date("2026-08-18T07:00:00-05:00"),
  giveawayClosesAt: new Date("2026-08-23T20:00:00-05:00"),
  giveawayUrl: "/sorteo/ep03",
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
  let state;
  if (now < SCHEDULE.revealAt) state = teaser();
  else if (now < SCHEDULE.publishAt) state = reveal();
  else state = live();
  return { ...state, giveaway: getGiveawayState(now) };
}

function getGiveawayState(now = new Date()) {
  if (now < SCHEDULE.revealAt) return {
    stage: "teaser", kicker: "Muy pronto · EP. 03", title: "Algo especial se está construyendo",
    summary: "Una experiencia para sembrar grandes aprendizajes.", action: "Descubrir pronto", url: SCHEDULE.giveawayUrl
  };
  if (now < SCHEDULE.giveawayOpensAt) return {
    stage: "reveal", kicker: "Mañana · 07:00", title: "2 libros firmados · 2 ganadores",
    summary: "La participación se habilita el martes por la mañana.", action: "Ver adelanto", url: SCHEDULE.giveawayUrl
  };
  if (now < SCHEDULE.giveawayClosesAt) return {
    stage: "open", kicker: "Sorteo abierto · hasta el domingo 23", title: "Participa por uno de 2 libros firmados",
    summary: "Completa el recorrido y registra tu participación gratuita.", action: "Participar ahora", url: SCHEDULE.giveawayUrl
  };
  return {
    stage: "closed", kicker: "Sorteo cerrado", title: "Gracias por construir esta conversación",
    summary: "Validamos participaciones y pronto anunciaremos ganadores.", action: "Ver estado", url: SCHEDULE.giveawayUrl
  };
}

function getPreviewGiveawayState(stage) {
  const states = {
    teaser: {
      stage: "teaser", kicker: "Muy pronto · EP. 03", title: "Algo especial se está construyendo",
      summary: "Una experiencia para sembrar grandes aprendizajes.", action: "Descubrir pronto", url: "/sorteo/ep03?preview=upcoming"
    },
    reveal: {
      stage: "reveal", kicker: "Mañana · 07:00", title: "2 libros firmados · 2 ganadores",
      summary: "La participación se habilita el martes por la mañana.", action: "Ver adelanto", url: "/sorteo/ep03?preview=upcoming"
    },
    open: {
      stage: "open", kicker: "Sorteo abierto · hasta el domingo 23", title: "Participa por uno de 2 libros firmados",
      summary: "Completa el recorrido y registra tu participación gratuita.", action: "Participar ahora", url: "/sorteo/ep03?preview=open"
    },
    closed: {
      stage: "closed", kicker: "Sorteo cerrado", title: "Gracias por construir esta conversación",
      summary: "Validamos participaciones y pronto anunciaremos ganadores.", action: "Ver estado", url: "/sorteo/ep03?preview=closed"
    }
  };
  return states[stage] || null;
}

function handler(request, response) {
  const state = getEpisodeState();
  if (process.env.VERCEL_ENV === "preview") {
    let requestedStage = request.query && request.query.giveaway;
    if (!requestedStage && request.url) requestedStage = new URL(request.url, "https://preview.local").searchParams.get("giveaway");
    const previewState = getPreviewGiveawayState(requestedStage);
    if (previewState) state.giveaway = previewState;
  }
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=60");
  response.statusCode = 200;
  response.end(JSON.stringify(state));
}

module.exports = handler;
module.exports.getEpisodeState = getEpisodeState;
module.exports.getGiveawayState = getGiveawayState;
module.exports.SCHEDULE = SCHEDULE;
