import { spawn } from "node:child_process";
import { accessSync, constants as fsConstants } from "node:fs";
import { randomUUID } from "node:crypto";

const SENDMAIL_CANDIDATES = [
  "/usr/sbin/sendmail",
  "/usr/lib/sendmail",
  "/usr/bin/sendmail",
  "/sbin/sendmail",
  "/usr/local/bin/sendmail",
];

function realEnv(value) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed || /^REEMPLAZA/i.test(trimmed) || /^TU_/i.test(trimmed)) {
    return "";
  }
  return trimmed;
}

function cleanHeader(value, max = 200) {
  return String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, max);
}

function findSendmail(env) {
  const candidates = [realEnv(env.SENDMAIL_PATH), ...SENDMAIL_CANDIDATES]
    .filter(Boolean);
  for (const candidate of candidates) {
    try {
      accessSync(candidate, fsConstants.X_OK);
      return candidate;
    } catch {
      // Siguiente candidato.
    }
  }
  return null;
}

export function createMailer({ env = process.env, logger = console } = {}) {
  const smtpHost = realEnv(env.SMTP_HOST);
  const smtpPort = Number(env.SMTP_PORT) > 0 ? Math.floor(Number(env.SMTP_PORT)) : 587;
  const smtpSecure = /^(1|true|yes|ssl|tls)$/i.test(String(env.SMTP_SECURE ?? ""));
  const smtpUser = realEnv(env.SMTP_USER);
  const smtpPass = realEnv(env.SMTP_PASSWORD) || realEnv(env.SMTP_PASS);
  const from =
    realEnv(env.MAIL_FROM) ||
    realEnv(env.SMTP_FROM) ||
    (smtpUser ? `Sopa de Piedras <${smtpUser}>` : "Sopa de Piedras <no-reply@rocksoup.xyz>");
  const sendmailPath = findSendmail(env);
  const smtpConfigured = Boolean(smtpHost && smtpUser && smtpPass);
  const transport = smtpConfigured ? "smtp" : sendmailPath ? "sendmail" : null;

  async function sendSmtp(message) {
    let nodemailer;
    try {
      nodemailer = await import("nodemailer");
    } catch {
      return { ok: false, transport: "smtp", error: "nodemailer no está instalado" };
    }
    try {
      const transporter = nodemailer.default.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: { user: smtpUser, pass: smtpPass },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
      });
      const info = await transporter.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      return { ok: true, transport: "smtp", id: info.messageId ?? null };
    } catch (error) {
      return { ok: false, transport: "smtp", error: error.message };
    }
  }

  function sendSendmail(message) {
    return new Promise((resolve) => {
      if (!sendmailPath) {
        resolve({ ok: false, transport: "sendmail", error: "sendmail no encontrado" });
        return;
      }
      const boundary = `rocksoup-${randomUUID()}`;
      const hasBoth = Boolean(message.text && message.html);
      const contentType = hasBoth
        ? `multipart/alternative; boundary="${boundary}"`
        : message.html
          ? 'text/html; charset="UTF-8"'
          : 'text/plain; charset="UTF-8"';
      let body = message.html ?? message.text ?? "";
      if (hasBoth) {
        body = [
          `--${boundary}`,
          'Content-Type: text/plain; charset="UTF-8"',
          "",
          message.text,
          `--${boundary}`,
          'Content-Type: text/html; charset="UTF-8"',
          "",
          message.html,
          `--${boundary}--`,
          "",
        ].join("\r\n");
      }
      const headers = [
        `From: ${cleanHeader(from)}`,
        `To: ${cleanHeader(message.to)}`,
        `Subject: ${cleanHeader(message.subject)}`,
        `Date: ${new Date().toUTCString()}`,
        `Message-ID: <${randomUUID()}@rocksoup.xyz>`,
        "MIME-Version: 1.0",
        `Content-Type: ${contentType}`,
      ].join("\r\n");

      const child = spawn(sendmailPath, ["-t", "-i"], {
        stdio: ["pipe", "ignore", "pipe"],
      });
      let stderr = "";
      let settled = false;
      const finish = (result) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(result);
      };
      const timer = setTimeout(() => {
        child.kill();
        finish({ ok: false, transport: "sendmail", error: "sendmail agotó el tiempo" });
      }, 15000);
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
        if (stderr.length > 2000) {
          stderr = stderr.slice(-2000);
        }
      });
      child.once("error", (error) => {
        finish({ ok: false, transport: "sendmail", error: error.message });
      });
      child.once("close", (code) => {
        finish(
          code === 0
            ? { ok: true, transport: "sendmail", id: null }
            : {
                ok: false,
                transport: "sendmail",
                error: stderr.trim() || `sendmail terminó con código ${code}`,
              },
        );
      });
      child.stdin.end(`${headers}\r\n\r\n${body}\r\n`);
    });
  }

  async function send(message) {
    const to = cleanHeader(message?.to);
    if (!to) {
      return { ok: false, transport: null, error: "Falta destinatario" };
    }
    const safeMessage = {
      to,
      subject: cleanHeader(message.subject, 160) || "Sopa de Piedras",
      text: String(message.text ?? ""),
      html: message.html ? String(message.html) : "",
    };
    if (smtpConfigured) {
      const result = await sendSmtp(safeMessage);
      if (result.ok || !sendmailPath) {
        return result;
      }
      logger.warn?.(`[MAIL] SMTP falló (${result.error}); probando sendmail.`);
    }
    if (sendmailPath) {
      return sendSendmail(safeMessage);
    }
    return { ok: false, transport: null, error: "Correo no configurado" };
  }

  async function sendWelcome(user) {
    const to = cleanHeader(user?.email);
    if (!to) {
      return { ok: false, transport: null, error: "Usuario sin correo" };
    }
    const name = cleanHeader(user?.displayName, 40) || "jugador";
    const text = [
      `Hola ${name},`,
      "",
      "Tu cuenta en Sopa de Piedras quedó registrada correctamente.",
      `Correo: ${to}`,
      "",
      "Ya puedes iniciar sesión y guardar tus mundos en la nube.",
      "",
      "— Sopa de Piedras",
    ].join("\n");
    const html = [
      `<p>Hola <strong>${escapeHtml(name)}</strong>,</p>`,
      "<p>Tu cuenta en <strong>Sopa de Piedras</strong> quedó registrada correctamente.</p>",
      `<p>Correo: <strong>${escapeHtml(to)}</strong></p>`,
      "<p>Ya puedes iniciar sesión y guardar tus mundos en la nube.</p>",
      "<p>— Sopa de Piedras</p>",
    ].join("");
    return send({ to, subject: "Bienvenido a Sopa de Piedras", text, html });
  }

  return {
    isConfigured: Boolean(transport),
    transport,
    from,
    send,
    sendWelcome,
    publicConfig: () => ({
      configured: Boolean(transport),
      transport,
      from: transport ? from : null,
    }),
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
