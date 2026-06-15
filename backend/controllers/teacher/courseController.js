const { sequelize } = require('../../config/database');

// Obtener cursos del docente autenticado
exports.getTeacherCourses = async (req, res) => {
  try {
    const [courses] = await sequelize.query(`
      SELECT c.*, 
        COUNT(DISTINCT ce.estudiante_id) as totalEstudiantes
      FROM cursos c
      INNER JOIN curso_docente cd ON c.id = cd.curso_id
      LEFT JOIN curso_estudiante ce ON c.id = ce.curso_id
      WHERE cd.docente_id = ? AND c.activo = true
      GROUP BY c.id
      ORDER BY c.fecha_creacion DESC
    `, { replacements: [req.user.id] });

    res.json({ courses });
  } catch (error) {
    console.error('Error al obtener cursos del docente:', error);
    res.status(500).json({ error: 'Error al obtener cursos' });
  }
};

module.exports = exports;