import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudentResponse } from '../../services/api';
import Navbar from '../common/Navbar';
import './ViewFeedback.css';

const ViewFeedback = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [response, setResponse] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [assignmentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getStudentResponse(assignmentId);
      setResponse(res.data.response);
      setFeedback(res.data.feedback);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (nota) => {
    if (nota >= 70) return 'grade-excellent';
    if (nota >= 60) return 'grade-good';
    if (nota >= 50) return 'grade-regular';
    return 'grade-low';
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="loading">Cargando...</div>
      </div>
    );
  }

  if (!response) {
    return (
      <div>
        <Navbar />
        <div className="container">
          <div className="alert alert-warning">No se encontró tu respuesta</div>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Volver</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <h1>Retroalimentación</h1>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Volver</button>
        </div>

        {/* Calificación */}
        {feedback && (
          <div className="card grade-card">
            <div className="grade-header">
              <h2>Tu Calificación</h2>
              {feedback.nota > 0 ? (
                <div className={`grade-display ${getGradeColor(feedback.nota)}`}>
                  <span className="grade-number">{feedback.nota}</span>
                  <span className="grade-total">/100</span>
                </div>
              ) : (
                <div className="ai-badge">
                  <span className="ai-icon"></span>
                  <span className="ai-text">Análisis de IA</span>
                </div>
              )}
            </div>

            {feedback.nota > 0 && (
              <div className="grade-status">
                {feedback.nota >= 70 && <div className="status-message success">✓ ¡Excelente trabajo!</div>}
                {feedback.nota >= 60 && feedback.nota < 70 && <div className="status-message good">✓ Buen trabajo</div>}
                {feedback.nota >= 50 && feedback.nota < 60 && <div className="status-message regular">⚠️ Aprobado con observaciones</div>}
                {feedback.nota < 50 && <div className="status-message low">✗ No aprobado</div>}
              </div>
            )}

            {feedback.nota === 0 && (
              <div className="ai-info-banner">
                <h3>Análisis Preliminar con IA</h3>
                <p>Esta retroalimentación fue generada automáticamente. El docente revisará y asignará la calificación final.</p>
              </div>
            )}

            <div className="feedback-section">
              <h3>{feedback.nota > 0 ? 'Comentarios del Docente' : 'Análisis de la IA'}</h3>
              <div className="feedback-content">
                {feedback.comentarios.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tu Respuesta */}
        <div className="card">
          <h2>Tu Respuesta</h2>

          {response.diagnostico && (
            <div className="response-section">
              <h3>Diagnóstico</h3>
              <div className="response-content">{response.diagnostico}</div>
            </div>
          )}

          {response.tratamiento && (
            <div className="response-section">
              <h3>Tratamiento</h3>
              <div className="response-content">{response.tratamiento}</div>
            </div>
          )}

          {response.archivoAdjunto && (
            <div className="response-section">
              <h3>📎 Archivo Adjunto</h3>
              <a href={`http://localhost:5000/${response.archivoAdjunto}`} target="_blank" rel="noopener noreferrer" className="file-link">
                Ver archivo
              </a>
            </div>
          )}
        </div>

        {!feedback && response.estado === 'enviado' && (
          <div className="card info-card">
            <h3>Pendiente de Calificación</h3>
            <p>Tu respuesta está pendiente de revisión.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewFeedback;