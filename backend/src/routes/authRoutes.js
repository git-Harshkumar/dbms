const express = require('express');
const router  = express.Router();

const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Helpful messages when someone opens the endpoint in a browser (GET).
router.get('/register', (req, res) => {
  return res.status(405).json({ message: 'Method Not Allowed. Use POST /api/auth/register' });
});
router.get('/login', (req, res) => {
  return res.status(405).json({ message: 'Method Not Allowed. Use POST /api/auth/login' });
});

router.post('/register', register);
router.post('/login',    login);
router.get ('/me',       protect, getMe);   // protected route example

module.exports = router;