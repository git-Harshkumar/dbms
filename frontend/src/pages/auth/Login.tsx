import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import '../../index.css';

export default function Login() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [email,    setEmail]    = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error,    setError]    = useState<string>('');
  const [loading,  setLoading]  = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      navigate(user.role === 'admin' ? '/admin' : '/student', { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          setError('Cannot reach the server. Is the backend running on port 3000?');
          return;
        }
        const msg = err.response.data?.message;
        setError(typeof msg === 'string' ? msg : 'Invalid email or password.');
      } else {
        setError('Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <h1 className="title">Sign in</h1>
        <p className="sub">Enter your credentials to access your account</p>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <label className="label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </div>

          <div className="row">
            <label className="remember">
              <input type="checkbox" />
              Remember me
            </label>
            <a href="#" className="link">Forgot password?</a>
          </div>

          <button type="submit" id="login-submit" disabled={loading} className="btn">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="footer">
          Don't have an account?{' '}
          <Link to="/register" className="link">Create one</Link>
        </p>
      </div>
    </div>
  );
}
