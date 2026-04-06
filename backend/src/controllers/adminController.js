const db = require('../config/db');

const createExam = async (req, res) => {
  const { title, description, duration_mins, starts_at, ends_at } = req.body;
  if (!title || !duration_mins || !starts_at || !ends_at) {
    return res.status(400).json({ message: 'title, duration_mins, starts_at and ends_at are required' });
  }
  try {
    const result = await db.query(
      `INSERT INTO exams (title, description, duration_mins, starts_at, ends_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [title, description || null, duration_mins, starts_at, ends_at, req.user.id]
    );
    return res.status(201).json({ message: 'Exam created successfully', exam_id: result.rows[0].id });
  } catch (err) {
    console.error('createExam error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const getAllExams = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT e.id, e.title, e.description, e.duration_mins,
              e.starts_at, e.ends_at, e.is_published,
              COUNT(DISTINCT q.id)::int AS total_questions,
              COUNT(DISTINCT r.id)::int AS total_attempts
       FROM exams e
       LEFT JOIN questions q ON q.exam_id = e.id
       LEFT JOIN results   r ON r.exam_id = e.id
       WHERE e.created_by = $1
       GROUP BY e.id
       ORDER BY e.created_at DESC`,
      [req.user.id]
    );
    return res.status(200).json({ exams: result.rows });
  } catch (err) {
    console.error('getAllExams error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const getExamById = async (req, res) => {
  const { examId } = req.params;
  try {
    const examResult = await db.query(
      'SELECT * FROM exams WHERE id = $1 AND created_by = $2',
      [examId, req.user.id]
    );
    if (examResult.rows.length === 0) return res.status(404).json({ message: 'Exam not found' });

    const questionsResult = await db.query(
      `SELECT q.id, q.content, q.type, q.marks, q.order_no,
              JSON_AGG(JSON_BUILD_OBJECT('id', o.id, 'content', o.content, 'is_correct', o.is_correct)) AS options
       FROM questions q
       LEFT JOIN options o ON o.question_id = q.id
       WHERE q.exam_id = $1
       GROUP BY q.id ORDER BY q.order_no`,
      [examId]
    );
    return res.status(200).json({ exam: { ...examResult.rows[0], questions: questionsResult.rows } });
  } catch (err) {
    console.error('getExamById error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const togglePublish = async (req, res) => {
  const { examId } = req.params;
  try {
    const examResult = await db.query(
      'SELECT id, is_published FROM exams WHERE id = $1 AND created_by = $2',
      [examId, req.user.id]
    );
    if (examResult.rows.length === 0) return res.status(404).json({ message: 'Exam not found' });
    const newStatus = !examResult.rows[0].is_published;
    await db.query('UPDATE exams SET is_published = $1 WHERE id = $2', [newStatus, examId]);
    return res.status(200).json({ message: newStatus ? 'Exam published' : 'Exam unpublished', is_published: newStatus });
  } catch (err) {
    console.error('togglePublish error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const deleteExam = async (req, res) => {
  const { examId } = req.params;
  try {
    const result = await db.query(
      'DELETE FROM exams WHERE id = $1 AND created_by = $2',
      [examId, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Exam not found' });
    return res.status(200).json({ message: 'Exam deleted successfully' });
  } catch (err) {
    console.error('deleteExam error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const addQuestion = async (req, res) => {
  const { examId } = req.params;
  const { content, type = 'mcq', marks = 1, order_no = 0, options = [] } = req.body;

  if (!content) return res.status(400).json({ message: 'Question content is required' });
  if (type === 'mcq' && options.length < 2) return res.status(400).json({ message: 'MCQ needs at least 2 options' });
  if (type === 'mcq' && !options.some(o => o.is_correct)) return res.status(400).json({ message: 'At least one option must be correct' });

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const qResult = await client.query(
      `INSERT INTO questions (exam_id, content, type, marks, order_no)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [examId, content, type, marks, order_no]
    );
    const questionId = qResult.rows[0].id;
    for (const opt of options) {
      await client.query(
        'INSERT INTO options (question_id, content, is_correct) VALUES ($1, $2, $3)',
        [questionId, opt.content, opt.is_correct || false]
      );
    }
    await client.query('COMMIT');
    return res.status(201).json({ message: 'Question added successfully', question_id: questionId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('addQuestion error:', err);
    return res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

const deleteQuestion = async (req, res) => {
  const { questionId } = req.params;
  try {
    const result = await db.query(
      `DELETE FROM questions WHERE id = $1
       AND exam_id IN (SELECT id FROM exams WHERE created_by = $2)`,
      [questionId, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Question not found' });
    return res.status(200).json({ message: 'Question deleted successfully' });
  } catch (err) {
    console.error('deleteQuestion error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const getExamResults = async (req, res) => {
  const { examId } = req.params;
  try {
    const result = await db.query(
      `SELECT r.id, r.score, r.total_marks, r.submitted_at,
              u.id AS student_id, u.name AS student_name, u.email AS student_email,
              ROUND((r.score::numeric / NULLIF(r.total_marks, 0)) * 100, 1) AS percentage
       FROM results r
       INNER JOIN users u ON u.id = r.student_id
       WHERE r.exam_id = $1
       ORDER BY r.score DESC`,
      [examId]
    );
    return res.status(200).json({ results: result.rows });
  } catch (err) {
    console.error('getExamResults error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createExam, getAllExams, getExamById, togglePublish, deleteExam, addQuestion, deleteQuestion, getExamResults };
