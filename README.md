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
- **HUD rediseñado**: estado compacto, menú único (`H` o botón ⚙), cruz de
  acciones (Atacar arriba, Saltar y Duendes a la izquierda, Chat a la derecha,
  Centrar abajo y Misiones abajo a la derecha; Usar/Colocar al centro), giro y
  zoom junto al joystick.
- **Hotbar de 9 slots en una sola fila**. El botón mochila abre el inventario
  completo centrado, donde se arrastran objetos a la fila rápida o se
  reordenan.
- **Fauna compartida** en LAN: el servidor sincroniza animales, saltos y vida;
  los nocturnos también reciben daño. Cada jugador ve el burro de los demás,
  pero solo su dueño puede usarlo.
- **Salto remoto** sincronizado para que ambos jugadores vean el salto.
- **Presencia limpia**: ping/pong y salida explícita eliminan jugadores
  desconectados del lobby.
- **Combate en móvil**: toca una criatura hostil para atacar o usa “Atacar”
  en el menú.
- **Selección múltiple** de unidades del feudo y duendes: botón/checkbox en el
  panel, `Shift + clic` y rectángulo de selección con el modo activo.
- **Guardar y salir** en el menú del HUD.
- Teclas: `T` chat, `B` ranking, `P` jugadores, `H` menú, `Esc` cierra el chat.

### Panel de administración

- Disponible en `/admin`.
- Requiere definir `ADMIN_TOKEN`; sin token la ruta y la API devuelven 404.
- Muestra conectados, salud, posición, tiempo conectado, evento y TOP del
  ranking. Se actualiza cada 2 segundos.
- Permite **descargar** e **importar** el mundo en JSON. La importación se
  aplica al reiniciar/redeployar la app.

### MySQL (ranking y mundos)

1. Importa `server/schema.sql` desde el panel de tu base de datos (Importar SQL).
2. Define las variables de entorno `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`,
   `MYSQL_PASSWORD`, `MYSQL_DATABASE`.
3. Configura `WORLD_ID` para separar mundos (`production`, `preview`).
4. Opcional: `MYSQL_SSL=true`, `MYSQL_SSL_CA=/ruta/ca.pem`,
   `MYSQL_CONNECTION_LIMIT=5`.
5. Opcional: migra el ranking actual con
   `node server/migrate-leaderboard.mjs`.

Si MySQL no está configurado o falla, el servidor continúa con `lan-save.json`.

## Variables de entorno útiles

- `PORT`: puerto HTTP/WebSocket (por defecto `3000`).
- `SAVE_PATH`: ruta del guardado (útil en volúmenes persistentes).
- `SAVE_DIR`: carpeta del guardado si no usas `SAVE_PATH`.
- `ADMIN_TOKEN`: token del panel `/admin`.
- `WORLD_ID`: identificador del mundo persistente (`main` por defecto).
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`.
- `MYSQL_SSL`, `MYSQL_SSL_CA`, `MYSQL_CONNECTION_LIMIT`.
- `PVP_INTERVAL_MS`: tiempo entre eventos (por defecto `300000`).
- `PVP_DURATION_MS`: duración del evento (por defecto `90000`).

Para conectarse a un servidor WebSocket distinto del mismo origen, abre la
página con `?ws=host:puerto`.

### Archivo .env

- Copia `.env.example` a `.env` y rellena los valores reales.
- `.env` está en `.gitignore`: no se sube al repositorio.
- En GoDaddy puedes usar **Importar .env** en la configuración del entorno.
- No incluyas `PORT` en el `.env` del hosting: lo inyecta la plataforma.
- En local, `npm run dev` carga `.env` automáticamente (Node 20.6+).

El cliente elige el WebSocket automáticamente:

- Mismo origen (`wss://dominio/ws`) cuando el juego lo sirve Node o un proxy
  HTTPS (GoDaddy, `npm start`).
- `hostname:3000` cuando la página se sirve desde XAMPP o un servidor estático
  local (flujo `npm run lan`).
- `?ws=host:puerto` fuerza otro servidor manualmente.

## Tests

```powershell
npm test
```

## Estructura

- `js/world`: generación procedural (biomas, minerales, vegetación).
- `js/game`: simulación, inventario, aldeas, crafteo, trabajadores.
- `js/render`: carga de assets y render isométrico.
- `js/net`: cliente WebSocket y UI social multijugador.
- `server`: servidor estático + WebSocket, eventos PvP, chat, ranking y mundos.
- `tests`: pruebas con `node --test`.
