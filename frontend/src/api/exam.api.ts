import API from './axios';

export interface QuestionPayload {
  content: string;
  type?: 'mcq';
  marks?: number;
  order_no?: number;
  options: { content: string; is_correct: boolean }[];
}

export interface ExamPayload {
  title: string;
  description?: string;
  duration_mins: number;
  starts_at: string;
  ends_at: string;
}

export interface SubmitExamPayload {
  result_id: number;
  answers: { question_id: number; selected_option_id: number | null }[];
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export const createExam      = (data: ExamPayload)                          => API.post('/admin/exams', data);
export const getAllExams      = ()                                           => API.get('/admin/exams');
export const getExamById      = (examId: number | string)                   => API.get(`/admin/exams/${examId}`);
export const togglePublish    = (examId: number | string)                   => API.patch(`/admin/exams/${examId}/publish`);
export const deleteExam       = (examId: number | string)                   => API.delete(`/admin/exams/${examId}`);
export const addQuestion      = (examId: number | string, data: QuestionPayload) => API.post(`/admin/exams/${examId}/questions`, data);
export const deleteQuestion   = (questionId: number | string)               => API.delete(`/admin/questions/${questionId}`);
export const getExamResults   = (examId: number | string)                   => API.get(`/admin/exams/${examId}/results`);

// ── Student ───────────────────────────────────────────────────────────────────
export const getAvailableExams = ()                                         => API.get('/student/exams');
export const startExam         = (examId: number | string)                  => API.post(`/student/exams/${examId}/start`);
export const submitExam        = (examId: number | string, data: SubmitExamPayload) => API.post(`/student/exams/${examId}/submit`, data);
export const getMyResults      = ()                                         => API.get('/student/exams/results');
export const getMyResultById   = (resultId: number | string)                => API.get(`/student/exams/results/${resultId}`);
