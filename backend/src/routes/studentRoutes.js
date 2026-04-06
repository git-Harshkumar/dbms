const express = require('express');
const router  = express.Router();

const {
  getAvailableExams,
  startExam,
  submitExam,
  getMyResults,
  getMyResultById,
} = require('../controllers/studentController');

const { protect, studentOnly } = require('../middleware/auth');

router.use(protect, studentOnly);

router.get ('/',                      getAvailableExams);
router.post('/:examId/start',         startExam);
router.post('/:examId/submit',        submitExam);
router.get ('/results',               getMyResults);
router.get ('/results/:resultId',     getMyResultById);

module.exports = router;