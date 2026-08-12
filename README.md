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

Este repositorio contiene su hub de enlaces: una experiencia compacta, responsive y pensada para dirigir a la audiencia al contenido, las redes y oportunidades de alianza.

## Experiencia

| Dirección | Implementación |
| --- | --- |
| Editorial premium | Identidad oficial, tipografías locales y paleta bronce/ivory. |
| Hub, no landing | Una jerarquía directa: episodio, plataformas, redes y contacto. |
| Movimiento sutil | Intro visual sin controles; respeta ahorro de datos y movimiento reducido. |
| Campaña viva | El EP. 03 evoluciona automáticamente entre expectativa, preestreno y disponibilidad. |
| Preparado para compartir | Metadatos Open Graph, manifest, sitemap y favicon incluidos. |

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
│   └── episode-state.js    # Cambio programado del EP. 03
├── assets/
│   ├── brand/              # Isotipo, iconos, cover y fondo editorial
│   ├── fonts/              # Lavagne, York y Myriad
│   └── video/              # Intro optimizada y póster
└── vercel.json             # Cabeceras y reglas de entrega
```

## Publicación

El sitio está listo para desplegarse como proyecto de Vercel con la raíz de este repositorio. No necesita variables de entorno.

La lógica del episodio usa hora de Ecuador (`UTC-5`): expectativa hasta el lunes 17 a las 09:00, preestreno hasta el martes 18 a las 09:00 y episodio disponible desde ese momento. Los CTAs generales llevan al canal oficial de YouTube.

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
