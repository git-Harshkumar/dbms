import { useEffect, useState, type CSSProperties } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMyResultById } from '../../api/exam.api';
import ExamResultDetailView, {
  type ResultResponseItem,
  type ResultSummary,
} from '../../component/ExamResultDetailView';

const ResultDetail = () => {
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();

  const [result, setResult] = useState<ResultSummary | null>(null);
  const [responses, setResponses] = useState<ResultResponseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getMyResultById(Number(resultId));
        setResult(res.data.result);
        setResponses(res.data.responses ?? []);
      } catch {
        setError('Failed to load result. Please go back and try again.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [resultId]);

  const center: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    fontFamily: 'sans-serif',
  };

  if (loading) {
    return (
      <div style={center}>
        <div
          style={{
            width: 40,
            height: 40,
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #4f46e5',
            borderRadius: '50%',
            animation: 'examResultSpin 0.8s linear infinite',
          }}
        />
        <p style={{ color: '#6b7280', marginTop: '1rem' }}>Loading your result…</p>
        <style>{`@keyframes examResultSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div style={center}>
        <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error || 'Result not found.'}</p>
        <button
          type="button"
          style={{
            background: '#fff',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: 12,
            padding: '0.75rem 1.2rem',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/student')}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <ExamResultDetailView
      result={result}
      responses={responses}
      onAllResults={() => navigate('/student/results')}
      onDashboard={() => navigate('/student')}
    />
  );
};

export default ResultDetail;
