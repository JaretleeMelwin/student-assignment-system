import { useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function Login({ onLogin, onBack }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!username || !password) {
      setMessage("Please enter your username and password.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminUsername", data.username);

      onLogin();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">CA</div>

        <span className="section-kicker">ADMIN PORTAL</span>

        <h1>Administrator Login</h1>

        <p className="auth-description">
          Sign in to manage assignments and view student submissions.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field">
            <span>Username</span>

            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
            />
          </label>

          <label className="field">
            <span>Password</span>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
            />
          </label>

          {message && (
            <div className="message error">
              {message}
            </div>
          )}

          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <button
            type="button"
            className="secondary-button full-button"
            onClick={onBack}
          >
            Back to Student Portal
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;