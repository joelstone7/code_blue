const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Rutas para docentes
router.get('/teacher/my-courses', auth, roleCheck('docente'), courseController.getTeacherCourses);

// Rutas para estudiantes
router.get('/student/my-courses', auth, roleCheck('estudiante'), courseController.getStudentCourses);

// Rutas para administradores
router.get('/', auth, roleCheck('administrador'), courseController.getAllCourses);
router.get('/:id', auth, courseController.getCourseById);
router.post('/', auth, roleCheck('administrador'), courseController.createCourse);
router.put('/:id', auth, roleCheck('administrador'), courseController.updateCourse);
router.delete('/:id', auth, roleCheck('administrador'), courseController.deleteCourse);

// Asignación de docentes y estudiantes (solo administrador)
router.post('/assign-teacher', auth, roleCheck('administrador'), courseController.assignTeacher);
router.post('/remove-teacher', auth, roleCheck('administrador'), courseController.removeTeacher);
router.post('/enroll-student', auth, roleCheck('administrador'), courseController.enrollStudent);
router.post('/remove-student', auth, roleCheck('administrador'), courseController.removeStudent);

module.exports = router;