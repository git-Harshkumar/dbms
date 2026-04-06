import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { startExam, submitExam, getMyResultById } from '../../api/exam.api';

// ── Interfaces ─────────────────────────────────────────────
interface Option  { id: number; content: string; }
interface Question {
  id: number; content: string; type: string;
  marks: number; order_no: number; options: Option[];
}
interface ExamInfo { id: number; title: string; duration_mins: number; }
interface Answer   { question_id: number; selected_option_id: number | null; }

interface ResponseItem {
  question_id: number;
  question: string;
  marks: number;
  selected_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
}
interface ResultDetail {
  id: number;
  exam_title: string;
  score: number;
  total_marks: number;
  percentage: string;
  submitted_at: string | null;
  responses: ResponseItem[];
}

// ── Main Component ─────────────────────────────────────────
const AttemptExam = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate   = useNavigate();

  // Exam state
  const [exam,      setExam]      = useState<ExamInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers,   setAnswers]   = useState<Record<number, number>>({});
  const [resultId,  setResultId]  = useState<number | null>(null);
  const [current,   setCurrent]   = useState<number>(0);
  const [timeLeft,  setTimeLeft]  = useState<number>(0);
  const [loading,   setLoading]   = useState<boolean>(true);
  const [submitting,setSubmitting]= useState<boolean>(false);
  const [error,     setError]     = useState<string>('');

  // Post-submission state
  const [submitted,     setSubmitted]     = useState<boolean>(false);
  const [finalScore,    setFinalScore]    = useState<number>(0);
  const [resultDetail,  setResultDetail]  = useState<ResultDetail | null>(null);
  const [loadingResult, setLoadingResult] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Submit handler ─────────────────────────────────────────
  const handleSubmit = useCallback(async (auto = false) => {
    if (!resultId || submitting) return;
    if (!auto && !window.confirm('Submit exam? You cannot change answers after this.')) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const formattedAnswers: Answer[] = questions.map(q => ({
        question_id:        q.id,
        selected_option_id: answers[q.id] ?? null,
      }));
      const res = await submitExam(Number(examId), { result_id: resultId, answers: formattedAnswers });
      setFinalScore(res.data.score);
      setSubmitted(true);

      // Fetch detailed result with per-question breakdown
      setLoadingResult(true);
      try {
        const detail = await getMyResultById(resultId);
        setResultDetail({ ...detail.data.result, responses: detail.data.responses });
      } catch { /* show basic score if detail fetch fails */ }
      finally { setLoadingResult(false); }

    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit exam');
      setSubmitting(false);
    }
  }, [resultId, submitting, questions, answers, examId]);

  // ── Load exam on mount ─────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const res = await startExam(Number(examId));
        if (!res.data.exam) {
          setError('Exam data not found. Please go back and try again.');
          return;
        }
        setExam(res.data.exam);
        setQuestions(res.data.questions ?? []);
        setResultId(res.data.result_id);
        setTimeLeft(res.data.exam.duration_mins * 60);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load exam');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [examId]);

  // ── Countdown timer ────────────────────────────────────────
  useEffect(() => {
    if (!exam || timeLeft <= 0 || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); handleSubmit(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [exam, submitted, handleSubmit]);

  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── Download Scorecard as PDF ──────────────────────────────
  const downloadScorecard = () => {
    if (!resultDetail) return;
    const pct   = Number(resultDetail.percentage);
    const pass  = pct >= 50;
    const color = pct >= 75 ? '#166534' : pct >= 50 ? '#854d0e' : '#dc2626';
    const bg    = pct >= 75 ? '#dcfce7' : pct >= 50 ? '#fef9c3' : '#fef2f2';

    const rows = resultDetail.responses.map((r, i) => `
      <tr style="border-bottom:1px solid #e5e7eb;background:${r.is_correct ? '#f0fdf4' : '#fef2f2'}">
        <td style="padding:10px 12px;font-weight:600;color:#6b7280">${i + 1}</td>
        <td style="padding:10px 12px">${r.question}</td>
        <td style="padding:10px 12px;color:${r.is_correct ? '#166534' : '#dc2626'}">
          ${r.selected_answer || '<em style="color:#9ca3af">Not answered</em>'}
        </td>
        <td style="padding:10px 12px;color:#166534;font-weight:500">${r.correct_answer}</td>
        <td style="padding:10px 12px;text-align:center">
          <span style="background:${r.is_correct ? '#dcfce7' : '#fef2f2'};color:${r.is_correct ? '#166534' : '#dc2626'};
                padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600">
            ${r.is_correct ? '✓ Correct' : '✗ Wrong'}
          </span>
        </td>
        <td style="padding:10px 12px;text-align:center;color:#4f46e5;font-weight:600">${r.marks}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Scorecard – ${resultDetail.exam_title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; background: #fff; padding: 40px; }
  .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #e5e7eb; padding-bottom: 24px; }
  .header h1 { font-size: 28px; font-weight: 700; color: #111827; }
  .header p  { color: #6b7280; margin-top: 4px; font-size: 14px; }
  .score-box { display: flex; justify-content: center; gap: 24px; margin: 24px 0; flex-wrap: wrap; }
  .score-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px 32px;
    text-align: center; min-width: 140px; }
  .score-big  { font-size: 36px; font-weight: 800; }
  .score-label{ font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; margin-top: 4px; }
  .badge { display: inline-block; padding: 6px 20px; border-radius: 24px; font-size: 16px;
    font-weight: 700; background: ${bg}; color: ${color}; margin: 8px 0 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead th { background: #f1f5f9; padding: 12px; text-align: left; font-size: 12px;
    text-transform: uppercase; letter-spacing: .05em; color: #374151; }
  @media print {
    body { padding: 20px; }
    button { display: none !important; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>📋 Exam Scorecard</h1>
    <p>${resultDetail.exam_title}</p>
    <p style="margin-top:6px;font-size:12px;color:#9ca3af">
      Submitted: ${resultDetail.submitted_at ? new Date(resultDetail.submitted_at).toLocaleString() : 'Just now'}
    </p>
  </div>

  <div style="text-align:center">
    <div class="badge">${pass ? '🎉 PASSED' : '❌ FAILED'}</div>
  </div>

  <div class="score-box">
    <div class="score-card">
      <div class="score-big" style="color:${color}">${resultDetail.percentage}%</div>
      <div class="score-label">Percentage</div>
    </div>
    <div class="score-card">
      <div class="score-big" style="color:#4f46e5">${resultDetail.score} / ${resultDetail.total_marks}</div>
      <div class="score-label">Marks Obtained</div>
    </div>
    <div class="score-card">
      <div class="score-big" style="color:#22c55e">${resultDetail.responses.filter(r => r.is_correct).length}</div>
      <div class="score-label">Correct Answers</div>
    </div>
    <div class="score-card">
      <div class="score-big" style="color:#ef4444">${resultDetail.responses.filter(r => !r.is_correct).length}</div>
      <div class="score-label">Wrong / Skipped</div>
    </div>
  </div>

  <h2 style="font-size:16px;font-weight:700;margin:28px 0 12px;color:#111827">Answer Sheet</h2>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Question</th><th>Your Answer</th>
        <th>Correct Answer</th><th>Result</th><th>Marks</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div style="margin-top:32px;text-align:center;color:#9ca3af;font-size:12px;border-top:1px solid #e5e7eb;padding-top:16px">
    Online Examination System &nbsp;·&nbsp; Generated ${new Date().toLocaleString()}
  </div>
</body></html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { alert('Please allow popups to download the scorecard.'); return; }
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.print(); };
  };

  // ── Result Screen (shown after submission) ─────────────────
  if (submitted) {
    const pct   = resultDetail ? Number(resultDetail.percentage) : 0;
    const pass  = pct >= 50;
    const color = pct >= 75 ? '#166534' : pct >= 50 ? '#854d0e' : '#dc2626';
    const bg    = pct >= 75 ? '#dcfce7' : pct >= 50 ? '#fef9c3' : '#fef2f2';
    const total = questions.reduce((a, q) => a + q.marks, 0);

    return (
      <div style={rs.page}>
        {/* Score summary card */}
        <div style={rs.summaryCard}>
          <div style={rs.examName}>{exam?.title}</div>
          {loadingResult ? (
            <p style={{ color: '#6b7280', margin: '1rem 0' }}>Loading your results…</p>
          ) : (
            <>
              <div style={{ ...rs.pctBig, color }}>{resultDetail?.percentage ?? '—'}%</div>
              <div style={{ ...rs.badge, background: bg, color }}>
                {pass ? '🎉 You Passed!' : '❌ Better luck next time'}
              </div>
              <div style={rs.statsRow}>
                <div style={rs.statBox}>
                  <span style={{ ...rs.statNum, color: '#4f46e5' }}>
                    {resultDetail?.score ?? finalScore} / {resultDetail?.total_marks ?? total}
                  </span>
                  <span style={rs.statLabel}>Marks</span>
                </div>
                {resultDetail && (
                  <>
                    <div style={rs.statBox}>
                      <span style={{ ...rs.statNum, color: '#22c55e' }}>
                        {resultDetail.responses.filter(r => r.is_correct).length}
                      </span>
                      <span style={rs.statLabel}>Correct</span>
                    </div>
                    <div style={rs.statBox}>
                      <span style={{ ...rs.statNum, color: '#ef4444' }}>
                        {resultDetail.responses.filter(r => !r.is_correct).length}
                      </span>
                      <span style={rs.statLabel}>Wrong / Skipped</span>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Action buttons */}
          <div style={rs.btnRow}>
            {resultDetail && (
              <button style={rs.btnDownload} onClick={downloadScorecard}>
                ⬇ Download Scorecard & Answer Sheet (PDF)
              </button>
            )}
            <button style={rs.btnBack} onClick={() => navigate('/student/results')}>
              📊 View All Results
            </button>
            <button style={rs.btnHome} onClick={() => navigate('/student')}>
              🏠 Back to Dashboard
            </button>
          </div>
        </div>

        {/* Per-question answer review */}
        {resultDetail && (
          <div style={rs.reviewSection}>
            <h2 style={rs.reviewTitle}>Answer Review</h2>
            {resultDetail.responses.map((r, i) => (
              <div key={r.question_id} style={{
                ...rs.responseCard,
                borderLeft: `4px solid ${r.is_correct ? '#22c55e' : '#ef4444'}`,
              }}>
                <div style={rs.responseTop}>
                  <span style={rs.qNum}>Q{i + 1}</span>
                  <span style={rs.qMarks}>{r.marks} mark{r.marks > 1 ? 's' : ''}</span>
                  <span style={{
                    ...rs.resultBadge,
                    background: r.is_correct ? '#dcfce7' : '#fef2f2',
                    color:      r.is_correct ? '#166534' : '#dc2626',
                  }}>
                    {r.is_correct ? '✓ Correct' : '✗ Wrong'}
                  </span>
                </div>

                <p style={rs.qText}>{r.question}</p>

                <div style={rs.answerGrid}>
                  <div style={rs.answerBox}>
                    <span style={rs.answerLabel}>Your Answer</span>
                    <span style={{
                      ...rs.answerVal,
                      color: r.is_correct ? '#166534' : (r.selected_answer ? '#dc2626' : '#9ca3af'),
                      fontStyle: r.selected_answer ? 'normal' : 'italic',
                    }}>
                      {r.selected_answer || 'Not answered'}
                    </span>
                  </div>
                  {!r.is_correct && (
                    <div style={rs.answerBox}>
                      <span style={rs.answerLabel}>Correct Answer</span>
                      <span style={{ ...rs.answerVal, color: '#166534', fontWeight: 600 }}>
                        {r.correct_answer}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Exam UI ────────────────────────────────────────────────
  const timerColor = timeLeft < 60 ? '#dc2626' : timeLeft < 300 ? '#f59e0b' : '#166534';
  const answered   = Object.keys(answers).length;
  const total      = questions.length;
  const progress   = total > 0 ? (answered / total) * 100 : 0;

  if (loading) return <div style={s.center}>Loading exam…</div>;
  if (error)   return <div style={s.center}><p style={{ color: '#dc2626' }}>{error}</p></div>;

  const q = questions[current];

  return (
    <div style={s.page}>
      {/* Top bar */}
      <div style={s.topBar}>
        <div>
          <h2 style={s.examTitle}>{exam?.title}</h2>
          <p style={s.progress}>{answered} of {total} answered</p>
        </div>
        <div style={{ ...s.timer, color: timerColor }}>⏱ {formatTime(timeLeft)}</div>
      </div>

      {/* Progress bar */}
      <div style={s.progressBar}>
        <div style={{ ...s.progressFill, width: `${progress}%` }} />
      </div>

      {/* Question navigator */}
      <div style={s.navigator}>
        {questions.map((_, i) => (
          <button key={i}
            style={{
              ...s.navBtn,
              ...(i === current              ? s.navBtnActive   : {}),
              ...(answers[questions[i].id]   ? s.navBtnAnswered : {}),
            }}
            onClick={() => setCurrent(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Question card */}
      {q && (
        <div style={s.questionCard}>
          <div style={s.questionMeta}>
            <span style={s.questionNum}>Question {current + 1} of {total}</span>
            <span style={s.marks}>{q.marks} mark{q.marks > 1 ? 's' : ''}</span>
          </div>

          <p style={s.questionText}>{q.content}</p>

          <div style={s.options}>
            {q.options?.map(opt => (
              <label key={opt.id} style={{
                ...s.optionLabel,
                ...(answers[q.id] === opt.id ? s.optionSelected : {}),
              }}>
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  value={opt.id}
                  checked={answers[q.id] === opt.id}
                  onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                  style={{ marginRight: '0.75rem' }}
                />
                {opt.content}
              </label>
            ))}
          </div>

          <div style={s.navRow}>
            <button style={s.btnSecondary}
              disabled={current === 0}
              onClick={() => setCurrent(c => c - 1)}
            >← Previous</button>

            {current < total - 1 ? (
              <button style={s.btnPrimary} onClick={() => setCurrent(c => c + 1)}>
                Next →
              </button>
            ) : (
              <button style={s.btnSubmit} onClick={() => handleSubmit(false)} disabled={submitting}>
                {submitting ? 'Submitting…' : '✓ Submit Exam'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Styles: Exam UI ────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page:           { width: '100%', maxWidth: '100%', margin: 0, boxSizing: 'border-box', padding: '1.5rem clamp(1rem, 4vw, 2.5rem)', fontFamily: 'system-ui, sans-serif' },
  center:         { textAlign: 'center', padding: '4rem', fontFamily: 'sans-serif' },
  topBar:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' },
  examTitle:      { fontSize: '1.3rem', fontWeight: 700, margin: 0 },
  progress:       { fontSize: '0.82rem', color: '#6b7280', marginTop: 2 },
  timer:          { fontSize: '1.6rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  progressBar:    { height: 6, background: '#e5e7eb', borderRadius: 4, marginBottom: '1rem', overflow: 'hidden' },
  progressFill:   { height: '100%', background: '#4f46e5', borderRadius: 4, transition: 'width 0.3s' },
  navigator:      { display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.5rem' },
  navBtn:         { width: 34, height: 34, border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 },
  navBtnActive:   { border: '2px solid #4f46e5', color: '#4f46e5', background: '#eff6ff' },
  navBtnAnswered: { background: '#dcfce7', borderColor: '#22c55e', color: '#166534' },
  questionCard:   { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '2rem' },
  questionMeta:   { display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' },
  questionNum:    { fontSize: '0.85rem', color: '#6b7280', fontWeight: 500 },
  marks:          { fontSize: '0.82rem', background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 12, fontWeight: 500 },
  questionText:   { fontSize: '1.05rem', fontWeight: 500, lineHeight: 1.6, marginBottom: '1.5rem' },
  options:        { display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' },
  optionLabel:    { display: 'flex', alignItems: 'center', padding: '0.85rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: '0.95rem', transition: 'all 0.15s' },
  optionSelected: { border: '1.5px solid #4f46e5', background: '#eff6ff', color: '#1d4ed8', fontWeight: 500 },
  navRow:         { display: 'flex', justifyContent: 'space-between' },
  btnPrimary:     { background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '0.65rem 1.5rem', cursor: 'pointer', fontWeight: 600 },
  btnSecondary:   { background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '0.65rem 1.5rem', cursor: 'pointer', fontWeight: 500 },
  btnSubmit:      { background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '0.65rem 1.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem' },
};

// ── Styles: Result Screen ──────────────────────────────────
const rs: Record<string, React.CSSProperties> = {
  page:         { width: '100%', maxWidth: '100%', margin: 0, boxSizing: 'border-box', padding: '1.5rem clamp(1rem, 4vw, 2.5rem)', fontFamily: 'system-ui, sans-serif' },
  summaryCard:  { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '2rem 1.5rem', textAlign: 'center', marginBottom: '1.5rem', boxShadow: 'none' },
  examName:     { fontSize: '1.05rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 500 },
  pctBig:       { fontSize: '3.25rem', fontWeight: 800, lineHeight: 1, margin: '0.5rem 0' },
  badge:        { display: 'inline-block', padding: '6px 20px', borderRadius: 24, fontWeight: 700, fontSize: '1rem', margin: '0.75rem 0 1.5rem' },
  statsRow:     { display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem' },
  statBox:      { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 100, background: '#f9fafb', borderRadius: 12, padding: '1rem 1.5rem' },
  statNum:      { fontSize: '2rem', fontWeight: 700 },
  statLabel:    { fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' },
  btnRow:       { display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' },
  btnDownload:  { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem 1.25rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', boxShadow: 'none' },
  btnBack:      { background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem 1.2rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' },
  btnHome:      { background: '#fff', color: '#334155', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem 1.2rem', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem' },
  reviewSection:{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.5rem', boxShadow: 'none' },
  reviewTitle:  { fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: '#111827' },
  responseCard: { padding: '1rem 1rem 1rem 1.25rem', marginBottom: '1rem', background: '#fafafa', borderRadius: '0 10px 10px 0', },
  responseTop:  { display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' },
  qNum:         { fontWeight: 700, color: '#4f46e5', fontSize: '0.85rem', minWidth: 28 },
  qMarks:       { fontSize: '0.78rem', color: '#9ca3af' },
  resultBadge:  { fontSize: '0.78rem', padding: '2px 10px', borderRadius: 20, fontWeight: 600 },
  qText:        { fontSize: '0.95rem', fontWeight: 500, margin: '0 0 0.75rem', lineHeight: 1.5 },
  answerGrid:   { display: 'flex', gap: '2rem', flexWrap: 'wrap' },
  answerBox:    { display: 'flex', flexDirection: 'column', gap: 4 },
  answerLabel:  { fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 },
  answerVal:    { fontSize: '0.9rem', fontWeight: 500 },
};

export default AttemptExam;