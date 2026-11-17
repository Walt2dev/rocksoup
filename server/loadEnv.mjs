import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function unquote(value) {
  const text = value.trim();
  if (text.length >= 2) {
    const first = text[0];
    const last = text[text.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return text.slice(1, -1);
    }
  }
  return text;
}

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }
  const withoutExport = trimmed.startsWith("export ")
    ? trimmed.slice(7).trim()
    : trimmed;
  const index = withoutExport.indexOf("=");
  if (index <= 0) {
    return null;
  }
  const key = withoutExport.slice(0, index).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return null;
  }
  const value = unquote(withoutExport.slice(index + 1));
  return { key, value };
}

const envPath = resolve(process.cwd(), ".env");

if (existsSync(envPath)) {
  try {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const entry = parseLine(line);
      if (entry && process.env[entry.key] === undefined) {
        process.env[entry.key] = entry.value;
      }
    }
  } catch {
    // El servidor continúa con las variables inyectadas por el hosting.
  }
}
