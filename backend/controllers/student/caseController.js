const ClinicalCase = require('../../models/ClinicalCase');
const CasePhase = require('../../models/CasePhase');
const CaseResource = require('../../models/CaseResource');
const { sequelize } = require('../../config/database');

// ─────────────────────────────────────────────────────────────
// Obtener caso por ID con todas sus fases
// El estudiante ve el caso completo pero solo puede responder
// la fase en la que se encuentra actualmente
// ─────────────────────────────────────────────────────────────
exports.getCaseById = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el estudiante está inscrito en el curso del caso
    const [enrollment] = await sequelize.query(`
      SELECT ce.*
      FROM curso_estudiante ce
      INNER JOIN asignaciones_casos ac ON ce.curso_id = ac.curso_id
      WHERE ac.id = ? AND ce.estudiante_id = ?
    `, { replacements: [id, req.user.id] });

    if (enrollment.length === 0) {
      return res.status(403).json({
        error: 'No tienes acceso a este caso'
      });
    }

    // Obtener el caso clínico por asignación
    const [caseRows] = await sequelize.query(`
      SELECT
        cc.id,
        cc.titulo,
        cc.descripcion,
        cc.paciente_edad,
        cc.paciente_sexo,
        cc.paciente_ocupacion,
        cc.antecedentes_personales,
        cc.antecedentes_epidemiologicos,
        cc.motivo_consulta,
        cc.tiempo_evolucion,
        cc.nivel_dificultad,
        cc.total_fases,
        cc.activo,
        ac.id as asignacion_id,
        ac.fecha_vencimiento,
        ac.fecha_limite
      FROM casos_clinicos cc
      INNER JOIN asignaciones_casos ac ON cc.id = ac.caso_id
      WHERE ac.id = ?
    `, { replacements: [id] });

    if (!caseRows || caseRows.length === 0) {
      return res.status(404).json({ error: 'Caso no encontrado' });
    }

    const clinicalCase = caseRows[0];

    // Obtener todas las fases del caso
    // IMPORTANTE: No incluimos el contenido de fases futuras
    // eso se maneja en el frontend con el sistema de pestañas bloqueadas
    const phases = await CasePhase.findAll({
      where: { casoId: clinicalCase.id },
      order: [['numeroFase', 'ASC']]
    });

    // Para cada fase obtener sus recursos
    for (let phase of phases) {
      const phaseResources = await CaseResource.findAll({
        where: { faseId: phase.id }
      });
      phase.dataValues.recursos = phaseResources;
    }

    // Recursos generales del caso (sin fase específica)
    const generalResources = await CaseResource.findAll({
      where: { casoId: clinicalCase.id, faseId: null }
    });

    // Verificar si el estudiante ya tiene una sesión iniciada
    const [sessionRows] = await sequelize.query(`
      SELECT
        re.id,
        re.fase_actual,
        re.estado,
        re.fecha_inicio,
        re.fecha_envio
      FROM respuestas_estudiantes re
      WHERE re.asignacion_id = ? AND re.estudiante_id = ?
    `, { replacements: [id, req.user.id] });

    const session = sessionRows.length > 0 ? sessionRows[0] : null;

    res.json({
      case: clinicalCase,
      phases,
      resources: generalResources,
      session
    });
  } catch (error) {
    console.error('Error al obtener caso:', error);
    res.status(500).json({ error: 'Error al obtener caso' });
  }
};

// ─────────────────────────────────────────────────────────────
// Obtener una fase específica con su contenido completo
// Solo se puede obtener si el estudiante ya llegó a esa fase
// ─────────────────────────────────────────────────────────────
exports.getPhaseById = async (req, res) => {
  try {
    const { asignacionId, numeroFase } = req.params;

    // Verificar acceso del estudiante
    const [enrollment] = await sequelize.query(`
      SELECT ce.*
      FROM curso_estudiante ce
      INNER JOIN asignaciones_casos ac ON ce.curso_id = ac.curso_id
      WHERE ac.id = ? AND ce.estudiante_id = ?
    `, { replacements: [asignacionId, req.user.id] });

    if (enrollment.length === 0) {
      return res.status(403).json({
        error: 'No tienes acceso a este caso'
      });
    }

    // Verificar que el estudiante puede acceder a esta fase
    const [sessionRows] = await sequelize.query(`
      SELECT re.fase_actual, re.estado
      FROM respuestas_estudiantes re
      WHERE re.asignacion_id = ? AND re.estudiante_id = ?
    `, { replacements: [asignacionId, req.user.id] });

    if (sessionRows.length === 0) {
      return res.status(400).json({
        error: 'Debes iniciar el caso antes de ver las fases'
      });
    }

    const session = sessionRows[0];

    // No puede ver fases futuras
    if (parseInt(numeroFase) > session.fase_actual) {
      return res.status(403).json({
        error: 'No puedes ver esta fase todavía. Completa las fases anteriores primero.'
      });
    }

    // Obtener el caso por asignación para tener el caso_id
    const [caseRows] = await sequelize.query(`
      SELECT cc.id as caso_id
      FROM casos_clinicos cc
      INNER JOIN asignaciones_casos ac ON cc.id = ac.caso_id
      WHERE ac.id = ?
    `, { replacements: [asignacionId] });

    if (caseRows.length === 0) {
      return res.status(404).json({ error: 'Caso no encontrado' });
    }

    // Obtener la fase con su contenido completo
    const phase = await CasePhase.findOne({
      where: {
        casoId: caseRows[0].caso_id,
        numeroFase: parseInt(numeroFase)
      }
    });

    if (!phase) {
      return res.status(404).json({ error: 'Fase no encontrada' });
    }

    // Obtener recursos de la fase
    const resources = await CaseResource.findAll({
      where: { faseId: phase.id }
    });

    // Verificar si el estudiante ya respondió esta fase
    const [phaseResponseRows] = await sequelize.query(`
      SELECT rf.*
      FROM respuestas_fases rf
      INNER JOIN respuestas_estudiantes re ON rf.respuesta_id = re.id
      WHERE re.asignacion_id = ? AND re.estudiante_id = ? AND rf.numero_fase = ?
    `, { replacements: [asignacionId, req.user.id, numeroFase] });

    const phaseResponse = phaseResponseRows.length > 0 ? phaseResponseRows[0] : null;

    res.json({
      phase,
      resources,
      phaseResponse,
      yaRespondida: phaseResponse !== null
    });
  } catch (error) {
    console.error('Error al obtener fase:', error);
    res.status(500).json({ error: 'Error al obtener fase' });
  }
};

// ─────────────────────────────────────────────────────────────
// Obtener casos asignados a un curso para el estudiante
// Muestra el estado y progreso de cada caso
// ─────────────────────────────────────────────────────────────
exports.getCasesByCourse = async (req, res) => {
  try {
    const { cursoId } = req.params;

    // Verificar inscripción del estudiante
    const [enrollment] = await sequelize.query(`
      SELECT * FROM curso_estudiante
      WHERE curso_id = ? AND estudiante_id = ?
    `, { replacements: [cursoId, req.user.id] });

    if (enrollment.length === 0) {
      return res.status(403).json({
        error: 'No estás inscrito en este curso'
      });
    }

    const [cases] = await sequelize.query(`
      SELECT
        cc.id,
        cc.titulo,
        cc.descripcion,
        cc.nivel_dificultad,
        cc.total_fases,
        cc.paciente_edad,
        cc.paciente_sexo,
        cc.motivo_consulta,
        ac.id as asignacionId,
        ac.fecha_vencimiento,
        ac.fecha_limite,
        ac.fecha_asignacion,
        re.id as respuesta_id,
        re.fase_actual,
        re.estado as estadoRespuesta,
        re.fecha_inicio,
        re.fecha_envio,
        re.tiempo_total_minutos,
        f.nota,
        f.ia_nota_sugerida,
        f.revisada_por_docente
      FROM casos_clinicos cc
      INNER JOIN asignaciones_casos ac ON cc.id = ac.caso_id
      LEFT JOIN respuestas_estudiantes re
        ON ac.id = re.asignacion_id
        AND re.estudiante_id = ?
      LEFT JOIN retroalimentaciones f ON re.id = f.respuesta_id
      WHERE ac.curso_id = ? AND cc.activo = true AND ac.activo = true
      ORDER BY ac.fecha_asignacion DESC
    `, { replacements: [req.user.id, cursoId] });

    // Calcular progreso de fases para cada caso
    for (let caseItem of cases) {
      if (caseItem.respuesta_id) {
        const [completedPhases] = await sequelize.query(`
          SELECT COUNT(*) as completadas
          FROM respuestas_fases
          WHERE respuesta_id = ? AND completada = true
        `, { replacements: [caseItem.respuesta_id] });

        caseItem.fasesCompletadas = parseInt(completedPhases[0].completadas);
        caseItem.progresoPorcentaje = caseItem.total_fases > 0
          ? Math.round((caseItem.fasesCompletadas / caseItem.total_fases) * 100)
          : 0;
      } else {
        caseItem.fasesCompletadas = 0;
        caseItem.progresoPorcentaje = 0;
      }
    }

    res.json({ cases });
  } catch (error) {
    console.error('Error al obtener casos del curso:', error);
    res.status(500).json({ error: 'Error al obtener casos' });
  }
};

module.exports = exports;