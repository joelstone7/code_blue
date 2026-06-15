const StudentResponse = require('../../models/StudentResponse');
const PhaseResponse = require('../../models/PhaseResponse');
const CasePhase = require('../../models/CasePhase');
const Feedback = require('../../models/Feedback');
const ClinicalCase = require('../../models/ClinicalCase');
const { sequelize } = require('../../config/database');
const { generateFeedback } = require('../../services/ollamaService');

// ─────────────────────────────────────────────────────────────
// Iniciar o continuar un caso — crea la sesión del estudiante
// Se llama cuando el estudiante entra al caso por primera vez
// ─────────────────────────────────────────────────────────────
exports.startCase = async (req, res) => {
  try {
    const { asignacionId } = req.body;

    if (!asignacionId) {
      return res.status(400).json({ error: 'ID de asignación es requerido' });
    }

    // Verificar acceso del estudiante
    const [assignment] = await sequelize.query(`
      SELECT ac.*, ce.estudiante_id, cc.id as caso_id, cc.total_fases
      FROM asignaciones_casos ac
      INNER JOIN curso_estudiante ce ON ac.curso_id = ce.curso_id
      INNER JOIN casos_clinicos cc ON ac.caso_id = cc.id
      WHERE ac.id = ? AND ce.estudiante_id = ? AND ac.activo = true
    `, { replacements: [asignacionId, req.user.id] });

    if (assignment.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a este caso' });
    }

    // Verificar si ya existe una sesión
    let response = await StudentResponse.findOne({
      where: { asignacionId, estudianteId: req.user.id }
    });

    if (!response) {
      // Crear nueva sesión
      response = await StudentResponse.create({
        asignacionId,
        estudianteId: req.user.id,
        faseActual: 1,
        estado: 'en_progreso'
      });
      console.log('✅ Nueva sesión de caso iniciada:', response.id);
    } else {
      console.log('✅ Sesión existente encontrada, fase actual:', response.faseActual);
    }

    // Obtener respuestas de fases ya completadas
    const [phaseResponses] = await sequelize.query(`
      SELECT rf.*, cf.titulo as tituloFase
      FROM respuestas_fases rf
      INNER JOIN caso_fases cf ON rf.fase_id = cf.id
      WHERE rf.respuesta_id = ?
      ORDER BY rf.numero_fase ASC
    `, { replacements: [response.id] });

    res.json({
      message: 'Caso iniciado correctamente',
      response,
      fasesCompletadas: phaseResponses,
      totalFases: assignment[0].total_fases
    });
  } catch (error) {
    console.error('❌ Error al iniciar caso:', error);
    res.status(500).json({ error: 'Error al iniciar caso' });
  }
};

// ─────────────────────────────────────────────────────────────
// Guardar respuesta de una fase específica
// Se llama cada vez que el estudiante completa una fase
// ─────────────────────────────────────────────────────────────
exports.submitPhaseResponse = async (req, res) => {
  try {
    const {
      asignacionId,
      faseId,
      numeroFase,
      respuestaPrincipal,
      respuestasSecundarias,
      usoPista,
      tiempoFaseSegundos
    } = req.body;

    if (!asignacionId || !faseId || !numeroFase) {
      return res.status(400).json({
        error: 'asignacionId, faseId y numeroFase son requeridos'
      });
    }

    // Verificar acceso del estudiante
    const [assignment] = await sequelize.query(`
      SELECT ac.*, cc.id as caso_id, cc.total_fases
      FROM asignaciones_casos ac
      INNER JOIN curso_estudiante ce ON ac.curso_id = ce.curso_id
      INNER JOIN casos_clinicos cc ON ac.caso_id = cc.id
      WHERE ac.id = ? AND ce.estudiante_id = ?
    `, { replacements: [asignacionId, req.user.id] });

    if (assignment.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a este caso' });
    }

    // Obtener la sesión principal del estudiante
    const response = await StudentResponse.findOne({
      where: { asignacionId, estudianteId: req.user.id }
    });

    if (!response) {
      return res.status(404).json({
        error: 'Sesión no encontrada. Inicia el caso primero.'
      });
    }

    // Verificar que el estudiante no está saltando fases
    if (parseInt(numeroFase) > response.faseActual) {
      return res.status(400).json({
        error: 'No puedes responder una fase sin completar las anteriores'
      });
    }

    // Verificar si ya respondió esta fase
    const phaseResponseExisting = await PhaseResponse.findOne({
      where: { respuestaId: response.id, faseId }
    });

    if (phaseResponseExisting) {
      return res.status(400).json({
        error: 'Ya respondiste esta fase'
      });
    }

    // Guardar la respuesta de la fase
    const phaseResponse = await PhaseResponse.create({
      respuestaId: response.id,
      faseId,
      numeroFase: parseInt(numeroFase),
      respuestaPrincipal: respuestaPrincipal || null,
      respuestasSecundarias: respuestasSecundarias
        ? JSON.parse(respuestasSecundarias)
        : null,
      usoPista: usoPista === 'true' || usoPista === true,
      tiempoFaseSegundos: tiempoFaseSegundos ? parseInt(tiempoFaseSegundos) : null,
      completada: true
    });

    console.log(`✅ Fase ${numeroFase} respondida correctamente`);

    const siguienteFase = parseInt(numeroFase) + 1;
    const totalFases = assignment[0].total_fases;
    const esFaseFinal = siguienteFase > totalFases;

    // Actualizar la fase actual en la sesión principal
    await response.update({
      faseActual: esFaseFinal ? totalFases : siguienteFase
    });

    res.json({
      message: `Fase ${numeroFase} guardada exitosamente`,
      phaseResponse,
      siguienteFase: esFaseFinal ? null : siguienteFase,
      casoConcluido: esFaseFinal
    });
  } catch (error) {
    console.error('❌ Error al guardar respuesta de fase:', error);
    res.status(500).json({ error: 'Error al guardar respuesta de fase' });
  }
};

// ─────────────────────────────────────────────────────────────
// Envío final del caso completo
// Se llama cuando el estudiante completa todas las fases
// Aquí es donde la IA genera la retroalimentación completa
// ─────────────────────────────────────────────────────────────
exports.submitFinalResponse = async (req, res) => {
  try {
    const {
      asignacionId,
      diagnosticoFinal,
      tratamientoFinal,
      tiempoTotalMinutos
    } = req.body;

    console.log('📝 Recibiendo envío final del caso:', { asignacionId });

    if (!asignacionId) {
      return res.status(400).json({ error: 'ID de asignación es requerido' });
    }

    // Verificar acceso y obtener datos del caso
    const [assignment] = await sequelize.query(`
      SELECT ac.*, ce.estudiante_id, cc.id as caso_id,
             cc.titulo, cc.diagnostico_correcto,
             cc.tratamiento_correcto, cc.total_fases,
             cc.nivel_dificultad
      FROM asignaciones_casos ac
      INNER JOIN curso_estudiante ce ON ac.curso_id = ce.curso_id
      INNER JOIN casos_clinicos cc ON ac.caso_id = cc.id
      WHERE ac.id = ? AND ce.estudiante_id = ?
    `, { replacements: [asignacionId, req.user.id] });

    if (assignment.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a este caso' });
    }

    const caseData = assignment[0];

    // Obtener la sesión del estudiante
    const response = await StudentResponse.findOne({
      where: { asignacionId, estudianteId: req.user.id }
    });

    if (!response) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    if (response.estado === 'enviado' || response.estado === 'calificado') {
      return res.status(400).json({ error: 'Este caso ya fue enviado' });
    }

    // Verificar que completó todas las fases
    const [completedPhases] = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM respuestas_fases
      WHERE respuesta_id = ? AND completada = true
    `, { replacements: [response.id] });

    const totalCompletadas = parseInt(completedPhases[0].total);

    if (totalCompletadas < caseData.total_fases) {
      return res.status(400).json({
        error: `Debes completar todas las fases. Completaste ${totalCompletadas} de ${caseData.total_fases}`
      });
    }

    // Actualizar la sesión con el diagnóstico final
    await response.update({
      diagnosticoFinal: diagnosticoFinal || null,
      tratamientoFinal: tratamientoFinal || null,
      archivoAdjunto: req.file ? req.file.path : null,
      tiempoTotalMinutos: tiempoTotalMinutos ? parseInt(tiempoTotalMinutos) : null,
      estado: 'enviado',
      fechaEnvio: new Date()
    });

    console.log('✅ Caso enviado correctamente, iniciando análisis de IA...');

    // Obtener todas las respuestas por fase para el análisis de IA
    const [phaseResponses] = await sequelize.query(`
      SELECT
        rf.numero_fase,
        rf.respuesta_principal,
        rf.respuestas_secundarias,
        rf.uso_pista,
        rf.tiempo_fase_segundos,
        cf.tipo_fase,
        cf.titulo as tituloFase,
        cf.pregunta_principal,
        cf.contenido as contenidoFase
      FROM respuestas_fases rf
      INNER JOIN caso_fases cf ON rf.fase_id = cf.id
      WHERE rf.respuesta_id = ?
      ORDER BY rf.numero_fase ASC
    `, { replacements: [response.id] });

    // Generar retroalimentación completa con IA
    try {
      const clinicalCase = await ClinicalCase.findByPk(caseData.caso_id);

      const iaFeedback = await generateFeedback(
        {
          titulo: clinicalCase.titulo,
          motivoConsulta: clinicalCase.motivoConsulta,
          antecedentesPersonales: clinicalCase.antecedentesPersonales,
          antecedentesEpidemiologicos: clinicalCase.antecedentesEpidemiologicos,
          diagnosticoCorrecto: clinicalCase.diagnosticoCorrecto,
          tratamientoCorrecto: clinicalCase.tratamientoCorrecto,
          totalFases: clinicalCase.totalFases,
          nivelDificultad: clinicalCase.nivelDificultad
        },
        {
          diagnosticoFinal,
          tratamientoFinal,
          respuestasPorFase: phaseResponses
        },
        tiempoTotalMinutos ? parseInt(tiempoTotalMinutos) : null
      );

      console.log('🤖 Feedback IA:', iaFeedback.success ? 'Exitoso' : 'Fallido');

      // Determinar en qué fase llegó al diagnóstico final
      const faseDiagnosticoReal = phaseResponses.find(
        p => p.tipo_fase === 'diagnostico_final'
      )?.numero_fase || caseData.total_fases;

      // Guardar retroalimentación completa
      const existingFeedback = await Feedback.findOne({
        where: { respuestaId: response.id }
      });

      const feedbackData = {
        respuestaId: response.id,
        docenteId: req.user.id,
        iaAnalisisRazonamiento: iaFeedback.success
          ? iaFeedback.analisisRazonamiento
          : 'Análisis no disponible en este momento.',
        iaCompetencias: iaFeedback.success ? iaFeedback.competencias : null,
        iaAnalisisFases: iaFeedback.success ? iaFeedback.analisisFases : null,
        iaFaseDiagnosticoEsperada: Math.ceil(caseData.total_fases / 2),
        iaFaseDiagnosticoReal: faseDiagnosticoReal,
        iaPreguntasReflexion: iaFeedback.success
          ? iaFeedback.preguntasReflexion
          : null,
        iaRecomendaciones: iaFeedback.success
          ? iaFeedback.recomendaciones
          : null,
        iaComparacionDiagnostico: iaFeedback.success
          ? iaFeedback.comparacionDiagnostico
          : null,
        iaNotaSugerida: iaFeedback.success ? iaFeedback.notaSugerida : null,
        revisadaPorDocente: false
      };

      if (existingFeedback) {
        await existingFeedback.update(feedbackData);
      } else {
        await Feedback.create(feedbackData);
      }

      console.log('✅ Retroalimentación de IA guardada');
    } catch (iaError) {
      console.error('❌ Error en IA:', iaError.message);

      // Retroalimentación por defecto si falla la IA
      await Feedback.create({
        respuestaId: response.id,
        docenteId: req.user.id,
        iaAnalisisRazonamiento: `Tu caso ha sido registrado correctamente con ${totalCompletadas} fases completadas. El docente revisará tu respuesta pronto.`,
        revisadaPorDocente: false
      });
    }

    res.json({
      message: 'Caso enviado exitosamente. La IA está analizando tu razonamiento clínico.',
      response
    });
  } catch (error) {
    console.error('❌ Error general al enviar caso:', error);
    res.status(500).json({ error: 'Error al enviar caso' });
  }
};

// ─────────────────────────────────────────────────────────────
// Obtener el estado actual del caso para el estudiante
// Devuelve la sesión + fases completadas + retroalimentación
// ─────────────────────────────────────────────────────────────
exports.getStudentResponse = async (req, res) => {
  try {
    const { asignacionId } = req.params;

    const response = await StudentResponse.findOne({
      where: { asignacionId, estudianteId: req.user.id }
    });

    if (!response) {
      return res.json({ response: null, fasesCompletadas: [] });
    }

    // Obtener fases completadas con contenido
    const [phaseResponses] = await sequelize.query(`
      SELECT
        rf.*,
        cf.titulo as tituloFase,
        cf.tipo_fase,
        cf.pregunta_principal
      FROM respuestas_fases rf
      INNER JOIN caso_fases cf ON rf.fase_id = cf.id
      WHERE rf.respuesta_id = ?
      ORDER BY rf.numero_fase ASC
    `, { replacements: [response.id] });

    // Obtener retroalimentación si el caso ya fue enviado
    let feedback = null;
    if (response.estado === 'enviado' || response.estado === 'calificado') {
      feedback = await Feedback.findOne({
        where: { respuestaId: response.id }
      });
    }

    res.json({
      response,
      fasesCompletadas: phaseResponses,
      feedback
    });
  } catch (error) {
    console.error('Error al obtener respuesta:', error);
    res.status(500).json({ error: 'Error al obtener respuesta' });
  }
};

// ─────────────────────────────────────────────────────────────
// Solicitar pista de una fase
// Registra que el estudiante usó la pista (penaliza puntos)
// ─────────────────────────────────────────────────────────────
exports.requestHint = async (req, res) => {
  try {
    const { faseId } = req.body;

    if (!faseId) {
      return res.status(400).json({ error: 'faseId es requerido' });
    }

    const phase = await CasePhase.findByPk(faseId);

    if (!phase || !phase.pista) {
      return res.status(404).json({
        error: 'No hay pista disponible para esta fase'
      });
    }

    res.json({
      pista: phase.pista,
      puntosPenalizacion: phase.puntosPenalizacionPista,
      message: `Se aplicará una penalización de ${phase.puntosPenalizacionPista} puntos por usar la pista`
    });
  } catch (error) {
    console.error('Error al obtener pista:', error);
    res.status(500).json({ error: 'Error al obtener pista' });
  }
};

module.exports = exports;