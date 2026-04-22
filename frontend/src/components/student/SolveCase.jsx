import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCaseById, submitResponse } from '../../services/api';
import Navbar from '../common/Navbar';
import './SolveCase.css';

const SolveCase = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Timer
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);

  const [formData, setFormData] = useState({
    diagnostico: '',
    tratamiento: '',
    archivo: null
  });

  useEffect(() => {
    loadCase();
    
    // Iniciar timer
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [assignmentId]);

  const loadCase = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/cases/${assignmentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }
      
      const data = await response.json();
      setCaseData(data);
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Error al cargar el caso' });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.diagnostico || !formData.tratamiento) {
      setMessage({ type: 'error', text: 'Diagnóstico y tratamiento son obligatorios' });
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);

    try {
      const data = new FormData();
      data.append('asignacionId', assignmentId);
      data.append('diagnostico', formData.diagnostico);
      data.append('tratamiento', formData.tratamiento);
      data.append('timeSpent', Math.floor(elapsedTime / 60));
      
      if (formData.archivo) {
        data.append('archivo', formData.archivo);
      }

      await submitResponse(data);
      setMessage({ type: 'success', text: '¡Respuesta enviada! La IA está generando retroalimentación...' });
      setTimeout(() => navigate(-1), 2000);
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Error al enviar respuesta' });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="loading">Cargando caso...</div>
      </div>
    );
  }

  if (!caseData || !caseData.case) {
    return (
      <div>
        <Navbar />
        <div className="container">
          <div className="alert alert-error">No se pudo cargar el caso</div>
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
          <div>
            <h1>Resolver Caso Clínico</h1>
            <div className="timer-display">
              Tiempo: <strong>{formatTime(elapsedTime)}</strong>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Volver</button>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}

        {/* Información del Caso */}
        <div className="card">
          <h2>{caseData.case.titulo}</h2>
          {caseData.case.descripcion && <p>{caseData.case.descripcion}</p>}

          <div className="case-section">
            <h3>Historia Clínica</h3>
            <div className="case-content">{caseData.case.historiaClinica}</div>
          </div>

          {caseData.case.signosVitales && (
            <div className="case-section">
              <h3>Signos Vitales</h3>
              <div className="vitals-grid">
                {Object.entries(caseData.case.signosVitales).map(([key, value]) => value && (
                  <div key={key} className="vital-item">
                    <span className="vital-label">{key}:</span>
                    <span className="vital-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {caseData.resources && caseData.resources.length > 0 && (
            <div className="case-section">
              <h3>📎 Recursos</h3>
              <div className="resources-list">
                {caseData.resources.map((r) => (
                  <a key={r.id} href={`http://localhost:5000/${r.rutaArchivo}`} target="_blank" rel="noopener noreferrer" className="resource-link">
                    📄 {r.nombreArchivo}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div className="card">
            <h2>Tu Respuesta</h2>

            <div className="form-group">
              <label>Diagnóstico *</label>
              <textarea
                className="form-control"
                rows="5"
                value={formData.diagnostico}
                onChange={(e) => setFormData({ ...formData, diagnostico: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Tratamiento Propuesto *</label>
              <textarea
                className="form-control"
                rows="5"
                value={formData.tratamiento}
                onChange={(e) => setFormData({ ...formData, tratamiento: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Archivo Adjunto (Opcional)</label>
              <input
                type="file"
                className="form-control"
                onChange={(e) => setFormData({ ...formData, archivo: e.target.files[0] })}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-success" disabled={submitting}>
              {submitting ? 'Enviando...' : '✓ Enviar Respuesta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SolveCase;