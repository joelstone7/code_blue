const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const upload = require('../config/multer');

// Controladores separados por rol
const teacherResponseController = require('../controllers/teacher/responseController');
const studentResponseController = require('../controllers/student/responseController');

// ── Estudiante ────────────────────────────────────────────────────────────────

// Iniciar o retomar un caso — crea la sesión del estudiante
// Se llama cuando el estudiante entra al caso por primera vez
router.post(
  '/start',
  auth, roleCheck('estudiante'),
  studentResponseController.startCase
);

// Guardar respuesta de una fase específica
// Se llama cada vez que el estudiante completa una fase y avanza
router.post(
  '/phase',
  auth, roleCheck('estudiante'),
  studentResponseController.submitPhaseResponse
);

// Envío final del caso completo
// Se llama cuando el estudiante completó todas las fases
// Dispara el análisis completo de la IA
router.post(
  '/submit-final',
  auth, roleCheck('estudiante'),
  upload.single('archivo'),
  studentResponseController.submitFinalResponse
);

// Obtener estado actual del caso para el estudiante
// Devuelve sesión + fases completadas + feedback si ya fue enviado
router.get(
  '/assignment/:asignacionId',
  auth, roleCheck('estudiante'),
  studentResponseController.getStudentResponse
);

// Solicitar pista de una fase
// Penaliza puntos al estudiante
router.post(
  '/hint',
  auth, roleCheck('estudiante'),
  studentResponseController.requestHint
);

// ── Docente ───────────────────────────────────────────────────────────────────

// Obtener todas las respuestas de un caso asignado con detalle por fases
router.get(
  '/case/:asignacionId/all',
  auth, roleCheck('docente'),
  teacherResponseController.getCaseResponses
);

// Obtener detalle completo de una respuesta específica para calificar
router.get(
  '/detail/:respuestaId',
  auth, roleCheck('docente'),
  teacherResponseController.getResponseDetail
);

// Calificar respuesta — agrega nota y comentarios del docente
// sobre la retroalimentación que ya generó la IA
router.post(
  '/grade',
  auth, roleCheck('docente'),
  teacherResponseController.gradeResponse
);

// Obtener respuestas pendientes de calificación del docente
router.get(
  '/pending',
  auth, roleCheck('docente'),
  teacherResponseController.getPendingResponses
);

module.exports = router;