import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './component/ProtectedRoutes';

// Auth pages
import Login    from './pages/auth/Login';
import Register from './pages/auth/Register';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import CreateExam     from './pages/admin/CreateExam';
import ExamResults    from './pages/admin/ExamResults';

// Student pages
import StudentDashboard from './pages/student/Dashboard';
import AttemptExam      from './pages/student/AttemptExam';
import Results          from './pages/student/Results';
import ResultDetail     from './pages/student/ResultDetail';

// Redirect logged-in users to their dashboard
const HomeRedirect = () => {
  const { isLoggedIn, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <Navigate to={isAdmin ? '/admin' : '/student'} replace />;
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/"         element={<HomeRedirect />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Admin only */}
          <Route path="/admin" element={
            <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
          }/>
          <Route path="/admin/exams/create" element={
            <ProtectedRoute role="admin"><CreateExam /></ProtectedRoute>
          }/>
          <Route path="/admin/exams/:examId/results" element={
            <ProtectedRoute role="admin"><ExamResults /></ProtectedRoute>
          }/>

          {/* Student only */}
          <Route path="/student" element={
            <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>
          }/>
          <Route path="/student/exams/:examId" element={
            <ProtectedRoute role="student"><AttemptExam /></ProtectedRoute>
          }/>
          <Route path="/student/results" element={
            <ProtectedRoute role="student"><Results /></ProtectedRoute>
          }/>
          <Route path="/student/results/:resultId" element={
            <ProtectedRoute role="student"><ResultDetail /></ProtectedRoute>
          }/>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;