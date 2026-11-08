const WS_OVERRIDE_PATTERN = /^[a-zA-Z0-9.\-:\[\]]+$/;

export function isPrivateHostname(hostname) {
  const host = String(hostname ?? "").toLowerCase();

  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]" ||
    host.endsWith(".local")
  ) {
    return true;
  }

  if (/^10\./.test(host)) {
    return true;
  }
  if (/^192\.168\./.test(host)) {
    return true;
  }
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    return true;
  }
  return false;
}

export function resolveWsUrl({
  protocol,
  host,
  hostname,
  port,
  override = null,
} = {}) {
  const wsProtocol = protocol === "https:" ? "wss:" : "ws:";

  if (typeof override === "string" && WS_OVERRIDE_PATTERN.test(override)) {
    return `${wsProtocol}//${override}/ws`;
  }

  const defaultPort = !port || port === "80" || port === "443";

  if (!defaultPort) {
    return `${wsProtocol}//${host}/ws`;
  }

  if (isPrivateHostname(hostname)) {
    return `${wsProtocol}//${hostname}:3000/ws`;
  }

  return `${wsProtocol}//${host}/ws`;
}
