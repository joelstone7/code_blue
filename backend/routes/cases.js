const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const upload = require('../config/multer');

// Controladores separados por rol
const teacherCaseController = require('../controllers/teacher/caseController');
const studentCaseController = require('../controllers/student/caseController');

// ── Docente ───────────────────────────────────────────────────────────────────

// Obtener todos los casos del docente
router.get(
  '/teacher/my-cases',
  auth, roleCheck('docente'),
  teacherCaseController.getTeacherCases
);

// Crear caso con fases
// Acepta múltiples archivos con fieldnames: recursos_general, recursos_fase_0, recursos_fase_1...
router.post(
  '/',
  auth, roleCheck('docente'),
  upload.any(),
  teacherCaseController.createCase
);

// Actualizar información general del caso
router.put(
  '/:id',
  auth, roleCheck('docente'),
  teacherCaseController.updateCase
);

// Actualizar una fase específica del caso
router.put(
  '/:caseId/phases/:phaseId',
  auth, roleCheck('docente'),
  teacherCaseController.updatePhase
);

// Eliminar caso (soft delete)
router.delete(
  '/:id',
  auth, roleCheck('docente'),
  teacherCaseController.deleteCase
);

// Asignar caso a un curso
router.post(
  '/assign',
  auth, roleCheck('docente'),
  teacherCaseController.assignCaseToCourse
);

// ── Estudiante ────────────────────────────────────────────────────────────────

// Obtener todos los casos de un curso con progreso
router.get(
  '/course/:cursoId',
  auth, roleCheck('estudiante'),
  studentCaseController.getCasesByCourse
);

// Obtener contenido de una fase específica
// Solo accesible si el estudiante ya llegó a esa fase
router.get(
  '/:asignacionId/phase/:numeroFase',
  auth, roleCheck('estudiante'),
  studentCaseController.getPhaseById
);

// ── Compartido ────────────────────────────────────────────────────────────────
// Obtener caso por ID — cada controlador valida permisos internamente
router.get(
  '/:id',
  auth,
  (req, res, next) => {
    if (req.user.rol === 'docente')    return teacherCaseController.getCaseById(req, res, next);
    if (req.user.rol === 'estudiante') return studentCaseController.getCaseById(req, res, next);
    res.status(403).json({ error: 'Rol no autorizado' });
  }
);

module.exports = router;