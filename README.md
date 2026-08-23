# Primera Piedra EC

> **La base de las grandes inversiones.**

Hub editorial oficial de **Primera Piedra Podcast**: conversaciones que acercan la inversión, los negocios y los bienes raíces en Ecuador a decisiones mejor informadas.

<p align="center">
  <a href="https://primerapiedraec.vercel.app/"><strong>Ver el hub</strong></a>
  &nbsp;·&nbsp;
  <a href="https://www.youtube.com/@primerapiedraec">YouTube</a>
  &nbsp;·&nbsp;
  <a href="https://open.spotify.com/show/033mvQVP3Z24000ll5EqMz">Spotify</a>
  &nbsp;·&nbsp;
  <a href="https://www.instagram.com/primerapiedra.ec/">Instagram</a>
</p>

---

## El proyecto

Primera Piedra es un podcast conducido por **Karina Celleri** y **Rebeca Astudillo**. Cada episodio transforma conversaciones de negocio, inversión y sector inmobiliario en ideas claras, aplicables y con visión de futuro.

Este repositorio contiene su hub editorial y la infraestructura de campañas: una experiencia compacta, responsive y pensada para convertir atención en comunidad sin perder claridad, identidad ni confianza.

## Experiencia

| Dirección | Implementación |
| --- | --- |
| Editorial premium | Identidad oficial, tipografías locales y paleta bronce/ivory. |
| Hub, no landing | Una jerarquía directa: episodio, plataformas, redes y contacto. |
| Movimiento sutil | Intro visual sin controles; respeta ahorro de datos y movimiento reducido. |
| Campaña viva | El EP. 03 evoluciona automáticamente entre expectativa, preestreno y disponibilidad. |
| Sorteo integrado | Acceso dinámico desde el hub, registro centralizado y estados programados. |
| Expectativa medible | Lista de espera privada y recordatorio de calendario sin revelar la dinámica antes de tiempo. |
| Gestión protegida | Validación privada, lista congelada y selección auditable de ganadores. |
| Preparado para compartir | Metadatos Open Graph, manifest, sitemap y favicon incluidos. |

## Sorteo EP. 03

La campaña de *El conejito Boris y sus monedas*, junto a **Weldyn Quezada**, vive dentro del mismo ecosistema de Primera Piedra:

- `/sorteo/ep03`: experiencia pública, recorrido social, bases y registro.
- `/gestion/sorteos/ep03`: acceso privado del equipo, validación y exportación.
- `/gestion/sorteos/ep03/en-vivo`: selección de dos ganadores y dos alternos.
- `/api/sorteo/*`: funciones serverless para estado, seguridad, registro y administración.

Antes de la revelación, la tarjeta del hub abre una lista de espera de correo sin mencionar el sorteo. Al completarla se ofrecen recordatorios de Google Calendar y Apple/Outlook. Cuando inicia la campaña, el mismo foco se transforma automáticamente en acceso directo a la participación.

Los datos sensibles nunca se leen directamente desde el navegador. Supabase mantiene las tablas con Row Level Security, funciones con permisos mínimos, control de duplicados y una huella de la lista final. La publicación de resultados es una acción separada del sorteo para evitar exposiciones accidentales.

## Canales oficiales

- [YouTube](https://www.youtube.com/@primerapiedraec)
- [Spotify](https://open.spotify.com/show/033mvQVP3Z24000ll5EqMz)
- [Instagram](https://www.instagram.com/primerapiedra.ec/)
- [TikTok](https://www.tiktok.com/@primerapiedra.ec)
- [Facebook](https://www.facebook.com/people/Primera-Piedra-Podcast/61589993567919/)
- [LinkedIn](https://www.linkedin.com/company/primera-piedra-podcast)
- [Negociaciones y alianzas](mailto:primerapiedraec@gmail.com)

## Arquitectura

```text
.
├── index.html              # Estructura y metadatos del hub
├── styles.css              # Sistema visual Editorial Bronce
├── app.js                  # Video, eventos y estado de campaña
├── api/
│   ├── episode-state.js    # Cambio programado del episodio y tarjeta del sorteo
│   └── sorteo/             # Registro y operaciones administrativas
├── assets/
│   ├── brand/              # Isotipo, iconos, cover y fondo editorial
│   ├── fonts/              # Lavagne, York y Myriad
│   ├── sorteo-ep03/        # Collage y recursos oficiales de campaña
│   └── video/              # Intro optimizada y póster
├── sorteo/ep03/            # Página pública del sorteo
├── gestion/sorteos/ep03/   # Gestión privada y modo en vivo
├── supabase/migrations/    # Esquema, RLS y selección reproducible
└── vercel.json             # Cabeceras y reglas de entrega
```

## Publicación

El sitio se despliega en Vercel desde la raíz del repositorio. Las ramas generan Preview y `main` alimenta producción después de aprobación.

| Variable | Uso |
| --- | --- |
| `SUPABASE_URL` | URL del proyecto exclusivo de Primera Piedra. |
| `SUPABASE_PUBLISHABLE_KEY` | Clave pública usada con RLS y funciones limitadas. |
| `GIVEAWAY_CAMPAIGN_ID` | Campaña real o campaña aislada de Preview. |
| `TURNSTILE_SITE_KEY` | Refuerzo anti-bot opcional visible del formulario. |
| `TURNSTILE_SECRET_KEY` | Validación opcional de Turnstile ejecutada solo en servidor. |
| `GIVEAWAY_ADMIN_EMAILS` | Correos autorizados para recibir el acceso privado. |

Nunca deben incorporarse secretos al repositorio. `.env.example` documenta las claves opcionales sin valores. La URL y la clave publicable del proyecto —diseñadas para ser visibles en clientes— tienen valores seguros por defecto; RLS y las funciones limitadas protegen los datos. La migración crea una campaña de producción y otra de Preview para que las pruebas no contaminen la lista real.

La lógica del episodio usa hora de Ecuador (`UTC-5`): expectativa hasta el lunes 17 a las 09:00, preestreno hasta el martes 18 a las 09:00 y episodio disponible desde ese momento. Los CTAs generales llevan al canal oficial de YouTube.

El sorteo se abre automáticamente el martes 18 a las 07:00 y cierra el lunes 31 a las 20:00, hora de Ecuador. La fecha de la transmisión final permanece editable en la campaña hasta ser confirmada por el equipo.

## Privacidad y operación

1. Una participación se identifica por contacto y usuario social normalizados; los duplicados se bloquean en base de datos.
2. La lista de espera guarda únicamente correo, consentimiento, fecha y una huella antiabuso; no expone sus datos en el sitio público.
3. Los registros se revisan antes de congelar la lista válida.
4. La huella SHA-256 demuestra qué lista se usó para seleccionar.
5. La lista final exige al menos cuatro registros válidos; dos ganadores y dos alternos se guardan en una única operación.
6. Solo después de revisión se publican nombre y usuario; los contactos permanecen privados.
7. El premio se retira en Samborondón, previa coordinación con cada ganador.

## Estándar de contribución

La identidad visual es un activo de marca. Al realizar cambios:

1. Conserva la paleta y tipografías oficiales incluidas en `assets/`.
2. Evita convertir el hub en una landing extensa.
3. Mantén objetivos táctiles amplios, foco visible y soporte para movimiento reducido.
4. Optimiza cualquier imagen nueva antes de incorporarla.
5. Verifica escritorio y móvil antes de publicar.

---

<p align="center">
  <strong>Primera Piedra EC</strong><br>
  Karina Celleri · Rebeca Astudillo
</p>
