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
  acciones (Atacar arriba, Saltar y Duendes a la izquierda, Misiones a la
  derecha, Centrar abajo y Chat abajo a la derecha; Usar/Colocar al centro),
  giro y zoom junto al joystick.
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
- Pide una **clave de administración** (`ADMIN_PASSWORD` o `ADMIN_TOKEN`);
  sin clave la ruta y la API devuelven 404.
- Muestra conectados, salud, posición, tiempo conectado, evento y TOP del
  ranking. Se actualiza cada 2 segundos.
- Incluye un resumen de jugadores únicos, tiempo jugado, compras con DracCoins y
  movimientos de economía, con selector de rango de **7, 30 o 90 días**.
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

Si MySQL no está configurado o falla, el servidor continúa con `lan-save.json`
para el mundo LAN. Las cuentas, los mundos en la nube y la tienda requieren
MySQL: sin base de datos esas rutas responden `503`.

#### Si `/api/health` devuelve `db:false`

1. Revisa la respuesta: ahora incluye `dbConfigured`, `dbHost` y `dbError` con el
   código y el mensaje saneado (sin contraseña).
2. El servidor prueba `MYSQL_HOST`, `DB_HOST`, los hosts de
   `MYSQL_HOST_FALLBACKS`, `127.0.0.1` y `localhost`. Si conecta por un host
   alternativo, `dbHost` lo muestra; útil cuando el hosting inyecta un
   `MYSQL_HOST` obsoleto y `DB_HOST` tiene el correcto.
3. Para diagnosticar desde el hosting, define `ADMIN_TOKEN` y llama:
   ```text
   GET /api/admin/diagnose
   Authorization: Bearer <ADMIN_TOKEN>
   ```
   Devuelve la IP pública de salida (`egress`), el estado de la conexión y un
   test TCP al puerto 3306 por cada host. Con esa IP puedes abrir
   **cPanel → Remote MySQL**.
4. En el host también puedes ejecutar `npm run check:db` para ver el error exacto
   y comprobar la conexión con las variables del entorno.
5. En el log de arranque busca `[DB]`:
   - `Cannot find package 'mysql2'`: ejecuta `npm install --omit=dev` en el
     servidor y reinicia la app.
   - `DB_NOT_CONFIGURED`: faltan `MYSQL_HOST`, `MYSQL_USER` o `MYSQL_DATABASE`
     en las variables del hosting.
   - `ECONNREFUSED`, `ETIMEDOUT`, `ENOTFOUND`: el host no llega al puerto 3306.
     Autoriza la IP de salida (`egress`) en **cPanel → Remote MySQL**.
   - `ER_ACCESS_DENIED_ERROR`: revisa usuario/contraseña (la contraseña no se
     muestra en `dbError`).

## Cuentas, mundos en la nube y lore

- **Registro con correo y contraseña** en MySQL. La contraseña se guarda con
  `scrypt` y sal aleatoria.
- **Google Sign-In opcional**: si defines `GOOGLE_CLIENT_ID`, el jugador también
  puede entrar con Google. La misma sesión se reutiliza en tienda, menú y
  multijugador.
- El multijugador online y las compras en la nube requieren cuenta. El jugador
  inicia sesión una sola vez al entrar al menú. La tienda local funciona sin
  cuenta con una cartera en el navegador.
- Google exige HTTPS o `localhost`; para LAN local se usa correo/contraseña.
- **Un mundo individual gratis** por cuenta, guardado en MySQL. Cada slot extra
  cuesta **2,500 DracCoins** y se compra en la tienda.
- **Lore del mundo**: el servidor guarda una crónica automática de eventos
  (creación, jugadores que entran/salen, ganadores PvP, inicio de partida) y la
  muestra en la cuenta. En LAN también se persiste dentro del mundo compartido.
- **Compras registradas**: cada compra queda en `economy_transactions` con usuario,
  producto, moneda del juego, saldo resultante y fecha.
- El guardado local (`localStorage`) sigue funcionando como caché y respaldo.

## Tienda y economía de Dracxcore

La tienda ya no usa PayPal ni dinero real. Usa una economía cerrada del juego:

- **DracCoins**: moneda comercial de la cuenta. Se gana jugando y se gasta en la
  tienda NPC, slots de mundo, packs de Esencias y contratos.
- **Esencias**: recurso por mundo. Se obtiene explorando, descubriendo
  constelaciones y aves, completando misiones y fabricando; se usa en recetas y
  objetos especiales del mundo.
- **Prestigio**: moneda de reputación de la cuenta. Se gana con logros, misiones
  y eventos PvP; desbloquea títulos y apariencias.

Reglas del modelo:

- Sin depósitos, compras con pesos, retiros ni conversión a dinero real.
- Sin criptomonedas, blockchain, apuestas ni cajas sorpresa pagadas.
- Los saldos de DracCoins y Prestigio viven en MySQL y se auditan en
  `economy_transactions`.
- Las Esencias viven en el guardado de cada mundo.
- Cada movimiento del servidor se valida con transacciones SQL y deduplicación
  para evitar abusos.
- Los jugadores sin cuenta usan una cartera local en el navegador; al iniciar
  sesión se usa la cartera de MySQL.

### Recompensas

Las misiones de aldeas, la cueva de lobos, la misión de aves, las constelaciones,
las especies nuevas, la fabricación, las bajas PvP, las victorias de evento y el
objetivo diario otorgan DracCoins, Prestigio y/o Esencias. El servidor aplica
topes diarios y solo entrega una vez las recompensas únicas.

### Tienda NPC

La tienda incluye recursos, equipo, Esencias, slots de mundo, contratos de 30
días con suministros diarios y títulos de prestigio. Los productos se compran
directamente con DracCoins o Prestigio. No hay botones ni SDK de PayPal.

### Migración desde diamantes

Si una cuenta tenía diamantes, se convierten una sola vez a Esencias pendientes
(`1 diamante = 5 Esencias`) que se entregan al cargar un mundo. Las
suscripciones antiguas de PayPal quedan canceladas; los contratos nuevos se
compran con DracCoins.

### Google Sign-In

1. Entra a <https://console.cloud.google.com/> y crea un proyecto.
2. Configura la pantalla de consentimiento OAuth (tipo externo).
3. Crea una credencial **OAuth Client ID → Web application**.
4. Añade en **Authorized JavaScript origins**:
   - `https://tudominio.com`
   - `http://localhost:3000` para desarrollo local.
5. Copia el Client ID a `GOOGLE_CLIENT_ID`.

No se necesita Client Secret para el flujo de ID Token usado aquí.

## Maderas, editor y reinos

### Editor de maderas

- En `/admin` → **Maderas** puedes crear, editar y ocultar tipos de árbol.
- Cada bioma de superficie, Subsuelo y Cielo puede tener una madera asignada.
- El editor permite ajustar colores, tronco, ramas, hojas, densidad y forma
  (árbol, cactus u hongo), con vista previa en vivo.
- También puedes subir hasta 6 sprites PNG por madera (uno por variante). Si no
  hay PNG, se usa el dibujo procedural.
- El catálogo público se sirve en `/api/woods`; los sprites en
  `/api/woods/:id/sprite/:variante.png`.
- Los cambios se aplican al recargar el juego. Las maderas ocultas dejan de
  generarse pero se conservan para mundos antiguos.
- Las maderas siguen dando `madera`; el tipo de árbol es visual y de bioma.

### Subsuelo y Cielo

- Cada partida individual/nube genera un **portal al Subsuelo** y unas
  **escaleras al Cielo** cerca del spawn.
- También se pueden fabricar **Portal al Subsuelo** y **Escalera al Cielo** en
  Crafteo → Construcción y colocarlos en la superficie.
- El Subsuelo es un laberinto de cuevas con minerales y hongos gigantes.
- El Cielo son islas de nubes conectadas por caminos de oro y árboles de nube.
- Entrar y salir usa el portal más cercano o el botón contextual.
- El estado de cada reino (árboles talados, minerales agotados) se guarda dentro
  del mundo.
- Los portales funcionan en partidas individuales y en la nube. En LAN se
  muestran desactivados para evitar desincronizaciones.

## Variables de entorno útiles

- `PORT`: puerto HTTP/WebSocket (por defecto `3000`).
- `SAVE_PATH`: ruta del guardado (útil en volúmenes persistentes).
- `SAVE_DIR`: carpeta del guardado si no usas `SAVE_PATH`.
- `ADMIN_P2P`: clave alternativa para entrar a `/admin`.
- `ADMIN_PASSWORD`: clave para entrar a `/admin` (recomendada).
- `ADMIN_TOKEN`: token alternativo para `/admin` y scripts.
- `WORLD_ID`: identificador del mundo persistente (`main` por defecto).
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`.
- `MYSQL_SSL`, `MYSQL_SSL_CA`, `MYSQL_CONNECTION_LIMIT`.
- `PUBLIC_BASE_URL`: URL pública HTTPS del juego.
- `GOOGLE_CLIENT_ID`: Client ID Web de Google Cloud.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`,
  `MAIL_FROM`: correo de bienvenida y pruebas. Si no hay SMTP se intenta usar
  `sendmail` del hosting (`SENDMAIL_PATH` opcional).
- `PVP_INTERVAL_MS`: tiempo entre eventos (por defecto `300000`).
- `PVP_DURATION_MS`: duración del evento (por defecto `90000`).

### Correo de bienvenida

Al registrarse con correo y contraseña se envía un mensaje de bienvenida. El
servidor usa SMTP si defines `SMTP_HOST`, `SMTP_USER` y `SMTP_PASSWORD`; si no,
intenta con el binario `sendmail` del hosting. Comprueba el transporte con:

```powershell
npm run check:mail -- gamersadracx@gmail.com
```

o, con `ADMIN_TOKEN`, haz `POST /api/admin/mail` con `{"to":"correo@ejemplo.com"}`.
`/api/health` y `/api/auth/config` muestran `mail.configured` y el transporte.

Para conectarse a un servidor WebSocket distinto del mismo origen, abre la
página con `?ws=host:puerto`.

### Archivo .env

- Copia `.env.example` a `.env` y rellena los valores reales.
- `.env` está en `.gitignore`: no se sube al repositorio.
- En GoDaddy puedes usar **Importar .env** en la configuración del entorno.
- No incluyas `PORT` en el `.env` del hosting: lo inyecta la plataforma.
- `npm start` y `npm run dev` cargan `.env` automáticamente si existe en la raíz
  del proyecto. Las variables inyectadas por el hosting tienen prioridad.
- En local también puedes usar `npm run dev:env` (Node 20.6+).

### Despliegue en GoDaddy con dominio propio

1. Sube todos los archivos nuevos o modificados. Como mínimo:
   `server/*.mjs`, `server/schema.sql`, `js/world/*.js`, `js/game/*.js`,
   `js/render/*.js`, `js/net/api.js`, `js/net/auth.js`, `js/net/cloudSave.js`,
   `js/ui/account.js`, `js/ui/store.js`, `js/admin.js`, `js/adminWoods.js`,
   `css/store.css`, `css/style.css`, `index.html`, `admin.html`, `js/main.js`,
   `js/net/lanClient.js`, `package.json`, `.env.example`, `README.md`.
2. En **GoDaddy → Node.js / Variables de entorno**, define:
   ```env
   PUBLIC_BASE_URL=https://rocksoup.xyz
   GOOGLE_CLIENT_ID=...
   ```
   Mantén tus variables de MySQL y `ADMIN_TOKEN`.
3. Reinicia la aplicación Node desde el panel de GoDaddy.
4. Verifica:
   ```text
   https://rocksoup.xyz/api/health
   ```
   Debe devolver `"db":true`, `"auth":true` y
   `"economy":{"enabled":true,"db":true}`.
5. Si `/api/health` devuelve 404, GoDaddy sigue ejecutando la versión anterior
   del servidor. Vuelve a subir el código y reinicia Node.
6. Abre `/api/auth/config` y `/api/store/config` para confirmar Google y la economía.
7. Prueba la economía: inicia sesión, gana DracCoins, compra un recurso,
   carga un mundo y verifica que aparece en el inventario.

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
- `js/game`: simulación, inventario, aldeas, crafteo, trabajadores y economía.
- `js/render`: carga de assets y render isométrico.
- `js/net`: cliente WebSocket y UI social multijugador.
- `server`: servidor estático + WebSocket, eventos PvP, chat, ranking, mundos y
  economía (DracCoins, Esencias y Prestigio).
- `tests`: pruebas con `node --test`.
