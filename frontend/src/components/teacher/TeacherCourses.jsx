import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTeacherCourses, getCourseById } from '../../services/api';
import Navbar from '../common/Navbar';
import './TeacherCourses.css';

const TeacherCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseDetails, setCourseDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await getTeacherCourses();
      setCourses(response.data.courses);
    } catch (error) {
      console.error('Error al cargar cursos:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (course) => {
    try {
      setSelectedCourse(course);
      const response = await getCourseById(course.id);
      setCourseDetails(response.data);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error al cargar detalles:', error);
    }
  };

  const closeDetails = () => {
    setShowDetailsModal(false);
    setSelectedCourse(null);
    setCourseDetails(null);
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="loading">Cargando cursos...</div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <h1>Mis Cursos Asignados</h1>
          <button className="btn btn-secondary" onClick={() => navigate('/teacher/dashboard')}>
            ← Volver al Dashboard
          </button>
        </div>

        {courses.length === 0 ? (
          <div className="empty-state">
            <h2>No tienes cursos asignados</h2>
            <p>El administrador debe asignarte a cursos para que puedas crear y asignar casos clínicos</p>
          </div>
        ) : (
          <>
            <div className="stats-summary">
              <div className="stat-item">
                <span className="stat-label">Total Cursos:</span>
                <span className="stat-value">{courses.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Estudiantes:</span>
                <span className="stat-value">
                  {courses.reduce((sum, course) => sum + (parseInt(course.totalEstudiantes) || 0), 0)}
                </span>
              </div>
            </div>

            <div className="courses-grid">
              {courses.map((course) => (
                <div key={course.id} className="course-card">
                  <div className="course-header">
                    <h3>{course.nombre}</h3>
                    <span className="badge badge-info">{course.codigo}</span>
                  </div>

                  <div className="course-info">
                    <div className="info-row">
                      <span className="info-icon"></span>
                      <span>{course.semestre} - {course.anio}</span>
                    </div>

                    <div className="info-row">
                      <span className="info-icon"></span>
                      <span>{course.totalEstudiantes || 0} estudiantes inscritos</span>
                    </div>

                    {course.descripcion && (
                      <p className="course-description">{course.descripcion}</p>
                    )}
                  </div>

                  <div className="course-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => openDetails(course)}
                    >
                      Ver Estudiantes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Modal de detalles del curso */}
        {showDetailsModal && courseDetails && (
          <div className="modal-overlay" onClick={closeDetails}>
            <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedCourse.nombre}</h2>
                <button className="modal-close" onClick={closeDetails}>×</button>
              </div>

              <div className="course-details">
                <div className="detail-section">
                  <h3>Información del Curso</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Código:</span>
                      <span className="detail-value">{courseDetails.course.codigo}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Semestre:</span>
                      <span className="detail-value">{courseDetails.course.semestre}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Año:</span>
                      <span className="detail-value">{courseDetails.course.anio}</span>
                    </div>
                  </div>
                  {courseDetails.course.descripcion && (
                    <p className="course-full-description">{courseDetails.course.descripcion}</p>
                  )}
                </div>

                <div className="detail-section">
                  <h3>Estudiantes Inscritos ({courseDetails.students?.length || 0})</h3>
                  {courseDetails.students && courseDetails.students.length > 0 ? (
                    <div className="students-list">
                      {courseDetails.students.map((student) => (
                        <div key={student.id} className="student-item">
                          <div className="student-info">
                            <strong>{student.nombre} {student.apellido}</strong>
                            <small>{student.email}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-text">No hay estudiantes inscritos en este curso</p>
                  )}
                </div>

                {courseDetails.teachers && courseDetails.teachers.length > 1 && (
                  <div className="detail-section">
                    <h3>Otros Docentes</h3>
                    <div className="teachers-list">
                      {courseDetails.teachers.map((teacher) => (
                        <div key={teacher.id} className="teacher-item">
                          <strong>{teacher.nombre} {teacher.apellido}</strong>
                          <small>{teacher.email}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherCourses;