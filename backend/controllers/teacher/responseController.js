const StudentResponse = require('../../models/StudentResponse');
const Feedback = require('../../models/Feedback');
const PhaseResponse = require('../../models/PhaseResponse');
const { sequelize } = require('../../config/database');

// ─────────────────────────────────────────────────────────────
// Obtener todas las respuestas de un caso asignado
// Ahora incluye las respuestas por fase de cada estudiante
// ─────────────────────────────────────────────────────────────
exports.getCaseResponses = async (req, res) => {
  try {
    const { asignacionId } = req.params;

    // Verificar que la asignación pertenece a un caso del docente
    const [assignment] = await sequelize.query(`
      SELECT ac.*, cc.docente_id, cc.total_fases
      FROM asignaciones_casos ac
      INNER JOIN casos_clinicos cc ON ac.caso_id = cc.id
      WHERE ac.id = ? AND cc.docente_id = ?
    `, { replacements: [asignacionId, req.user.id] });

    if (assignment.length === 0) {
      return res.status(403).json({
        error: 'No tienes permisos para ver estas respuestas'
      });
    }

    // Obtener respuestas generales con datos del estudiante y retroalimentación
    const [responses] = await sequelize.query(`
      SELECT 
        re.id,
        re.asignacion_id,
        re.estudiante_id,
        re.fase_actual,
        re.estado,
        re.tiempo_total_minutos,
        re.diagnostico_final,
        re.tratamiento_final,
        re.archivo_adjunto,
        re.fecha_inicio,
        re.fecha_envio,
        u.nombre,
        u.apellido,
        u.email,
        f.id as feedback_id,
        f.nota,
        f.comentarios_docente,
        f.ia_nota_sugerida,
        f.revisada_por_docente,
        f.fecha_retroalimentacion
      FROM respuestas_estudiantes re
      INNER JOIN usuarios u ON re.estudiante_id = u.id
      LEFT JOIN retroalimentaciones f ON re.id = f.respuesta_id
      WHERE re.asignacion_id = ?
      ORDER BY re.fecha_envio DESC
    `, { replacements: [asignacionId] });

    // Para cada respuesta obtener el detalle de sus fases
    for (let response of responses) {
      const [phaseResponses] = await sequelize.query(`
        SELECT 
          rf.*,
          cf.titulo as tituloFase,
          cf.tipo_fase,
          cf.pregunta_principal,
          cf.pista
        FROM respuestas_fases rf
        INNER JOIN caso_fases cf ON rf.fase_id = cf.id
        WHERE rf.respuesta_id = ?
        ORDER BY rf.numero_fase ASC
      `, { replacements: [response.id] });

      response.respuestasPorFase = phaseResponses;
    }

    res.json({
      responses,
      totalFases: assignment[0].total_fases
    });
  } catch (error) {
    console.error('Error al obtener respuestas:', error);
    res.status(500).json({ error: 'Error al obtener respuestas' });
  }
};

// ─────────────────────────────────────────────────────────────
// Obtener detalle completo de una respuesta específica
// Para cuando el docente va a calificar
// ─────────────────────────────────────────────────────────────
exports.getResponseDetail = async (req, res) => {
  try {
    const { respuestaId } = req.params;

    // Verificar permisos del docente
    const [check] = await sequelize.query(`
      SELECT 
        re.*,
        u.nombre,
        u.apellido,
        u.email,
        cc.titulo as tituloCaso,
        cc.diagnostico_correcto,
        cc.tratamiento_correcto,
        cc.total_fases,
        c.nombre as nombreCurso,
        ac.id as asignacion_id
      FROM respuestas_estudiantes re
      INNER JOIN usuarios u ON re.estudiante_id = u.id
      INNER JOIN asignaciones_casos ac ON re.asignacion_id = ac.id
      INNER JOIN casos_clinicos cc ON ac.caso_id = cc.id
      INNER JOIN cursos c ON ac.curso_id = c.id
      WHERE re.id = ? AND cc.docente_id = ?
    `, { replacements: [respuestaId, req.user.id] });

    if (check.length === 0) {
      return res.status(403).json({
        error: 'No tienes permisos para ver esta respuesta'
      });
    }

    const responseData = check[0];

    // Obtener respuestas por fase con el contenido de cada fase
    const [phaseResponses] = await sequelize.query(`
      SELECT 
        rf.id,
        rf.numero_fase,
        rf.respuesta_principal,
        rf.respuestas_secundarias,
        rf.uso_pista,
        rf.tiempo_fase_segundos,
        rf.completada,
        rf.fecha_respuesta,
        cf.titulo as tituloFase,
        cf.tipo_fase,
        cf.contenido as contenidoFase,
        cf.pregunta_principal,
        cf.preguntas_secundarias,
        cf.pista,
        cf.puntos_penalizacion_pista
      FROM respuestas_fases rf
      INNER JOIN caso_fases cf ON rf.fase_id = cf.id
      WHERE rf.respuesta_id = ?
      ORDER BY rf.numero_fase ASC
    `, { replacements: [respuestaId] });

    // Obtener retroalimentación si existe
    const feedback = await Feedback.findOne({
      where: { respuestaId }
    });

    res.json({
      response: responseData,
      phaseResponses,
      feedback
    });
  } catch (error) {
    console.error('Error al obtener detalle de respuesta:', error);
    res.status(500).json({ error: 'Error al obtener detalle de respuesta' });
  }
};

// ─────────────────────────────────────────────────────────────
// Calificar respuesta — ahora actualiza la retroalimentación
// completa que generó la IA y agrega los comentarios del docente
// ─────────────────────────────────────────────────────────────
exports.gradeResponse = async (req, res) => {
  try {
    const {
      respuestaId,
      nota,
      comentariosDocente
    } = req.body;

    if (!respuestaId || nota === undefined) {
      return res.status(400).json({
        error: 'ID de respuesta y nota son requeridos'
      });
    }

    if (nota < 0 || nota > 100) {
      return res.status(400).json({
        error: 'La nota debe estar entre 0 y 100'
      });
    }

    const response = await StudentResponse.findByPk(respuestaId);
    if (!response) {
      return res.status(404).json({ error: 'Respuesta no encontrada' });
    }

    // Verificar que el caso pertenece al docente
    const [check] = await sequelize.query(`
      SELECT cc.docente_id
      FROM respuestas_estudiantes re
      INNER JOIN asignaciones_casos ac ON re.asignacion_id = ac.id
      INNER JOIN casos_clinicos cc ON ac.caso_id = cc.id
      WHERE re.id = ? AND cc.docente_id = ?
    `, { replacements: [respuestaId, req.user.id] });

    if (check.length === 0) {
      return res.status(403).json({
        error: 'No tienes permisos para calificar esta respuesta'
      });
    }

    // Buscar si ya existe retroalimentación de la IA
    let feedback = await Feedback.findOne({ where: { respuestaId } });

    if (feedback) {
      // Actualizar la retroalimentación existente con la nota y comentarios del docente
      await feedback.update({
        nota,
        comentariosDocente,
        docenteId: req.user.id,
        revisadaPorDocente: true,
        fechaRevisionDocente: new Date()
      });
    } else {
      // Crear retroalimentación sin análisis de IA (calificación manual)
      feedback = await Feedback.create({
        respuestaId,
        docenteId: req.user.id,
        nota,
        comentariosDocente,
        revisadaPorDocente: true,
        fechaRevisionDocente: new Date()
      });
    }

    // Actualizar estado de la respuesta a calificado
    await response.update({ estado: 'calificado' });

    res.json({
      message: 'Calificación guardada exitosamente',
      feedback
    });
  } catch (error) {
    console.error('Error al calificar:', error);
    res.status(500).json({ error: 'Error al calificar respuesta' });
  }
};

// ─────────────────────────────────────────────────────────────
// Obtener respuestas pendientes de calificación del docente
// Ahora muestra el progreso por fases de cada estudiante
// ─────────────────────────────────────────────────────────────
exports.getPendingResponses = async (req, res) => {
  try {
    const docenteId = req.user.id;

    console.log('🔍 Buscando respuestas pendientes para docente ID:', docenteId);

    const [pending] = await sequelize.query(`
      SELECT 
        re.id,
        re.asignacion_id,
        re.fase_actual,
        re.diagnostico_final,
        re.tratamiento_final,
        re.archivo_adjunto,
        re.estado,
        re.tiempo_total_minutos,
        re.fecha_inicio,
        re.fecha_envio,
        u.id as estudiante_id,
        u.nombre,
        u.apellido,
        u.email,
        cc.id as caso_id,
        cc.titulo as tituloCaso,
        cc.total_fases,
        cc.nivel_dificultad,
        c.id as curso_id,
        c.nombre as nombreCurso,
        f.ia_nota_sugerida
      FROM respuestas_estudiantes re
      INNER JOIN usuarios u ON re.estudiante_id = u.id
      INNER JOIN asignaciones_casos ac ON re.asignacion_id = ac.id
      INNER JOIN casos_clinicos cc ON ac.caso_id = cc.id
      INNER JOIN cursos c ON ac.curso_id = c.id
      LEFT JOIN retroalimentaciones f ON re.id = f.respuesta_id
      WHERE cc.docente_id = ? 
        AND re.estado = 'enviado'
      ORDER BY re.fecha_envio ASC
    `, { replacements: [docenteId] });

    console.log(`✅ Se encontraron ${pending.length} respuestas pendientes`);

    res.json({ pending });
  } catch (error) {
    console.error('❌ Error al obtener respuestas pendientes:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Error al obtener respuestas pendientes' });
  }
};

module.exports = exports;