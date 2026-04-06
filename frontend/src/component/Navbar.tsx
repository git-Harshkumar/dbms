import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { isLoggedIn, isAdmin, logout } = useAuth();

  return (
    <nav style={{
      padding: '1rem 2rem',
      background: '#fff',
      display: 'flex',
      gap: '1rem',
      alignItems: 'center',
      borderBottom: '1px solid #e2e8f0',
    }}>
      <Link to="/" style={{ color: '#111827', fontWeight: 700, textDecoration: 'none' }}>ExamPortal</Link>

      {isLoggedIn && isAdmin && (
        <>
          <Link to="/admin" style={{ color: '#2563eb', textDecoration: 'none' }}>Dashboard</Link>
          <Link to="/admin/exams/create" style={{ color: '#2563eb', textDecoration: 'none' }}>Create Exam</Link>
        </>
      )}

      {isLoggedIn && !isAdmin && (
        <>
          <Link to="/student" style={{ color: '#2563eb', textDecoration: 'none' }}>Dashboard</Link>
          <Link to="/student/results" style={{ color: '#2563eb', textDecoration: 'none' }}>My Results</Link>
        </>
      )}

      <div style={{ marginLeft: 'auto' }}>
        {isLoggedIn
          ? (
            <button
              type="button"
              onClick={logout}
              style={{
                cursor: 'pointer',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '0.4rem 0.9rem',
                color: '#374151',
                fontSize: '0.875rem',
              }}
            >
              Logout
            </button>
          )
          : <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none' }}>Login</Link>
        }
      </div>
    </nav>
  );
}
