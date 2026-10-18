# K-Ver

App para Android y iPhone que muestra películas y series mejor calificadas disponibles por suscripción en México, y guarda en el teléfono lo que ya viste con una calificación de 1 a 5 estrellas.

## De dónde sale el catálogo

Netflix, Max, Disney+, Apple TV+, Paramount+ y Prime Video no publican una API del catálogo de México. K-Ver consulta [TMDB](https://www.themoviedb.org/), que incluye disponibilidad por país (datos de JustWatch) con `watch_region=MX`.

Hulu no opera en México, así que no está en los filtros. Prime Video sí, y entra como la plataforma que faltaba. Para sumar otra, agrega su id de TMDB en `lib/platforms.ts`.

La lista se ordena por la calificación de TMDB, pidiendo al menos 80 votos para no subir títulos casi sin reseñas. Al abrir una ficha, si configuraste OMDb, la app consulta el porcentaje de Rotten Tomatoes.

Lo que marcas como visto se guarda con SQLite en el dispositivo. No hay cuenta ni servidor propio.

## Cómo correrla

1. Crea una API key gratis en [TMDB](https://www.themoviedb.org/settings/api).
2. Opcional: pide una key en [OMDb](https://www.omdbapi.com/apikey.aspx) para Rotten Tomatoes.
3. Copia el ejemplo de entorno y pega tus llaves:

```bash
copy .env.example .env
```

4. Instala y abre el servidor:

```bash
npm install
npm start
```

5. Instala **Expo Go** en el teléfono (Android o iPhone) y escanea el código QR. El teléfono y la computadora tienen que estar en la misma red.

Para generar la app instalable más adelante se usa EAS Build de Expo. En Windows puedes compilar Android; el binario de iPhone se compila en la nube de Expo o en una Mac.
