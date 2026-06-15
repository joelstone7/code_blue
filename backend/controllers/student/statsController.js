const { sequelize } = require('../../config/database');

// Estadísticas del estudiante autenticado
exports.getStudentStats = async (req, res) => {
  try {
    const estudianteId = req.user.id;

    // Cursos en los que está inscrito
    const [courses] = await sequelize.query(`
      SELECT COUNT(*) as totalCursos
      FROM curso_estudiante
      WHERE estudiante_id = ?
    `, { replacements: [estudianteId] });

    // Casos disponibles, completados y calificados
    const [cases] = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT ac.id) as casosDisponibles,
        COUNT(DISTINCT re.id) as casosCompletados,
        SUM(CASE WHEN re.estado = 'calificado' THEN 1 ELSE 0 END) as casosCalificados
      FROM curso_estudiante ce
      INNER JOIN asignaciones_casos ac ON ce.curso_id = ac.curso_id
      LEFT JOIN respuestas_estudiantes re ON ac.id = re.asignacion_id 
        AND re.estudiante_id = ce.estudiante_id
      WHERE ce.estudiante_id = ? AND ac.activo = true
    `, { replacements: [estudianteId] });

    // Promedio de notas del estudiante
    const [avgGrade] = await sequelize.query(`
      SELECT AVG(f.nota) as promedioNotas
      FROM retroalimentaciones f
      INNER JOIN respuestas_estudiantes re ON f.respuesta_id = re.id
      WHERE re.estudiante_id = ?
    `, { replacements: [estudianteId] });

    // Últimas 5 calificaciones recibidas
    const [recentGrades] = await sequelize.query(`
      SELECT 
        cc.titulo as tituloCaso,
        c.nombre as nombreCurso,
        f.nota,
        f.fecha_retroalimentacion
      FROM retroalimentaciones f
      INNER JOIN respuestas_estudiantes re ON f.respuesta_id = re.id
      INNER JOIN asignaciones_casos ac ON re.asignacion_id = ac.id
      INNER JOIN casos_clinicos cc ON ac.caso_id = cc.id
      INNER JOIN cursos c ON ac.curso_id = c.id
      WHERE re.estudiante_id = ?
      ORDER BY f.fecha_retroalimentacion DESC
      LIMIT 5
    `, { replacements: [estudianteId] });

    // ✅ CORREGIDO: Casos pendientes ahora incluyen ac.id as asignacionId
    const [pending] = await sequelize.query(`
      SELECT 
        cc.titulo as tituloCaso,
        c.nombre as nombreCurso,
        ac.id as asignacionId,
        ac.fecha_vencimiento,
        ac.fecha_limite
      FROM curso_estudiante ce
      INNER JOIN asignaciones_casos ac ON ce.curso_id = ac.curso_id
      INNER JOIN casos_clinicos cc ON ac.caso_id = cc.id
      INNER JOIN cursos c ON ac.curso_id = c.id
      LEFT JOIN respuestas_estudiantes re ON ac.id = re.asignacion_id 
        AND re.estudiante_id = ce.estudiante_id
      WHERE ce.estudiante_id = ? 
        AND ac.activo = true
        AND re.id IS NULL
      ORDER BY ac.fecha_vencimiento ASC
    `, { replacements: [estudianteId] });

    res.json({
      courses: courses[0],
      cases: cases[0],
      avgGrade: avgGrade[0],
      recentGrades,
      pending
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del estudiante:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

module.exports = exports;