const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const upload = require('../config/multer');

// Rutas para docentes
router.get('/teacher/my-cases', auth, roleCheck('docente'), caseController.getTeacherCases);
router.post('/', auth, roleCheck('docente'), upload.array('recursos', 10), caseController.createCase);
router.put('/:id', auth, roleCheck('docente'), caseController.updateCase);
router.delete('/:id', auth, roleCheck('docente'), caseController.deleteCase);
router.post('/assign', auth, roleCheck('docente'), caseController.assignCaseToCourse);

// Rutas para estudiantes
router.get('/course/:cursoId', auth, roleCheck('estudiante'), caseController.getCasesByCourse);

// Rutas compartidas (docentes y estudiantes)
router.get('/:id', auth, caseController.getCaseById);

module.exports = router;