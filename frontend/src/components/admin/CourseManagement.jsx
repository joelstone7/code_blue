import { useState, useEffect } from 'react';
import { 
  getCourses, 
  getCourseById, 
  createCourse, 
  updateCourse, 
  deleteCourse,
  assignTeacher,
  removeTeacher,
  enrollStudent,
  removeStudent,
  getTeachers,
  getStudents
} from '../../services/api';
import Navbar from '../common/Navbar';
import './CourseManagement.css';

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseDetails, setCourseDetails] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [courseFormData, setCourseFormData] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    semestre: '',
    anio: new Date().getFullYear(),
    activo: true
  });

  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [coursesRes, teachersRes, studentsRes] = await Promise.all([
        getCourses(),
        getTeachers(),
        getStudents()
      ]);
      setCourses(coursesRes.data.courses);
      setTeachers(teachersRes.data.teachers);
      setStudents(studentsRes.data.students);
    } catch (error) {
      showMessage('error', 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadCourseDetails = async (courseId) => {
    try {
      const response = await getCourseById(courseId);
      setCourseDetails(response.data);
    } catch (error) {
      showMessage('error', 'Error al cargar detalles del curso');
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const openCourseModal = (course = null) => {
    if (course) {
      setEditingCourse(course);
      setCourseFormData({
        nombre: course.nombre,
        codigo: course.codigo,
        descripcion: course.descripcion || '',
        semestre: course.semestre || '',
        anio: course.anio || new Date().getFullYear(),
        activo: course.activo
      });
    } else {
      setEditingCourse(null);
      setCourseFormData({
        nombre: '',
        codigo: '',
        descripcion: '',
        semestre: '',
        anio: new Date().getFullYear(),
        activo: true
      });
    }
    setShowCourseModal(true);
  };

  const closeCourseModal = () => {
    setShowCourseModal(false);
    setEditingCourse(null);
  };

  const openManageModal = async (course) => {
    setSelectedCourse(course);
    await loadCourseDetails(course.id);
    setShowManageModal(true);
  };

  const closeManageModal = () => {
    setShowManageModal(false);
    setSelectedCourse(null);
    setCourseDetails(null);
    setSelectedTeacher('');
    setSelectedStudent('');
  };

  const handleCourseSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingCourse) {
        await updateCourse(editingCourse.id, courseFormData);
        showMessage('success', 'Curso actualizado exitosamente');
      } else {
        await createCourse(courseFormData);
        showMessage('success', 'Curso creado exitosamente');
      }
      closeCourseModal();
      loadData();
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Error al guardar curso');
    }
  };

  const handleDeleteCourse = async (courseId, courseName) => {
    if (window.confirm(`¿Estás seguro de desactivar el curso "${courseName}"?`)) {
      try {
        await deleteCourse(courseId);
        showMessage('success', 'Curso desactivado exitosamente');
        loadData();
      } catch (error) {
        showMessage('error', 'Error al desactivar curso');
      }
    }
  };

  const handleAssignTeacher = async () => {
    if (!selectedTeacher) {
      showMessage('error', 'Selecciona un docente');
      return;
    }

    try {
      await assignTeacher({
        cursoId: selectedCourse.id,
        docenteId: parseInt(selectedTeacher)
      });
      showMessage('success', 'Docente asignado exitosamente');
      setSelectedTeacher('');
      await loadCourseDetails(selectedCourse.id);
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Error al asignar docente');
    }
  };

  const handleRemoveTeacher = async (teacherId, teacherName) => {
    if (window.confirm(`¿Remover a ${teacherName} de este curso?`)) {
      try {
        await removeTeacher({
          cursoId: selectedCourse.id,
          docenteId: teacherId
        });
        showMessage('success', 'Docente removido exitosamente');
        await loadCourseDetails(selectedCourse.id);
      } catch (error) {
        showMessage('error', 'Error al remover docente');
      }
    }
  };

  const handleEnrollStudent = async () => {
    if (!selectedStudent) {
      showMessage('error', 'Selecciona un estudiante');
      return;
    }

    try {
      await enrollStudent({
        cursoId: selectedCourse.id,
        estudianteId: parseInt(selectedStudent)
      });
      showMessage('success', 'Estudiante inscrito exitosamente');
      setSelectedStudent('');
      await loadCourseDetails(selectedCourse.id);
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Error al inscribir estudiante');
    }
  };

  const handleRemoveStudent = async (studentId, studentName) => {
    if (window.confirm(`¿Remover a ${studentName} de este curso?`)) {
      try {
        await removeStudent({
          cursoId: selectedCourse.id,
          estudianteId: studentId
        });
        showMessage('success', 'Estudiante removido exitosamente');
        await loadCourseDetails(selectedCourse.id);
      } catch (error) {
        showMessage('error', 'Error al remover estudiante');
      }
    }
  };

  if (loading) {
    return <div className="loading">Cargando cursos...</div>;
  }

  return (
    <div>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <h1>Gestión de Cursos</h1>
          <button className="btn btn-primary" onClick={() => openCourseModal()}>
            Crear Curso
          </button>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="stats-summary">
          <div className="stat-item">
            <span className="stat-label">Total Cursos:</span>
            <span className="stat-value">{courses.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Cursos Activos:</span>
            <span className="stat-value">{courses.filter(c => c.activo).length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Docentes Disponibles:</span>
            <span className="stat-value">{teachers.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Estudiantes Disponibles:</span>
            <span className="stat-value">{students.length}</span>
          </div>
        </div>

        <div className="courses-grid">
          {courses.length === 0 ? (
            <div className="empty-state">
              <p>No hay cursos creados aún</p>
              <button className="btn btn-primary" onClick={() => openCourseModal()}>
                Crear primer curso
              </button>
            </div>
          ) : (
            courses.map((course) => (
              <div key={course.id} className="course-card">
                <div className="course-header">
                  <h3>{course.nombre}</h3>
                  <span className={`badge ${course.activo ? 'badge-success' : 'badge-danger'}`}>
                    {course.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="course-info">
                  <p><strong>Código:</strong> {course.codigo}</p>
                  <p><strong>Semestre:</strong> {course.semestre || 'N/A'}</p>
                  <p><strong>Año:</strong> {course.anio || 'N/A'}</p>
                  {course.descripcion && (
                    <p className="course-description">{course.descripcion}</p>
                  )}
                </div>
                <div className="course-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => openManageModal(course)}
                  >
                    Gestionar
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => openCourseModal(course)}
                  >
                    Editar
                  </button>
                  {course.activo && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteCourse(course.id, course.nombre)}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal para crear/editar curso */}
        {showCourseModal && (
          <div className="modal-overlay" onClick={closeCourseModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingCourse ? 'Editar Curso' : 'Crear Nuevo Curso'}</h2>
                <button className="modal-close" onClick={closeCourseModal}>×</button>
              </div>

              <form onSubmit={handleCourseSubmit}>
                <div className="form-group">
                  <label>Nombre del Curso *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={courseFormData.nombre}
                    onChange={(e) => setCourseFormData({ ...courseFormData, nombre: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Código *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: MED-101"
                    value={courseFormData.codigo}
                    onChange={(e) => setCourseFormData({ ...courseFormData, codigo: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={courseFormData.descripcion}
                    onChange={(e) => setCourseFormData({ ...courseFormData, descripcion: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Semestre</label>
                    <select
                      className="form-control"
                      value={courseFormData.semestre}
                      onChange={(e) => setCourseFormData({ ...courseFormData, semestre: e.target.value })}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="1er Semestre">1er Semestre</option>
                      <option value="2do Semestre">2do Semestre</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Año</label>
                    <input
                      type="number"
                      className="form-control"
                      value={courseFormData.anio}
                      onChange={(e) => setCourseFormData({ ...courseFormData, anio: parseInt(e.target.value) })}
                      min="2020"
                      max="2030"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Estado</label>
                  <select
                    className="form-control"
                    value={courseFormData.activo}
                    onChange={(e) => setCourseFormData({ ...courseFormData, activo: e.target.value === 'true' })}
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeCourseModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingCourse ? 'Actualizar' : 'Crear'} Curso
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal para gestionar docentes y estudiantes */}
        {showManageModal && courseDetails && (
          <div className="modal-overlay" onClick={closeManageModal}>
            <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Gestionar: {selectedCourse.nombre}</h2>
                <button className="modal-close" onClick={closeManageModal}>×</button>
              </div>

              <div className="manage-content">
                {/* Sección de Docentes */}
                <div className="manage-section">
                  <h3>Docentes Asignados ({courseDetails.teachers?.length || 0})</h3>
                  
                  <div className="assign-form">
                    <select
                      className="form-control"
                      value={selectedTeacher}
                      onChange={(e) => setSelectedTeacher(e.target.value)}
                    >
                      <option value="">Seleccionar docente...</option>
                      {teachers.filter(t => 
                        !courseDetails.teachers?.some(ct => ct.id === t.id)
                      ).map(teacher => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.nombre} {teacher.apellido} ({teacher.email})
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-primary"
                      onClick={handleAssignTeacher}
                      disabled={!selectedTeacher}
                    >
                      Asignar
                    </button>
                  </div>

                  <div className="members-list">
                    {courseDetails.teachers?.length === 0 ? (
                      <p className="empty-text">No hay docentes asignados</p>
                    ) : (
                      courseDetails.teachers?.map(teacher => (
                        <div key={teacher.id} className="member-item">
                          <div>
                            <strong>{teacher.nombre} {teacher.apellido}</strong>
                            <br />
                            <small>{teacher.email}</small>
                          </div>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRemoveTeacher(teacher.id, `${teacher.nombre} ${teacher.apellido}`)}
                          >
                            Remover
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Sección de Estudiantes */}
                <div className="manage-section">
                  <h3>Estudiantes Inscritos ({courseDetails.students?.length || 0})</h3>
                  
                  <div className="assign-form">
                    <select
                      className="form-control"
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                    >
                      <option value="">Seleccionar estudiante...</option>
                      {students.filter(s => 
                        !courseDetails.students?.some(cs => cs.id === s.id)
                      ).map(student => (
                        <option key={student.id} value={student.id}>
                          {student.nombre} {student.apellido} ({student.email})
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-success"
                      onClick={handleEnrollStudent}
                      disabled={!selectedStudent}
                    >
                      Inscribir
                    </button>
                  </div>

                  <div className="members-list">
                    {courseDetails.students?.length === 0 ? (
                      <p className="empty-text">No hay estudiantes inscritos</p>
                    ) : (
                      courseDetails.students?.map(student => (
                        <div key={student.id} className="member-item">
                          <div>
                            <strong>{student.nombre} {student.apellido}</strong>
                            <br />
                            <small>{student.email}</small>
                          </div>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRemoveStudent(student.id, `${student.nombre} ${student.apellido}`)}
                          >
                            Remover
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseManagement;