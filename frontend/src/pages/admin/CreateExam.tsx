import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createExam, addQuestion } from '../../api/exam.api';

// ── Types ───────────────────────────────────────────
type Option = {
  content: string;
  is_correct: boolean;
};

type Question = {
  content: string;
  type: 'mcq';
  marks: number;
  options: Option[];
};

type ExamForm = {
  title: string;
  description: string;
  duration_mins: number;
  starts_at: string;
  ends_at: string;
};

// ── Helpers ─────────────────────────────────────────
const emptyQuestion = (): Question => ({
  content: '',
  type: 'mcq',
  marks: 1,
  options: [
    { content: '', is_correct: false },
    { content: '', is_correct: false },
    { content: '', is_correct: false },
    { content: '', is_correct: false },
  ],
});

const CreateExam: React.FC = () => {
  const navigate = useNavigate();

  // ── Exam form ──────────────────────────────────────
  const [examForm, setExamForm] = useState<ExamForm>({
    title: '',
    description: '',
    duration_mins: 30,
    starts_at: '',
    ends_at: '',
  });

  // ── Questions list ─────────────────────────────────
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()]);

  // ── UI state ───────────────────────────────────────
  const [step, setStep] = useState<number>(1);
  const [examId, setExamId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // ── Step 1: Save exam details ──────────────────────
  const handleCreateExam = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!examForm.title || !examForm.starts_at || !examForm.ends_at) {
      return setError('Title, start date and end date are required');
    }

    setSubmitting(true);
    try {
      const res = await createExam(examForm);
      setExamId(res.data.exam_id);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create exam');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Question helpers ───────────────────────────────
  const updateQuestion = (qi: number, field: keyof Question, value: any) => {
    setQuestions((qs) =>
      qs.map((q, i) => (i === qi ? { ...q, [field]: value } : q))
    );
  };

  const updateOption = (
    qi: number,
    oi: number,
    field: keyof Option,
    value: any
  ) => {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qi) return q;

        const options = q.options.map((o, j) => {
          if (field === 'is_correct') {
            return { ...o, is_correct: j === oi };
          }
          return j === oi ? { ...o, [field]: value } : o;
        });

        return { ...q, options };
      })
    );
  };

  const addQuestionRow = () => {
    setQuestions((qs) => [...qs, emptyQuestion()]);
  };

  const removeQuestion = (qi: number) => {
    if (questions.length === 1) return;
    setQuestions((qs) => qs.filter((_, i) => i !== qi));
  };

  // ── Step 2: Save all questions ─────────────────────
  const handleSaveQuestions = async () => {
    setError('');

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      if (!q.content.trim()) {
        return setError(`Question ${i + 1} is empty`);
      }

      if (q.type === 'mcq') {
        if (q.options.some((o) => !o.content.trim())) {
          return setError(`Fill all options for Q${i + 1}`);
        }
        if (!q.options.some((o) => o.is_correct)) {
          return setError(`Mark a correct answer for Q${i + 1}`);
        }
      }
    }

    setSubmitting(true);
    try {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
      await addQuestion(examId!, { ...q, order_no: i + 1 });
      }
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save questions');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Shared styles ────────────────────────────────────
  const s: Record<string, React.CSSProperties> = {
    page:      { width: '100%', maxWidth: '100%', margin: 0, boxSizing: 'border-box', padding: '1.5rem clamp(1rem, 4vw, 2.5rem)', fontFamily: 'system-ui, sans-serif' },
    title:     { fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.5rem' },
    card:      { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' },
    cardTitle: { fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' },
    field:     { marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: 4 },
    label:     { fontSize: '0.85rem', fontWeight: 500, color: '#374151' },
    input:     { border: '1px solid #d1d5db', borderRadius: 8, padding: '0.55rem 0.75rem', fontSize: '0.9rem', outline: 'none' },
    row:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
    error:     { color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.6rem 1rem', fontSize: '0.875rem', marginBottom: '1rem' },
    btnPrimary:{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '0.65rem 1.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' },
    btnOutline:{ background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, padding: '0.6rem 1.2rem', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem' },
    btnDanger: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem' },
    btnAdd:    { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.55rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 },
    optRow:    { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' },
    radioLabel:{ fontSize: '0.8rem', color: '#6b7280' },
    qCard:     { border: '1px solid #e5e7eb', borderRadius: 10, padding: '1rem', marginBottom: '1rem', background: '#f9fafb' },
    qHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' },
    actions:   { display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' },
  };

  // ── Step 1: Exam details form ─────────────────────────
  if (step === 1) {
    return (
      <div style={s.page}>
        <h1 style={s.title}>Create New Exam</h1>
        {error && <p style={s.error}>{error}</p>}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Exam Details</h2>
          <form onSubmit={handleCreateExam}>
            <div style={s.field}>
              <label style={s.label}>Title *</label>
              <input style={s.input} value={examForm.title} onChange={e => setExamForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Midterm SQL Exam" required />
            </div>
            <div style={s.field}>
              <label style={s.label}>Description</label>
              <textarea style={{ ...s.input, resize: 'vertical', minHeight: 72 }} value={examForm.description} onChange={e => setExamForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
            </div>
            <div style={s.row}>
              <div style={s.field}>
                <label style={s.label}>Duration (minutes) *</label>
                <input style={s.input} type="number" min={1} value={examForm.duration_mins} onChange={e => setExamForm(f => ({ ...f, duration_mins: Number(e.target.value) }))} required />
              </div>
              <div style={s.field}>
                <label style={s.label}>&nbsp;</label>
              </div>
            </div>
            <div style={s.row}>
              <div style={s.field}>
                <label style={s.label}>Starts At </label>
                <input style={s.input} type="datetime-local" value={examForm.starts_at} onChange={e => setExamForm(f => ({ ...f, starts_at: e.target.value }))} required />
              </div>
              <div style={s.field}>
                <label style={s.label}>Ends At </label>
                <input style={s.input} type="datetime-local" value={examForm.ends_at} onChange={e => setExamForm(f => ({ ...f, ends_at: e.target.value }))} required />
              </div>
            </div>
            <div style={s.actions}>
              <button type="button" style={s.btnOutline} onClick={() => navigate('/admin')}>Cancel</button>
              <button type="submit" style={s.btnPrimary} disabled={submitting}>
                {submitting ? 'Creating…' : 'Next: Add Questions →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── Step 2: Add questions ─────────────────────────────
  return (
    <div style={s.page}>
      <h1 style={s.title}>Add Questions</h1>
      {error && <p style={s.error}>{error}</p>}

      {questions.map((q, qi) => (
        <div key={qi} style={s.qCard}>
          <div style={s.qHeader}>
            <strong style={{ fontSize: '0.9rem' }}>Question {qi + 1}</strong>
            <button style={s.btnDanger} onClick={() => removeQuestion(qi)} disabled={questions.length === 1}>Remove</button>
          </div>

          <div style={s.field}>
            <label style={s.label}>Question Text </label>
            <textarea
              style={{ ...s.input, resize: 'vertical', minHeight: 60 }}
              value={q.content}
              onChange={e => updateQuestion(qi, 'content', e.target.value)}
              placeholder="Enter question here…"
            />
          </div>

          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>Marks</label>
              <input style={s.input} type="number" min={1} value={q.marks} onChange={e => updateQuestion(qi, 'marks', Number(e.target.value))} />
            </div>
          </div>

          <label style={{ ...s.label, marginBottom: '0.5rem', display: 'block' }}>Options (select correct answer)</label>
          {q.options.map((opt, oi) => (
            <div key={oi} style={s.optRow}>
              <input
                type="radio"
                name={`correct-${qi}`}
                checked={opt.is_correct}
                onChange={() => updateOption(qi, oi, 'is_correct', true)}
              />
              <input
                style={{ ...s.input, flex: 1 }}
                value={opt.content}
                onChange={e => updateOption(qi, oi, 'content', e.target.value)}
                placeholder={`Option ${String.fromCharCode(65 + oi)}`}
              />
            </div>
          ))}
        </div>
      ))}

      <button style={s.btnAdd} onClick={addQuestionRow}>+ Add Question</button>

      <div style={s.actions}>
        <button style={s.btnOutline} onClick={() => setStep(1)}>← Back</button>
        <button style={s.btnPrimary} onClick={handleSaveQuestions} disabled={submitting}>
          {submitting ? 'Saving…' : ' Save & Finish'}
        </button>
      </div>
    </div>
  );
};

export default CreateExam;