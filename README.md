# Sopa de Piedras

Mundo isométrico procedural y determinista (HTML + JavaScript sin bundler).

## Requisitos

- Node.js 20 o superior (para tests y servidor multijugador).
- Opcional: XAMPP/Apache o cualquier servidor estático para jugar en local.

## Jugar

Sirve la carpeta del proyecto con un servidor estático y abre `index.html`.
Por ejemplo, con XAMPP copia el proyecto en `htdocs` y visita
`http://localhost/rocksoup/`.

Para jugar en red u online, el servidor Node sirve el juego y el WebSocket:

```powershell
npm install
npm start
```

Abre `http://localhost:3000` en el equipo anfitrión o la URL del despliegue.

## Multijugador

- **PvP** siempre activo en partidas multijugador.
- **Evento Deathmatch PvP** automático cada 5 minutos durante 90 segundos.
  Cada kill da puntos; las rachas de 3 o más dan bonus.
- **Ranking** persistente: puntos acumulados, kills, muertes, mejor racha,
  victorias de evento y mejor puntuación de un evento. Usa MySQL si está
  configurado; si no, guarda el ranking en `lan-save.json`.
- **Chat** global dentro de la partida con rate-limit e historial reciente.
- **Roster** en partida con el botón **Jugadores** o la tecla `P`.
- Teclas: `T` chat, `B` ranking, `P` jugadores, `Esc` cierra el chat.

### Panel de administración

- Disponible en `/admin`.
- Requiere definir `ADMIN_TOKEN`; sin token la ruta y la API devuelven 404.
- Muestra conectados, salud, posición, tiempo conectado, evento y TOP del
  ranking. Se actualiza cada 2 segundos.

### MySQL (solo ranking)

1. Importa `server/schema.sql` desde el panel de tu base de datos (Importar SQL).
2. Define las variables de entorno `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`,
   `MYSQL_PASSWORD`, `MYSQL_DATABASE`.
3. Opcional: `MYSQL_SSL=true`, `MYSQL_SSL_CA=/ruta/ca.pem`,
   `MYSQL_CONNECTION_LIMIT=5`.
4. Opcional: migra el ranking actual con
   `node server/migrate-leaderboard.mjs`.

Si MySQL no está configurado o falla, el servidor continúa con el ranking JSON.

## Variables de entorno útiles

- `PORT`: puerto HTTP/WebSocket (por defecto `3000`).
- `SAVE_PATH`: ruta del guardado (útil en volúmenes persistentes).
- `SAVE_DIR`: carpeta del guardado si no usas `SAVE_PATH`.
- `ADMIN_TOKEN`: token del panel `/admin`.
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`.
- `MYSQL_SSL`, `MYSQL_SSL_CA`, `MYSQL_CONNECTION_LIMIT`.
- `PVP_INTERVAL_MS`: tiempo entre eventos (por defecto `300000`).
- `PVP_DURATION_MS`: duración del evento (por defecto `90000`).

Para conectarse a un servidor WebSocket distinto del mismo origen, abre la
página con `?ws=host:puerto`.

## Tests

```powershell
npm test
```

## Estructura

- `js/world`: generación procedural (biomas, minerales, vegetación).
- `js/game`: simulación, inventario, aldeas, crafteo, trabajadores.
- `js/render`: carga de assets y render isométrico.
- `js/net`: cliente WebSocket y UI social multijugador.
- `server`: servidor estático + WebSocket, eventos PvP, chat y ranking.
- `tests`: pruebas con `node --test`.
