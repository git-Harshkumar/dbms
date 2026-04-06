import type { CSSProperties, FC } from 'react';

export interface ResultSummary {
  id: number;
  exam_title: string;
  score: number;
  total_marks: number;
  percentage: string;
  submitted_at: string | null;
  duration_mins: number;
}

export interface ResultResponseItem {
  question_id: number;
  question: string;
  marks: number;
  selected_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
}

interface ExamResultDetailViewProps {
  result: ResultSummary;
  responses: ResultResponseItem[];
  onAllResults: () => void;
  onDashboard: () => void;
  /** e.g. "← Back to Results" when embedded in the list page */
  topBack?: { label: string; onClick: () => void };
}

const ExamResultDetailView: FC<ExamResultDetailViewProps> = ({
  result,
  responses,
  onAllResults,
  onDashboard,
  topBack,
}) => {
  const downloadReport = () => {
    const pct = Number(result.percentage);
    const pass = pct >= 50;
    const color = pct >= 75 ? '#166534' : pct >= 50 ? '#854d0e' : '#dc2626';
    const bg = pct >= 75 ? '#dcfce7' : pct >= 50 ? '#fef9c3' : '#fef2f2';
    const correct = responses.filter((r) => r.is_correct).length;
    const wrong = responses.length - correct;

    const answerRows = responses
      .map(
        (r, i) => `
      <tr style="background:${r.is_correct ? '#f0fdf4' : '#fff5f5'};border-bottom:1px solid #e5e7eb;">
        <td style="padding:12px 14px;text-align:center;font-weight:700;color:#6b7280;border-right:1px solid #f3f4f6;">${i + 1}</td>
        <td style="padding:12px 14px;font-weight:500;color:#111827;">${r.question}</td>
        <td style="padding:12px 14px;color:${r.is_correct ? '#166534' : r.selected_answer ? '#dc2626' : '#9ca3af'};
            font-style:${r.selected_answer ? 'normal' : 'italic'}">
          ${r.selected_answer || 'Not answered'}
        </td>
        <td style="padding:12px 14px;color:#166534;font-weight:500">${r.correct_answer}</td>
        <td style="padding:12px 14px;text-align:center">
          <span style="padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;
            background:${r.is_correct ? '#dcfce7' : '#fee2e2'};color:${r.is_correct ? '#166534' : '#dc2626'}">
            ${r.is_correct ? '✓ Correct' : '✗ Wrong'}
          </span>
        </td>
        <td style="padding:12px 14px;text-align:center;font-weight:700;color:#4f46e5">${r.marks}</td>
      </tr>
    `
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Result Report – ${result.exam_title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; background: #fff; }
    .wrap { max-width: 860px; margin: 0 auto; padding: 40px 32px; }
    .header { text-align: center; padding-bottom: 28px; border-bottom: 2px solid #e5e7eb; margin-bottom: 32px; }
    .header h1 { font-size: 26px; font-weight: 800; color: #111827; letter-spacing: -0.5px; }
    .header .sub { color: #6b7280; font-size: 14px; margin-top: 6px; }
    .score-hero { text-align: center; margin-bottom: 32px; }
    .score-pct { font-size: 72px; font-weight: 900; color: ${color}; line-height: 1; }
    .score-label { font-size: 14px; color: #9ca3af; margin-top: 4px; }
    .badge { display: inline-block; margin: 12px 0 24px; padding: 8px 28px;
      border-radius: 30px; font-size: 16px; font-weight: 800;
      background: ${bg}; color: ${color}; }
    .stats { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; margin-bottom: 36px; }
    .stat { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px;
      padding: 16px 24px; text-align: center; min-width: 120px; }
    .stat-num { font-size: 28px; font-weight: 800; }
    .stat-lbl { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: .06em; margin-top: 4px; }
    .section-title { font-size: 17px; font-weight: 700; color: #111827;
      margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead th { background: #1e293b; color: #fff; padding: 12px 14px;
      text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
    .footer { text-align: center; margin-top: 36px; padding-top: 20px;
      border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>📋 Exam Result Report</h1>
    <div class="sub">${result.exam_title}</div>
    <div class="sub" style="margin-top:4px">
      ${result.submitted_at ? 'Submitted: ' + new Date(result.submitted_at).toLocaleString() : ''}
      &nbsp;·&nbsp; Duration: ${result.duration_mins} min
    </div>
  </div>
  <div class="score-hero">
    <div class="score-pct">${result.percentage}%</div>
    <div class="score-label">Overall Score</div>
    <div class="badge">${pass ? '🎉 PASSED' : '❌ FAILED'}</div>
  </div>
  <div class="stats">
    <div class="stat">
      <div class="stat-num" style="color:#4f46e5">${result.score} / ${result.total_marks}</div>
      <div class="stat-lbl">Marks Obtained</div>
    </div>
    <div class="stat">
      <div class="stat-num" style="color:#22c55e">${correct}</div>
      <div class="stat-lbl">Correct</div>
    </div>
    <div class="stat">
      <div class="stat-num" style="color:#ef4444">${wrong}</div>
      <div class="stat-lbl">Wrong / Skipped</div>
    </div>
    <div class="stat">
      <div class="stat-num" style="color:#f59e0b">${responses.length}</div>
      <div class="stat-lbl">Total Questions</div>
    </div>
  </div>
  <div class="section-title">Answer Sheet</div>
  <table>
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th>Question</th>
        <th>Your Answer</th>
        <th>Correct Answer</th>
        <th style="width:100px;text-align:center">Result</th>
        <th style="width:60px;text-align:center">Marks</th>
      </tr>
    </thead>
    <tbody>${answerRows}</tbody>
  </table>
  <div class="footer">
    Online Examination System &nbsp;·&nbsp; Report generated on ${new Date().toLocaleString()}
  </div>
</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=950,height=750');
    if (!win) {
      alert('Allow pop-ups in your browser to download the report.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
  };

  const pct = Number(result.percentage);
  const pass = pct >= 50;
  const color = pct >= 75 ? '#166534' : pct >= 50 ? '#854d0e' : '#dc2626';
  const bg = pct >= 75 ? '#dcfce7' : pct >= 50 ? '#fef9c3' : '#fef2f2';
  const correct = responses.filter((r) => r.is_correct).length;
  const wrong = responses.length - correct;

  return (
    <div style={s.page}>
      {topBack && (
        <button type="button" style={s.backLink} onClick={topBack.onClick}>
          {topBack.label}
        </button>
      )}

      <div style={s.heroCard}>
        <p style={s.examLabel}>{result.exam_title}</p>

        <div style={{ ...s.pctCircle, borderColor: color }}>
          <span style={{ ...s.pctNumber, color }}>{result.percentage}%</span>
          <span style={s.pctSub}>Score</span>
        </div>

        <div style={{ ...s.badge, background: bg, color }}>
          {pass ? '🎉 Congratulations — You Passed!' : '❌ You Failed — Keep Practicing!'}
        </div>

        <div style={s.statsRow}>
          <div style={s.statCard}>
            <span style={{ ...s.statNum, color: '#4f46e5' }}>
              {result.score} / {result.total_marks}
            </span>
            <span style={s.statLabel}>Marks</span>
          </div>
          <div style={s.statCard}>
            <span style={{ ...s.statNum, color: '#22c55e' }}>{correct}</span>
            <span style={s.statLabel}>Correct</span>
          </div>
          <div style={s.statCard}>
            <span style={{ ...s.statNum, color: '#ef4444' }}>{wrong}</span>
            <span style={s.statLabel}>Wrong / Skipped</span>
          </div>
          <div style={s.statCard}>
            <span style={{ ...s.statNum, color: '#f59e0b' }}>{responses.length}</span>
            <span style={s.statLabel}>Total Questions</span>
          </div>
        </div>

        <div style={s.btnRow}>
          <button type="button" style={s.btnDownload} onClick={downloadReport}>
            ⬇ Download Result Report (PDF)
          </button>
          <button type="button" style={s.btnSecondary} onClick={onAllResults}>
            📊 All My Results
          </button>
          <button type="button" style={s.btnOutline} onClick={onDashboard}>
            🏠 Dashboard
          </button>
        </div>

        {result.submitted_at && (
          <p style={s.submittedAt}>Submitted on {new Date(result.submitted_at).toLocaleString()}</p>
        )}
      </div>

      <div style={s.sheetCard}>
        <h2 style={s.sheetTitle}>📋 Answer Sheet</h2>
        <p style={s.sheetSub}>Review each question — correct answers are highlighted in green.</p>

        <div style={s.questionList}>
          {responses.map((r, i) => (
            <div
              key={r.question_id}
              style={{
                ...s.qRow,
                borderLeft: `5px solid ${r.is_correct ? '#22c55e' : '#ef4444'}`,
                background: r.is_correct ? '#f0fdf4' : '#fff5f5',
              }}
            >
              <div style={s.qTop}>
                <div style={s.qMeta}>
                  <span
                    style={{
                      ...s.qBadge,
                      background: r.is_correct ? '#dcfce7' : '#fee2e2',
                      color: r.is_correct ? '#166534' : '#dc2626',
                    }}
                  >
                    {r.is_correct ? '✓ Correct' : '✗ Wrong'}
                  </span>
                  <span style={s.qNum}>Question {i + 1}</span>
                  <span style={s.qMarks}>
                    {r.marks} mark{r.marks > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <p style={s.qText}>{r.question}</p>

              <div style={s.answerRow}>
                <div
                  style={{
                    ...s.answerBox,
                    background: r.is_correct ? '#dcfce7' : '#fee2e2',
                    borderColor: r.is_correct ? '#86efac' : '#fca5a5',
                  }}
                >
                  <span style={s.answerLabel}>YOUR ANSWER</span>
                  <span
                    style={{
                      ...s.answerVal,
                      color: r.is_correct ? '#166534' : r.selected_answer ? '#dc2626' : '#9ca3af',
                      fontStyle: r.selected_answer ? 'normal' : 'italic',
                    }}
                  >
                    {r.selected_answer || 'Not answered'}
                  </span>
                </div>

                {!r.is_correct && (
                  <div style={{ ...s.answerBox, background: '#dcfce7', borderColor: '#86efac' }}>
                    <span style={s.answerLabel}>CORRECT ANSWER</span>
                    <span style={{ ...s.answerVal, color: '#166534', fontWeight: 700 }}>
                      {r.correct_answer}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button type="button" style={s.btnDownload} onClick={downloadReport}>
            ⬇ Download Full Report & Answer Sheet (PDF)
          </button>
        </div>
      </div>
    </div>
  );
};

const s: Record<string, CSSProperties> = {
  page: {
    width: '100%',
    maxWidth: '100%',
    margin: 0,
    padding: '1.5rem clamp(1rem, 4vw, 2.5rem)',
    boxSizing: 'border-box',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  backLink: {
    background: 'none',
    border: 'none',
    color: '#4f46e5',
    cursor: 'pointer',
    fontSize: '0.9rem',
    padding: 0,
    marginBottom: '1rem',
    display: 'block',
    textAlign: 'left',
  },
  heroCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: '2rem 1.5rem',
    textAlign: 'center',
    marginBottom: '1.5rem',
    boxShadow: 'none',
  },
  examLabel: { fontSize: '0.95rem', color: '#6b7280', fontWeight: 500, marginBottom: '1.5rem' },
  pctCircle: {
    width: 140,
    height: 140,
    borderRadius: '50%',
    border: '4px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
    background: '#fafafa',
  },
  pctNumber: { fontSize: '2.6rem', fontWeight: 900, lineHeight: 1 },
  pctSub: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginTop: 4,
  },
  badge: {
    display: 'inline-block',
    padding: '8px 24px',
    borderRadius: 30,
    fontWeight: 700,
    fontSize: '1rem',
    margin: '1rem 0 1.5rem',
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
    marginBottom: '1.5rem',
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    minWidth: 110,
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    padding: '1rem 1.5rem',
  },
  statNum: { fontSize: '1.8rem', fontWeight: 800 },
  statLabel: {
    fontSize: '0.72rem',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 600,
  },
  btnRow: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '1rem',
  },
  btnDownload: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '0.75rem 1.25rem',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.9rem',
    boxShadow: 'none',
  },
  btnSecondary: {
    background: '#f1f5f9',
    color: '#0f172a',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '0.75rem 1.2rem',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  btnOutline: {
    background: '#fff',
    color: '#334155',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '0.75rem 1.2rem',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '0.875rem',
  },
  submittedAt: { fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.5rem' },
  sheetCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: '1.5rem',
    boxShadow: 'none',
  },
  sheetTitle: { fontSize: '1.2rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' },
  sheetSub: { fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.5rem' },
  questionList: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  qRow: { borderRadius: '0 12px 12px 0', padding: '1.25rem 1.25rem 1.25rem 1.5rem' },
  qTop: { marginBottom: '0.5rem' },
  qMeta: { display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' },
  qBadge: { fontSize: '0.75rem', padding: '3px 12px', borderRadius: 20, fontWeight: 700 },
  qNum: { fontSize: '0.82rem', color: '#6b7280', fontWeight: 600 },
  qMarks: { fontSize: '0.75rem', color: '#9ca3af' },
  qText: {
    fontSize: '1rem',
    fontWeight: 500,
    color: '#1f2937',
    lineHeight: 1.6,
    margin: '0.5rem 0 1rem',
  },
  answerRow: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  answerBox: {
    flex: 1,
    minWidth: 180,
    border: '1px solid',
    borderRadius: 10,
    padding: '0.75rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  answerLabel: {
    fontSize: '0.68rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#6b7280',
  },
  answerVal: { fontSize: '0.9rem', fontWeight: 500 },
};

export default ExamResultDetailView;
