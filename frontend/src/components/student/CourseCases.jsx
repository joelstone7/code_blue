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
    if (caseItem.estadoRespuesta === 'en_progreso') {
      return <span className="badge badge-warning">En progreso</span>;
    }
    const isOverdue = caseItem.fecha_vencimiento &&
      new Date(caseItem.fecha_vencimiento) < new Date();
    if (isOverdue) {
      return <span className="badge badge-danger">Vencido</span>;
    }
    return <span className="badge badge-secondary">Pendiente</span>;
  };

  const getNivelColor = (nivel) => {
    if (nivel === 'avanzado')   return 'badge-danger';
    if (nivel === 'intermedio') return 'badge-warning';
    return 'badge-success';
  };

  const getActionButton = (caseItem) => {
    if (caseItem.estadoRespuesta === 'calificado') {
      return (
        <button
          className="btn btn-success"
          onClick={() => navigate(`/student/feedback/${caseItem.asignacionId}`)}
        >
          Ver Retroalimentación
        </button>
      );
    }
    if (caseItem.estadoRespuesta === 'enviado') {
      return (
        <button
          className="btn btn-secondary"
          onClick={() => navigate(`/student/feedback/${caseItem.asignacionId}`)}
        >
          Ver Análisis IA
        </button>
      );
    }
    if (caseItem.estadoRespuesta === 'en_progreso') {
      return (
        <button
          className="btn btn-warning"
          onClick={() => navigate(`/student/solve/${caseItem.asignacionId}`)}
        >
          Continuar Caso →
        </button>
      );
    }
    return (
      <button
        className="btn btn-primary"
        onClick={() => navigate(`/student/solve/${caseItem.asignacionId}`)}
      >
        Resolver Caso →
      </button>
    );
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
            <p className="course-title">
              {course?.nombre} ({course?.codigo})
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/student/dashboard')}
          >
            ← Volver
          </button>
        </div>

        {/* Resumen */}
        <div className="stats-summary">
          <div className="stat-item">
            <span className="stat-label">Total Casos:</span>
            <span className="stat-value">{cases.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Calificados:</span>
            <span className="stat-value">
              {cases.filter(c => c.estadoRespuesta === 'calificado').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">En progreso:</span>
            <span className="stat-value">
              {cases.filter(c => c.estadoRespuesta === 'en_progreso').length}
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
              <div
                key={caseItem.asignacionId}
                className={`case-item ${caseItem.estadoRespuesta === 'en_progreso' ? 'case-in-progress' : ''}`}
              >
                <div className="case-main">
                  <div className="case-info">

                    {/* Título y badges */}
                    <div className="case-title-row">
                      <h3>{caseItem.titulo}</h3>
                      <div className="case-badges">
                        {getStatusBadge(caseItem)}
                        {caseItem.nivel_dificultad && (
                          <span className={`badge ${getNivelColor(caseItem.nivel_dificultad)}`}>
                            {caseItem.nivel_dificultad}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Descripción */}
                    {caseItem.descripcion && (
                      <p className="case-description">{caseItem.descripcion}</p>
                    )}

                    {/* Info del paciente */}
                    {(caseItem.paciente_edad || caseItem.motivo_consulta) && (
                      <p className="case-paciente">
                        {caseItem.paciente_edad && `${caseItem.paciente_edad} años`}
                        {caseItem.paciente_edad && caseItem.paciente_sexo && ' · '}
                        {caseItem.paciente_sexo}
                        {caseItem.motivo_consulta && (
                          <span> — {caseItem.motivo_consulta.substring(0, 80)}
                            {caseItem.motivo_consulta.length > 80 ? '...' : ''}
                          </span>
                        )}
                      </p>
                    )}

                    {/* Barra de progreso de fases */}
                    {caseItem.total_fases > 0 && (
                      <div className="fases-progreso">
                        <div className="fases-progreso-info">
                          <span>
                            {caseItem.fasesCompletadas || 0}/{caseItem.total_fases} fases
                          </span>
                          <span>{caseItem.progresoPorcentaje || 0}%</span>
                        </div>
                        <div className="fases-barra">
                          <div
                            className={`fases-fill ${
                              caseItem.estadoRespuesta === 'calificado' ? 'fill-calificado' :
                              caseItem.estadoRespuesta === 'enviado'    ? 'fill-enviado' :
                              caseItem.estadoRespuesta === 'en_progreso' ? 'fill-progreso' :
                              'fill-vacio'
                            }`}
                            style={{ width: `${caseItem.progresoPorcentaje || 0}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Metadatos */}
                    <div className="case-meta">
                      {caseItem.fecha_vencimiento && (
                        <span className={`meta-item ${
                          new Date(caseItem.fecha_vencimiento) < new Date() &&
                          caseItem.estadoRespuesta !== 'calificado' &&
                          caseItem.estadoRespuesta !== 'enviado'
                            ? 'meta-vencido' : ''
                        }`}>
                          📅 Vence: {new Date(caseItem.fecha_vencimiento).toLocaleDateString()}
                        </span>
                      )}
                      {caseItem.fecha_envio && (
                        <span className="meta-item meta-enviado">
                          ✓ Enviado: {new Date(caseItem.fecha_envio).toLocaleDateString()}
                        </span>
                      )}
                      {caseItem.tiempo_total_minutos && (
                        <span className="meta-item">
                          ⏱ {caseItem.tiempo_total_minutos} min
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Nota */}
                  <div className="case-status">
                    {(caseItem.nota !== null && caseItem.nota !== undefined && caseItem.nota > 0) && (
                      <div className="case-grade">
                        <span className="grade-label">Nota</span>
                        <span className={`grade-value ${
                          caseItem.nota >= 70 ? 'grade-good' :
                          caseItem.nota >= 60 ? 'grade-regular' :
                          'grade-low'
                        }`}>
                          {parseFloat(caseItem.nota).toFixed(1)}
                        </span>
                        <span className="grade-total">/100</span>
                      </div>
                    )}
                    {caseItem.ia_nota_sugerida && !caseItem.nota && (
                      <div className="case-grade ia-grade">
                        <span className="grade-label"> IA</span>
                        <span className="grade-value grade-ia">
                          {parseFloat(caseItem.ia_nota_sugerida).toFixed(1)}
                        </span>
                        <span className="grade-total">/100</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="case-actions">
                  {getActionButton(caseItem)}
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