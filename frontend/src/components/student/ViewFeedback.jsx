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
  const [fasesCompletadas, setFasesCompletadas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pestaña activa en la sección de retroalimentación
  const [tabActiva, setTabActiva] = useState('resumen');

  useEffect(() => {
    loadData();
  }, [assignmentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getStudentResponse(assignmentId);
      setResponse(res.data.response);
      setFeedback(res.data.feedback);

      // Normalizar fases — el backend las devuelve en snake_case desde SQL
      const fases = (res.data.fasesCompletadas || []).map(f => ({
        numeroFase:         f.numero_fase        || f.numeroFase        || 0,
        tipoFase:           f.tipo_fase          || f.tipoFase          || '',
        preguntaPrincipal:  f.pregunta_principal  || f.preguntaPrincipal  || '',
        respuestaPrincipal: f.respuesta_principal || f.respuestaPrincipal || '',
        usoPista:           f.uso_pista != null   ? Boolean(f.uso_pista) : Boolean(f.usoPista),
        tiempoFaseSegundos: f.tiempo_fase_segundos || f.tiempoFaseSegundos || 0
      }));
      setFasesCompletadas(fases);

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

  const getGradeLabel = (nota) => {
    if (nota >= 70) return { text: '✓ Excelente trabajo', class: 'success' };
    if (nota >= 60) return { text: '✓ Buen trabajo', class: 'good' };
    if (nota >= 50) return { text: '⚠️ Aprobado con observaciones', class: 'regular' };
    return { text: '✗ No aprobado', class: 'low' };
  };

  const getCompetenciaColor = (valor) => {
    if (valor >= 80) return '#28a745';
    if (valor >= 60) return '#ffc107';
    return '#dc3545';
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="loading">Cargando retroalimentación...</div>
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

  const notaFinal = feedback?.nota;
  const notaSugerida = feedback?.iaNotaSugerida;
  const notaMostrar = notaFinal > 0 ? notaFinal : notaSugerida;
  const revisadaPorDocente = feedback?.revisadaPorDocente;

  // Parsear campos JSON de la IA
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
          <h1>Retroalimentación del Caso</h1>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Volver</button>
        </div>

        {/* ── Tarjeta de calificación principal ────────────── */}
        <div className="card grade-card">
          <div className="grade-header">
            <div>
              <h2>Tu Calificación</h2>
              {!revisadaPorDocente && (
                <span className="badge-pendiente">⏳ Pendiente de revisión del docente</span>
              )}
              {revisadaPorDocente && (
                <span className="badge-revisado">✓ Revisado por el docente</span>
              )}
            </div>

            {notaMostrar ? (
              <div className={`grade-display ${getGradeColor(notaMostrar)}`}>
                <span className="grade-number">{parseFloat(notaMostrar).toFixed(1)}</span>
                <span className="grade-total">/100</span>
                {!revisadaPorDocente && notaSugerida && (
                  <span className="grade-ia-label">IA</span>
                )}
              </div>
            ) : (
              <div className="ai-badge">
                <span className="ai-icon"></span>
                <span className="ai-text">Análisis en proceso</span>
              </div>
            )}
          </div>

          {notaMostrar && (
            <div className={`status-message ${getGradeLabel(notaMostrar).class}`}>
              {getGradeLabel(notaMostrar).text}
            </div>
          )}

          {!revisadaPorDocente && (
            <div className="ai-info-banner">
              <h3> Análisis Preliminar con Inteligencia Artificial</h3>
              <p>
                Esta retroalimentación fue generada automáticamente analizando tu razonamiento
                clínico en cada fase del caso. El docente revisará y asignará la calificación final.
              </p>
            </div>
          )}

          {/* Comentarios del docente si ya revisó */}
          {revisadaPorDocente && feedback?.comentariosDocente && (
            <div className="docente-comentarios">
              <h3>💬 Comentarios del Docente</h3>
              <div className="feedback-content">
                {feedback.comentariosDocente.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Pestañas de análisis ─────────────────────────── */}
        {feedback && (
          <div className="card">
            <div className="feedback-tabs">
              {[
                { id: 'resumen',      label: ' Resumen' },
                { id: 'competencias', label: ' Competencias', show: !!competencias },
                { id: 'fases',        label: ' Por Fases',    show: !!analisisFases },
                { id: 'reflexion',    label: ' Reflexión',    show: !!preguntasReflexion },
                { id: 'turespuesta',  label: ' Tu Respuesta' },
              ].filter(t => t.show !== false).map(tab => (
                <button
                  key={tab.id}
                  className={`feedback-tab ${tabActiva === tab.id ? 'active' : ''}`}
                  onClick={() => setTabActiva(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── TAB: Resumen ─────────────────────────────── */}
            {tabActiva === 'resumen' && (
              <div className="tab-content">
                {/* Análisis general del razonamiento */}
                {feedback.iaAnalisisRazonamiento && (
                  <div className="analisis-section">
                    <h3>Análisis de tu Razonamiento Clínico</h3>
                    <div className="feedback-content">
                      {feedback.iaAnalisisRazonamiento.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Eficiencia diagnóstica */}
                {feedback.iaFaseDiagnosticoEsperada && (
                  <div className="eficiencia-section">
                    <h3>Eficiencia Diagnóstica</h3>
                    <div className="eficiencia-grid">
                      <div className="eficiencia-item">
                        <span className="eficiencia-label">Fase esperada</span>
                        <span className="eficiencia-valor esperada">
                          Fase {feedback.iaFaseDiagnosticoEsperada}
                        </span>
                      </div>
                      <div className="eficiencia-item">
                        <span className="eficiencia-label">Fase real</span>
                        <span className={`eficiencia-valor ${
                          feedback.iaFaseDiagnosticoReal <= feedback.iaFaseDiagnosticoEsperada
                            ? 'buena' : 'tardio'
                        }`}>
                          Fase {feedback.iaFaseDiagnosticoReal}
                        </span>
                      </div>
                      <div className="eficiencia-item">
                        <span className="eficiencia-label">Resultado</span>
                        <span className="eficiencia-valor">
                          {feedback.iaFaseDiagnosticoReal <= feedback.iaFaseDiagnosticoEsperada
                            ? '✓ Diagnóstico oportuno'
                            : `⚠ ${feedback.iaFaseDiagnosticoReal - feedback.iaFaseDiagnosticoEsperada} fase(s) de retraso`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Comparación con diagnóstico correcto */}
                {feedback.iaComparacionDiagnostico && (
                  <div className="analisis-section">
                    <h3>Comparación con el Diagnóstico Correcto</h3>
                    <div className="feedback-content">
                      {feedback.iaComparacionDiagnostico.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recomendaciones de estudio */}
                {recomendaciones && recomendaciones.length > 0 && (
                  <div className="analisis-section">
                    <h3> Temas a Reforzar</h3>
                    <ul className="recomendaciones-list">
                      {recomendaciones.map((rec, i) => (
                        <li key={i} className="recomendacion-item">
                          <span className="rec-numero">{i + 1}</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: Competencias ────────────────────────── */}
            {tabActiva === 'competencias' && competencias && (
              <div className="tab-content">
                <h3>Evaluación por Competencias Clínicas</h3>
                <p className="tab-subtitle">
                  Análisis de tus habilidades en cada área del proceso diagnóstico
                </p>
                <div className="competencias-grid">
                  {Object.entries(competencias).map(([key, valor]) => {
                    const labels = {
                      anamnesis:              'Anamnesis e Historia Clínica',
                      interpretacionLaboratorio: 'Interpretación de Laboratorio',
                      diagnosticoDiferencial: 'Diagnóstico Diferencial',
                      planDiagnostico:        'Plan Diagnóstico',
                      razonamientoClinico:    'Razonamiento Clínico',
                      decisionTerapeutica:    'Decisión Terapéutica'
                    };
                    const color = getCompetenciaColor(valor);
                    return (
                      <div key={key} className="competencia-item">
                        <div className="competencia-header">
                          <span className="competencia-label">
                            {labels[key] || key}
                          </span>
                          <span className="competencia-valor" style={{ color }}>
                            {valor}%
                          </span>
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

            {/* ── TAB: Análisis por Fases ──────────────────── */}
            {tabActiva === 'fases' && analisisFases && (
              <div className="tab-content">
                <h3>Análisis de tu Razonamiento Fase por Fase</h3>
                <p className="tab-subtitle">
                  Cómo fue evolucionando tu pensamiento clínico a lo largo del caso
                </p>
                <div className="fases-analisis">
                  {analisisFases.map((fase, i) => (
                    <div key={i} className="fase-analisis-card">
                      <div className="fase-analisis-header">
                        <span className="fase-analisis-numero">Fase {fase.fase}</span>
                        <span className="fase-analisis-titulo">{fase.titulo || ''}</span>
                      </div>

                      {fase.analisis && (
                        <p className="fase-analisis-texto">{fase.analisis}</p>
                      )}

                      <div className="fase-analisis-detalle">
                        {fase.aciertos && fase.aciertos.length > 0 && (
                          <div className="aciertos">
                            <h5>✓ Aciertos</h5>
                            <ul>
                              {fase.aciertos.map((a, j) => (
                                <li key={j}>{a}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {fase.errores && fase.errores.length > 0 && (
                          <div className="errores">
                            <h5>✗ Áreas de mejora</h5>
                            <ul>
                              {fase.errores.map((e, j) => (
                                <li key={j}>{e}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Respuesta del estudiante en esa fase */}
                      {fasesCompletadas[i] && (
                        <div className="fase-respuesta-original">
                          <strong>Tu respuesta:</strong>
                          <p>{fasesCompletadas[i].respuestaPrincipal || 'Sin respuesta registrada'}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB: Preguntas de Reflexión ──────────────── */}
            {tabActiva === 'reflexion' && preguntasReflexion && (
              <div className="tab-content">
                <h3>Preguntas para Reflexionar</h3>
                <p className="tab-subtitle">
                  Estas preguntas te ayudarán a profundizar tu comprensión del caso
                </p>
                <div className="reflexion-list">
                  {preguntasReflexion.map((preg, i) => (
                    <div key={i} className="reflexion-item">
                      <span className="reflexion-numero">{i + 1}</span>
                      <p className="reflexion-pregunta">{preg}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB: Tu Respuesta ────────────────────────── */}
            {tabActiva === 'turespuesta' && (
              <div className="tab-content">
                <h3>Tu Respuesta Completa</h3>

                {/* Respuestas por fase */}
                {fasesCompletadas.length > 0 && (
                  <div className="respuestas-fases">
                    <h4>Respuestas por Fase</h4>
                    {fasesCompletadas.map((fase, i) => (
                      <div key={i} className="respuesta-fase-item">
                        <div className="respuesta-fase-header">
                          <span>Fase {fase.numeroFase}</span>
                          <span className="respuesta-fase-tipo">{fase.tipoFase}</span>
                          {fase.usoPista && (
                            <span className="badge-pista">💡 Usó pista</span>
                          )}
                        </div>
                        <p className="respuesta-fase-pregunta">{fase.preguntaPrincipal}</p>
                        <div className="response-content">
                          {fase.respuestaPrincipal || 'Sin respuesta'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Diagnóstico y tratamiento final */}
                {response.diagnosticoFinal && (
                  <div className="response-section">
                    <h4>Diagnóstico Final</h4>
                    <div className="response-content">{response.diagnosticoFinal}</div>
                  </div>
                )}

                {response.tratamientoFinal && (
                  <div className="response-section">
                    <h4>Tratamiento Propuesto</h4>
                    <div className="response-content">{response.tratamientoFinal}</div>
                  </div>
                )}

                {response.archivoAdjunto && (
                  <div className="response-section">
                    <h4>📎 Archivo Adjunto</h4>
                    <a
                      href={`http://localhost:5000/${response.archivoAdjunto}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="file-link"
                    >
                      Ver archivo adjunto
                    </a>
                  </div>
                )}

                {/* Estadísticas de la sesión */}
                <div className="sesion-stats">
                  <h4>Estadísticas de tu Sesión</h4>
                  <div className="stats-grid-small">
                    <div className="stat-small">
                      <span className="stat-label">Tiempo total</span>
                      <span className="stat-valor">
                        {response.tiempoTotalMinutos
                          ? `${response.tiempoTotalMinutos} min`
                          : 'No registrado'}
                      </span>
                    </div>
                    <div className="stat-small">
                      <span className="stat-label">Fases completadas</span>
                      <span className="stat-valor">{fasesCompletadas.length}</span>
                    </div>
                    <div className="stat-small">
                      <span className="stat-label">Pistas usadas</span>
                      <span className="stat-valor">
                        {fasesCompletadas.filter(f => f.usoPista).length}
                      </span>
                    </div>
                    <div className="stat-small">
                      <span className="stat-label">Fecha de envío</span>
                      <span className="stat-valor">
                        {response.fechaEnvio
                          ? new Date(response.fechaEnvio).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sin retroalimentación todavía */}
        {!feedback && response.estado === 'enviado' && (
          <div className="card info-card">
            <h3>⏳ Pendiente de Análisis</h3>
            <p>Tu respuesta está siendo procesada. El análisis de IA y la retroalimentación estarán disponibles pronto.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewFeedback;