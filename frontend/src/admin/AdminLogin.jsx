import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../api/client";
import { setAdminToken } from "./auth";

function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const data = await adminLogin(username, password);
      setAdminToken(data.token);
      navigate("/admin/games", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="admin-auth-page">
      <form className="admin-login-panel" onSubmit={handleSubmit}>
        <div>
          <p className="admin-kicker">IFNBL Admin</p>
          <h2>Sign in</h2>
        </div>

        {error && <div className="admin-alert">{error}</div>}

        <label className="admin-field">
          <span>Username</span>
          <input
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>

        <label className="admin-field">
          <span>Password</span>
          <input
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button className="admin-primary-button" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </section>
  );
}

export default AdminLogin;
