
import { useState } from "react";
import "./App.css";

const API_BASE = "https://trustvault-backend-z1yy.onrender.com/api";

function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isRegister ? "register" : "login";

      const body = isRegister
        ? { name: name.trim(), email: email.trim(), password }
        : { email: email.trim(), password };

      const response = await fetch(`${API_BASE}/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Request failed.");
      }

      if (!data.token || !data.user) {
        throw new Error("The server returned an invalid login response.");
      }

      onLogin(data);
    } catch (err) {
      setError(err.message || "Could not connect to TrustVault.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-brand-mark">T</div>

        <h1>TrustVault<span>.</span></h1>
        <p className="auth-subtitle">
          Your documents. Your control. Your security.
        </p>

        <div className="auth-heading">
          <h2>{isRegister ? "Create your account" : "Welcome back"}</h2>
          <p>
            {isRegister
              ? "Create a secure workspace for your documents."
              : "Sign in to access your secure workspace."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <label>
              Full name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
                maxLength={100}
                required
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isRegister ? "At least 12 characters" : "Enter your password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={isRegister ? 12 : undefined}
              maxLength={72}
              required
            />
          </label>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : isRegister
                ? "Create account"
                : "Sign in securely"}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? "Already have an account?" : "New to TrustVault?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
          >
            {isRegister ? "Sign in" : "Create account"}
          </button>
        </p>

        <div className="auth-security">
          <span>◇</span> Secure document workspace
        </div>
      </section>
    </main>
  );
}

export default Login;
