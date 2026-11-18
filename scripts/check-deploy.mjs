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
  const version = home.text?.match(/js\/main\.js\?v=(\d+)/)?.[1] ?? "?";
  line(version !== "4", "Cliente actualizado", `main.js v${version}`);
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
    const dbDetail = health.data?.db
      ? health.data?.dbHost
        ? `host ${health.data.dbHost}`
        : ""
      : health.data?.dbConfigured === false
        ? "faltan MYSQL_HOST / MYSQL_USER / MYSQL_DATABASE en el entorno"
        : [health.data?.dbError?.code, health.data?.dbError?.message]
            .filter(Boolean)
            .join(": ") || "sin detalle; revisa el log [DB]";
    line(health.data?.db === true, "MySQL conectado", dbDetail);
    line(health.data?.auth === true, "Google configurado");
    line(
      health.data?.paypal?.configured === true,
      "PayPal configurado",
      health.data?.paypal?.mode
        ? `modo ${health.data.paypal.mode}`
        : "faltan credenciales",
    );
    line(
      health.data?.mail?.configured === true,
      "Correo configurado",
      health.data?.mail?.transport
        ? `transporte ${health.data.mail.transport}`
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
      store.data?.configured === true,
      "PAYPAL_CLIENT_ID / SECRET presentes",
    );
    line(
      store.data?.webhookConfigured === true,
      "PAYPAL_WEBHOOK_ID presente",
    );
  } catch (error) {
    line(false, "Configuración de auth/tienda", error.message);
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
