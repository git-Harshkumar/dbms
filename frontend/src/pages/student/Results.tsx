import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyResults, getMyResultById } from '../../api/exam.api';
import ExamResultDetailView, {
  type ResultResponseItem,
  type ResultSummary,
} from '../../component/ExamResultDetailView';

interface Result extends ResultSummary {}
interface DetailResult extends Result { responses: ResultResponseItem[]; }

const Results = () => {
  const navigate = useNavigate();

  const [results,       setResults]       = useState<Result[]>([]);
  const [detail,        setDetail]        = useState<DetailResult | null>(null);
  const [loading,       setLoading]       = useState<boolean>(true);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [error,         setError]         = useState<string>('');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await getMyResults();
        setResults(res.data.results);
      } catch {
        setError('Failed to load results');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  const viewDetail = async (resultId: number) => {
    setDetailLoading(true);
    try {
      const res = await getMyResultById(resultId);
      setDetail({ ...res.data.result, responses: res.data.responses ?? [] });
    } catch {
      alert('Failed to load result details');
    } finally {
      setDetailLoading(false);
    }
  };

  const getPct   = (pct: string) => Number(pct);
  const getColor = (pct: string) => getPct(pct) >= 75 ? '#065f46' : getPct(pct) >= 50 ? '#92400e' : '#991b1b';
  const getBg    = (pct: string) => getPct(pct) >= 75 ? '#d1fae5' : getPct(pct) >= 50 ? '#fef3c7' : '#fee2e2';
  const getLabel = (pct: string) => getPct(pct) >= 50 ? 'Pass' : 'Fail';

  if (detail) {
    return (
      <ExamResultDetailView
        result={detail}
        responses={detail.responses}
        topBack={{ label: '← Back to Results', onClick: () => setDetail(null) }}
        onAllResults={() => setDetail(null)}
        onDashboard={() => navigate('/student')}
      />
    );
  }

  return (
    <div style={s.page}>
      <button style={s.back} onClick={() => navigate('/student')}>← Back to Dashboard</button>
      <h1 style={s.title}>My Results</h1>

      {loading && <p style={s.info}>Loading results…</p>}
      {error   && <p style={s.errorText}>{error}</p>}

      {!loading && results.length === 0 && (
        <div style={s.empty}>You haven't completed any exams yet.</div>
      )}

      <div style={s.grid}>
        {results.map(r => (
          <div key={r.id} style={s.card}>
            <div style={s.cardTop}>
              <h3 style={s.cardTitle}>{r.exam_title}</h3>
              <span style={{ ...s.badge, background: getBg(r.percentage), color: getColor(r.percentage) }}>
                {getLabel(r.percentage)}
              </span>
            </div>

            <div style={s.scoreArea}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: getColor(r.percentage) }}>
                {r.percentage}%
              </span>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                {r.score} / {r.total_marks} marks
              </span>
            </div>

            <div style={s.meta}>
              <span>⏱ {r.duration_mins} min</span>
              <span>{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '—'}</span>
            </div>

            <button
              style={s.btnPrimary}
              onClick={() => viewDetail(r.id)}
              disabled={detailLoading}
            >
              {detailLoading ? 'Loading…' : 'View Details'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const s: Record<string, CSSProperties> = {
  page:      { width: '100%', padding: '1.5rem clamp(1rem, 4vw, 2.5rem)', fontFamily: "'Inter', system-ui, sans-serif", background: '#f7f8fa', minHeight: '100dvh' },
  back:      { background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.875rem', padding: 0, marginBottom: '0.75rem', fontFamily: "'Inter', sans-serif", fontWeight: 500 },
  title:     { fontSize: '1.6rem', fontWeight: 800, marginBottom: '1.5rem', letterSpacing: '-0.02em', color: '#111827' },

  info:      { color: '#6b7280', textAlign: 'center', padding: '2rem' },
  errorText: { color: '#dc2626', textAlign: 'center', padding: '1rem' },
  empty:     { textAlign: 'center', padding: '3rem', color: '#6b7280', background: '#fff', borderRadius: 10, border: '1px dashed #e2e8f0' },

  grid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' },
  card:      { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,.05)' },
  cardTop:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' },
  cardTitle: { fontSize: '1rem', fontWeight: 700, margin: 0, color: '#111827' },
  badge:     { fontSize: '0.72rem', padding: '0.2rem 0.65rem', borderRadius: 999, fontWeight: 600, whiteSpace: 'nowrap' as const },
  scoreArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem 0', gap: '0.2rem' },
  meta:      { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#9ca3af' },
  btnPrimary:{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', fontFamily: "'Inter', sans-serif" },
};

export default Results;