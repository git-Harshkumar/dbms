import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAvailableExams } from '../../api/exam.api';

interface Exam {
  id: number;
  title: string;
  description: string;
  duration_mins: number;
  starts_at: string;
  ends_at: string;
  total_questions: number;
  total_marks: number;
  result_id: number | null;
  submitted_at: string | null;
}

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const [exams,   setExams]   = useState<Exam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error,   setError]   = useState<string>('');

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await getAvailableExams();
        setExams(res.data.exams);
      } catch {
        setError('Failed to load exams');
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  const getStatus = (exam: Exam) => {
    if (exam.submitted_at) return 'completed';
    if (exam.result_id)    return 'in-progress';
    return 'available';
  };

  const statusCfg = {
    completed:    { label: 'Completed',   bg: '#d1fae5', color: '#065f46' },
    'in-progress':{ label: 'In Progress', bg: '#fef3c7', color: '#92400e' },
    available:    { label: 'Available',   bg: '#eff6ff', color: '#1e40af' },
  } as const;

  return (
    <div style={s.page}>
      {/* Top bar */}
      <div style={s.topbar}>
        <div>
          <h1 style={s.title}>My Exams</h1>
          <p style={s.subtitle}>Welcome, {user?.name}</p>
        </div>
        <div style={s.topbarActions}>
          <button style={s.btnOutline} onClick={() => navigate('/student/results')}>
            My Results
          </button>
          <button style={s.btnOutline} onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={s.statsRow}>
        {[
          { label: 'Total',       value: exams.length },
          { label: 'Completed',   value: exams.filter(e => e.submitted_at).length },
          { label: 'In Progress', value: exams.filter(e => e.result_id && !e.submitted_at).length },
          { label: 'Available',   value: exams.filter(e => !e.result_id && !e.submitted_at).length },
        ].map(s2 => (
          <div key={s2.label} style={s.statCard}>
            <span style={s.statNum}>{s2.value}</span>
            <span style={s.statLabel}>{s2.label}</span>
          </div>
        ))}
      </div>

      {/* States */}
      {loading && <p style={s.info}>Loading exams…</p>}
      {error   && <p style={s.errorText}>{error}</p>}
      {!loading && exams.length === 0 && (
        <div style={s.empty}>No exams available right now. Check back later!</div>
      )}

      {/* Grid */}
      <div style={s.grid}>
        {exams.map(exam => {
          const status = getStatus(exam);
          const cfg = statusCfg[status as keyof typeof statusCfg];
          return (
            <div key={exam.id} style={s.card}>
              {/* Left: title, description, badge */}
              <div style={s.cardTop}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                  <h3 style={s.cardTitle}>{exam.title}</h3>
                  <span style={{ ...s.badge, background: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>
                {exam.description && <p style={s.cardDesc}>{exam.description}</p>}
              </div>

              {/* Middle: meta + date */}
              <div style={s.metaRow}>
                <span style={s.meta}>⏱ {exam.duration_mins} min</span>
                <span style={s.meta}> {exam.total_questions} questions</span>
                <span style={s.meta}> {exam.total_marks} marks</span>
                <span style={s.dateText}>Closes: {new Date(exam.ends_at).toLocaleString()}</span>
              </div>

              {/* Right: action button */}
              <div style={s.cardFooter}>
                {status === 'completed' ? (
                  <button
                    style={s.btnAction}
                    onClick={() =>
                      exam.result_id != null
                        ? navigate(`/student/results/${exam.result_id}`)
                        : navigate('/student/results')
                    }
                  >
                    View Result
                  </button>
                ) : (
                  <button
                    style={s.btnAction}
                    onClick={() => navigate(`/student/exams/${exam.id}`)}
                  >
                    {status === 'in-progress' ? 'Continue Exam' : 'Start Exam'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
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

  info:         { color: '#6b7280', textAlign: 'center', padding: '2rem' },
  errorText:    { color: '#dc2626', textAlign: 'center', padding: '1rem' },
  empty:        { textAlign: 'center', padding: '3rem', color: '#6b7280', background: '#fff', borderRadius: 10, border: '1px dashed #e2e8f0' },

  grid:         { display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' },
  card:         { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,.05)', flexWrap: 'wrap' as const },
  cardTop:      { display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, minWidth: 160 },
  cardTitle:    { fontSize: '1rem', fontWeight: 700, margin: 0, color: '#111827', lineHeight: 1.35 },
  cardDesc:     { fontSize: '0.82rem', color: '#6b7280', margin: 0, lineHeight: 1.5 },
  metaRow:      { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' as const, alignItems: 'center' },
  meta:         { fontSize: '0.78rem', color: '#6b7280', background: '#f3f4f6', padding: '0.2rem 0.6rem', borderRadius: 6 },
  dateText:     { fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap' as const },
  badge:        { fontSize: '0.72rem', padding: '0.22rem 0.7rem', borderRadius: 999, fontWeight: 600, whiteSpace: 'nowrap' as const },
  cardFooter:   { marginLeft: 'auto', flexShrink: 0 },

  btnAction:    { background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 1.25rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap' as const },
  btnPrimary:   { background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 1.25rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', fontFamily: "'Inter', sans-serif" },
  btnOutline:   { background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem', fontFamily: "'Inter', sans-serif" },
};

export default StudentDashboard;