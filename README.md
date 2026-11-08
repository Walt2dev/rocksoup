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
- **Ranking** persistente en `lan-save.json`: puntos acumulados, kills,
  muertes, mejor racha, victorias de evento y mejor puntuación de un evento.
- **Chat** global dentro de la partida con rate-limit e historial reciente.
- Teclas: `T` abre el chat, `B` abre el ranking, `Esc` cierra el chat.

Variables de entorno útiles:

- `PORT`: puerto HTTP/WebSocket (por defecto `3000`).
- `SAVE_PATH`: ruta del guardado (útil en volúmenes persistentes).
- `SAVE_DIR`: carpeta del guardado si no usas `SAVE_PATH`.
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
