import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para añadir token a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── AUTH ──────────────────────────────────────────────────────────────────────
export const login = (credentials) => api.post('/auth/login', credentials);
export const getProfile = () => api.get('/auth/profile');
export const changePassword = (passwords) => api.put('/auth/change-password', passwords);

// ── USERS ─────────────────────────────────────────────────────────────────────
export const getUsers = (params) => api.get('/users', { params });
export const getUserById = (id) => api.get(`/users/${id}`);
export const createUser = (userData) => api.post('/users', userData);
export const updateUser = (id, userData) => api.put(`/users/${id}`, userData);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const getTeachers = () => api.get('/users/teachers');
export const getStudents = () => api.get('/users/students');

// ── COURSES ───────────────────────────────────────────────────────────────────
export const getCourses = (params) => api.get('/courses', { params });
export const getCourseById = (id) => api.get(`/courses/${id}`);
export const createCourse = (courseData) => api.post('/courses', courseData);
export const updateCourse = (id, courseData) => api.put(`/courses/${id}`, courseData);
export const deleteCourse = (id) => api.delete(`/courses/${id}`);
export const assignTeacher = (data) => api.post('/courses/assign-teacher', data);
export const removeTeacher = (data) => api.post('/courses/remove-teacher', data);
export const enrollStudent = (data) => api.post('/courses/enroll-student', data);
export const removeStudent = (data) => api.post('/courses/remove-student', data);
export const getTeacherCourses = () => api.get('/courses/teacher/my-courses');
export const getStudentCourses = () => api.get('/courses/student/my-courses');

// ── CASES ─────────────────────────────────────────────────────────────────────

// Docente — obtener todos sus casos
export const getTeacherCases = () => api.get('/cases/teacher/my-cases');

// Crear caso con fases — multipart por archivos por fase
export const createCase = (caseData) =>
  api.post('/cases', caseData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

// Actualizar información general del caso
export const updateCase = (id, caseData) => api.put(`/cases/${id}`, caseData);

// Actualizar una fase específica del caso
export const updatePhase = (caseId, phaseId, phaseData) =>
  api.put(`/cases/${caseId}/phases/${phaseId}`, phaseData);

// Eliminar caso
export const deleteCase = (id) => api.delete(`/cases/${id}`);

// Asignar caso a un curso
export const assignCase = (data) => api.post('/cases/assign', data);

// Obtener caso por ID — docente y estudiante
export const getCaseById = (id) => api.get(`/cases/${id}`);

// Estudiante — casos de un curso con progreso de fases
export const getCasesByCourse = (cursoId) => api.get(`/cases/course/${cursoId}`);

// Estudiante — contenido de una fase específica
export const getPhaseById = (asignacionId, numeroFase) =>
  api.get(`/cases/${asignacionId}/phase/${numeroFase}`);

// ── RESPONSES ─────────────────────────────────────────────────────────────────

// Estudiante — iniciar o retomar un caso
export const startCase = (data) => api.post('/responses/start', data);

// Estudiante — guardar respuesta de una fase
export const submitPhaseResponse = (data) => api.post('/responses/phase', data);

// Estudiante — envío final del caso (dispara análisis de IA)
export const submitFinalResponse = (data) =>
  api.post('/responses/submit-final', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

// Estudiante — estado actual del caso (sesión + fases + feedback)
export const getStudentResponse = (asignacionId) =>
  api.get(`/responses/assignment/${asignacionId}`);

// Estudiante — solicitar pista de una fase
export const requestHint = (data) => api.post('/responses/hint', data);

// Docente — respuestas de un caso asignado con detalle por fases
export const getCaseResponses = (asignacionId) =>
  api.get(`/responses/case/${asignacionId}/all`);

// Docente — detalle completo de una respuesta para calificar
export const getResponseDetail = (respuestaId) =>
  api.get(`/responses/detail/${respuestaId}`);

// Docente — calificar respuesta
export const gradeResponse = (data) => api.post('/responses/grade', data);

// Docente — respuestas pendientes de calificación
export const getPendingResponses = () => api.get('/responses/pending');

// ── STATS ─────────────────────────────────────────────────────────────────────
export const getAdminStats = () => api.get('/stats/admin');
export const getTeacherStats = () => api.get('/stats/teacher');
export const getStudentStats = () => api.get('/stats/student');

export default api;