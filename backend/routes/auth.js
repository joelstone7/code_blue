const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Contraseña requerida')
], authController.login);

// Obtener perfil del usuario autenticado
router.get('/profile', auth, authController.getProfile);

// Cambiar contraseña
router.put('/change-password', auth, authController.changePassword);

module.exports = router;