const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { validationResult } = require('express-validator');

// Generar JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Login
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Verificar dominio institucional
    if (!email.endsWith('@unifranz.edu.bo')) {
      return res.status(400).json({
        error: 'Solo se permiten correos institucionales @unifranz.edu.bo'
      });
    }

    // Buscar usuario
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({
        error: 'Credenciales incorrectas'
      });
    }

    // Verificar si está activo
    if (!user.activo) {
      return res.status(403).json({
        error: 'Usuario inactivo. Contacta al administrador'
      });
    }

    // Comparar contraseña
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        error: 'Credenciales incorrectas'
      });
    }

    // Generar token
    const token = generateToken(user);

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        rol: user.rol
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

// Obtener perfil del usuario autenticado
exports.getProfile = async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

// Cambiar contraseña
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Se requiere contraseña actual y nueva'
      });
    }

    const user = await User.findByPk(req.user.id);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Contraseña actual incorrecta'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
};

module.exports = exports;