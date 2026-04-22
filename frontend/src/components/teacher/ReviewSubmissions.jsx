import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingResponses, gradeResponse } from '../../services/api';
import Navbar from '../common/Navbar';
import './ReviewSubmissions.css';

const ReviewSubmissions = () => {
  const navigate = useNavigate();
  const [pendingList, setPendingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [error, setError] = useState(null);

  const [gradeData, setGradeData] = useState({
    nota: '',
    comentarios: ''
  });

  useEffect(() => {
    loadPendingResponses();
  }, []);

  const loadPendingResponses = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Cargando entregas pendientes...');
      
      const response = await getPendingResponses();
      
      console.log('Response completa:', response);
      console.log('Pending data:', response.data);
      console.log('Pending array:', response.data.pending);
      
      const pendingData = response.data.pending || [];
      setPendingList(pendingData);
      
      console.log(`Se cargaron ${pendingData.length} entregas pendientes`);
      
    } catch (error) {
      console.error('Error al cargar entregas:', error);
      console.error('Error details:', error.response?.data);
      setError('Error al cargar entregas pendientes');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const openGradeModal = (response) => {
    console.log('Abriendo modal para calificar:', response);
    setSelectedResponse(response);
    setGradeData({ nota: '', comentarios: '' });
    setShowGradeModal(true);
  };

  const closeGradeModal = () => {
    setShowGradeModal(false);
    setSelectedResponse(null);
    setGradeData({ nota: '', comentarios: '' });
  };

  const handleGrade = async (e) => {
    e.preventDefault();

    if (!gradeData.nota || gradeData.nota < 0 || gradeData.nota > 100) {
      showMessage('error', 'La nota debe estar entre 0 y 100');
      return;
    }

    try {
      console.log('Guardando calificación:', {
        respuestaId: selectedResponse.id,
        nota: parseFloat(gradeData.nota),
        comentarios: gradeData.comentarios
      });

      await gradeResponse({
        respuestaId: selectedResponse.id,
        nota: parseFloat(gradeData.nota),
        comentarios: gradeData.comentarios
      });
      
      showMessage('success', 'Calificación guardada exitosamente');
      closeGradeModal();
      loadPendingResponses();
    } catch (error) {
      console.error('Error al calificar:', error);
      showMessage('error', error.response?.data?.error || 'Error al calificar');
    }
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
          <button className="btn btn-secondary" onClick={() => navigate('/teacher/dashboard')}>
            ← Volver al Dashboard
          </button>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            {error}
            <button 
              className="btn btn-primary" 
              onClick={loadPendingResponses}
              style={{ marginLeft: '10px' }}
            >
              Reintentar
            </button>
          </div>
        )}

        <div className="stats-summary">
          <div className="stat-item">
            <span className="stat-label">Entregas Pendientes:</span>
            <span className="stat-value" style={{ color: pendingList.length > 0 ? '#dc3545' : '#28a745' }}>
              {pendingList.length}
            </span>
          </div>
        </div>

        {pendingList.length === 0 ? (
          <div className="empty-state">
            <h2>¡No hay entregas pendientes!</h2>
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
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Caso Clínico</th>
                    <th>Curso</th>
                    <th>Fecha de Envío</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingList.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.nombre} {item.apellido}</strong>
                        <br />
                        <small style={{ color: '#666' }}>{item.email}</small>
                      </td>
                      <td>{item.tituloCaso}</td>
                      <td>{item.nombreCurso}</td>
                      <td>{new Date(item.fecha_envio).toLocaleString()}</td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => openGradeModal(item)}
                        >
                          Calificar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal para calificar */}
        {showGradeModal && selectedResponse && (
          <div className="modal-overlay" onClick={closeGradeModal}>
            <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Calificar Entrega</h2>
                <button className="modal-close" onClick={closeGradeModal}>×</button>
              </div>

              <div className="submission-details">
                <div className="detail-card">
                  <h3>Información del Estudiante</h3>
                  <p><strong>Nombre:</strong> {selectedResponse.nombre} {selectedResponse.apellido}</p>
                  <p><strong>Email:</strong> {selectedResponse.email}</p>
                  <p><strong>Caso:</strong> {selectedResponse.tituloCaso}</p>
                  <p><strong>Curso:</strong> {selectedResponse.nombreCurso}</p>
                  <p><strong>Fecha de Envío:</strong> {new Date(selectedResponse.fecha_envio).toLocaleString()}</p>
                </div>

                <div className="detail-card">
                  <h3>Respuesta del Estudiante</h3>
                  
                  {selectedResponse.diagnostico && (
                    <div className="response-section">
                      <h4>Diagnóstico:</h4>
                      <p className="response-text">{selectedResponse.diagnostico}</p>
                    </div>
                  )}

                  {selectedResponse.tratamiento && (
                    <div className="response-section">
                      <h4>Tratamiento Propuesto:</h4>
                      <p className="response-text">{selectedResponse.tratamiento}</p>
                    </div>
                  )}

                  {selectedResponse.respuestas_preguntas && (
                    <div className="response-section">
                      <h4>Respuestas a Preguntas:</h4>
                      <div className="questions-answers">
                        {(() => {
                          try {
                            const respuestas = typeof selectedResponse.respuestas_preguntas === 'string' 
                              ? JSON.parse(selectedResponse.respuestas_preguntas) 
                              : selectedResponse.respuestas_preguntas;
                            
                            return Object.entries(respuestas).map(([key, value], index) => (
                              <div key={index} className="qa-item">
                                <strong>Pregunta {parseInt(key) + 1}:</strong>
                                <p>{value}</p>
                              </div>
                            ));
                          } catch (error) {
                            console.error('Error parsing respuestas_preguntas:', error);
                            return <p>Error al cargar respuestas</p>;
                          }
                        })()}
                      </div>
                    </div>
                  )}

                  {selectedResponse.archivo_adjunto && (
                    <div className="response-section">
                      <h4>Archivo Adjunto:</h4>
                      <a
                        href={`http://localhost:5000/${selectedResponse.archivo_adjunto}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="file-link"
                      >
                        📎 Ver archivo adjunto
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleGrade}>
                <div className="grading-section">
                  <h3>Calificación</h3>

                  <div className="form-group">
                    <label>Nota (0-100) *</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      max="100"
                      step="0.5"
                      value={gradeData.nota}
                      onChange={(e) => setGradeData({ ...gradeData, nota: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Comentarios y Retroalimentación *</label>
                    <textarea
                      className="form-control"
                      rows="6"
                      placeholder="Proporciona retroalimentación constructiva al estudiante..."
                      value={gradeData.comentarios}
                      onChange={(e) => setGradeData({ ...gradeData, comentarios: e.target.value })}
                      required
                    />
                    <small className="form-text">
                      Incluye puntos fuertes, áreas de mejora y sugerencias
                    </small>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeGradeModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-success">
                    ✓ Guardar Calificación
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

export default ReviewSubmissions;