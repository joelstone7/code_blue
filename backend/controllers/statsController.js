const { sequelize } = require('../config/database');

// Estadísticas del docente
exports.getTeacherStats = async (req, res) => {
  try {
    const docenteId = req.user.id;

    console.log('📊 Obteniendo estadísticas para docente ID:', docenteId);

    // Cursos asignados
    const [courses] = await sequelize.query(`
      SELECT COUNT(DISTINCT curso_id) as totalCursos
      FROM curso_docente
      WHERE docente_id = ?
    `, { replacements: [docenteId] });

    console.log('📚 Cursos:', courses);

    // Total de casos creados
    const [cases] = await sequelize.query(`
      SELECT COUNT(*) as totalCasos
      FROM casos_clinicos
      WHERE docente_id = ? AND activo = true
    `, { replacements: [docenteId] });

    console.log('📋 Casos:', cases);

    // Entregas pendientes y completadas
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

    console.log('✏️ Entregas:', submissions);

    // Promedio de notas
    const [avgGrade] = await sequelize.query(`
      SELECT AVG(f.nota) as promedioNotas
      FROM retroalimentaciones f
      INNER JOIN respuestas_estudiantes re ON f.respuesta_id = re.id
      INNER JOIN asignaciones_casos ac ON re.asignacion_id = ac.id
      INNER JOIN casos_clinicos cc ON ac.caso_id = cc.id
      WHERE cc.docente_id = ?
    `, { replacements: [docenteId] });

    console.log('📊 Promedio:', avgGrade);

    // Estudiantes únicos que han respondido
    const [students] = await sequelize.query(`
      SELECT COUNT(DISTINCT re.estudiante_id) as totalEstudiantes
      FROM respuestas_estudiantes re
      INNER JOIN asignaciones_casos ac ON re.asignacion_id = ac.id
      INNER JOIN casos_clinicos cc ON ac.caso_id = cc.id
      WHERE cc.docente_id = ?
    `, { replacements: [docenteId] });

    console.log('👥 Estudiantes:', students);

    // Casos más asignados
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

    console.log('🏆 Top casos:', topCases);

    const responseData = {
      courses: courses[0] || { totalCursos: 0 },
      cases: cases[0] || { totalCasos: 0 },
      submissions: submissions[0] || { totalEntregas: 0, pendientes: 0, calificadas: 0 },
      avgGrade: avgGrade[0] || { promedioNotas: null },
      students: students[0] || { totalEstudiantes: 0 },
      topCases: topCases || []
    };

    console.log('✅ Respuesta final:', responseData);

    res.json(responseData);
  } catch (error) {
    console.error('❌ Error al obtener estadísticas del docente:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

// Estadísticas globales (Administrador) - CORREGIDO
exports.getGlobalStats = async (req, res) => {
  try {
    console.log('📊 Iniciando obtención de estadísticas globales...');

    // Total de usuarios por rol (ACTIVOS E INACTIVOS)
    const [userStats] = await sequelize.query(`
      SELECT rol, activo, COUNT(*) as total
      FROM usuarios
      GROUP BY rol, activo
    `);
    console.log('👥 Estadísticas de usuarios:', userStats);

    // Total de cursos (ACTIVOS E INACTIVOS)
    const [courseStats] = await sequelize.query(`
      SELECT 
        COUNT(*) as totalCursos,
        SUM(CASE WHEN activo = true THEN 1 ELSE 0 END) as cursosActivos,
        SUM(CASE WHEN activo = false THEN 1 ELSE 0 END) as cursosInactivos
      FROM cursos
    `);
    console.log('📚 Estadísticas de cursos:', courseStats);

    // Casos clínicos por docente
    const [casesByTeacher] = await sequelize.query(`
      SELECT 
        u.nombre,
        u.apellido,
        COUNT(cc.id) as totalCasos
      FROM usuarios u
      LEFT JOIN casos_clinicos cc ON u.id = cc.docente_id AND cc.activo = true
      WHERE u.rol = 'docente' AND u.activo = true
      GROUP BY u.id, u.nombre, u.apellido
      HAVING COUNT(cc.id) > 0
      ORDER BY totalCasos DESC
    `);
    console.log('📋 Casos por docente:', casesByTeacher);

    // Promedio general de notas
    const [avgGrade] = await sequelize.query(`
      SELECT AVG(nota) as promedioGeneral
      FROM retroalimentaciones
    `);
    console.log('📊 Promedio general:', avgGrade);

    // Casos activos vs inactivos - CORREGIDO
    const [caseStatus] = await sequelize.query(`
      SELECT 
        COUNT(*) as totalCasos,
        SUM(CASE WHEN activo = true THEN 1 ELSE 0 END) as casosActivos,
        SUM(CASE WHEN activo = false THEN 1 ELSE 0 END) as casosInactivos
      FROM casos_clinicos
    `);
    console.log('✅ Estado de casos (CORREGIDO):', caseStatus);

    // Entregas recientes
    const [recentSubmissions] = await sequelize.query(`
      SELECT 
        COUNT(*) as totalEntregas,
        SUM(CASE WHEN estado = 'enviado' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'calificado' THEN 1 ELSE 0 END) as calificadas
      FROM respuestas_estudiantes
      WHERE fecha_envio >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);
    console.log('📝 Entregas recientes:', recentSubmissions);

    // Verificar integración con Ollama
    const ollamaIntegrated = process.env.OLLAMA_API_URL ? true : false;
    const ollamaModel = process.env.OLLAMA_MODEL || 'No configurado';
    console.log('🤖 Ollama integrado:', ollamaIntegrated, '- Modelo:', ollamaModel);

    const response = {
      users: userStats,
      courses: courseStats[0],
      casesByTeacher,
      avgGrade: avgGrade[0],
      caseStatus: caseStatus[0],
      recentSubmissions: recentSubmissions[0],
      ollama: {
        integrated: ollamaIntegrated,
        model: ollamaModel,
        status: ollamaIntegrated ? 'Activo' : 'No configurado'
      }
    };

    console.log('✅ Respuesta final:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    console.error('❌ Error al obtener estadísticas globales:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

// Estadísticas del estudiante
exports.getStudentStats = async (req, res) => {
  try {
    const estudianteId = req.user.id;

    // Cursos inscritos
    const [courses] = await sequelize.query(`
      SELECT COUNT(*) as totalCursos
      FROM curso_estudiante
      WHERE estudiante_id = ?
    `, { replacements: [estudianteId] });

    // Casos disponibles y completados
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

    // Promedio de notas
    const [avgGrade] = await sequelize.query(`
      SELECT AVG(f.nota) as promedioNotas
      FROM retroalimentaciones f
      INNER JOIN respuestas_estudiantes re ON f.respuesta_id = re.id
      WHERE re.estudiante_id = ?
    `, { replacements: [estudianteId] });

    // Últimas calificaciones
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

    // Casos pendientes
    const [pending] = await sequelize.query(`
      SELECT 
        cc.titulo as tituloCaso,
        c.nombre as nombreCurso,
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