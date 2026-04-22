const StudentResponse = require('../models/StudentResponse');
const Feedback = require('../models/Feedback');
const ClinicalCase = require('../models/ClinicalCase');
const { sequelize } = require('../config/database');
const { generateFeedback } = require('../services/ollamaService');

// Enviar respuesta de estudiante
exports.submitResponse = async (req, res) => {
  try {
    const { asignacionId, diagnostico, tratamiento, respuestasPreguntas, timeSpent } = req.body;

    console.log('📝 Recibiendo respuesta del estudiante:', {
      asignacionId,
      diagnostico: diagnostico ? 'Sí' : 'No',
      tratamiento: tratamiento ? 'Sí' : 'No',
      timeSpent
    });

    if (!asignacionId) {
      return res.status(400).json({ 
        error: 'ID de asignación es requerido' 
      });
    }

    // Verificar que la asignación existe y el estudiante está inscrito
    const [assignment] = await sequelize.query(`
      SELECT ac.*, ce.estudiante_id, cc.id as caso_id
      FROM asignaciones_casos ac
      INNER JOIN curso_estudiante ce ON ac.curso_id = ce.curso_id
      INNER JOIN casos_clinicos cc ON ac.caso_id = cc.id
      WHERE ac.id = ? AND ce.estudiante_id = ?
    `, { replacements: [asignacionId, req.user.id] });

    if (assignment.length === 0) {
      return res.status(403).json({ 
        error: 'No tienes acceso a este caso' 
      });
    }

    console.log('✅ Asignación válida encontrada');

    // Verificar si ya existe una respuesta
    let response = await StudentResponse.findOne({
      where: { 
        asignacionId,
        estudianteId: req.user.id 
      }
    });

    const responseData = {
      diagnostico,
      tratamiento,
      respuestasPreguntas: respuestasPreguntas ? JSON.parse(respuestasPreguntas) : null,
      archivoAdjunto: req.file ? req.file.path : null,
      estado: 'enviado',
      fechaEnvio: new Date()
    };

    if (response) {
      // Actualizar respuesta existente
      console.log('📝 Actualizando respuesta existente');
      await response.update(responseData);
    } else {
      // Crear nueva respuesta
      console.log('📝 Creando nueva respuesta');
      response = await StudentResponse.create({
        asignacionId,
        estudianteId: req.user.id,
        ...responseData
      });
    }

    console.log('✅ Respuesta guardada con ID:', response.id);

    // 🤖 GENERAR RETROALIMENTACIÓN AUTOMÁTICA CON IA
    console.log('🤖 Iniciando generación de retroalimentación con IA...');
    
    try {
      // Obtener datos del caso clínico
      const clinicalCase = await ClinicalCase.findByPk(assignment[0].caso_id);
      
      if (!clinicalCase) {
        console.log('⚠️ No se encontró el caso clínico');
        throw new Error('Caso clínico no encontrado');
      }

      console.log('📋 Caso clínico cargado:', clinicalCase.titulo);
      
      // Generar retroalimentación con IA
      const iaFeedback = await generateFeedback(
        {
          titulo: clinicalCase.titulo,
          historiaClinica: clinicalCase.historiaClinica,
          signosVitales: clinicalCase.signosVitales
        },
        {
          diagnostico,
          tratamiento
        },
        timeSpent ? parseInt(timeSpent) : null
      );

      console.log('🤖 Feedback generado:', iaFeedback.success ? 'Exitoso' : 'Fallido');

      if (iaFeedback.success) {
        console.log('💾 Guardando retroalimentación de IA...');
        
        // Verificar si ya existe retroalimentación
        const existingFeedback = await Feedback.findOne({
          where: { respuestaId: response.id }
        });

        if (existingFeedback) {
          // Actualizar retroalimentación existente
          await existingFeedback.update({
            nota: 0,
            comentarios: `🤖 **Retroalimentación Automática con IA**\n\n${iaFeedback.feedback}\n\n---\n*Esta retroalimentación fue generada automáticamente. El docente revisará y proporcionará la calificación final.*`,
            docenteId: req.user.id
          });
          console.log('✅ Retroalimentación actualizada');
        } else {
          // Crear nueva retroalimentación
          await Feedback.create({
            respuestaId: response.id,
            docenteId: req.user.id,
            nota: 0,
            comentarios: `🤖 **Retroalimentación Automática con IA**\n\n${iaFeedback.feedback}\n\n---\n*Esta retroalimentación fue generada automáticamente. El docente revisará y proporcionará la calificación final.*`
          });
          console.log('✅ Retroalimentación creada');
        }
      } else {
        console.log('⚠️ IA no generó retroalimentación, usando fallback');
        // Crear retroalimentación por defecto
        await Feedback.create({
          respuestaId: response.id,
          docenteId: req.user.id,
          nota: 0,
          comentarios: iaFeedback.feedback
        });
      }
    } catch (iaError) {
      console.error('❌ Error en generación de IA:', iaError.message);
      console.error('Stack:', iaError.stack);
      
      // Crear retroalimentación por defecto si falla la IA
      try {
        await Feedback.create({
          respuestaId: response.id,
          docenteId: req.user.id,
          nota: 0,
          comentarios: `📋 **Retroalimentación Automática**\n\nTu respuesta ha sido registrada correctamente.\n\n**Diagnóstico:** ${diagnostico ? '✓ Proporcionado' : '⚠ No proporcionado'}\n**Tratamiento:** ${tratamiento ? '✓ Proporcionado' : '⚠ No proporcionado'}\n\nEl docente revisará tu respuesta pronto.`
        });
        console.log('✅ Retroalimentación por defecto creada');
      } catch (fallbackError) {
        console.error('❌ Error al crear retroalimentación por defecto:', fallbackError);
      }
    }

    res.json({ 
      message: 'Respuesta enviada exitosamente. La IA ha generado retroalimentación preliminar.',
      response
    });
  } catch (error) {
    console.error('❌ Error general al enviar respuesta:', error);
    res.status(500).json({ error: 'Error al enviar respuesta' });
  }
};

// Obtener respuesta del estudiante para un caso
exports.getStudentResponse = async (req, res) => {
  try {
    const { asignacionId } = req.params;

    const response = await StudentResponse.findOne({
      where: { 
        asignacionId,
        estudianteId: req.user.id 
      }
    });

    if (!response) {
      return res.json({ response: null });
    }

    // Obtener retroalimentación si existe
    const feedback = await Feedback.findOne({
      where: { respuestaId: response.id }
    });

    res.json({ 
      response,
      feedback
    });
  } catch (error) {
    console.error('Error al obtener respuesta:', error);
    res.status(500).json({ error: 'Error al obtener respuesta' });
  }
};

// Obtener todas las respuestas de un caso (para docentes)
exports.getCaseResponses = async (req, res) => {
  try {
    const { asignacionId } = req.params;

    // Verificar que el caso pertenece al docente
    const [assignment] = await sequelize.query(`
      SELECT ac.*, cc.docente_id
      FROM asignaciones_casos ac
      INNER JOIN casos_clinicos cc ON ac.caso_id = cc.id
      WHERE ac.id = ? AND cc.docente_id = ?
    `, { replacements: [asignacionId, req.user.id] });

    if (assignment.length === 0) {
      return res.status(403).json({ 
        error: 'No tienes permisos para ver estas respuestas' 
      });
    }

    // Obtener respuestas con datos del estudiante
    const [responses] = await sequelize.query(`
      SELECT 
        re.*,
        u.nombre,
        u.apellido,
        u.email,
        f.nota,
        f.comentarios,
        f.fecha_retroalimentacion
      FROM respuestas_estudiantes re
      INNER JOIN usuarios u ON re.estudiante_id = u.id
      LEFT JOIN retroalimentaciones f ON re.id = f.respuesta_id
      WHERE re.asignacion_id = ?
      ORDER BY re.fecha_envio DESC
    `, { replacements: [asignacionId] });

    res.json({ responses });
  } catch (error) {
    console.error('Error al obtener respuestas:', error);
    res.status(500).json({ error: 'Error al obtener respuestas' });
  }
};

// Calificar respuesta (docente)
exports.gradeResponse = async (req, res) => {
  try {
    const { respuestaId, nota, comentarios } = req.body;

    if (!respuestaId || nota === undefined) {
      return res.status(400).json({ 
        error: 'ID de respuesta y nota son requeridos' 
      });
    }

    // Validar nota
    if (nota < 0 || nota > 100) {
      return res.status(400).json({ 
        error: 'La nota debe estar entre 0 y 100' 
      });
    }

    // Verificar que la respuesta existe
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

    // Verificar si ya existe retroalimentación
    let feedback = await Feedback.findOne({
      where: { respuestaId }
    });

    if (feedback) {
      // Actualizar retroalimentación existente
      await feedback.update({
        nota,
        comentarios,
        docenteId: req.user.id
      });
    } else {
      // Crear nueva retroalimentación
      feedback = await Feedback.create({
        respuestaId,
        docenteId: req.user.id,
        nota,
        comentarios
      });
    }

    // Actualizar estado de la respuesta
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

// Obtener respuestas pendientes del docente
// Este es solo el método getPendingResponses corregido
// Reemplaza SOLO este método en tu responseController.js

// Obtener respuestas pendientes del docente
exports.getPendingResponses = async (req, res) => {
  try {
    const docenteId = req.user.id;

    console.log('🔍 Buscando respuestas pendientes para docente ID:', docenteId);

    const [pending] = await sequelize.query(`
      SELECT 
        re.id,
        re.asignacion_id,
        re.diagnostico,
        re.tratamiento,
        re.respuestas_preguntas,
        re.archivo_adjunto,
        re.estado,
        re.fecha_envio,
        u.id as estudiante_id,
        u.nombre,
        u.apellido,
        u.email,
        cc.id as caso_id,
        cc.titulo as tituloCaso,
        c.id as curso_id,
        c.nombre as nombreCurso
      FROM respuestas_estudiantes re
      INNER JOIN usuarios u ON re.estudiante_id = u.id
      INNER JOIN asignaciones_casos ac ON re.asignacion_id = ac.id
      INNER JOIN casos_clinicos cc ON ac.caso_id = cc.id
      INNER JOIN cursos c ON ac.curso_id = c.id
      WHERE cc.docente_id = ? 
        AND re.estado = 'enviado'
      ORDER BY re.fecha_envio ASC
    `, { replacements: [docenteId] });

    console.log(`✅ Se encontraron ${pending.length} respuestas pendientes`);
    
    if (pending.length > 0) {
      console.log('📋 Primera respuesta pendiente:', {
        id: pending[0].id,
        estudiante: `${pending[0].nombre} ${pending[0].apellido}`,
        caso: pending[0].tituloCaso,
        fecha: pending[0].fecha_envio
      });
    }

    res.json({ pending });
  } catch (error) {
    console.error('❌ Error al obtener respuestas pendientes:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Error al obtener respuestas pendientes' });
  }
};

module.exports = exports;