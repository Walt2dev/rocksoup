#!/usr/bin/env node

import "../server/loadEnv.mjs";
import { createMailer } from "../server/mailer.mjs";

const to = process.argv[2] || process.env.MAIL_TEST_TO || "";
if (!to) {
  console.error("Uso: npm run check:mail -- correo@ejemplo.com");
  process.exit(2);
}

const mailer = createMailer();
console.log(
  JSON.stringify(
    {
      configured: mailer.isConfigured,
      transport: mailer.transport,
      from: mailer.from,
      to,
    },
    null,
    2,
  ),
);

const result = await mailer.send({
  to,
  subject: "Prueba de correo — Sopa de Piedras",
  text: "Este es un correo de prueba de Sopa de Piedras. Si lo recibes, el envío funciona.",
  html: "<p>Este es un correo de prueba de <strong>Sopa de Piedras</strong>. Si lo recibes, el envío funciona.</p>",
});

console.log(JSON.stringify(result, null, 2));
process.exitCode = result.ok ? 0 : 1;
