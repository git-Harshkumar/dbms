const express = require('express');
const router = express.Router();

const { deleteQuestion } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);
router.delete('/:questionId', deleteQuestion);

module.exports = router;
