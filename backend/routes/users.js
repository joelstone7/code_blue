const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Todas las rutas requieren autenticación de administrador
router.use(auth, roleCheck('administrador'));

// CRUD de usuarios
router.get('/', userController.getAllUsers);
router.get('/teachers', userController.getTeachers);
router.get('/students', userController.getStudents);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;