function isLocalHostname(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

function normalizeBaseUrl(value) {
  return String(value || "").replace(/\/$/, "");
}

export function resolveApiBaseUrl() {
  const configuredBaseUrl = normalizeBaseUrl(
    process.env.REACT_APP_API_BASE_URL || ""
  );

  if (!configuredBaseUrl) {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
    return "";
  }

  if (typeof window === "undefined") {
    return configuredBaseUrl;
  }

  try {
    const configuredUrl = new URL(configuredBaseUrl);

    if (
      isLocalHostname(configuredUrl.hostname) &&
      !isLocalHostname(window.location.hostname)
    ) {
      return `${window.location.protocol}//${window.location.hostname}${
        configuredUrl.port ? `:${configuredUrl.port}` : ""
      }`;
    }
  } catch (_err) {
    // Keep the configured value if it is not a full URL.
  }

  return configuredBaseUrl;
}
