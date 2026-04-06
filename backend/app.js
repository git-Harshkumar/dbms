const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    const allowed = process.env.CLIENT_ORIGIN;
    if (allowed && origin === allowed.trim()) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/admin/exams', require('./src/routes/adminRoutes'));
app.use('/api/admin/questions', require('./src/routes/adminQuestionRoutes'));
app.use('/api/student/exams', require('./src/routes/studentRoutes'));

app.get('/', (req, res) => {
  res.json({ message: 'Exam System API is running 🚀' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
