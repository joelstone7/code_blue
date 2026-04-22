const ClinicalCase = require('../models/ClinicalCase');
const CaseResource = require('../models/CaseResource');
const CaseAssignment = require('../models/CaseAssignment');
const { sequelize } = require('../config/database');

// Obtener todos los casos clínicos del docente
exports.getTeacherCases = async (req, res) => {
  try {
    const cases = await ClinicalCase.findAll({
      where: { docenteId: req.user.id },
      order: [['fechaCreacion', 'DESC']]
    });

    // Obtener recursos de cada caso
    for (let clinicalCase of cases) {
      const resources = await CaseResource.findAll({
        where: { casoId: clinicalCase.id }
      });
      clinicalCase.dataValues.recursos = resources;
    }

    res.json({ cases });
  } catch (error) {
    console.error('Error al obtener casos:', error);
    res.status(500).json({ error: 'Error al obtener casos' });
  }
};

// Obtener caso por ID con detalles
exports.getCaseById = async (req, res) => {
  try {
    const { id } = req.params;

    // Primero intentamos como ID de caso clínico directo
    let clinicalCase = await ClinicalCase.findByPk(id);
    
    // Si no se encuentra, intentamos como ID de asignación
    if (!clinicalCase) {
      const [assignment] = await sequelize.query(`
        SELECT cc.* 
        FROM casos_clinicos cc
        INNER JOIN asignaciones_casos ac ON cc.id = ac.caso_id
        WHERE ac.id = ?
      `, { replacements: [id] });
      
      if (assignment && assignment.length > 0) {
        clinicalCase = assignment[0];
      }
    }
    
    if (!clinicalCase) {
      return res.status(404).json({ error: 'Caso no encontrado' });
    }

    // Verificar permisos según rol
    if (req.user.rol === 'docente' && clinicalCase.docenteId !== req.user.id) {
      return res.status(403).json({ 
        error: 'No tienes permisos para ver este caso' 
      });
    }

    // Para estudiantes, verificar que esté inscrito en el curso
    if (req.user.rol === 'estudiante') {
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
    }

    // Obtener recursos
    const resources = await CaseResource.findAll({
      where: { casoId: clinicalCase.id }
    });

    // Obtener preguntas
    const [questions] = await sequelize.query(`
      SELECT * FROM preguntas_caso 
      WHERE caso_id = ? 
      ORDER BY orden
    `, { replacements: [clinicalCase.id] });

    // Obtener asignaciones
    const [assignments] = await sequelize.query(`
      SELECT ac.*, c.nombre as nombreCurso, c.codigo as codigoCurso
      FROM asignaciones_casos ac
      INNER JOIN cursos c ON ac.curso_id = c.id
      WHERE ac.caso_id = ?
    `, { replacements: [clinicalCase.id] });

    res.json({ 
      case: clinicalCase,
      resources,
      questions,
      assignments
    });
  } catch (error) {
    console.error('Error al obtener caso:', error);
    res.status(500).json({ error: 'Error al obtener caso' });
  }
};

// Crear caso clínico
exports.createCase = async (req, res) => {
  try {
    const { titulo, descripcion, historiaClinica, signosVitales, preguntas } = req.body;

    if (!titulo || !historiaClinica) {
      return res.status(400).json({ 
        error: 'Título e historia clínica son requeridos' 
      });
    }

    const clinicalCase = await ClinicalCase.create({
      titulo,
      descripcion,
      historiaClinica,
      signosVitales: signosVitales ? JSON.parse(signosVitales) : null,
      docenteId: req.user.id
    });

    // Insertar preguntas si existen
    if (preguntas) {
      const preguntasArray = JSON.parse(preguntas);
      for (let i = 0; i < preguntasArray.length; i++) {
        const p = preguntasArray[i];
        await sequelize.query(`
          INSERT INTO preguntas_caso 
          (caso_id, tipo_pregunta, enunciado, opciones, respuesta_correcta, puntos, orden)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, { 
          replacements: [
            clinicalCase.id, 
            p.tipoPregunta, 
            p.enunciado, 
            p.opciones ? JSON.stringify(p.opciones) : null,
            p.respuestaCorrecta || null,
            p.puntos || 0,
            i
          ] 
        });
      }
    }

    // Manejar archivos subidos
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        let tipoRecurso = 'otro';
        if (file.mimetype.startsWith('image/')) tipoRecurso = 'imagen';
        else if (file.mimetype === 'application/pdf') tipoRecurso = 'pdf';
        else if (file.mimetype.startsWith('video/')) tipoRecurso = 'video';

        await CaseResource.create({
          casoId: clinicalCase.id,
          tipoRecurso,
          nombreArchivo: file.originalname,
          rutaArchivo: file.path,
          tamanioBytes: file.size
        });
      }
    }

    res.status(201).json({ 
      message: 'Caso clínico creado exitosamente',
      case: clinicalCase
    });
  } catch (error) {
    console.error('Error al crear caso:', error);
    res.status(500).json({ error: 'Error al crear caso clínico' });
  }
};

// Actualizar caso clínico
exports.updateCase = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, historiaClinica, signosVitales, activo } = req.body;

    const clinicalCase = await ClinicalCase.findByPk(id);
    
    if (!clinicalCase) {
      return res.status(404).json({ error: 'Caso no encontrado' });
    }

    // Verificar que el docente es el creador
    if (clinicalCase.docenteId !== req.user.id) {
      return res.status(403).json({ 
        error: 'No tienes permisos para modificar este caso' 
      });
    }

    await clinicalCase.update({
      titulo: titulo || clinicalCase.titulo,
      descripcion: descripcion !== undefined ? descripcion : clinicalCase.descripcion,
      historiaClinica: historiaClinica || clinicalCase.historiaClinica,
      signosVitales: signosVitales ? JSON.parse(signosVitales) : clinicalCase.signosVitales,
      activo: activo !== undefined ? activo : clinicalCase.activo
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

// Eliminar caso clínico
exports.deleteCase = async (req, res) => {
  try {
    const { id } = req.params;

    const clinicalCase = await ClinicalCase.findByPk(id);
    
    if (!clinicalCase) {
      return res.status(404).json({ error: 'Caso no encontrado' });
    }

    // Verificar que el docente es el creador
    if (clinicalCase.docenteId !== req.user.id) {
      return res.status(403).json({ 
        error: 'No tienes permisos para eliminar este caso' 
      });
    }

    await clinicalCase.update({ activo: false });

    res.json({ 
      message: 'Caso eliminado exitosamente' 
    });
  } catch (error) {
    console.error('Error al eliminar caso:', error);
    res.status(500).json({ error: 'Error al eliminar caso' });
  }
};

// Asignar caso a curso
exports.assignCaseToCourse = async (req, res) => {
  try {
    const { casoId, cursoId, fechaVencimiento, fechaLimite } = req.body;

    if (!casoId || !cursoId) {
      return res.status(400).json({ 
        error: 'Caso y curso son requeridos' 
      });
    }

    // Verificar que el caso existe y pertenece al docente
    const clinicalCase = await ClinicalCase.findOne({
      where: { id: casoId, docenteId: req.user.id }
    });

    if (!clinicalCase) {
      return res.status(404).json({ 
        error: 'Caso no encontrado o no tienes permisos' 
      });
    }

    // Verificar que el docente está asignado al curso
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

// Obtener casos asignados a un curso (para estudiantes)
exports.getCasesByCourse = async (req, res) => {
  try {
    const { cursoId } = req.params;

    // Verificar que el estudiante está inscrito en el curso
    const [enrollment] = await sequelize.query(`
      SELECT * FROM curso_estudiante 
      WHERE curso_id = ? AND estudiante_id = ?
    `, { replacements: [cursoId, req.user.id] });

    if (enrollment.length === 0) {
      return res.status(403).json({ 
        error: 'No estás inscrito en este curso' 
      });
    }

    // Obtener casos con estado de respuesta del estudiante
    const [cases] = await sequelize.query(`
      SELECT 
        cc.*,
        ac.id as asignacionId,
        ac.fecha_vencimiento,
        ac.fecha_limite,
        re.estado as estadoRespuesta,
        re.fecha_envio,
        f.nota
      FROM casos_clinicos cc
      INNER JOIN asignaciones_casos ac ON cc.id = ac.caso_id
      LEFT JOIN respuestas_estudiantes re ON ac.id = re.asignacion_id 
        AND re.estudiante_id = ?
      LEFT JOIN retroalimentaciones f ON re.id = f.respuesta_id
      WHERE ac.curso_id = ? AND cc.activo = true AND ac.activo = true
      ORDER BY ac.fecha_asignacion DESC
    `, { replacements: [req.user.id, cursoId] });

    res.json({ cases });
  } catch (error) {
    console.error('Error al obtener casos del curso:', error);
    res.status(500).json({ error: 'Error al obtener casos' });
  }
};

module.exports = exports;