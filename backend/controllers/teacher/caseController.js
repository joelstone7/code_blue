const ClinicalCase = require('../../models/ClinicalCase');
const CasePhase = require('../../models/CasePhase');
const CaseResource = require('../../models/CaseResource');
const CaseAssignment = require('../../models/CaseAssignment');
const { sequelize } = require('../../config/database');
const path = require('path');

// ── Normaliza la ruta del archivo para que funcione como URL ──
// Convierte uploads\archivo.jpg → uploads/archivo.jpg
const normalizePath = (filePath) => {
  return filePath.replace(/\\/g, '/');
};

// ─────────────────────────────────────────────────────────────
// Obtener todos los casos del docente autenticado
// ─────────────────────────────────────────────────────────────
exports.getTeacherCases = async (req, res) => {
  try {
    const cases = await ClinicalCase.findAll({
      where: { docenteId: req.user.id },
      order: [['fechaCreacion', 'DESC']]
    });

    for (let clinicalCase of cases) {
      const phases = await CasePhase.findAll({
        where: { casoId: clinicalCase.id },
        order: [['numeroFase', 'ASC']]
      });
      const resources = await CaseResource.findAll({
        where: { casoId: clinicalCase.id, faseId: null }
      });
      clinicalCase.dataValues.fases = phases;
      clinicalCase.dataValues.recursos = resources;
    }

    res.json({ cases });
  } catch (error) {
    console.error('Error al obtener casos:', error);
    res.status(500).json({ error: 'Error al obtener casos' });
  }
};

// ─────────────────────────────────────────────────────────────
// Obtener caso por ID con todas sus fases y recursos
// ─────────────────────────────────────────────────────────────
exports.getCaseById = async (req, res) => {
  try {
    const { id } = req.params;

    const clinicalCase = await ClinicalCase.findByPk(id);

    if (!clinicalCase) {
      return res.status(404).json({ error: 'Caso no encontrado' });
    }

    if (clinicalCase.docenteId !== req.user.id) {
      return res.status(403).json({
        error: 'No tienes permisos para ver este caso'
      });
    }

    // Obtener fases con sus recursos
    const phases = await CasePhase.findAll({
      where: { casoId: clinicalCase.id },
      order: [['numeroFase', 'ASC']]
    });

    for (let phase of phases) {
      const phaseResources = await CaseResource.findAll({
        where: { faseId: phase.id }
      });
      // Normalizar rutas de archivos
      phase.dataValues.recursos = phaseResources.map(r => ({
        ...r.dataValues,
        rutaArchivo: normalizePath(r.rutaArchivo)
      }));
    }

    // Recursos generales del caso
    const generalResources = await CaseResource.findAll({
      where: { casoId: clinicalCase.id, faseId: null }
    });

    const normalizedResources = generalResources.map(r => ({
      ...r.dataValues,
      rutaArchivo: normalizePath(r.rutaArchivo)
    }));

    // Asignaciones del caso a cursos
    const [assignments] = await sequelize.query(`
      SELECT ac.*, c.nombre as nombreCurso, c.codigo as codigoCurso
      FROM asignaciones_casos ac
      INNER JOIN cursos c ON ac.curso_id = c.id
      WHERE ac.caso_id = ?
    `, { replacements: [clinicalCase.id] });

    res.json({
      case: clinicalCase,
      phases,
      resources: normalizedResources,
      assignments
    });
  } catch (error) {
    console.error('Error al obtener caso:', error);
    res.status(500).json({ error: 'Error al obtener caso' });
  }
};

// ─────────────────────────────────────────────────────────────
// Crear caso clínico con sus fases
// ─────────────────────────────────────────────────────────────
exports.createCase = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      titulo,
      descripcion,
      pacienteEdad,
      pacienteSexo,
      pacienteOcupacion,
      antecedentesPersonales,
      antecedentesEpidemiologicos,
      motivoConsulta,
      tiempoEvolucion,
      diagnosticoCorrecto,
      tratamientoCorrecto,
      nivelDificultad,
      fases
    } = req.body;

    if (!titulo || !motivoConsulta) {
      await t.rollback();
      return res.status(400).json({
        error: 'Título y motivo de consulta son requeridos'
      });
    }

    if (!fases || JSON.parse(fases).length === 0) {
      await t.rollback();
      return res.status(400).json({
        error: 'El caso debe tener al menos una fase'
      });
    }

    const fasesArray = JSON.parse(fases);

    // Crear el caso clínico
    const clinicalCase = await ClinicalCase.create({
      titulo,
      descripcion,
      docenteId: req.user.id,
      pacienteEdad: pacienteEdad ? parseInt(pacienteEdad) : null,
      pacienteSexo: pacienteSexo || null,
      pacienteOcupacion: pacienteOcupacion || null,
      antecedentesPersonales: antecedentesPersonales || null,
      antecedentesEpidemiologicos: antecedentesEpidemiologicos || null,
      motivoConsulta,
      tiempoEvolucion: tiempoEvolucion || null,
      diagnosticoCorrecto: diagnosticoCorrecto || null,
      tratamientoCorrecto: tratamientoCorrecto || null,
      nivelDificultad: nivelDificultad || 'intermedio',
      totalFases: fasesArray.length
    }, { transaction: t });

    // Crear cada fase del caso
    for (let i = 0; i < fasesArray.length; i++) {
      const fase = fasesArray[i];

      await CasePhase.create({
        casoId: clinicalCase.id,
        numeroFase: i + 1,
        tipoFase: fase.tipoFase,
        titulo: fase.titulo,
        contenido: fase.contenido,
        datosLaboratorio: fase.datosLaboratorio || null,
        signosVitales: fase.signosVitales || null,
        preguntaPrincipal: fase.preguntaPrincipal,
        preguntasSecundarias: fase.preguntasSecundarias || null,
        pista: fase.pista || null,
        puntosPenalizacionPista: fase.puntosPenalizacionPista || 5.00
      }, { transaction: t });
    }

    // Manejar archivos subidos
    if (req.files && req.files.length > 0) {
      const phasesCreated = await CasePhase.findAll({
        where: { casoId: clinicalCase.id },
        order: [['numeroFase', 'ASC']],
        transaction: t
      });

      for (const file of req.files) {
        let tipoRecurso = 'otro';
        if (file.mimetype.startsWith('image/')) tipoRecurso = 'imagen';
        else if (file.mimetype === 'application/pdf') tipoRecurso = 'pdf';
        else if (file.mimetype.startsWith('video/')) tipoRecurso = 'video';

        let faseId = null;
        if (file.fieldname.startsWith('recursos_fase_')) {
          const faseIndex = parseInt(file.fieldname.replace('recursos_fase_', ''));
          if (phasesCreated[faseIndex]) {
            faseId = phasesCreated[faseIndex].id;
          }
        }

        // ✅ CORREGIDO: normalizar ruta para que funcione como URL
        await CaseResource.create({
          casoId: clinicalCase.id,
          faseId,
          tipoRecurso,
          nombreArchivo: file.originalname,
          rutaArchivo: normalizePath(file.path),
          tamanioBytes: file.size,
          descripcion: file.originalname
        }, { transaction: t });
      }
    }

    await t.commit();

    res.status(201).json({
      message: 'Caso clínico creado exitosamente',
      case: clinicalCase
    });
  } catch (error) {
    await t.rollback();
    console.error('Error al crear caso:', error);
    res.status(500).json({ error: 'Error al crear caso clínico' });
  }
};

// ─────────────────────────────────────────────────────────────
// Actualizar información general del caso
// ─────────────────────────────────────────────────────────────
exports.updateCase = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titulo,
      descripcion,
      pacienteEdad,
      pacienteSexo,
      pacienteOcupacion,
      antecedentesPersonales,
      antecedentesEpidemiologicos,
      motivoConsulta,
      tiempoEvolucion,
      diagnosticoCorrecto,
      tratamientoCorrecto,
      nivelDificultad,
      activo
    } = req.body;

    const clinicalCase = await ClinicalCase.findByPk(id);

    if (!clinicalCase) {
      return res.status(404).json({ error: 'Caso no encontrado' });
    }

    if (clinicalCase.docenteId !== req.user.id) {
      return res.status(403).json({
        error: 'No tienes permisos para modificar este caso'
      });
    }

    await clinicalCase.update({
      titulo:                     titulo || clinicalCase.titulo,
      descripcion:                descripcion !== undefined ? descripcion : clinicalCase.descripcion,
      pacienteEdad:               pacienteEdad !== undefined ? pacienteEdad : clinicalCase.pacienteEdad,
      pacienteSexo:               pacienteSexo !== undefined ? pacienteSexo : clinicalCase.pacienteSexo,
      pacienteOcupacion:          pacienteOcupacion !== undefined ? pacienteOcupacion : clinicalCase.pacienteOcupacion,
      antecedentesPersonales:     antecedentesPersonales !== undefined ? antecedentesPersonales : clinicalCase.antecedentesPersonales,
      antecedentesEpidemiologicos: antecedentesEpidemiologicos !== undefined ? antecedentesEpidemiologicos : clinicalCase.antecedentesEpidemiologicos,
      motivoConsulta:             motivoConsulta || clinicalCase.motivoConsulta,
      tiempoEvolucion:            tiempoEvolucion !== undefined ? tiempoEvolucion : clinicalCase.tiempoEvolucion,
      diagnosticoCorrecto:        diagnosticoCorrecto !== undefined ? diagnosticoCorrecto : clinicalCase.diagnosticoCorrecto,
      tratamientoCorrecto:        tratamientoCorrecto !== undefined ? tratamientoCorrecto : clinicalCase.tratamientoCorrecto,
      nivelDificultad:            nivelDificultad || clinicalCase.nivelDificultad,
      activo:                     activo !== undefined ? activo : clinicalCase.activo
    });

    res.json({
      message: 'Caso actualizado exitosamente',
      case: clinicalCase
    });
  } catch (error) {
    console.error('Error al actualizar caso:', error);
    res.status(500).json({ error: 'Error al actualizar caso' });
  }
};

// ─────────────────────────────────────────────────────────────
// Actualizar una fase específica del caso
// ─────────────────────────────────────────────────────────────
exports.updatePhase = async (req, res) => {
  try {
    const { caseId, phaseId } = req.params;
    const {
      titulo,
      contenido,
      datosLaboratorio,
      signosVitales,
      preguntaPrincipal,
      preguntasSecundarias,
      pista,
      puntosPenalizacionPista
    } = req.body;

    const clinicalCase = await ClinicalCase.findOne({
      where: { id: caseId, docenteId: req.user.id }
    });

    if (!clinicalCase) {
      return res.status(403).json({
        error: 'No tienes permisos para modificar este caso'
      });
    }

    const phase = await CasePhase.findOne({
      where: { id: phaseId, casoId: caseId }
    });

    if (!phase) {
      return res.status(404).json({ error: 'Fase no encontrada' });
    }

    await phase.update({
      titulo:                  titulo || phase.titulo,
      contenido:               contenido || phase.contenido,
      datosLaboratorio:        datosLaboratorio !== undefined ? datosLaboratorio : phase.datosLaboratorio,
      signosVitales:           signosVitales !== undefined ? signosVitales : phase.signosVitales,
      preguntaPrincipal:       preguntaPrincipal || phase.preguntaPrincipal,
      preguntasSecundarias:    preguntasSecundarias !== undefined ? preguntasSecundarias : phase.preguntasSecundarias,
      pista:                   pista !== undefined ? pista : phase.pista,
      puntosPenalizacionPista: puntosPenalizacionPista || phase.puntosPenalizacionPista
    });

    res.json({
      message: 'Fase actualizada exitosamente',
      phase
    });
  } catch (error) {
    console.error('Error al actualizar fase:', error);
    res.status(500).json({ error: 'Error al actualizar fase' });
  }
};

// ─────────────────────────────────────────────────────────────
// Eliminar caso clínico (soft delete)
// ─────────────────────────────────────────────────────────────
exports.deleteCase = async (req, res) => {
  try {
    const { id } = req.params;

    const clinicalCase = await ClinicalCase.findByPk(id);

    if (!clinicalCase) {
      return res.status(404).json({ error: 'Caso no encontrado' });
    }

    if (clinicalCase.docenteId !== req.user.id) {
      return res.status(403).json({
        error: 'No tienes permisos para eliminar este caso'
      });
    }

    await clinicalCase.update({ activo: false });

    res.json({ message: 'Caso eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar caso:', error);
    res.status(500).json({ error: 'Error al eliminar caso' });
  }
};

// ─────────────────────────────────────────────────────────────
// Asignar caso a un curso
// ─────────────────────────────────────────────────────────────
exports.assignCaseToCourse = async (req, res) => {
  try {
    const { casoId, cursoId, fechaVencimiento, fechaLimite } = req.body;

    if (!casoId || !cursoId) {
      return res.status(400).json({
        error: 'Caso y curso son requeridos'
      });
    }

    const clinicalCase = await ClinicalCase.findOne({
      where: { id: casoId, docenteId: req.user.id }
    });

    if (!clinicalCase) {
      return res.status(404).json({
        error: 'Caso no encontrado o no tienes permisos'
      });
    }

    const phaseCount = await CasePhase.count({ where: { casoId } });

    if (phaseCount === 0) {
      return res.status(400).json({
        error: 'El caso debe tener al menos una fase antes de asignarlo'
      });
    }

    const [courseCheck] = await sequelize.query(`
      SELECT * FROM curso_docente 
      WHERE curso_id = ? AND docente_id = ?
    `, { replacements: [cursoId, req.user.id] });

    if (courseCheck.length === 0) {
      return res.status(403).json({
        error: 'No estás asignado a este curso'
      });
    }

    const assignment = await CaseAssignment.create({
      casoId,
      cursoId,
      fechaVencimiento: fechaVencimiento || null,
      fechaLimite: fechaLimite || null
    });

    res.status(201).json({
      message: 'Caso asignado al curso exitosamente',
      assignment
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: 'El caso ya está asignado a este curso'
      });
    }
    console.error('Error al asignar caso:', error);
    res.status(500).json({ error: 'Error al asignar caso' });
  }
};

module.exports = exports;