import { useEffect } from "react";
import { refreshAdminToken } from "../api/client";

const ADMIN_TOKEN_KEY = "ifnbl_admin_token";
const TOKEN_REFRESH_INTERVAL_MS = 30 * 60 * 1000;

export function getAdminToken() {
  return window.localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token) {
  window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function isAdminAuthError(error) {
  return (
    error?.status === 401 ||
    error?.message === "Authentication required" ||
    error?.message === "Invalid or expired token"
  );
}

// Keeps the admin session alive by trading the stored token for a fresh one on
// mount and every 30 minutes after, so it never hard-expires while an admin
// page is open. A failed refresh is ignored — if the token really is dead, the
// page's next API call gets a 401 and redirects to login as usual.
export function useAdminTokenRefresh() {
  useEffect(() => {
    let isActive = true;

    async function refresh() {
      const token = getAdminToken();
      if (!token) return;

      try {
        const data = await refreshAdminToken(token);
        if (isActive && data?.token) setAdminToken(data.token);
      } catch (_err) {
        // Leave the existing token in place; auth errors surface elsewhere.
      }
    }

    refresh();
    const intervalId = window.setInterval(refresh, TOKEN_REFRESH_INTERVAL_MS);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, []);
}
