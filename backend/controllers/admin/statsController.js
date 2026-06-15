const { sequelize } = require('../../config/database');

exports.getGlobalStats = async (req, res) => {
  try {
    console.log('📊 Iniciando obtención de estadísticas globales...');

    const [userStats] = await sequelize.query(`
      SELECT rol, activo, COUNT(*) as total
      FROM usuarios
      GROUP BY rol, activo
    `);

    const [courseStats] = await sequelize.query(`
      SELECT 
        COUNT(*) as totalCursos,
        SUM(CASE WHEN activo = true THEN 1 ELSE 0 END) as cursosActivos,
        SUM(CASE WHEN activo = false THEN 1 ELSE 0 END) as cursosInactivos
      FROM cursos
    `);

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

    const [avgGrade] = await sequelize.query(`
      SELECT AVG(nota) as promedioGeneral
      FROM retroalimentaciones
    `);

    const [caseStatus] = await sequelize.query(`
      SELECT 
        COUNT(*) as totalCasos,
        SUM(CASE WHEN activo = true THEN 1 ELSE 0 END) as casosActivos,
        SUM(CASE WHEN activo = false THEN 1 ELSE 0 END) as casosInactivos
      FROM casos_clinicos
    `);

    const [recentSubmissions] = await sequelize.query(`
      SELECT 
        COUNT(*) as totalEntregas,
        SUM(CASE WHEN estado = 'enviado' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'calificado' THEN 1 ELSE 0 END) as calificadas
      FROM respuestas_estudiantes
      WHERE fecha_envio >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    // ── Cálculos ─────────────────────────────────────────────────────────────

    const totalUsers = userStats.reduce((sum, u) => sum + parseInt(u.total), 0);
    const totalActiveUsers = userStats
      .filter(u => u.activo)
      .reduce((sum, u) => sum + parseInt(u.total), 0);

    const teachersActive = userStats.find(
      u => u.rol === 'docente' && u.activo
    )?.total || 0;

    const studentsActive = userStats.find(
      u => u.rol === 'estudiante' && u.activo
    )?.total || 0;

    const activityRate = totalUsers > 0
      ? parseFloat(((totalActiveUsers / totalUsers) * 100).toFixed(1))
      : 0;

    const studentTeacherRatio = teachersActive > 0
      ? parseFloat((studentsActive / teachersActive).toFixed(1))
      : null;

    const totalEntregas = parseInt(recentSubmissions[0]?.totalEntregas) || 0;
    const calificadas   = parseInt(recentSubmissions[0]?.calificadas)   || 0;
    const completionRate = totalEntregas > 0
      ? parseFloat(((calificadas / totalEntregas) * 100).toFixed(1))
      : 0;

    const avgGradeValue = avgGrade[0]?.promedioGeneral
      ? parseFloat(parseFloat(avgGrade[0].promedioGeneral).toFixed(2))
      : null;

    const avgCasesPerTeacher = casesByTeacher.length > 0
      ? parseFloat(
          (casesByTeacher.reduce((sum, t) => sum + parseInt(t.totalCasos), 0) /
          casesByTeacher.length).toFixed(2)
        )
      : 0;

    const ollamaIntegrated = process.env.OLLAMA_API_URL ? true : false;
    const ollamaModel      = process.env.OLLAMA_MODEL || 'No configurado';

    const response = {
      users: userStats,
      courses: courseStats[0],
      casesByTeacher,
      avgGrade: {
        promedioGeneral: avgGradeValue
      },
      caseStatus: caseStatus[0],
      recentSubmissions: recentSubmissions[0],
      ollama: {
        integrated: ollamaIntegrated,
        model: ollamaModel,
        status: ollamaIntegrated ? 'Activo' : 'No configurado'
      },
      metrics: {
        totalUsers,
        totalActiveUsers,
        teachersActive: parseInt(teachersActive),
        studentsActive: parseInt(studentsActive),
        activityRate,
        studentTeacherRatio,
        completionRate,
        avgCasesPerTeacher,

        // ✅ NUEVO — PASO 6: Estados calculados en el backend
        studentTeacherRatioStatus: (() => {
          if (parseInt(teachersActive) === 0) return 'Sin docentes activos';
          const ratio = studentsActive / teachersActive;
          if (ratio > 30)  return 'Considerar contratar más docentes';
          if (ratio >= 15) return 'Ratio óptimo';
          return 'Capacidad disponible';
        })(),

        activityRateStatus: (() => {
          const rate = totalUsers > 0
            ? (totalActiveUsers / totalUsers) * 100
            : 0;
          if (rate >= 80) return 'success';
          if (rate >= 60) return 'warning';
          return 'danger';
        })(),

        completionRateStatus: (() => {
          const rate = totalEntregas > 0
            ? (calificadas / totalEntregas) * 100
            : 0;
          if (rate >= 80) return 'success';
          if (rate >= 50) return 'warning';
          return 'danger';
        })(),

        avgGradeStatus: (() => {
          if (!avgGradeValue) return 'Sin datos suficientes';
          if (avgGradeValue >= 70) return 'Rendimiento satisfactorio';
          if (avgGradeValue >= 60) return 'Rendimiento aceptable';
          return 'Necesita mejoras';
        })(),

        avgGradeBarStatus: (() => {
          if (!avgGradeValue) return null;
          if (avgGradeValue >= 70) return 'success';
          if (avgGradeValue >= 60) return 'warning';
          return 'danger';
        })()
      }
    };

    console.log('✅ Estadísticas globales enviadas');
    res.json(response);
  } catch (error) {
    console.error('❌ Error al obtener estadísticas globales:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

module.exports = exports;