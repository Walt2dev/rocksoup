import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createLeaderboardStore } from "./leaderboardStore.mjs";

const SAVE_PATH = process.env.SAVE_PATH
  ? resolve(process.env.SAVE_PATH)
  : process.env.SAVE_DIR
    ? join(resolve(process.env.SAVE_DIR), "lan-save.json")
    : join(process.cwd(), "server", "lan-save.json");

const store = createLeaderboardStore();

try {
  if (!store.configured) {
    throw new Error(
      "MySQL no está configurado. Define MYSQL_HOST, MYSQL_USER y MYSQL_DATABASE.",
    );
  }

  const connected = await store.init();
  if (!connected) {
    throw new Error("No se pudo conectar a MySQL.");
  }

  const raw = await readFile(SAVE_PATH, "utf8");
  const save = JSON.parse(raw);
  const entries = save?.leaderboard?.entries ?? {};
  const count = await store.importEntries(entries);

  console.log(
    `[Migración] ${count} entradas de ranking importadas desde ${SAVE_PATH}.`,
  );
} catch (error) {
  console.error(`[Migración] Error: ${error.message}`);
  process.exitCode = 1;
} finally {
  await store.close();
}
