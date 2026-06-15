const { sequelize } = require('../../config/database');

// Estadísticas del docente autenticado
exports.getTeacherStats = async (req, res) => {
  try {
    const docenteId = req.user.id;

    console.log('📊 Obteniendo estadísticas para docente ID:', docenteId);

    // Cursos asignados al docente
    const [courses] = await sequelize.query(`
      SELECT COUNT(DISTINCT curso_id) as totalCursos
      FROM curso_docente
      WHERE docente_id = ?
    `, { replacements: [docenteId] });

    // Total de casos creados por el docente
    const [cases] = await sequelize.query(`
      SELECT COUNT(*) as totalCasos
      FROM casos_clinicos
      WHERE docente_id = ? AND activo = true
    `, { replacements: [docenteId] });

    // Entregas pendientes y completadas en los casos del docente
    const [submissions] = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT re.id) as totalEntregas,
        SUM(CASE WHEN re.estado = 'enviado' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN re.estado = 'calificado' THEN 1 ELSE 0 END) as calificadas
      FROM respuestas_estudiantes re
      INNER JOIN asignaciones_casos ac ON re.asignacion_id = ac.id
      INNER JOIN casos_clinicos cc ON ac.caso_id = cc.id
      WHERE cc.docente_id = ?
    `, { replacements: [docenteId] });

    // Promedio de notas en los casos del docente
    const [avgGrade] = await sequelize.query(`
      SELECT AVG(f.nota) as promedioNotas
      FROM retroalimentaciones f
      INNER JOIN respuestas_estudiantes re ON f.respuesta_id = re.id
      INNER JOIN asignaciones_casos ac ON re.asignacion_id = ac.id
      INNER JOIN casos_clinicos cc ON ac.caso_id = cc.id
      WHERE cc.docente_id = ?
    `, { replacements: [docenteId] });

    // Estudiantes únicos que han respondido
    const [students] = await sequelize.query(`
      SELECT COUNT(DISTINCT re.estudiante_id) as totalEstudiantes
      FROM respuestas_estudiantes re
      INNER JOIN asignaciones_casos ac ON re.asignacion_id = ac.id
      INNER JOIN casos_clinicos cc ON ac.caso_id = cc.id
      WHERE cc.docente_id = ?
    `, { replacements: [docenteId] });

    // Top 5 casos más asignados del docente
    const [topCases] = await sequelize.query(`
      SELECT 
        cc.titulo,
        COUNT(ac.id) as vecesAsignado,
        COUNT(DISTINCT re.id) as totalRespuestas
      FROM casos_clinicos cc
      LEFT JOIN asignaciones_casos ac ON cc.id = ac.caso_id
      LEFT JOIN respuestas_estudiantes re ON ac.id = re.asignacion_id
      WHERE cc.docente_id = ? AND cc.activo = true
      GROUP BY cc.id, cc.titulo
      ORDER BY vecesAsignado DESC
      LIMIT 5
    `, { replacements: [docenteId] });

    const responseData = {
      courses: courses[0] || { totalCursos: 0 },
      cases: cases[0] || { totalCasos: 0 },
      submissions: submissions[0] || { totalEntregas: 0, pendientes: 0, calificadas: 0 },
      avgGrade: avgGrade[0] || { promedioNotas: null },
      students: students[0] || { totalEstudiantes: 0 },
      topCases: topCases || []
    };

    console.log('✅ Estadísticas del docente enviadas');
    res.json(responseData);
  } catch (error) {
    console.error('❌ Error al obtener estadísticas del docente:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

module.exports = exports;