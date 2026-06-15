import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTeacherCases, getTeacherCourses, assignCase, deleteCase } from '../../services/api';
import Navbar from '../common/Navbar';
import './MyCases.css';

const MyCases = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [casesRes, coursesRes] = await Promise.all([
        getTeacherCases(),
        getTeacherCourses()
      ]);
      setCases(casesRes.data.cases);
      setCourses(coursesRes.data.courses);
    } catch (error) {
      showMessage('error', 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const openAssignModal = (caseItem) => {
    setSelectedCase(caseItem);
    setShowAssignModal(true);
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedCase(null);
    setSelectedCourse('');
    setFechaVencimiento('');
    setFechaLimite('');
  };

  const handleAssign = async (e) => {
    e.preventDefault();

    if (!selectedCourse) {
      showMessage('error', 'Selecciona un curso');
      return;
    }

    try {
      await assignCase({
        casoId: selectedCase.id,
        cursoId: parseInt(selectedCourse),
        fechaVencimiento: fechaVencimiento || null,
        fechaLimite: fechaLimite || null
      });
      showMessage('success', 'Caso asignado al curso exitosamente');
      closeAssignModal();
      loadData();
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Error al asignar caso');
    }
  };

  const handleDelete = async (caseId, caseTitle) => {
    if (window.confirm(`¿Estás seguro de eliminar el caso "${caseTitle}"?`)) {
      try {
        await deleteCase(caseId);
        showMessage('success', 'Caso eliminado exitosamente');
        loadData();
      } catch (error) {
        showMessage('error', 'Error al eliminar caso');
      }
    }
  };

  const getNivelBadge = (nivel) => {
    if (nivel === 'avanzado')   return 'badge-danger';
    if (nivel === 'intermedio') return 'badge-warning';
    return 'badge-success';
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="loading">Cargando casos...</div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <h1>Mis Casos Clínicos</h1>
          <button className="btn btn-primary" onClick={() => navigate('/teacher/create-case')}>
            + Crear Nuevo Caso
          </button>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}

        <div className="stats-summary">
          <div className="stat-item">
            <span className="stat-label">Total Casos:</span>
            <span className="stat-value">{cases.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Casos Activos:</span>
            <span className="stat-value">{cases.filter(c => c.activo).length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Mis Cursos:</span>
            <span className="stat-value">{courses.length}</span>
          </div>
        </div>

        {cases.length === 0 ? (
          <div className="empty-state">
            <h2>No has creado casos clínicos aún</h2>
            <p>Crea tu primer caso clínico para asignarlo a tus cursos</p>
            <button className="btn btn-primary" onClick={() => navigate('/teacher/create-case')}>
              Crear Primer Caso
            </button>
          </div>
        ) : (
          <div className="cases-grid">
            {cases.map((caseItem) => (
              <div key={caseItem.id} className="case-card">

                {/* Header */}
                <div className="case-header">
                  <h3>{caseItem.titulo}</h3>
                  <div className="case-header-badges">
                    <span className={`badge ${caseItem.activo ? 'badge-success' : 'badge-danger'}`}>
                      {caseItem.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    {caseItem.nivel_dificultad && (
                      <span className={`badge ${getNivelBadge(caseItem.nivel_dificultad)}`}>
                        {caseItem.nivel_dificultad}
                      </span>
                    )}
                  </div>
                </div>

                {caseItem.descripcion && (
                  <p className="case-description">{caseItem.descripcion}</p>
                )}

                {/* Info del caso */}
                <div className="case-info">

                  {/* Motivo de consulta — nuevo campo principal */}
                  {caseItem.motivo_consulta && (
                    <div className="info-item">
                      <span className="info-label">Motivo de consulta</span>
                      <span className="info-value">
                        {caseItem.motivo_consulta.length > 100
                          ? `${caseItem.motivo_consulta.substring(0, 100)}...`
                          : caseItem.motivo_consulta}
                      </span>
                    </div>
                  )}

                  {/* Datos del paciente */}
                  {(caseItem.paciente_edad || caseItem.paciente_sexo) && (
                    <div className="info-item">
                      <span className="info-label">Paciente</span>
                      <span className="info-value">
                        {[
                          caseItem.paciente_edad ? `${caseItem.paciente_edad} años` : null,
                          caseItem.paciente_sexo
                        ].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  )}

                  {/* Fases del caso — nuevo */}
                  <div className="info-item">
                    <span className="info-label">Fases</span>
                    <span className="info-value">
                      <span className="fases-count">{caseItem.total_fases || 0}</span>
                      {caseItem.fases && caseItem.fases.length > 0 && (
                        <span className="fases-tipos">
                          {caseItem.fases.map(f => f.tipoFase || f.tipo_fase).join(' → ')}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Recursos */}
                  {caseItem.recursos && caseItem.recursos.length > 0 && (
                    <div className="info-item">
                      <span className="info-label">Recursos</span>
                      <span className="info-value">
                        {caseItem.recursos.length} archivo(s) adjunto(s)
                      </span>
                    </div>
                  )}

                  {/* Fecha */}
                  <div className="info-item">
                    <span className="info-label">Creado</span>
                    <span className="info-value">
                      {new Date(caseItem.fecha_creacion || caseItem.fechaCreacion).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="case-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => openAssignModal(caseItem)}
                    disabled={!caseItem.activo}
                  >
                    Asignar a Curso
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate(`/teacher/case/${caseItem.id}`)}
                  >
                    Ver Detalles
                  </button>
                  {caseItem.activo && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(caseItem.id, caseItem.titulo)}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal para asignar caso a curso */}
        {showAssignModal && (
          <div className="modal-overlay" onClick={closeAssignModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Asignar Caso a Curso</h2>
                <button className="modal-close" onClick={closeAssignModal}>×</button>
              </div>

              <form onSubmit={handleAssign}>
                <div className="assignment-info">
                  <h3>{selectedCase?.titulo}</h3>
                  {selectedCase?.total_fases && (
                    <p>{selectedCase.total_fases} fase(s) · {selectedCase.nivel_dificultad}</p>
                  )}
                </div>

                <div className="form-group">
                  <label>Seleccionar Curso *</label>
                  <select
                    className="form-control"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.nombre} ({course.codigo})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Fecha de Vencimiento (Opcional)</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                  />
                  <small className="form-text">
                    Fecha recomendada para completar el caso
                  </small>
                </div>

                <div className="form-group">
                  <label>Fecha Límite (Opcional)</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={fechaLimite}
                    onChange={(e) => setFechaLimite(e.target.value)}
                  />
                  <small className="form-text">
                    Fecha máxima para enviar respuestas
                  </small>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeAssignModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Asignar al Curso
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCases;