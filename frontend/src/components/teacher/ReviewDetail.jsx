import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getResponseDetail, gradeResponse } from '../../services/api';
import Navbar from '../common/Navbar';
import './ReviewDetail.css';

const ReviewDetail = () => {
  const { respuestaId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Pestaña activa
  const [tabActiva, setTabActiva] = useState('respuestas');

  // Formulario de calificación
  const [nota, setNota] = useState('');
  const [comentarios, setComentarios] = useState('');

  useEffect(() => {
    loadDetail();
  }, [respuestaId]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const res = await getResponseDetail(respuestaId);
      setData(res.data);

      // Pre-cargar nota sugerida por IA si existe
      if (res.data.feedback?.iaNotaSugerida) {
        setNota(parseFloat(res.data.feedback.iaNotaSugerida).toFixed(1));
      }
    } catch (error) {
      console.error('Error al cargar detalle:', error);
      showMessage('error', 'Error al cargar la entrega');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleGrade = async (e) => {
    e.preventDefault();

    if (!nota || parseFloat(nota) < 0 || parseFloat(nota) > 100) {
      showMessage('error', 'La nota debe estar entre 0 y 100');
      return;
    }

    setSaving(true);
    try {
      await gradeResponse({
        respuestaId: parseInt(respuestaId),
        nota: parseFloat(nota),
        comentariosDocente: comentarios
      });
      showMessage('success', 'Calificación guardada exitosamente');
      setTimeout(() => navigate('/teacher/review'), 2000);
    } catch (error) {
      console.error('Error al calificar:', error);
      showMessage('error', error.response?.data?.error || 'Error al guardar calificación');
    } finally {
      setSaving(false);
    }
  };

  const getCompetenciaColor = (valor) => {
    if (valor >= 80) return '#28a745';
    if (valor >= 60) return '#ffc107';
    return '#dc3545';
  };

  const formatMinutos = (min) => {
    if (!min) return 'N/A';
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)}h ${min % 60}min`;
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="loading">Cargando entrega...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <Navbar />
        <div className="container">
          <div className="alert alert-error">No se pudo cargar la entrega</div>
          <button className="btn btn-secondary" onClick={() => navigate('/teacher/review')}>
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  const { response, phaseResponses, feedback } = data;
  const competencias = feedback?.iaCompetencias || null;
  const analisisFases = feedback?.iaAnalisisFases || null;
  const preguntasReflexion = feedback?.iaPreguntasReflexion || null;
  const recomendaciones = feedback?.iaRecomendaciones || null;

  return (
    <div>
      <Navbar />
      <div className="container">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="page-header">
          <div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/teacher/review')}
              style={{ marginBottom: '10px' }}
            >
              ← Volver a Entregas
            </button>
            <h1>Revisar Entrega</h1>
          </div>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}

        {/* ── Info del estudiante y caso ───────────────────── */}
        <div className="card info-header-card">
          <div className="info-header-grid">
            <div className="info-bloque">
              <h3>Estudiante</h3>
              <p className="info-nombre">{response.nombre} {response.apellido}</p>
              <p className="info-email">{response.email}</p>
            </div>
            <div className="info-bloque">
              <h3>Caso Clínico</h3>
              <p className="info-nombre">{response.tituloCaso}</p>
              <p className="info-email">{response.nombreCurso}</p>
            </div>
            <div className="info-bloque">
              <h3>Estadísticas</h3>
              <p className="info-stat">⏱ {formatMinutos(response.tiempo_total_minutos)}</p>
              <p className="info-stat">
                📋 {phaseResponses.length}/{response.total_fases} fases completadas
              </p>
              <p className="info-stat">
                💡 {phaseResponses.filter(p => p.uso_pista).length} pistas usadas
              </p>
            </div>
            <div className="info-bloque">
              <h3>Estado</h3>
              <span className="badge badge-warning">Pendiente de calificación</span>
              {feedback?.iaNotaSugerida && (
                <p className="ia-sugerencia-header">
                   IA sugiere: <strong>{parseFloat(feedback.iaNotaSugerida).toFixed(1)}/100</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Pestañas ─────────────────────────────────────── */}
        <div className="card">
          <div className="review-tabs">
            {[
              { id: 'respuestas',   label: 'Respuestas por Fase' },
              { id: 'ia-analisis',  label: 'Análisis IA',        show: !!feedback?.iaAnalisisRazonamiento },
              { id: 'competencias', label: 'Competencias',        show: !!competencias },
              { id: 'fases-ia',     label: 'IA por Fases',        show: !!analisisFases },
              { id: 'calificar',    label: '✓ Calificar' },
            ].filter(t => t.show !== false).map(tab => (
              <button
                key={tab.id}
                className={`review-tab ${tabActiva === tab.id ? 'active' : ''} ${tab.id === 'calificar' ? 'tab-calificar' : ''}`}
                onClick={() => setTabActiva(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── TAB: Respuestas por Fase ─────────────────── */}
          {tabActiva === 'respuestas' && (
            <div className="tab-content">
              <h3>Razonamiento del Estudiante Fase por Fase</h3>

              {phaseResponses.length === 0 ? (
                <p className="empty-text">No hay respuestas registradas por fase</p>
              ) : (
                <div className="phase-responses-list">
                  {phaseResponses.map((fase, i) => (
                    <div key={i} className="phase-response-card">
                      <div className="phase-response-header">
                        <div className="phase-response-title">
                          <span className="phase-numero">Fase {fase.numero_fase}</span>
                          <span className="phase-tipo">{fase.tipo_fase?.replace('_', ' ')}</span>
                          <span className="phase-titulo-caso">{fase.tituloFase}</span>
                        </div>
                        <div className="phase-response-meta">
                          {fase.tiempo_fase_segundos && (
                            <span className="phase-tiempo">
                              ⏱ {Math.floor(fase.tiempo_fase_segundos / 60)}m {fase.tiempo_fase_segundos % 60}s
                            </span>
                          )}
                          {fase.uso_pista && (
                            <span className="badge-pista">💡 Usó pista</span>
                          )}
                        </div>
                      </div>

                      <div className="phase-response-body">
                        <div className="phase-pregunta">
                          <strong>Pregunta:</strong> {fase.pregunta_principal}
                        </div>
                        <div className="phase-respuesta">
                          <strong>Respuesta del estudiante:</strong>
                          <div className="response-text-box">
                            {fase.respuesta_principal || 'Sin respuesta'}
                          </div>
                        </div>

                        {/* Respuestas secundarias */}
                        {fase.respuestas_secundarias && Object.keys(fase.respuestas_secundarias).length > 0 && (
                          <div className="phase-secundarias">
                            <strong>Respuestas adicionales:</strong>
                            {Object.entries(fase.respuestas_secundarias).map(([key, val]) => (
                              <div key={key} className="secundaria-item">
                                <span className="secundaria-key">Pregunta {parseInt(key) + 1}:</span>
                                <span>{val}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Contenido de la fase para contexto */}
                        {fase.contenidoFase && (
                          <details className="fase-contexto">
                            <summary>Ver contenido de la fase</summary>
                            <div className="fase-contexto-contenido">
                              {fase.contenidoFase}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Diagnóstico y tratamiento final */}
              {(response.diagnostico_final || response.tratamiento_final) && (
                <div className="final-response-section">
                  <h3>Diagnóstico y Tratamiento Final</h3>
                  {response.diagnostico_final && (
                    <div className="final-item">
                      <h4>Diagnóstico Final</h4>
                      <div className="response-text-box">{response.diagnostico_final}</div>
                    </div>
                  )}
                  {response.tratamiento_final && (
                    <div className="final-item">
                      <h4>Tratamiento Propuesto</h4>
                      <div className="response-text-box">{response.tratamiento_final}</div>
                    </div>
                  )}
                  {/* Diagnóstico correcto para comparar */}
                  {response.diagnostico_correcto && (
                    <div className="diagnostico-correcto-box">
                      <h4>🔑 Diagnóstico Correcto (referencia)</h4>
                      <div className="response-text-box correcto">
                        {response.diagnostico_correcto}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Archivo adjunto */}
              {response.archivo_adjunto && (
                <div className="final-item">
                  <h4>📎 Archivo Adjunto</h4>
                  <a
                    href={`http://localhost:5000/${response.archivo_adjunto}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="file-link"
                  >
                    Ver archivo adjunto
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Análisis IA ─────────────────────────── */}
          {tabActiva === 'ia-analisis' && feedback && (
            <div className="tab-content">
              <h3>Análisis del Razonamiento Clínico</h3>
              <p className="tab-subtitle">Generado automáticamente por IA</p>

              {feedback.iaAnalisisRazonamiento && (
                <div className="ia-analisis-box">
                  {feedback.iaAnalisisRazonamiento.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              )}

              {/* Eficiencia diagnóstica */}
              {feedback.iaFaseDiagnosticoEsperada && (
                <div className="eficiencia-section">
                  <h4>Eficiencia Diagnóstica</h4>
                  <div className="eficiencia-grid">
                    <div className="eficiencia-item">
                      <span className="ef-label">Fase esperada</span>
                      <span className="ef-valor esperada">Fase {feedback.iaFaseDiagnosticoEsperada}</span>
                    </div>
                    <div className="eficiencia-item">
                      <span className="ef-label">Fase real</span>
                      <span className={`ef-valor ${
                        feedback.iaFaseDiagnosticoReal <= feedback.iaFaseDiagnosticoEsperada
                          ? 'buena' : 'tardio'
                      }`}>
                        Fase {feedback.iaFaseDiagnosticoReal}
                      </span>
                    </div>
                    <div className="eficiencia-item">
                      <span className="ef-label">Resultado</span>
                      <span className="ef-valor">
                        {feedback.iaFaseDiagnosticoReal <= feedback.iaFaseDiagnosticoEsperada
                          ? '✓ Oportuno'
                          : `⚠ ${feedback.iaFaseDiagnosticoReal - feedback.iaFaseDiagnosticoEsperada} fase(s) tarde`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Comparación con diagnóstico correcto */}
              {feedback.iaComparacionDiagnostico && (
                <div className="ia-section">
                  <h4>Comparación con Diagnóstico Correcto</h4>
                  <div className="ia-analisis-box">
                    {feedback.iaComparacionDiagnostico.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Recomendaciones */}
              {recomendaciones && recomendaciones.length > 0 && (
                <div className="ia-section">
                  <h4>Temas a Reforzar (sugeridos por IA)</h4>
                  <ul className="recomendaciones-list">
                    {recomendaciones.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preguntas de reflexión */}
              {preguntasReflexion && preguntasReflexion.length > 0 && (
                <div className="ia-section">
                  <h4>Preguntas de Reflexión para el Estudiante</h4>
                  <ol className="reflexion-list-docente">
                    {preguntasReflexion.map((preg, i) => (
                      <li key={i}>{preg}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Competencias ────────────────────────── */}
          {tabActiva === 'competencias' && competencias && (
            <div className="tab-content">
              <h3>Evaluación por Competencias</h3>
              <p className="tab-subtitle">Análisis automático de la IA</p>
              <div className="competencias-grid">
                {Object.entries(competencias).map(([key, valor]) => {
                  const labels = {
                    anamnesis:                 'Anamnesis e Historia Clínica',
                    interpretacionLaboratorio: 'Interpretación de Laboratorio',
                    diagnosticoDiferencial:    'Diagnóstico Diferencial',
                    planDiagnostico:           'Plan Diagnóstico',
                    razonamientoClinico:       'Razonamiento Clínico',
                    decisionTerapeutica:       'Decisión Terapéutica'
                  };
                  const color = getCompetenciaColor(valor);
                  return (
                    <div key={key} className="competencia-item">
                      <div className="competencia-header">
                        <span>{labels[key] || key}</span>
                        <span style={{ color, fontWeight: 'bold' }}>{valor}%</span>
                      </div>
                      <div className="competencia-barra">
                        <div
                          className="competencia-fill"
                          style={{ width: `${valor}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TAB: IA por Fases ────────────────────────── */}
          {tabActiva === 'fases-ia' && analisisFases && (
            <div className="tab-content">
              <h3>Análisis IA por Fase</h3>
              <p className="tab-subtitle">Evaluación del razonamiento en cada etapa</p>
              <div className="fases-ia-list">
                {analisisFases.map((fase, i) => (
                  <div key={i} className="fase-ia-card">
                    <div className="fase-ia-header">
                      <span className="fase-ia-numero">Fase {fase.fase}</span>
                    </div>
                    {fase.analisis && (
                      <p className="fase-ia-analisis">{fase.analisis}</p>
                    )}
                    <div className="fase-ia-detalle">
                      {fase.aciertos && fase.aciertos.length > 0 && (
                        <div className="aciertos">
                          <h5>✓ Aciertos</h5>
                          <ul>
                            {fase.aciertos.map((a, j) => <li key={j}>{a}</li>)}
                          </ul>
                        </div>
                      )}
                      {fase.errores && fase.errores.length > 0 && (
                        <div className="errores">
                          <h5>✗ Áreas de mejora</h5>
                          <ul>
                            {fase.errores.map((e, j) => <li key={j}>{e}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: Calificar ───────────────────────────── */}
          {tabActiva === 'calificar' && (
            <div className="tab-content">
              <h3>Asignar Calificación Final</h3>

              {feedback?.iaNotaSugerida && (
                <div className="ia-sugerencia-banner">
                  <span> La IA sugiere una nota de</span>
                  <strong>{parseFloat(feedback.iaNotaSugerida).toFixed(1)}/100</strong>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setNota(parseFloat(feedback.iaNotaSugerida).toFixed(1))}
                  >
                    Usar esta nota
                  </button>
                </div>
              )}

              <form onSubmit={handleGrade}>
                <div className="form-group">
                  <label>Nota Final (0 - 100) *</label>
                  <div className="nota-input-group">
                    <input
                      type="number"
                      className="form-control nota-input"
                      min="0"
                      max="100"
                      step="0.5"
                      value={nota}
                      onChange={(e) => setNota(e.target.value)}
                      required
                    />
                    <span className="nota-suffix">/100</span>
                  </div>
                  {nota && (
                    <div className={`nota-preview ${
                      parseFloat(nota) >= 70 ? 'excelente' :
                      parseFloat(nota) >= 60 ? 'bueno' :
                      parseFloat(nota) >= 50 ? 'regular' : 'bajo'
                    }`}>
                      {parseFloat(nota) >= 70 && '✓ Aprobado con excelencia'}
                      {parseFloat(nota) >= 60 && parseFloat(nota) < 70 && '✓ Aprobado'}
                      {parseFloat(nota) >= 50 && parseFloat(nota) < 60 && '⚠ Aprobado con observaciones'}
                      {parseFloat(nota) < 50 && '✗ No aprobado'}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Comentarios para el Estudiante</label>
                  <textarea
                    className="form-control"
                    rows="6"
                    placeholder="Proporciona retroalimentación constructiva...
Puedes mencionar:
- Puntos fuertes del razonamiento
- Áreas de mejora identificadas
- Sugerencias específicas para mejorar"
                    value={comentarios}
                    onChange={(e) => setComentarios(e.target.value)}
                  />
                  <small className="form-text">
                    El análisis de la IA ya está disponible para el estudiante.
                    Aquí puedes agregar tu perspectiva como docente.
                  </small>
                </div>

                <div className="grade-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate('/teacher/review')}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={saving}
                  >
                    {saving ? 'Guardando...' : '✓ Guardar Calificación Final'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewDetail;