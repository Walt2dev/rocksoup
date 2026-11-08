# Sopa de Piedras

Mundo isométrico procedural y determinista (HTML + JavaScript sin bundler).

## Requisitos

- Node.js 20 o superior (para tests y servidor LAN).
- Opcional: XAMPP/Apache o cualquier servidor estático para jugar en local.

## Jugar

Sirve la carpeta del proyecto con un servidor estático y abre `index.html`.
Por ejemplo, con XAMPP copia el proyecto en `htdocs` y visita
`http://localhost/rocksoup/`.

Para jugar en red local:

```powershell
npm install
npm run lan
```

Abre `http://localhost:3000` en el equipo anfitrión y la IP de la LAN en los demás.

## Tests

```powershell
npm test
```

## Estructura

- `js/world`: generación procedural (biomas, minerales, vegetación).
- `js/game`: simulación, inventario, aldeas, crafteo, trabajadores.
- `js/render`: carga de assets y render isométrico.
- `js/net`: cliente WebSocket para el modo LAN.
- `server`: servidor estático + WebSocket para LAN.
- `tests`: pruebas con `node --test`.
