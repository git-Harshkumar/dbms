import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAllExams, deleteExam, togglePublish } from '../../api/exam.api';

type Exam = {
  id: number;
  title: string;
  description?: string;
  total_questions: number;
  duration_mins: number;
  total_attempts?: number;
  is_published: boolean;
};

type User = { name: string };

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth() as { user: User | null; logout: () => void };
  const navigate = useNavigate();

  const [exams,   setExams]   = useState<Exam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error,   setError]   = useState<string>('');

  const fetchExams = async () => {
    try {
      const res = await getAllExams();
      setExams(res.data.exams);
    } catch {
      setError('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExams(); }, []);

  const handleDelete = async (examId: number) => {
    if (!window.confirm('Delete this exam? This cannot be undone.')) return;
    try {
      await deleteExam(examId);
      setExams(prev => prev.filter(e => e.id !== examId));
    } catch {
      alert('Failed to delete exam');
    }
  };

  const handleTogglePublish = async (examId: number) => {
    try {
      const res = await togglePublish(examId);
      setExams(prev =>
        prev.map(e => e.id === examId ? { ...e, is_published: res.data.is_published } : e)
      );
    } catch {
      alert('Failed to update exam status');
    }
  };

  return (
    <div style={s.page}>
      {/* Top bar */}
      <div style={s.topbar}>
        <div>
          <h1 style={s.title}>Admin Dashboard</h1>
          <p style={s.subtitle}>Welcome, {user?.name}</p>
        </div>
        <div style={s.topbarActions}>
          <button style={s.btnPrimary} onClick={() => navigate('/admin/exams/create')}>
            + Create Exam
          </button>
          <button style={s.btnOutline} onClick={logout}>Logout</button>
        </div>
      </div>

      {/* Stats */}
      <div style={s.statsRow}>
        {[
          { label: 'Total Exams',    value: exams.length },
          { label: 'Published',      value: exams.filter(e => e.is_published).length },
          { label: 'Drafts',         value: exams.filter(e => !e.is_published).length },
          { label: 'Total Attempts', value: exams.reduce((a, e) => a + Number(e.total_attempts || 0), 0) },
        ].map(st => (
          <div key={st.label} style={s.statCard}>
            <span style={s.statNum}>{st.value}</span>
            <span style={s.statLabel}>{st.label}</span>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={s.tableCard}>
        <div style={s.tableHeader}>
          <h2 style={s.tableTitle}>Your Exams</h2>
        </div>

        {loading && <p style={s.info}>Loading exams…</p>}
        {error   && <p style={s.errorText}>{error}</p>}

        {!loading && exams.length === 0 && (
          <div style={s.empty}>
            <p style={{ marginBottom: '1rem' }}>No exams yet.</p>
            <button style={s.btnPrimary} onClick={() => navigate('/admin/exams/create')}>
              Create your first exam
            </button>
          </div>
        )}

        {!loading && exams.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Title', 'Questions', 'Duration', 'Attempts', 'Status', 'Actions'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exams.map(exam => (
                  <tr key={exam.id} style={s.tr}>
                    <td style={s.td}>
                      <strong style={{ color: '#111827' }}>{exam.title}</strong>
                      {exam.description && (
                        <p style={s.tdSub}>{exam.description.slice(0, 60)}{exam.description.length > 60 ? '…' : ''}</p>
                      )}
                    </td>
                    <td style={s.tdCenter}>{exam.total_questions}</td>
                    <td style={s.tdCenter}>{exam.duration_mins} min</td>
                    <td style={s.tdCenter}>{exam.total_attempts ?? 0}</td>
                    <td style={s.tdCenter}>
                      <span style={exam.is_published ? s.badgeGreen : s.badgeGray}>
                        {exam.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td style={s.tdActions}>
                      <button
                        style={exam.is_published ? s.btnSmOrange : s.btnSmGreen}
                        onClick={() => handleTogglePublish(exam.id)}
                      >
                        {exam.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button style={s.btnSmBlue} onClick={() => navigate(`/admin/exams/${exam.id}/results`)}>
                        Results
                      </button>
                      <button style={s.btnSmRed} onClick={() => handleDelete(exam.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  page:         { width: '100%', padding: '1.5rem clamp(1rem, 4vw, 2.5rem)', fontFamily: "'Inter', system-ui, sans-serif", background: '#f7f8fa', minHeight: '100dvh' },
  topbar:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
  title:        { fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#111827' },
  subtitle:     { color: '#6b7280', fontSize: '0.875rem', marginTop: '0.2rem' },
  topbarActions:{ display: 'flex', gap: '0.6rem' },

  statsRow:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.75rem' },
  statCard:     { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, boxShadow: '0 1px 3px rgba(0,0,0,.05)' },
  statNum:      { fontSize: '1.6rem', fontWeight: 800, color: '#4f46e5' },
  statLabel:    { fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 },

  tableCard:    { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.05)', overflow: 'hidden' },
  tableHeader:  { padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0' },
  tableTitle:   { fontSize: '1rem', fontWeight: 700, margin: 0, color: '#111827' },

  table:        { width: '100%', borderCollapse: 'collapse' as const },
  th:           { textAlign: 'left' as const, padding: '0.65rem 1rem', background: '#f9fafb', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  tr:           { borderBottom: '1px solid #f3f4f6' },
  td:           { padding: '0.85rem 1rem', fontSize: '0.875rem', verticalAlign: 'middle' as const },
  tdCenter:     { padding: '0.85rem 1rem', textAlign: 'center' as const, fontSize: '0.875rem', verticalAlign: 'middle' as const, color: '#6b7280' },
  tdSub:        { fontSize: '0.75rem', color: '#9ca3af', margin: '2px 0 0' },
  tdActions:    { padding: '0.75rem 1rem', verticalAlign: 'middle' as const, display: 'flex', gap: '0.4rem', flexWrap: 'wrap' as const },

  badgeGreen:   { background: '#d1fae5', color: '#065f46', fontSize: '0.72rem', padding: '0.18rem 0.6rem', borderRadius: 999, fontWeight: 600, display: 'inline-block' },
  badgeGray:    { background: '#f3f4f6', color: '#6b7280', fontSize: '0.72rem', padding: '0.18rem 0.6rem', borderRadius: 999, fontWeight: 600, display: 'inline-block' },

  btnPrimary:   { background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 1.1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', fontFamily: "'Inter', sans-serif" },
  btnOutline:   { background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem', fontFamily: "'Inter', sans-serif" },
  btnSmGreen:   { background: '#d1fae5', color: '#065f46', border: 'none', borderRadius: 6, padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, fontFamily: "'Inter', sans-serif" },
  btnSmOrange:  { background: '#fef3c7', color: '#92400e', border: 'none', borderRadius: 6, padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, fontFamily: "'Inter', sans-serif" },
  btnSmBlue:    { background: '#eff6ff', color: '#1e40af', border: 'none', borderRadius: 6, padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, fontFamily: "'Inter', sans-serif" },
  btnSmRed:     { background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, fontFamily: "'Inter', sans-serif" },

  info:         { color: '#6b7280', textAlign: 'center', padding: '2rem' },
  errorText:    { color: '#dc2626', textAlign: 'center', padding: '1rem' },
  empty:        { textAlign: 'center', padding: '3rem', color: '#6b7280' },
};

export default AdminDashboard;