-- ============================================================
-- Online Examination System -- Full Database Setup Script
-- Run: psql -U postgres -f setup.sql
-- ============================================================

-- 1. Create the database (run this from a separate connection if DB doesn't exist yet)
-- If exam_system already exists this will error; that's fine.
CREATE DATABASE exam_system;

-- Switch into exam_system database
\c exam_system;

-- ============================================================
-- 2. Drop existing tables (safe re-run)
-- ============================================================
DROP TABLE IF EXISTS responses  CASCADE;
DROP TABLE IF EXISTS results    CASCADE;
DROP TABLE IF EXISTS options    CASCADE;
DROP TABLE IF EXISTS questions  CASCADE;
DROP TABLE IF EXISTS exams      CASCADE;
DROP TABLE IF EXISTS users      CASCADE;

-- ============================================================
-- 3. Create tables
-- ============================================================

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

-- ============================================================
-- 4. Useful indexes
-- ============================================================
CREATE INDEX idx_exams_created_by   ON exams(created_by);
CREATE INDEX idx_questions_exam_id  ON questions(exam_id);
CREATE INDEX idx_options_question   ON options(question_id);
CREATE INDEX idx_results_exam       ON results(exam_id);
CREATE INDEX idx_results_student    ON results(student_id);
CREATE INDEX idx_responses_result   ON responses(result_id);

-- Done!
SELECT 'Database setup complete! Tables: users, exams, questions, options, results, responses' AS status;
