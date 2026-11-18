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

Si MySQL no está configurado o falla, el servidor continúa con `lan-save.json`
para el mundo LAN. Las cuentas, los mundos en la nube y la tienda requieren
MySQL: sin base de datos esas rutas responden `503`.

## Cuentas, mundos en la nube y lore

- **Invitado**: el modo LAN sigue funcionando con un token local, incluso sin
  internet ni MySQL.
- **Google Sign-In**: en el menú **Mi cuenta** cada jugador puede entrar con su
  cuenta de Google. El servidor verifica el ID Token de Google y crea una sesión
  `HttpOnly`. No se guardan contraseñas.
- Google exige HTTPS o `localhost`. Desde una IP LAN (`192.168.x.x`) el botón de
  Google no funcionará; para eso está el modo invitado. Si el servidor se abre
  por un dominio HTTPS, Google Sign-In sí está disponible para todos.
- **Un mundo individual gratis** por cuenta, guardado en MySQL. Cada slot extra
  cuesta **15 MXN** (pago único) y se compra en la tienda.
- **Lore del mundo**: el servidor guarda una crónica automática de eventos
  (creación, jugadores que entran/salen, ganadores PvP, inicio de partida) y la
  muestra en la cuenta. En LAN también se persiste dentro del mundo compartido.
- El guardado local (`localStorage`) sigue funcionando como caché y respaldo.
  Al iniciar sesión se puede subir la partida local a la nube.

## Tienda y PayPal Business

La tienda integrada incluye recursos, diamantes, armaduras, el slot de mundo de
15 MXN y las suscripciones Noble, Lord y Feudo con recursos cada 24 horas.

También existe un **modo invitado** para comprar sin crear cuenta ni depender de
Google: las compras de un solo pago se guardan en `guest-store.json` dentro de
`SAVE_DIR` y los artículos se aplican a la partida local al iniciar o continuar.
Incluye dos productos de prueba de **5 MXN**.

> **Importante:** una cuenta PayPal **personal no puede usar la API de cobros**.
> Para que el pago llegue solo a tu cuenta y el artículo se entregue
> automáticamente necesitas una cuenta **PayPal Business**.

### Cómo pasar de PayPal personal a Business

1. Entra a <https://www.paypal.com> con tu cuenta personal.
2. Abre **Configuración** (engranaje) → **Cuenta** → **Actualizar a Business**.
   También puedes crear una cuenta Business nueva con el mismo correo desde
   <https://www.paypal.com/business>.
3. Completa los datos del negocio (puede ser como persona física / actividad
   independiente). PayPal no cobra por tener la cuenta Business; solo aplica sus
   comisiones normales por venta.
4. Confirma tu correo, identidad y, si te lo pide, datos fiscales. En México
   puedes facturar después; para operar la tienda basta con completar la
   verificación.
5. Entra a <https://developer.paypal.com/dashboard/applications> con la cuenta
   Business.
6. Crea una app **REST API**:
   - Modo **Sandbox** para probar con compradores de prueba.
   - Modo **Live** para cobrar de verdad.
7. Copia **Client ID** y **Secret** a `PAYPAL_CLIENT_ID` y
   `PAYPAL_CLIENT_SECRET` en `.env`. No pongas el Secret en el frontend.
8. En la app, crea un **Webhook** con la URL
   `https://tudominio.com/api/paypal/webhook` y copia su ID a
   `PAYPAL_WEBHOOK_ID`.
9. Activa los eventos:
   `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`,
   `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.UPDATED`,
   `BILLING.SUBSCRIPTION.RENEWED`, `BILLING.SUBSCRIPTION.CANCELLED`,
   `BILLING.SUBSCRIPTION.SUSPENDED`, `BILLING.SUBSCRIPTION.EXPIRED` y
   `PAYMENT.SALE.COMPLETED`.
10. Prueba una compra y una suscripción en Sandbox. Cuando todo funcione, cambia
    `PAYPAL_MODE=live` y usa las credenciales Live.

El dinero se abona en el saldo de tu PayPal Business (y desde ahí lo retiras a
tu banco o cuenta personal). PayPal descuenta su comisión habitual por
transacción. Revisa también tu política de reembolsos y obligaciones fiscales
por venta de bienes digitales en México.

### Google Sign-In

1. Entra a <https://console.cloud.google.com/> y crea un proyecto.
2. Configura la pantalla de consentimiento OAuth (tipo externo).
3. Crea una credencial **OAuth Client ID → Web application**.
4. Añade en **Authorized JavaScript origins**:
   - `https://tudominio.com`
   - `http://localhost:3000` para desarrollo local.
5. Copia el Client ID a `GOOGLE_CLIENT_ID`.

No se necesita Client Secret para el flujo de ID Token usado aquí.

## Variables de entorno útiles

- `PORT`: puerto HTTP/WebSocket (por defecto `3000`).
- `SAVE_PATH`: ruta del guardado (útil en volúmenes persistentes).
- `SAVE_DIR`: carpeta del guardado si no usas `SAVE_PATH`.
- `ADMIN_TOKEN`: token del panel `/admin`.
- `WORLD_ID`: identificador del mundo persistente (`main` por defecto).
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`.
- `MYSQL_SSL`, `MYSQL_SSL_CA`, `MYSQL_CONNECTION_LIMIT`.
- `PUBLIC_BASE_URL`: URL pública HTTPS del juego.
- `GOOGLE_CLIENT_ID`: Client ID Web de Google Cloud.
- `PAYPAL_MODE`: `sandbox` o `live`.
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`: app REST de PayPal Business.
- `PAYPAL_WEBHOOK_ID`: ID del webhook de PayPal.
- `PVP_INTERVAL_MS`: tiempo entre eventos (por defecto `300000`).
- `PVP_DURATION_MS`: duración del evento (por defecto `90000`).

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

1. Sube todos los archivos nuevos (`server/*.mjs`, `js/net/api.js`,
   `js/net/auth.js`, `js/net/cloudSave.js`, `js/ui/account.js`,
   `js/ui/store.js`, `css/store.css`, `index.html`, `js/main.js`,
   `js/net/lanClient.js`, `package.json`, `.env.example`, `README.md`).
2. En **GoDaddy → Node.js / Variables de entorno**, define:
   ```env
   PUBLIC_BASE_URL=https://rocksoup.xyz
   GOOGLE_CLIENT_ID=...
   PAYPAL_MODE=sandbox
   PAYPAL_CLIENT_ID=...
   PAYPAL_CLIENT_SECRET=...
   PAYPAL_WEBHOOK_ID=...
   ```
   Mantén tus variables de MySQL y `ADMIN_TOKEN`.
3. Reinicia la aplicación Node desde el panel de GoDaddy.
4. Verifica:
   ```text
   https://rocksoup.xyz/api/health
   ```
   Debe devolver `"db":true`, `"auth":true` y
   `"paypal":{"configured":true,...}`.
5. Si `/api/health` devuelve 404, GoDaddy sigue ejecutando la versión anterior
   del servidor. Vuelve a subir el código y reinicia Node.
6. Abre `/api/auth/config` y `/api/store/config` para confirmar Google y PayPal.
7. Prueba en Sandbox: login con Google, crear mundo, comprar un recurso y
   verificar que aparece en el inventario. Después cambia a `PAYPAL_MODE=live`
   con las credenciales Live y el webhook Live.

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
