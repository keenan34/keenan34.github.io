const ADMIN_TOKEN_KEY = "ifnbl_admin_token";

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
