import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExamResults, getExamById } from '../../api/exam.api';

interface Exam {
  title: string;
  duration_mins: number;
  questions?: unknown[];
}

interface ExamResult {
  id: number;
  student_name: string;
  student_email: string;
  score: number;
  total_marks: number;
  percentage: string;
  submitted_at: string | null;
}

const ExamResults: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate   = useNavigate();

  const [exam,    setExam]    = useState<Exam | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error,   setError]   = useState<string>('');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [examRes, resultsRes] = await Promise.all([
          getExamById(examId!),
          getExamResults(examId!),
        ]);
        setExam(examRes.data.exam);
        setResults(resultsRes.data.results);
      } catch {
        setError('Failed to load results');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [examId]);

  const avgScore = results.length
    ? (results.reduce((a, r) => a + Number(r.percentage), 0) / results.length).toFixed(1)
    : 0;
  const passed = results.filter(r => Number(r.percentage) >= 50).length;

  const getScoreColor = (pct: number) =>
    pct >= 75 ? '#065f46' : pct >= 50 ? '#92400e' : '#991b1b';
  const getScoreBg = (pct: number) =>
    pct >= 75 ? '#d1fae5' : pct >= 50 ? '#fef3c7' : '#fee2e2';

  return (
    <div style={s.page}>
      <button style={s.back} onClick={() => navigate('/admin')}>← Back to Dashboard</button>

      {loading && <p style={s.info}>Loading results…</p>}
      {error   && <p style={s.errorText}>{error}</p>}

      {!loading && exam && (
        <>
          <div style={s.pageHeader}>
            <h1 style={s.title}>{exam.title}</h1>
            <p style={s.subtitle}>
              {exam.duration_mins} min &nbsp;·&nbsp;
              {exam.questions?.length ?? 0} questions &nbsp;·&nbsp;
              {results.length} submission{results.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Stats */}
          <div style={s.statsRow}>
            {[
              { label: 'Attempts',    value: results.length },
              { label: 'Passed',      value: passed },
              { label: 'Failed',      value: results.length - passed },
              { label: 'Avg Score',   value: `${avgScore}%` },
            ].map(st => (
              <div key={st.label} style={s.statCard}>
                <span style={s.statNum}>{st.value}</span>
                <span style={s.statLabel}>{st.label}</span>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={s.tableCard}>
            <div style={s.tableHeader}>
              <h2 style={s.tableTitle}>Student Results</h2>
            </div>

            {results.length === 0 ? (
              <p style={s.info}>No students have attempted this exam yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {['#', 'Student', 'Email', 'Score', 'Percentage', 'Submitted At'].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={r.id} style={s.tr}>
                        <td style={s.tdCenter}>{i + 1}</td>
                        <td style={s.td}><strong>{r.student_name}</strong></td>
                        <td style={s.td}>{r.student_email}</td>
                        <td style={s.tdCenter}>{r.score} / {r.total_marks}</td>
                        <td style={s.tdCenter}>
                          <span style={{
                            background: getScoreBg(Number(r.percentage)),
                            color: getScoreColor(Number(r.percentage)),
                            padding: '0.2rem 0.65rem', borderRadius: 999,
                            fontWeight: 700, fontSize: '0.78rem', display: 'inline-block',
                          }}>
                            {r.percentage}%
                          </span>
                        </td>
                        <td style={s.td}>
                          {r.submitted_at
                            ? new Date(r.submitted_at).toLocaleString()
                            : <span style={{ color: '#d97706', fontWeight: 500 }}>In progress</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  page:       { width: '100%', padding: '1.5rem clamp(1rem, 4vw, 2.5rem)', fontFamily: "'Inter', system-ui, sans-serif", background: '#f7f8fa', minHeight: '100dvh' },
  back:       { background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.875rem', padding: 0, marginBottom: '0.75rem', fontFamily: "'Inter', sans-serif", fontWeight: 500 },
  pageHeader: { marginBottom: '1.5rem' },
  title:      { fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#111827' },
  subtitle:   { color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' },

  statsRow:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.75rem' },
  statCard:   { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, boxShadow: '0 1px 3px rgba(0,0,0,.05)' },
  statNum:    { fontSize: '1.6rem', fontWeight: 800, color: '#4f46e5' },
  statLabel:  { fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 },

  tableCard:  { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.05)' },
  tableHeader:{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0' },
  tableTitle: { fontSize: '1rem', fontWeight: 700, margin: 0, color: '#111827' },

  table:      { width: '100%', borderCollapse: 'collapse' as const },
  th:         { textAlign: 'left' as const, padding: '0.65rem 1rem', background: '#f9fafb', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  tr:         { borderBottom: '1px solid #f3f4f6' },
  td:         { padding: '0.85rem 1rem', fontSize: '0.875rem', verticalAlign: 'middle' as const },
  tdCenter:   { padding: '0.85rem 1rem', textAlign: 'center' as const, fontSize: '0.875rem', verticalAlign: 'middle' as const, color: '#6b7280' },

  info:       { color: '#6b7280', textAlign: 'center', padding: '2rem' },
  errorText:  { color: '#dc2626', textAlign: 'center', padding: '1rem' },
};

export default ExamResults;