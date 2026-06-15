const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Controladores separados por rol ← ACTUALIZADO
const adminCourseController   = require('../controllers/admin/courseController');
const teacherCourseController = require('../controllers/teacher/courseController');
const studentCourseController = require('../controllers/student/courseController');

// ── Docente ──────────────────────────────────────────────────────────────────
router.get('/teacher/my-courses', auth, roleCheck('docente'), teacherCourseController.getTeacherCourses);

// ── Estudiante ────────────────────────────────────────────────────────────────
router.get('/student/my-courses', auth, roleCheck('estudiante'), studentCourseController.getStudentCourses);

// ── Administrador ─────────────────────────────────────────────────────────────
router.get('/',    auth, roleCheck('administrador'), adminCourseController.getAllCourses);
router.post('/',   auth, roleCheck('administrador'), adminCourseController.createCourse);
router.put('/:id', auth, roleCheck('administrador'), adminCourseController.updateCourse);
router.delete('/:id', auth, roleCheck('administrador'), adminCourseController.deleteCourse);

// Asignación de docentes y estudiantes (solo administrador)
router.post('/assign-teacher',  auth, roleCheck('administrador'), adminCourseController.assignTeacher);
router.post('/remove-teacher',  auth, roleCheck('administrador'), adminCourseController.removeTeacher);
router.post('/enroll-student',  auth, roleCheck('administrador'), adminCourseController.enrollStudent);
router.post('/remove-student',  auth, roleCheck('administrador'), adminCourseController.removeStudent);

// ── Compartido ────────────────────────────────────────────────────────────────
router.get('/:id', auth, adminCourseController.getCourseById);

module.exports = router;