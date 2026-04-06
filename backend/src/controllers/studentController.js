const db = require('../config/db');

// ---------------------------------------------------------------
// GET /api/student/exams
// List all published exams available to attempt
// ---------------------------------------------------------------
const getAvailableExams = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT e.id, e.title, e.description, e.duration_mins,
              e.starts_at, e.ends_at,
              COUNT(DISTINCT q.id)::int AS total_questions,
              SUM(q.marks)::int         AS total_marks,
              r.id                      AS result_id,
              r.submitted_at            AS submitted_at
       FROM exams e
       LEFT JOIN questions q ON q.exam_id = e.id
       LEFT JOIN results   r ON r.exam_id = e.id AND r.student_id = $1
       WHERE e.is_published = TRUE
         AND e.ends_at > NOW()
       GROUP BY e.id, r.id, r.submitted_at
       ORDER BY e.starts_at ASC`,
      [req.user.id]
    );
    return res.status(200).json({ exams: result.rows });
  } catch (err) {
    console.error('getAvailableExams error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ---------------------------------------------------------------
// POST /api/student/exams/:examId/start
// Start an exam — creates a result row (in progress)
// ---------------------------------------------------------------
const startExam = async (req, res) => {
  const { examId } = req.params;

  try {
    // Check exam exists and is published
    const examResult = await db.query(
      `SELECT id, title, duration_mins, ends_at FROM exams
       WHERE id = $1 AND is_published = TRUE AND ends_at > NOW()`,
      [examId]
    );
    if (examResult.rows.length === 0) {
      return res.status(404).json({ message: 'Exam not found or not available' });
    }

    // Check already attempted
    const existing = await db.query(
      'SELECT id, submitted_at FROM results WHERE exam_id = $1 AND student_id = $2',
      [examId, req.user.id]
    );
    if (existing.rows.length > 0 && existing.rows[0].submitted_at) {
      return res.status(409).json({ message: 'You have already submitted this exam' });
    }
    if (existing.rows.length > 0) {
      // Already started but not submitted — return existing result id WITH full exam+questions
      const questions = await db.query(
        `SELECT q.id, q.content, q.type, q.marks, q.order_no,
                JSON_AGG(
                  JSON_BUILD_OBJECT('id', o.id, 'content', o.content)
                  ORDER BY o.id
                ) AS options
         FROM questions q
         LEFT JOIN options o ON o.question_id = q.id
         WHERE q.exam_id = $1
         GROUP BY q.id
         ORDER BY q.order_no`,
        [examId]
      );
      return res.status(200).json({
        message: 'Resuming exam',
        result_id: existing.rows[0].id,
        exam: examResult.rows[0],
        questions: questions.rows,
      });
    }

    // Calculate total marks
    const marksResult = await db.query(
      'SELECT COALESCE(SUM(marks), 0)::int AS total FROM questions WHERE exam_id = $1',
      [examId]
    );
    const total_marks = marksResult.rows[0].total;

    // Create result row
    const result = await db.query(
      `INSERT INTO results (exam_id, student_id, total_marks)
       VALUES ($1, $2, $3) RETURNING id`,
      [examId, req.user.id, total_marks]
    );

    // Fetch questions + options (without revealing is_correct)
    const questions = await db.query(
      `SELECT q.id, q.content, q.type, q.marks, q.order_no,
              JSON_AGG(
                JSON_BUILD_OBJECT('id', o.id, 'content', o.content)
                ORDER BY o.id
              ) AS options
       FROM questions q
       LEFT JOIN options o ON o.question_id = q.id
       WHERE q.exam_id = $1
       GROUP BY q.id
       ORDER BY q.order_no`,
      [examId]
    );

    return res.status(201).json({
      message: 'Exam started',
      result_id: result.rows[0].id,
      exam: examResult.rows[0],
      questions: questions.rows,
    });
  } catch (err) {
    console.error('startExam error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ---------------------------------------------------------------
// POST /api/student/exams/:examId/submit
// Submit answers and auto-calculate score
// Body: { result_id, answers: [{ question_id, selected_option_id }] }
// ---------------------------------------------------------------
const submitExam = async (req, res) => {
  const { examId }                  = req.params;
  const { result_id, answers = [] } = req.body;

  if (!result_id) {
    return res.status(400).json({ message: 'result_id is required' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Verify result belongs to this student and is not yet submitted
    const resultCheck = await client.query(
      'SELECT id, submitted_at FROM results WHERE id = $1 AND student_id = $2 AND exam_id = $3',
      [result_id, req.user.id, examId]
    );
    if (resultCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Result not found' });
    }
    if (resultCheck.rows[0].submitted_at) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Exam already submitted' });
    }

    let score = 0;

    // Save each answer and check correctness
    for (const answer of answers) {
      const { question_id, selected_option_id } = answer;

      // Check if selected option is correct
      let is_correct = false;
      if (selected_option_id) {
        const optCheck = await client.query(
          'SELECT is_correct, (SELECT marks FROM questions WHERE id = $2) AS marks FROM options WHERE id = $1',
          [selected_option_id, question_id]
        );
        if (optCheck.rows.length > 0 && optCheck.rows[0].is_correct) {
          is_correct = true;
          score += Number(optCheck.rows[0].marks);
        }
      }

      // Upsert response
      await client.query(
        `INSERT INTO responses (result_id, question_id, selected_option_id, is_correct)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (result_id, question_id)
         DO UPDATE SET selected_option_id = $3, is_correct = $4`,
        [result_id, question_id, selected_option_id || null, is_correct]
      );
    }

    // Update result with final score and submitted_at
    await client.query(
      'UPDATE results SET score = $1, submitted_at = NOW() WHERE id = $2',
      [score, result_id]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      message: 'Exam submitted successfully',
      score,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('submitExam error:', err);
    return res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// ---------------------------------------------------------------
// GET /api/student/results
// Get all results for the logged-in student
// ---------------------------------------------------------------
const getMyResults = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.id, r.score, r.total_marks, r.submitted_at, r.created_at,
              e.title       AS exam_title,
              e.duration_mins,
              ROUND((r.score::numeric / NULLIF(r.total_marks, 0)) * 100, 1) AS percentage
       FROM results r
       INNER JOIN exams e ON e.id = r.exam_id
       WHERE r.student_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    return res.status(200).json({ results: result.rows });
  } catch (err) {
    console.error('getMyResults error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ---------------------------------------------------------------
// GET /api/student/results/:resultId
// Get detailed result with each question and the student's answer
// ---------------------------------------------------------------
const getMyResultById = async (req, res) => {
  const { resultId } = req.params;

  try {
    // Get result summary
    const resultRow = await db.query(
      `SELECT r.id, r.score, r.total_marks, r.submitted_at,
              e.title AS exam_title, e.duration_mins,
              ROUND((r.score::numeric / NULLIF(r.total_marks, 0)) * 100, 1) AS percentage
       FROM results r
       INNER JOIN exams e ON e.id = r.exam_id
       WHERE r.id = $1 AND r.student_id = $2`,
      [resultId, req.user.id]
    );
    if (resultRow.rows.length === 0) {
      return res.status(404).json({ message: 'Result not found' });
    }

    // Get each question with correct answer + student's answer
    const responses = await db.query(
      `SELECT q.id AS question_id, q.content AS question, q.marks,
              resp.selected_option_id,
              resp.is_correct,
              sel_opt.content  AS selected_answer,
              corr_opt.id      AS correct_option_id,
              corr_opt.content AS correct_answer
       FROM questions q
       LEFT JOIN responses resp  ON resp.question_id = q.id AND resp.result_id = $1
       LEFT JOIN options sel_opt  ON sel_opt.id = resp.selected_option_id
       LEFT JOIN options corr_opt ON corr_opt.question_id = q.id AND corr_opt.is_correct = TRUE
       WHERE q.exam_id = (SELECT exam_id FROM results WHERE id = $1)
       ORDER BY q.order_no`,
      [resultId]
    );

    return res.status(200).json({
      result:    resultRow.rows[0],
      responses: responses.rows,
    });
  } catch (err) {
    console.error('getMyResultById error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAvailableExams,
  startExam,
  submitExam,
  getMyResults,
  getMyResultById,
};