#!/usr/bin/env node

const base = (
  process.argv[2] ||
  process.env.PUBLIC_BASE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

const checks = [];
let failed = false;

async function get(path) {
  const response = await fetch(`${base}${path}`, {
    headers: { Accept: "application/json" },
    redirect: "follow",
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { status: response.status, text, data };
}

function line(ok, label, detail = "") {
  checks.push({ ok, label, detail });
  if (!ok) {
    failed = true;
  }
}

console.log(`\nComprobando despliegue: ${base}\n`);

try {
  const home = await get("/");
  line(home.status === 200, "El dominio responde", `HTTP ${home.status}`);
  const version = home.text?.match(/v8\/js\/main\.js/)?.[0] ?? "";
  line(version.length > 0, "Cliente actualizado", version || "busca v8/js/main.js");
} catch (error) {
  line(false, "El dominio responde", error.message);
}

try {
  const health = await get("/api/health");
  if (health.status === 404) {
    line(
      false,
      "Servidor Node con /api",
      "404: GoDaddy sigue ejecutando la versión anterior del servidor",
    );
  } else {
    line(health.status === 200, "Servidor Node con /api", `HTTP ${health.status}`);
    line(
      health.data?.db === true,
      "MySQL conectado",
      health.data?.db
        ? ""
        : "revisa los logs del servidor o /api/admin/diagnose con ADMIN_TOKEN",
    );
    line(health.data?.auth === true, "Google configurado");
    line(
      health.data?.economy?.enabled === true,
      "Economía del juego activa",
    );
    line(
      health.data?.mail?.configured === true,
      "Correo configurado",
      health.data?.mail?.configured
        ? ""
        : "define SMTP_* o SENDMAIL_PATH",
    );
  }
} catch (error) {
  line(false, "Servidor Node con /api", error.message);
}

if (!failed) {
  try {
    const auth = await get("/api/auth/config");
    line(
      Boolean(auth.data?.googleClientId),
      "GOOGLE_CLIENT_ID presente",
    );
    const store = await get("/api/store/config");
    line(
      store.data?.economyEnabled === true,
      "Tienda con economía de DracCoins activa",
    );
    const content = await get("/api/content/manifest");
    line(
      content.status === 200 && content.data !== null,
      "Editor de contenido activo",
    );
    const woods = await get("/api/woods");
    line(
      woods.status === 200 && Array.isArray(woods.data?.woods),
      "Catálogo de maderas activo",
    );
  } catch (error) {
    line(false, "Configuración de auth/tienda/contenido", error.message);
  }
}

for (const check of checks) {
  console.log(`${check.ok ? "OK  " : "FALTA"} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}

console.log("");
if (failed) {
  console.log("Corrige los puntos marcados como FALTA y reinicia el Node de GoDaddy.");
  process.exitCode = 1;
} else {
  console.log("Todo listo. Prueba una compra en Sandbox antes de pasar a live.");
}
