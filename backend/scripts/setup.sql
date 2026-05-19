-- ============================================================
-- Online Examination System -- Render Cloud Setup Script
-- ============================================================

-- Drop existing tables (safe re-run)
DROP TABLE IF EXISTS responses  CASCADE;
DROP TABLE IF EXISTS results    CASCADE;
DROP TABLE IF EXISTS options    CASCADE;
DROP TABLE IF EXISTS questions  CASCADE;
DROP TABLE IF EXISTS exams      CASCADE;
DROP TABLE IF EXISTS users      CASCADE;

-- Create tables

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT         NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE exams (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  duration_mins INT          NOT NULL,
  starts_at     TIMESTAMPTZ  NOT NULL,
  ends_at       TIMESTAMPTZ  NOT NULL,
  is_published  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_by    INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE questions (
  id       SERIAL PRIMARY KEY,
  exam_id  INT    NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  content  TEXT   NOT NULL,
  type     VARCHAR(20) NOT NULL DEFAULT 'mcq' CHECK (type IN ('mcq')),
  marks    INT    NOT NULL DEFAULT 1,
  order_no INT    NOT NULL DEFAULT 0
);

CREATE TABLE options (
  id          SERIAL PRIMARY KEY,
  question_id INT     NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  content     TEXT    NOT NULL,
  is_correct  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE results (
  id          SERIAL PRIMARY KEY,
  exam_id     INT  NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id  INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score       INT  NOT NULL DEFAULT 0,
  total_marks INT  NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (exam_id, student_id)
);

CREATE TABLE responses (
  id                 SERIAL PRIMARY KEY,
  result_id          INT  NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  question_id        INT  NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option_id INT  REFERENCES options(id),
  is_correct         BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (result_id, question_id)
);

-- Indexes
CREATE INDEX idx_exams_created_by   ON exams(created_by);
CREATE INDEX idx_questions_exam_id  ON questions(exam_id);
CREATE INDEX idx_options_question   ON options(question_id);
CREATE INDEX idx_results_exam       ON results(exam_id);
CREATE INDEX idx_results_student    ON results(student_id);
CREATE INDEX idx_responses_result   ON responses(result_id);


-- ============================================================
-- TRIGGERS
-- ============================================================

-- ------------------------------------------------------------
-- TRIGGER 1: Auto-mark a response as correct/incorrect
--   Fires BEFORE INSERT OR UPDATE on responses.
--   Sets is_correct = TRUE when the selected option's
--   is_correct flag is TRUE, otherwise FALSE.
--   Table behaviour is unchanged — is_correct is still stored
--   in the responses row, just populated automatically.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_fn_mark_response_correct()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.selected_option_id IS NULL THEN
    NEW.is_correct := FALSE;
  ELSE
    SELECT o.is_correct
      INTO NEW.is_correct
      FROM options o
     WHERE o.id = NEW.selected_option_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mark_response_correct
BEFORE INSERT OR UPDATE ON responses
FOR EACH ROW
EXECUTE FUNCTION trg_fn_mark_response_correct();


-- ------------------------------------------------------------
-- TRIGGER 2: Auto-update result score after every response
--   Fires AFTER INSERT OR UPDATE on responses.
--   Recomputes score and total_marks for the parent result row
--   by summing marks of all questions in that result.
--   Keeps results.score always in sync without any manual call.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_fn_sync_result_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_score       INT;
  v_total_marks INT;
BEGIN
  -- Sum marks for correct responses
  SELECT COALESCE(SUM(q.marks), 0)
    INTO v_score
    FROM responses r
    JOIN questions q ON q.id = r.question_id
   WHERE r.result_id  = NEW.result_id
     AND r.is_correct = TRUE;

  -- Sum total possible marks for this result's exam
  SELECT COALESCE(SUM(q.marks), 0)
    INTO v_total_marks
    FROM results  res
    JOIN questions q ON q.exam_id = res.exam_id
   WHERE res.id = NEW.result_id;

  UPDATE results
     SET score       = v_score,
         total_marks = v_total_marks
   WHERE id = NEW.result_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_result_score
AFTER INSERT OR UPDATE ON responses
FOR EACH ROW
EXECUTE FUNCTION trg_fn_sync_result_score();


-- ------------------------------------------------------------
-- TRIGGER 3: Prevent responses after exam window closes
--   Fires BEFORE INSERT on responses.
--   Raises an exception if the exam's ends_at has passed,
--   stopping late submissions at the database level.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_fn_block_late_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_ends_at TIMESTAMPTZ;
BEGIN
  SELECT e.ends_at
    INTO v_ends_at
    FROM results  res
    JOIN exams    e   ON e.id = res.exam_id
   WHERE res.id = NEW.result_id;

  IF NOW() > v_ends_at THEN
    RAISE EXCEPTION
      'Exam window has closed. Responses are no longer accepted (ended at %).', v_ends_at;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_block_late_submission
BEFORE INSERT ON responses
FOR EACH ROW
EXECUTE FUNCTION trg_fn_block_late_submission();


-- ============================================================
-- STORED PROCEDURES
-- ============================================================

-- ------------------------------------------------------------
-- PROCEDURE 1: sp_register_student
--   Creates a new user with role = 'student'.
--   Parameters: name, email, password_hash
--   Usage: CALL sp_register_student('Alice', 'a@x.com', 'hashed_pw');
-- ------------------------------------------------------------

CREATE OR REPLACE PROCEDURE sp_register_student(
  p_name          VARCHAR,
  p_email         VARCHAR,
  p_password_hash TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO users (name, email, password_hash, role)
  VALUES (p_name, p_email, p_password_hash, 'student');

  RAISE NOTICE 'Student "%" registered successfully.', p_name;
END;
$$;


-- ------------------------------------------------------------
-- PROCEDURE 2: sp_submit_exam
--   Marks a result row as submitted (sets submitted_at = NOW()).
--   Raises an error if the result does not exist or is already
--   submitted, keeping business logic close to the data.
--   Usage: CALL sp_submit_exam(result_id);
-- ------------------------------------------------------------

CREATE OR REPLACE PROCEDURE sp_submit_exam(
  p_result_id INT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_submitted_at TIMESTAMPTZ;
BEGIN
  SELECT submitted_at
    INTO v_submitted_at
    FROM results
   WHERE id = p_result_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Result ID % does not exist.', p_result_id;
  END IF;

  IF v_submitted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Exam already submitted at %.', v_submitted_at;
  END IF;

  UPDATE results
     SET submitted_at = NOW()
   WHERE id = p_result_id;

  RAISE NOTICE 'Exam result % submitted at %.', p_result_id, NOW();
END;
$$;


-- ------------------------------------------------------------
-- PROCEDURE 3: sp_publish_exam
--   Flips is_published = TRUE for a given exam.
--   Validates that the exam has at least one question and each
--   question has at least one correct option before publishing.
--   Usage: CALL sp_publish_exam(exam_id);
-- ------------------------------------------------------------

CREATE OR REPLACE PROCEDURE sp_publish_exam(
  p_exam_id INT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_question_count  INT;
  v_invalid_count   INT;
BEGIN
  -- Must have at least 1 question
  SELECT COUNT(*) INTO v_question_count
    FROM questions
   WHERE exam_id = p_exam_id;

  IF v_question_count = 0 THEN
    RAISE EXCEPTION 'Cannot publish exam %: no questions found.', p_exam_id;
  END IF;

  -- Every question must have at least one correct option
  SELECT COUNT(*) INTO v_invalid_count
    FROM questions q
   WHERE q.exam_id = p_exam_id
     AND NOT EXISTS (
           SELECT 1 FROM options o
            WHERE o.question_id = q.id
              AND o.is_correct  = TRUE
         );

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION
      'Cannot publish exam %: % question(s) have no correct option set.',
      p_exam_id, v_invalid_count;
  END IF;

  UPDATE exams
     SET is_published = TRUE
   WHERE id = p_exam_id;

  RAISE NOTICE 'Exam % published successfully.', p_exam_id;
END;
$$;


-- ============================================================
-- FUNCTIONS
-- ============================================================

-- ------------------------------------------------------------
-- FUNCTION 1: fn_get_student_score
--   Returns a simple summary record (score, total_marks,
--   percentage) for a student's attempt at an exam.
--   Usage: SELECT * FROM fn_get_student_score(student_id, exam_id);
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_get_student_score(
  p_student_id INT,
  p_exam_id    INT
)
RETURNS TABLE (
  score       INT,
  total_marks INT,
  percentage  NUMERIC(5,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.score,
    r.total_marks,
    CASE
      WHEN r.total_marks = 0 THEN 0.00
      ELSE ROUND((r.score::NUMERIC / r.total_marks) * 100, 2)
    END AS percentage
  FROM results r
  WHERE r.student_id = p_student_id
    AND r.exam_id    = p_exam_id;
END;
$$;


-- ------------------------------------------------------------
-- FUNCTION 2: fn_exam_total_marks
--   Returns the maximum possible marks for an exam by summing
--   marks across all its questions.
--   Usage: SELECT fn_exam_total_marks(exam_id);
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_exam_total_marks(p_exam_id INT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_total INT;
BEGIN
  SELECT COALESCE(SUM(marks), 0)
    INTO v_total
    FROM questions
   WHERE exam_id = p_exam_id;

  RETURN v_total;
END;
$$;


-- ============================================================
-- CURSOR-BASED FUNCTIONS
-- ============================================================

-- ------------------------------------------------------------
-- CURSOR FUNCTION 1: fn_exam_leaderboard
--   Uses an explicit cursor to walk through all submitted
--   results for an exam, ordered by score DESC, and returns
--   a ranked leaderboard table.
--   Usage: SELECT * FROM fn_exam_leaderboard(exam_id);
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_exam_leaderboard(p_exam_id INT)
RETURNS TABLE (
  rank        BIGINT,
  student_id  INT,
  student_name VARCHAR(150),
  score       INT,
  total_marks INT,
  percentage  NUMERIC(5,2),
  submitted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
  -- Explicit cursor over submitted results for this exam
  cur_results CURSOR FOR
    SELECT
      r.student_id,
      u.name           AS student_name,
      r.score,
      r.total_marks,
      r.submitted_at
    FROM results r
    JOIN users   u ON u.id = r.student_id
   WHERE r.exam_id      = p_exam_id
     AND r.submitted_at IS NOT NULL
   ORDER BY r.score DESC, r.submitted_at ASC;

  rec         cur_results%ROWTYPE;
  v_rank      BIGINT := 0;
BEGIN
  OPEN cur_results;

  LOOP
    FETCH cur_results INTO rec;
    EXIT WHEN NOT FOUND;

    v_rank       := v_rank + 1;
    rank         := v_rank;
    student_id   := rec.student_id;
    student_name := rec.student_name;
    score        := rec.score;
    total_marks  := rec.total_marks;
    percentage   :=
      CASE WHEN rec.total_marks = 0 THEN 0.00
           ELSE ROUND((rec.score::NUMERIC / rec.total_marks) * 100, 2)
      END;
    submitted_at := rec.submitted_at;

    RETURN NEXT;
  END LOOP;

  CLOSE cur_results;
END;
$$;


-- ------------------------------------------------------------
-- CURSOR FUNCTION 2: fn_student_response_report
--   Uses an explicit cursor to iterate over every response
--   a student gave in a specific exam result, returning a
--   detailed question-by-question breakdown.
--   Usage: SELECT * FROM fn_student_response_report(result_id);
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_student_response_report(p_result_id INT)
RETURNS TABLE (
  question_no        INT,
  question_content   TEXT,
  marks              INT,
  selected_answer    TEXT,
  correct_answer     TEXT,
  is_correct         BOOLEAN,
  marks_awarded      INT
)
LANGUAGE plpgsql
AS $$
DECLARE
  -- Cursor over all questions for this result's exam
  cur_questions CURSOR FOR
    SELECT
      q.id         AS question_id,
      q.order_no   AS question_no,
      q.content    AS question_content,
      q.marks
    FROM results   r
    JOIN questions q ON q.exam_id = r.exam_id
   WHERE r.id = p_result_id
   ORDER BY q.order_no;

  rec              cur_questions%ROWTYPE;
  v_resp           RECORD;
  v_correct_text   TEXT;
BEGIN
  OPEN cur_questions;

  LOOP
    FETCH cur_questions INTO rec;
    EXIT WHEN NOT FOUND;

    -- Fetch the student's response for this question
    SELECT
      rsp.is_correct,
      o.content AS selected_content
    INTO v_resp
    FROM responses rsp
    LEFT JOIN options o ON o.id = rsp.selected_option_id
    WHERE rsp.result_id   = p_result_id
      AND rsp.question_id = rec.question_id;

    -- Fetch the correct option text for reference
    SELECT o.content
      INTO v_correct_text
      FROM options o
     WHERE o.question_id = rec.question_id
       AND o.is_correct  = TRUE
     LIMIT 1;

    question_no      := rec.question_no;
    question_content := rec.question_content;
    marks            := rec.marks;
    selected_answer  := COALESCE(v_resp.selected_content, '(no answer)');
    correct_answer   := COALESCE(v_correct_text, '(not set)');
    is_correct       := COALESCE(v_resp.is_correct, FALSE);
    marks_awarded    := CASE WHEN COALESCE(v_resp.is_correct, FALSE) THEN rec.marks ELSE 0 END;

    RETURN NEXT;
  END LOOP;

  CLOSE cur_questions;
END;
$$;


SELECT 'Database setup complete! Tables, Triggers, Procedures, Functions, and Cursors all installed.' AS status;