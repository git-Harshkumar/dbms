import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import '../../index.css';

export default function Register() {
  const { register } = useAuth();
  const navigate      = useNavigate();

  const [name,     setName]     = useState<string>('');
  const [email,    setEmail]    = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role,     setRole]     = useState<'student' | 'admin'>('student');
  const [error,    setError]    = useState<string>('');
  const [loading,  setLoading]  = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await register(name, email, password, role);
      navigate(user.role === 'admin' ? '/admin' : '/student', { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message;
        setError(typeof msg === 'string' ? msg : 'Registration failed. Please try again.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <h1 className="title">Create account</h1>
        <p className="sub">Sign up to get started</p>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <label className="label" htmlFor="reg-name">Full name</label>
            <input
              id="reg-name"
              type="text"
              required
              autoComplete="name"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
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
            <label className="label" htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="reg-role">Role</label>
            <select
              id="reg-role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'student' | 'admin')}
              className="input"
              style={{ cursor: 'pointer' }}
            >
              <option value="student">Student</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <button type="submit" id="register-submit" disabled={loading} className="btn">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="footer">
          Already have an account?{' '}
          <Link to="/login" className="link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
