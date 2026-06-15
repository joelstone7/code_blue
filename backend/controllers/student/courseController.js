const { sequelize } = require('../../config/database');

// Obtener cursos del estudiante autenticado
exports.getStudentCourses = async (req, res) => {
  try {
    const [courses] = await sequelize.query(`
      SELECT c.*
      FROM cursos c
      INNER JOIN curso_estudiante ce ON c.id = ce.curso_id
      WHERE ce.estudiante_id = ? AND c.activo = true
      ORDER BY c.fecha_creacion DESC
    `, { replacements: [req.user.id] });

    res.json({ courses });
  } catch (error) {
    console.error('Error al obtener cursos del estudiante:', error);
    res.status(500).json({ error: 'Error al obtener cursos' });
  }
};

module.exports = exports;