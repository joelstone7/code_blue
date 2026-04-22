import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCasesByCourse, getCourseById } from '../../services/api';
import Navbar from '../common/Navbar';
import './CourseCases.css';

const CourseCases = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [courseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [courseRes, casesRes] = await Promise.all([
        getCourseById(courseId),
        getCasesByCourse(courseId)
      ]);
      setCourse(courseRes.data.course);
      setCases(casesRes.data.cases);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (caseItem) => {
    if (caseItem.estadoRespuesta === 'calificado') {
      return <span className="badge badge-success">Calificado</span>;
    }
    if (caseItem.estadoRespuesta === 'enviado') {
      return <span className="badge badge-info">Enviado</span>;
    }
    const isOverdue = caseItem.fecha_vencimiento && new Date(caseItem.fecha_vencimiento) < new Date();
    if (isOverdue) {
      return <span className="badge badge-danger">Vencido</span>;
    }
    return <span className="badge badge-warning">Pendiente</span>;
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
          <div>
            <h1>Casos Clínicos</h1>
            <p className="course-title">{course?.nombre} ({course?.codigo})</p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/student/dashboard')}>
            ← Volver
          </button>
        </div>

        <div className="stats-summary">
          <div className="stat-item">
            <span className="stat-label">Total Casos:</span>
            <span className="stat-value">{cases.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Completados:</span>
            <span className="stat-value">
              {cases.filter(c => c.estadoRespuesta === 'calificado').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Pendientes:</span>
            <span className="stat-value">
              {cases.filter(c => !c.estadoRespuesta).length}
            </span>
          </div>
        </div>

        {cases.length === 0 ? (
          <div className="empty-state">
            <h2>No hay casos clínicos asignados</h2>
            <p>El docente aún no ha asignado casos a este curso</p>
          </div>
        ) : (
          <div className="cases-list">
            {cases.map((caseItem) => (
              <div key={caseItem.asignacionId} className="case-item">
                <div className="case-main">
                  <div className="case-info">
                    <h3>{caseItem.titulo}</h3>
                    {caseItem.descripcion && (
                      <p className="case-description">{caseItem.descripcion}</p>
                    )}
                    <div className="case-meta">
                      {caseItem.fecha_vencimiento && (
                        <span className="meta-item">
                          Vencimiento: {new Date(caseItem.fecha_vencimiento).toLocaleDateString()}
                        </span>
                      )}
                      {caseItem.fecha_envio && (
                        <span className="meta-item">
                          ✓ Enviado: {new Date(caseItem.fecha_envio).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="case-status">
                    {getStatusBadge(caseItem)}
                    {caseItem.nota !== null && caseItem.nota !== undefined && (
                      <div className="case-grade">
                        <span className="grade-label">Nota:</span>
                        <span className={`grade-value ${
                          caseItem.nota >= 70 ? 'grade-good' : 
                          caseItem.nota >= 60 ? 'grade-regular' : 
                          'grade-low'
                        }`}>
                          {caseItem.nota}/100
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="case-actions">
                  {caseItem.estadoRespuesta === 'calificado' ? (
                    <button
                      className="btn btn-success"
                      onClick={() => navigate(`/student/feedback/${caseItem.asignacionId}`)}
                    >
                      Ver Retroalimentación
                    </button>
                  ) : caseItem.estadoRespuesta === 'enviado' ? (
                    <button
                      className="btn btn-info"
                      onClick={() => navigate(`/student/feedback/${caseItem.asignacionId}`)}
                    >
                      Ver Estado
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate(`/student/solve/${caseItem.asignacionId}`)}
                    >
                      Resolver Caso
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseCases;