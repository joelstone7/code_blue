const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Estadísticas por rol
router.get('/admin', auth, roleCheck('administrador'), statsController.getGlobalStats);
router.get('/teacher', auth, roleCheck('docente'), statsController.getTeacherStats);
router.get('/student', auth, roleCheck('estudiante'), statsController.getStudentStats);

module.exports = router;