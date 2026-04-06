import { useState } from "react";
import type { FormEvent } from "react";
import "../../index.css";

export default function LoginPage() {
  const [email,    setEmail]    = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading,  setLoading]  = useState<boolean>(false);
  const [success,  setSuccess]  = useState<boolean>(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setSuccess(true); }, 1500);
  };

  return (
    <div className="page">
      <div className="card">
        <h1 className="title">Sign in</h1>
        <p className="sub">Enter your credentials to continue</p>

        {success ? (
          <p className="success">✓ Signed in successfully!</p>
        ) : (
          <form onSubmit={handleSubmit} className="form">
            <div className="field">
              <label className="label" htmlFor="demo-email">Email</label>
              <input
                id="demo-email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="demo-password">Password</label>
              <input
                id="demo-password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
            </div>
            <div className="row">
              <label className="remember">
                <input type="checkbox" style={{ marginRight: 6 }} />
                Remember me
              </label>
              <a href="#" className="link">Forgot password?</a>
            </div>
            <button type="submit" disabled={loading} className="btn">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}

        <p className="footer">
          Don't have an account? <a href="#" className="link">Sign up</a>
        </p>
      </div>
    </div>
  );
}