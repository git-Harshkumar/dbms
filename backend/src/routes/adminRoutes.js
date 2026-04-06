const express = require('express');
const router = express.Router();

const {
  createExam,
  getAllExams,
  getExamById,
  togglePublish,
  deleteExam,
  addQuestion,
  getExamResults,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

router.post('/', createExam);
router.get('/', getAllExams);
router.get('/:examId/results', getExamResults);
router.get('/:examId', getExamById);
router.patch('/:examId/publish', togglePublish);
router.delete('/:examId', deleteExam);
router.post('/:examId/questions', addQuestion);

module.exports = router;
