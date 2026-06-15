const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Controladores separados por rol ← ACTUALIZADO
const adminStatsController   = require('../controllers/admin/statsController');
const teacherStatsController = require('../controllers/teacher/statsController');
const studentStatsController = require('../controllers/student/statsController');

// Estadísticas por rol
router.get('/admin',   auth, roleCheck('administrador'), adminStatsController.getGlobalStats);
router.get('/teacher', auth, roleCheck('docente'),       teacherStatsController.getTeacherStats);
router.get('/student', auth, roleCheck('estudiante'),    studentStatsController.getStudentStats);

module.exports = router;