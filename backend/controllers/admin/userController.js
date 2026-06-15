const User = require('../../models/User');
const { Op } = require('sequelize');

// Obtener todos los usuarios
exports.getAllUsers = async (req, res) => {
  try {
    const { rol, activo, search } = req.query;

    const where = {};
    if (rol) where.rol = rol;
    if (activo !== undefined) where.activo = activo === 'true';
    if (search) {
      where[Op.or] = [
        { nombre: { [Op.like]: `%${search}%` } },
        { apellido: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const users = await User.findAll({
      where,
      order: [['fechaCreacion', 'DESC']]
    });

    res.json({ users });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

// Obtener usuario por ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

// Crear usuario
exports.createUser = async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol } = req.body;

    if (!nombre || !apellido || !email || !password || !rol) {
      return res.status(400).json({
        error: 'Todos los campos son requeridos'
      });
    }

    if (!email.endsWith('@unifranz.edu.bo')) {
      return res.status(400).json({
        error: 'Solo se permiten correos institucionales @unifranz.edu.bo'
      });
    }

    const rolesValidos = ['administrador', 'docente', 'estudiante'];
    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({
        error: 'Rol inválido'
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        error: 'El correo ya está registrado'
      });
    }

    const user = await User.create({ nombre, apellido, email, password, rol });

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

// Actualizar usuario
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, rol, activo } = req.body;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (email && email !== user.email) {
      if (!email.endsWith('@unifranz.edu.bo')) {
        return res.status(400).json({
          error: 'Solo se permiten correos institucionales @unifranz.edu.bo'
        });
      }

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          error: 'El correo ya está registrado'
        });
      }
    }

    await user.update({
      nombre: nombre || user.nombre,
      apellido: apellido || user.apellido,
      email: email || user.email,
      rol: rol || user.rol,
      activo: activo !== undefined ? activo : user.activo
    });

    res.json({
      message: 'Usuario actualizado exitosamente',
      user
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

// Eliminar usuario (soft delete)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await user.update({ activo: false });

    res.json({ message: 'Usuario desactivado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};

// Obtener docentes activos
exports.getTeachers = async (req, res) => {
  try {
    const teachers = await User.findAll({
      where: { rol: 'docente', activo: true },
      order: [['apellido', 'ASC']]
    });

    res.json({ teachers });
  } catch (error) {
    console.error('Error al obtener docentes:', error);
    res.status(500).json({ error: 'Error al obtener docentes' });
  }
};

// Obtener estudiantes activos
exports.getStudents = async (req, res) => {
  try {
    const students = await User.findAll({
      where: { rol: 'estudiante', activo: true },
      order: [['apellido', 'ASC']]
    });

    res.json({ students });
  } catch (error) {
    console.error('Error al obtener estudiantes:', error);
    res.status(500).json({ error: 'Error al obtener estudiantes' });
  }
};

module.exports = exports;