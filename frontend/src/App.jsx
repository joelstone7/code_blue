import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/common/PrivateRoute';
import Login from './components/Login';

// Admin Components
import AdminDashboard from './components/admin/AdminDashboard';
import UserManagement from './components/admin/UserManagement';
import CourseManagement from './components/admin/CourseManagement';
import Statistics from './components/admin/Statistics';

// Teacher Components
import TeacherDashboard from './components/teacher/TeacherDashboard';
import CreateCase from './components/teacher/CreateCase';
import MyCases from './components/teacher/MyCases';
import CaseDetails from './components/teacher/CaseDetails'; // 🆕 NUEVO
import TeacherCourses from './components/teacher/TeacherCourses';
import ReviewSubmissions from './components/teacher/ReviewSubmissions';

// Student Components
import StudentDashboard from './components/student/StudentDashboard';
import CourseCases from './components/student/CourseCases';
import SolveCase from './components/student/SolveCase';
import ViewFeedback from './components/student/ViewFeedback';

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Ruta pública */}
          <Route path="/login" element={<Login />} />
          
          {/* Redirección raíz al login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* ========== Rutas del Administrador ========== */}
          <Route
            path="/admin/dashboard"
            element={
              <PrivateRoute allowedRoles={['administrador']}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <PrivateRoute allowedRoles={['administrador']}>
                <UserManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/courses"
            element={
              <PrivateRoute allowedRoles={['administrador']}>
                <CourseManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/statistics"
            element={
              <PrivateRoute allowedRoles={['administrador']}>
                <Statistics />
              </PrivateRoute>
            }
          />

          {/* ========== Rutas del Docente ========== */}
          <Route
            path="/teacher/dashboard"
            element={
              <PrivateRoute allowedRoles={['docente']}>
                <TeacherDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/create-case"
            element={
              <PrivateRoute allowedRoles={['docente']}>
                <CreateCase />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/my-cases"
            element={
              <PrivateRoute allowedRoles={['docente']}>
                <MyCases />
              </PrivateRoute>
            }
          />
          {/* 🆕 NUEVA RUTA: Ver/Editar Detalles del Caso */}
          <Route
            path="/teacher/case/:id"
            element={
              <PrivateRoute allowedRoles={['docente']}>
                <CaseDetails />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/courses"
            element={
              <PrivateRoute allowedRoles={['docente']}>
                <TeacherCourses />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/review"
            element={
              <PrivateRoute allowedRoles={['docente']}>
                <ReviewSubmissions />
              </PrivateRoute>
            }
          />

          {/* ========== Rutas del Estudiante ========== */}
          <Route
            path="/student/dashboard"
            element={
              <PrivateRoute allowedRoles={['estudiante']}>
                <StudentDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/student/course/:courseId"
            element={
              <PrivateRoute allowedRoles={['estudiante']}>
                <CourseCases />
              </PrivateRoute>
            }
          />
          <Route
            path="/student/solve/:assignmentId"
            element={
              <PrivateRoute allowedRoles={['estudiante']}>
                <SolveCase />
              </PrivateRoute>
            }
          />
          <Route
            path="/student/feedback/:assignmentId"
            element={
              <PrivateRoute allowedRoles={['estudiante']}>
                <ViewFeedback />
              </PrivateRoute>
            }
          />

          {/* Ruta para acceso no autorizado */}
          <Route
            path="/unauthorized"
            element={
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                textAlign: 'center'
              }}>
                <h1>🚫 Acceso No Autorizado</h1>
                <p>No tienes permisos para acceder a esta página</p>
                <button 
                  onClick={() => window.history.back()}
                  style={{ marginTop: '20px' }}
                  className="btn btn-primary"
                >
                  Volver
                </button>
              </div>
            }
          />

          {/* Ruta 404 */}
          <Route
            path="*"
            element={
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                textAlign: 'center'
              }}>
                <h1>404 - Página No Encontrada</h1>
                <p>La página que buscas no existe</p>
                <button 
                  onClick={() => window.location.href = '/login'}
                  style={{ marginTop: '20px' }}
                  className="btn btn-primary"
                >
                  Ir al Inicio
                </button>
              </div>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;