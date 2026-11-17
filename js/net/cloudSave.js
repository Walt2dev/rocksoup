import { api } from "./api.js";

const SAVE_DEBOUNCE_MS = 6000;

export function createCloudSaveStore({
  baseStore,
  worldId,
  initialVersion = 0,
  onError = null,
  onSaved = null,
} = {}) {
  let currentWorldId = worldId;
  let version = Number(initialVersion) || 0;
  let timer = 0;
  let pending = null;
  let saving = null;

  function reportError(error) {
    onError?.(error);
  }

  async function saveNow(value) {
    if (!currentWorldId || !value) {
      return false;
    }
    if (saving) {
      pending = value;
      return saving;
    }

    saving = (async () => {
      try {
        const data = await api(`/api/worlds/${encodeURIComponent(currentWorldId)}`, {
          method: "PUT",
          body: {
            payload: value,
            version,
          },
        });
        version = Number(data?.world?.version) || version + 1;
        onSaved?.(data?.world ?? null);
        return true;
      } catch (error) {
        if (
          error?.status === 409 &&
          Number.isFinite(error?.data?.currentVersion)
        ) {
          version = Number(error.data.currentVersion);
          try {
            const data = await api(
              `/api/worlds/${encodeURIComponent(currentWorldId)}`,
              {
                method: "PUT",
                body: { payload: value, version },
              },
            );
            version = Number(data?.world?.version) || version + 1;
            onSaved?.(data?.world ?? null);
            return true;
          } catch (retryError) {
            reportError(retryError);
            return false;
          }
        }
        reportError(error);
        return false;
      } finally {
        saving = null;
        if (pending) {
          const next = pending;
          pending = null;
          window.setTimeout(() => {
            void saveNow(next);
          }, 0);
        }
      }
    })();

    return saving;
  }

  function queue(value) {
    pending = value;
    if (timer) {
      return;
    }
    timer = window.setTimeout(() => {
      timer = 0;
      const next = pending;
      pending = null;
      if (next) {
        void saveNow(next);
      }
    }, SAVE_DEBOUNCE_MS);
  }

  function write(value) {
    const written = baseStore?.write(value) ?? false;
    if (currentWorldId && written) {
      queue(value);
    }
    return written;
  }

  function read() {
    return baseStore?.read() ?? null;
  }

  function clear() {
    baseStore?.clear?.();
    pending = null;
    if (timer) {
      window.clearTimeout(timer);
      timer = 0;
    }
  }

  async function flush() {
    if (timer) {
      window.clearTimeout(timer);
      timer = 0;
    }
    const next = pending;
    pending = null;
    if (next) {
      return saveNow(next);
    }
    if (saving) {
      return saving;
    }
    return true;
  }

  function setWorld(nextWorldId, nextVersion = 0) {
    currentWorldId = nextWorldId || null;
    version = Number(nextVersion) || 0;
  }

  return {
    key: baseStore?.key ?? "rocksoup.save.v1",
    read,
    write,
    clear,
    flush,
    setWorld,
    get worldId() {
      return currentWorldId;
    },
    get version() {
      return version;
    },
  };
}
