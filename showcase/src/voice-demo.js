export function voiceDemoUrl(configuredUrl, hostname) {
  if (configuredUrl?.trim()) {
    try {
      const url = new URL(configuredUrl.trim());
      if (url.protocol === "https:" || url.protocol === "http:") return url.href;
    } catch {
      // A malformed override leaves the default call link usable.
    }
  }
  if (["localhost", "127.0.0.1", "[::1]"].includes(hostname)) {
    return "http://127.0.0.1:8000/voice-test";
  }
  return "/voice-test";
}
