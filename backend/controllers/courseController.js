const Course = require('../models/Course');
const User = require('../models/User');
const { sequelize } = require('../config/database');

// Obtener todos los cursos
exports.getAllCourses = async (req, res) => {
  try {
    const { activo } = req.query;
    
    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';

    const courses = await Course.findAll({ 
      where,
      order: [['fechaCreacion', 'DESC']]
    });

    res.json({ courses });
  } catch (error) {
    console.error('Error al obtener cursos:', error);
    res.status(500).json({ error: 'Error al obtener cursos' });
  }
};

// Obtener curso por ID con detalles
exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByPk(id);
    
    if (!course) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    // Obtener docentes asignados
    const [teachers] = await sequelize.query(`
      SELECT u.id, u.nombre, u.apellido, u.email
      FROM usuarios u
      INNER JOIN curso_docente cd ON u.id = cd.docente_id
      WHERE cd.curso_id = ? AND u.activo = true
    `, { replacements: [id] });

    // Obtener estudiantes inscritos
    const [students] = await sequelize.query(`
      SELECT u.id, u.nombre, u.apellido, u.email
      FROM usuarios u
      INNER JOIN curso_estudiante ce ON u.id = ce.estudiante_id
      WHERE ce.curso_id = ? AND u.activo = true
    `, { replacements: [id] });

    res.json({ 
      course,
      teachers,
      students
    });
  } catch (error) {
    console.error('Error al obtener curso:', error);
    res.status(500).json({ error: 'Error al obtener curso' });
  }
};

// Crear curso
exports.createCourse = async (req, res) => {
  try {
    const { nombre, codigo, descripcion, semestre, anio } = req.body;

    if (!nombre || !codigo) {
      return res.status(400).json({ 
        error: 'Nombre y código son requeridos' 
      });
    }

    // Verificar si el código ya existe
    const existingCourse = await Course.findOne({ where: { codigo } });
    if (existingCourse) {
      return res.status(400).json({ 
        error: 'El código de curso ya existe' 
      });
    }

    const course = await Course.create({
      nombre,
      codigo,
      descripcion,
      semestre,
      anio
    });

    res.status(201).json({ 
      message: 'Curso creado exitosamente',
      course 
    });
  } catch (error) {
    console.error('Error al crear curso:', error);
    res.status(500).json({ error: 'Error al crear curso' });
  }
};

// Actualizar curso
exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, codigo, descripcion, semestre, anio, activo } = req.body;

    const course = await Course.findByPk(id);
    
    if (!course) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    // Si se actualiza el código, verificar que no exista
    if (codigo && codigo !== course.codigo) {
      const existingCourse = await Course.findOne({ where: { codigo } });
      if (existingCourse) {
        return res.status(400).json({ 
          error: 'El código de curso ya existe' 
        });
      }
    }

    await course.update({
      nombre: nombre || course.nombre,
      codigo: codigo || course.codigo,
      descripcion: descripcion !== undefined ? descripcion : course.descripcion,
      semestre: semestre || course.semestre,
      anio: anio || course.anio,
      activo: activo !== undefined ? activo : course.activo
    });

    res.json({ 
      message: 'Curso actualizado exitosamente',
      course 
    });
  } catch (error) {
    console.error('Error al actualizar curso:', error);
    res.status(500).json({ error: 'Error al actualizar curso' });
  }
};

// Eliminar curso
exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByPk(id);
    
    if (!course) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    await course.update({ activo: false });

    res.json({ 
      message: 'Curso desactivado exitosamente' 
    });
  } catch (error) {
    console.error('Error al eliminar curso:', error);
    res.status(500).json({ error: 'Error al eliminar curso' });
  }
};

// Asignar docente a curso
exports.assignTeacher = async (req, res) => {
  try {
    const { cursoId, docenteId } = req.body;

    if (!cursoId || !docenteId) {
      return res.status(400).json({ 
        error: 'Curso y docente son requeridos' 
      });
    }

    // Verificar que el curso existe
    const course = await Course.findByPk(cursoId);
    if (!course) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    // Verificar que el docente existe y tiene el rol correcto
    const teacher = await User.findOne({ 
      where: { id: docenteId, rol: 'docente', activo: true } 
    });
    if (!teacher) {
      return res.status(404).json({ error: 'Docente no encontrado o inactivo' });
    }

    // Asignar docente
    await sequelize.query(
      'INSERT INTO curso_docente (curso_id, docente_id) VALUES (?, ?)',
      { replacements: [cursoId, docenteId] }
    );

    res.json({ 
      message: 'Docente asignado exitosamente' 
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        error: 'El docente ya está asignado a este curso' 
      });
    }
    console.error('Error al asignar docente:', error);
    res.status(500).json({ error: 'Error al asignar docente' });
  }
};

// Remover docente de curso
exports.removeTeacher = async (req, res) => {
  try {
    const { cursoId, docenteId } = req.body;

    await sequelize.query(
      'DELETE FROM curso_docente WHERE curso_id = ? AND docente_id = ?',
      { replacements: [cursoId, docenteId] }
    );

    res.json({ 
      message: 'Docente removido exitosamente' 
    });
  } catch (error) {
    console.error('Error al remover docente:', error);
    res.status(500).json({ error: 'Error al remover docente' });
  }
};

// Inscribir estudiante a curso
exports.enrollStudent = async (req, res) => {
  try {
    const { cursoId, estudianteId } = req.body;

    if (!cursoId || !estudianteId) {
      return res.status(400).json({ 
        error: 'Curso y estudiante son requeridos' 
      });
    }

    // Verificar que el curso existe
    const course = await Course.findByPk(cursoId);
    if (!course) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    // Verificar que el estudiante existe y tiene el rol correcto
    const student = await User.findOne({ 
      where: { id: estudianteId, rol: 'estudiante', activo: true } 
    });
    if (!student) {
      return res.status(404).json({ error: 'Estudiante no encontrado o inactivo' });
    }

    // Inscribir estudiante
    await sequelize.query(
      'INSERT INTO curso_estudiante (curso_id, estudiante_id) VALUES (?, ?)',
      { replacements: [cursoId, estudianteId] }
    );

    res.json({ 
      message: 'Estudiante inscrito exitosamente' 
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        error: 'El estudiante ya está inscrito en este curso' 
      });
    }
    console.error('Error al inscribir estudiante:', error);
    res.status(500).json({ error: 'Error al inscribir estudiante' });
  }
};

// Remover estudiante de curso
exports.removeStudent = async (req, res) => {
  try {
    const { cursoId, estudianteId } = req.body;

    await sequelize.query(
      'DELETE FROM curso_estudiante WHERE curso_id = ? AND estudiante_id = ?',
      { replacements: [cursoId, estudianteId] }
    );

    res.json({ 
      message: 'Estudiante removido exitosamente' 
    });
  } catch (error) {
    console.error('Error al remover estudiante:', error);
    res.status(500).json({ error: 'Error al remover estudiante' });
  }
};

// Obtener cursos del docente autenticado
exports.getTeacherCourses = async (req, res) => {
  try {
    const [courses] = await sequelize.query(`
      SELECT c.*, 
        COUNT(DISTINCT ce.estudiante_id) as totalEstudiantes
      FROM cursos c
      INNER JOIN curso_docente cd ON c.id = cd.curso_id
      LEFT JOIN curso_estudiante ce ON c.id = ce.curso_id
      WHERE cd.docente_id = ? AND c.activo = true
      GROUP BY c.id
      ORDER BY c.fecha_creacion DESC
    `, { replacements: [req.user.id] });

    res.json({ courses });
  } catch (error) {
    console.error('Error al obtener cursos del docente:', error);
    res.status(500).json({ error: 'Error al obtener cursos' });
  }
};

// Obtener cursos del estudiante autenticado
exports.getStudentCourses = async (req, res) => {
  try {
    const [courses] = await sequelize.query(`
      SELECT c.*
      FROM cursos c
      INNER JOIN curso_estudiante ce ON c.id = ce.curso_id
      WHERE ce.estudiante_id = ? AND c.activo = true
      ORDER BY c.fecha_creacion DESC
    `, { replacements: [req.user.id] });

    res.json({ courses });
  } catch (error) {
    console.error('Error al obtener cursos del estudiante:', error);
    res.status(500).json({ error: 'Error al obtener cursos' });
  }
};

module.exports = exports;