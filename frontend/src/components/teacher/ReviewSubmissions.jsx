import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingResponses } from '../../services/api';
import Navbar from '../common/Navbar';
import './ReviewSubmissions.css';

const ReviewSubmissions = () => {
  const navigate = useNavigate();
  const [pendingList, setPendingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadPendingResponses();
  }, []);

  const loadPendingResponses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPendingResponses();
      setPendingList(response.data.pending || []);
    } catch (error) {
      console.error('Error al cargar entregas:', error);
      setError('Error al cargar entregas pendientes');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const getNivelColor = (nivel) => {
    if (nivel === 'avanzado')   return 'badge-danger';
    if (nivel === 'intermedio') return 'badge-warning';
    return 'badge-success';
  };

  const formatMinutos = (minutos) => {
    if (!minutos) return 'N/A';
    if (minutos < 60) return `${minutos} min`;
    return `${Math.floor(minutos / 60)}h ${minutos % 60}min`;
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="loading">Cargando entregas pendientes...</div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="container">

        <div className="page-header">
          <h1>Revisar Entregas</h1>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/teacher/dashboard')}
          >
            ← Volver al Dashboard
          </button>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}

        {error && (
          <div className="alert alert-error">
            {error}
            <button
              className="btn btn-primary btn-sm"
              onClick={loadPendingResponses}
              style={{ marginLeft: '10px' }}
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Resumen */}
        <div className="stats-summary">
          <div className="stat-item">
            <span className="stat-label">Entregas Pendientes:</span>
            <span
              className="stat-value"
              style={{ color: pendingList.length > 0 ? '#dc3545' : '#28a745' }}
            >
              {pendingList.length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Con nota sugerida por IA:</span>
            <span className="stat-value" style={{ color: '#667eea' }}>
              {pendingList.filter(p => p.ia_nota_sugerida).length}
            </span>
          </div>
        </div>

        {pendingList.length === 0 ? (
          <div className="empty-state">
            <h2>✓ ¡No hay entregas pendientes!</h2>
            <p>Todas las respuestas han sido calificadas</p>
            <button
              className="btn btn-primary"
              onClick={loadPendingResponses}
              style={{ marginTop: '20px' }}
            >
              Actualizar
            </button>
          </div>
        ) : (
          <div className="card">
            <h2>Entregas por Calificar ({pendingList.length})</h2>
            <p className="card-subtitle">
              Haz clic en "Ver y Calificar" para revisar el razonamiento del estudiante
              fase por fase junto con el análisis de la IA.
            </p>

            <div className="submissions-list">
              {pendingList.map((item) => (
                <div key={item.id} className="submission-card">

                  {/* Info del estudiante y caso */}
                  <div className="submission-main">
                    <div className="submission-info">
                      <h3>{item.nombre} {item.apellido}</h3>
                      <small>{item.email}</small>
                      <div className="submission-meta">
                        <span className="meta-caso"> {item.tituloCaso}</span>
                        <span className="meta-curso"> {item.nombreCurso}</span>
                      </div>
                    </div>

                    <div className="submission-stats">
                      {/* Nivel de dificultad */}
                      {item.nivel_dificultad && (
                        <span className={`badge ${getNivelColor(item.nivel_dificultad)}`}>
                          {item.nivel_dificultad}
                        </span>
                      )}

                      {/* Progreso de fases */}
                      <div className="fases-progreso">
                        <span className="fases-label">
                          {item.fase_actual}/{item.total_fases} fases
                        </span>
                        <div className="fases-barra">
                          <div
                            className="fases-fill"
                            style={{
                              width: `${(item.fase_actual / item.total_fases) * 100}%`
                            }}
                          />
                        </div>
                      </div>

                      {/* Tiempo empleado */}
                      <div className="tiempo-info">
                        ⏱ {formatMinutos(item.tiempo_total_minutos)}
                      </div>

                      {/* Nota sugerida por IA */}
                      {item.ia_nota_sugerida && (
                        <div className="ia-sugerencia">
                           IA sugiere: <strong>{parseFloat(item.ia_nota_sugerida).toFixed(1)}/100</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer con fecha y acciones */}
                  <div className="submission-footer">
                    <span className="submission-fecha">
                      Enviado: {new Date(item.fecha_envio).toLocaleString()}
                    </span>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate(`/teacher/review/${item.id}`)}
                    >
                      Ver y Calificar →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewSubmissions;