import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getCaseById,
  startCase,
  submitPhaseResponse,
  submitFinalResponse,
  requestHint
} from '../../services/api';
import Navbar from '../common/Navbar';
import './SolveCase.css';

const TIPO_FASE_LABEL = {
  presentacion:       'Presentación',
  exploracion_fisica: 'Exploración Física',
  laboratorio:        'Laboratorio',
  imagenes:           'Imágenes',
  evolucion:          'Evolución',
  diagnostico_final:  'Diagnóstico Final'
};

const SolveCase = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  // ── Estado general ─────────────────────────────────────────
  const [caseData, setCaseData] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // ── Sistema de fases ───────────────────────────────────────
  const [faseActiva, setFaseActiva] = useState(0);
  const [fasesCompletadas, setFasesCompletadas] = useState(new Set());
  const [respuestasGuardadas, setRespuestasGuardadas] = useState({});

  // ── Formulario de la fase actual ───────────────────────────
  const [respuestaPrincipal, setRespuestaPrincipal] = useState('');
  const [respuestasSecundarias, setRespuestasSecundarias] = useState({});
  const [pistaVisible, setPistaVisible] = useState(false);
  const [usoPista, setUsoPista] = useState(false);

  // ── Formulario final (última fase) ────────────────────────
  const [diagnosticoFinal, setDiagnosticoFinal] = useState('');
  const [tratamientoFinal, setTratamientoFinal] = useState('');
  const [archivoFinal, setArchivoFinal] = useState(null);

  // ── Timer ──────────────────────────────────────────────────
  const [tiempoTotal, setTiempoTotal] = useState(0);
  const [tiempoFase, setTiempoFase] = useState(0);
  const timerTotalRef = useRef(null);
  const timerFaseRef = useRef(null);
  const tiempoFaseInicioRef = useRef(Date.now());

  // ── Carga inicial ──────────────────────────────────────────
  useEffect(() => {
    inicializar();
    timerTotalRef.current = setInterval(() => {
      setTiempoTotal(t => t + 1);
    }, 1000);
    return () => {
      clearInterval(timerTotalRef.current);
      clearInterval(timerFaseRef.current);
    };
  }, [assignmentId]);

  useEffect(() => {
    clearInterval(timerFaseRef.current);
    tiempoFaseInicioRef.current = Date.now();
    setTiempoFase(0);
    timerFaseRef.current = setInterval(() => {
      setTiempoFase(Math.floor((Date.now() - tiempoFaseInicioRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timerFaseRef.current);
  }, [faseActiva]);

  const inicializar = async () => {
    try {
      setLoading(true);

      const caseRes = await getCaseById(assignmentId);
      const rawCase = caseRes.data.case;
      const casoNormalizado = {
        ...rawCase,
        pacienteEdad:                rawCase.pacienteEdad                || rawCase.paciente_edad,
        pacienteSexo:                rawCase.pacienteSexo                || rawCase.paciente_sexo,
        pacienteOcupacion:           rawCase.pacienteOcupacion           || rawCase.paciente_ocupacion,
        antecedentesPersonales:      rawCase.antecedentesPersonales      || rawCase.antecedentes_personales,
        antecedentesEpidemiologicos: rawCase.antecedentesEpidemiologicos || rawCase.antecedentes_epidemiologicos,
        motivoConsulta:              rawCase.motivoConsulta              || rawCase.motivo_consulta,
        tiempoEvolucion:             rawCase.tiempoEvolucion             || rawCase.tiempo_evolucion,
        nivelDificultad:             rawCase.nivelDificultad             || rawCase.nivel_dificultad,
        totalFases:                  rawCase.totalFases                  || rawCase.total_fases,
      };
      setCaseData({ ...caseRes.data, case: casoNormalizado });

      const sessionRes = await startCase({ asignacionId: assignmentId });
      setSession(sessionRes.data.response);

      const completadas = new Set();
      const guardadas = {};
      if (sessionRes.data.fasesCompletadas) {
        sessionRes.data.fasesCompletadas.forEach(fr => {
          const idx = (fr.numero_fase ?? fr.numeroFase ?? 1) - 1;
          completadas.add(idx);
          guardadas[idx] = {
            principal:   fr.respuesta_principal   || fr.respuestaPrincipal   || '',
            secundarias: fr.respuestas_secundarias || fr.respuestasSecundarias || {}
          };
        });
      }
      setFasesCompletadas(completadas);
      setRespuestasGuardadas(guardadas);

      const faseActualIdx = sessionRes.data.response?.faseActual
        ? sessionRes.data.response.faseActual - 1
        : 0;
      setFaseActiva(Math.min(faseActualIdx, (caseRes.data.phases?.length || 1) - 1));

    } catch (error) {
      console.error('Error al inicializar:', error);
      setMessage({ type: 'error', text: 'Error al cargar el caso' });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const irAFase = (index) => {
    const faseActualSession = session?.faseActual || 1;
    if (index <= faseActualSession - 1) {
      setFaseActiva(index);
      if (respuestasGuardadas[index]) {
        setRespuestaPrincipal(respuestasGuardadas[index].principal || '');
        setRespuestasSecundarias(respuestasGuardadas[index].secundarias || {});
      } else {
        setRespuestaPrincipal('');
        setRespuestasSecundarias({});
      }
      setPistaVisible(false);
      setUsoPista(false);
    }
  };

  const handleSolicitarPista = async () => {
    const fase = caseData.phases[faseActiva];
    try {
      await requestHint({ faseId: fase.id });
      setPistaVisible(true);
      setUsoPista(true);
    } catch (error) {
      showMessage('error', 'No hay pista disponible para esta fase');
    }
  };

  const handleSubmitFase = async () => {
    if (!respuestaPrincipal.trim()) {
      showMessage('error', 'Debes responder la pregunta principal antes de continuar');
      return;
    }

    const fase = caseData.phases[faseActiva];
    const totalFases = caseData.phases.length;
    const esUltimaFase = faseActiva === totalFases - 1;

    if (esUltimaFase && (!diagnosticoFinal.trim() || !tratamientoFinal.trim())) {
      showMessage('error', 'En la fase final debes completar el diagnóstico y tratamiento');
      return;
    }

    setSubmitting(true);

    try {
      await submitPhaseResponse({
        asignacionId: assignmentId,
        faseId: fase.id,
        numeroFase: faseActiva + 1,
        respuestaPrincipal,
        respuestasSecundarias: JSON.stringify(respuestasSecundarias),
        usoPista: String(usoPista),
        tiempoFaseSegundos: String(tiempoFase)
      });

      const nuevasCompletadas = new Set(fasesCompletadas);
      nuevasCompletadas.add(faseActiva);
      setFasesCompletadas(nuevasCompletadas);

      setRespuestasGuardadas(prev => ({
        ...prev,
        [faseActiva]: { principal: respuestaPrincipal, secundarias: respuestasSecundarias }
      }));

      if (esUltimaFase) {
        const formData = new FormData();
        formData.append('asignacionId', assignmentId);
        formData.append('diagnosticoFinal', diagnosticoFinal);
        formData.append('tratamientoFinal', tratamientoFinal);
        formData.append('tiempoTotalMinutos', String(Math.floor(tiempoTotal / 60)));
        if (archivoFinal) formData.append('archivo', archivoFinal);

        await submitFinalResponse(formData);

        clearInterval(timerTotalRef.current);
        clearInterval(timerFaseRef.current);

        showMessage('success', '¡Caso enviado! La IA está analizando tu razonamiento clínico...');
        setTimeout(() => navigate(`/student/feedback/${assignmentId}`), 3000);
      } else {
        const siguienteFase = faseActiva + 1;
        setFaseActiva(siguienteFase);
        setRespuestaPrincipal('');
        setRespuestasSecundarias({});
        setPistaVisible(false);
        setUsoPista(false);

        setSession(prev => ({ ...prev, faseActual: siguienteFase + 1 }));

        showMessage('success', `Fase ${faseActiva + 1} completada. Avanzando a la siguiente...`);
      }
    } catch (error) {
      console.error('Error:', error);
      showMessage('error', error.response?.data?.error || 'Error al guardar la respuesta');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="loading">Cargando caso clínico...</div>
      </div>
    );
  }

  if (!caseData || !caseData.case || !caseData.phases) {
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

  const { case: caso, phases, resources } = caseData;
  const faseActualData = phases[faseActiva];
  const totalFases = phases.length;
  const esUltimaFase = faseActiva === totalFases - 1;
  const faseActualSession = session?.faseActual || 1;
  const progreso = Math.round((fasesCompletadas.size / totalFases) * 100);

  return (
    <div>
      <Navbar />
      <div className="container">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="solve-header">
          <div>
            <h1>{caso.titulo}</h1>
            <div className="caso-meta">
              {caso.pacienteEdad && <span>👤 {caso.pacienteEdad} años</span>}
              {caso.pacienteSexo && <span>• {caso.pacienteSexo}</span>}
              {caso.nivelDificultad && (
                <span className={`badge-dificultad badge-${caso.nivelDificultad}`}>
                  {caso.nivelDificultad}
                </span>
              )}
            </div>
          </div>
          <div className="timers">
            <div className="timer-total">
              ⏱ Total: <strong>{formatTime(tiempoTotal)}</strong>
            </div>
            <div className="timer-fase">
              Fase: <strong>{formatTime(tiempoFase)}</strong>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
              ← Volver
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}

        {/* ── Barra de progreso ────────────────────────────── */}
        <div className="progreso-container">
          <div className="progreso-info">
            <span>Progreso del caso</span>
            <span>{fasesCompletadas.size}/{totalFases} fases completadas</span>
          </div>
          <div className="progreso-barra">
            <div className="progreso-fill" style={{ width: `${progreso}%` }} />
          </div>
        </div>

        {/* ── Pestañas de fases ────────────────────────────── */}
        <div className="fases-nav">
          {phases.map((fase, index) => {
            const completada = fasesCompletadas.has(index);
            const actual = index === faseActiva;
            const desbloqueada = index <= faseActualSession - 1;
            const bloqueada = !desbloqueada;

            return (
              <button
                key={fase.id}
                className={`fase-btn ${actual ? 'active' : ''} ${completada ? 'completada' : ''} ${bloqueada ? 'bloqueada' : ''}`}
                onClick={() => irAFase(index)}
                disabled={bloqueada}
                title={bloqueada ? 'Completa las fases anteriores primero' : fase.titulo}
              >
                <span className="fase-numero">
                  {completada ? '✓' : bloqueada ? '🔒' : index + 1}
                </span>
                <span className="fase-titulo-tab">
                  {TIPO_FASE_LABEL[fase.tipoFase] || `Fase ${index + 1}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Contenido de la fase activa ──────────────────── */}
        <div className="fase-contenido">

          {/* Datos del paciente — siempre visible arriba */}
          {faseActiva === 0 && (
            <div className="card card-paciente">
              <h3>Información del Paciente</h3>
              <div className="paciente-grid">
                {caso.motivoConsulta && (
                  <div className="paciente-item">
                    <span className="paciente-label">Motivo de consulta</span>
                    <span className="paciente-valor">{caso.motivoConsulta}</span>
                  </div>
                )}
                {caso.tiempoEvolucion && (
                  <div className="paciente-item">
                    <span className="paciente-label">Tiempo de evolución</span>
                    <span className="paciente-valor">{caso.tiempoEvolucion}</span>
                  </div>
                )}
                {caso.antecedentesPersonales && (
                  <div className="paciente-item full-width">
                    <span className="paciente-label">Antecedentes personales</span>
                    <span className="paciente-valor">{caso.antecedentesPersonales}</span>
                  </div>
                )}
                {caso.antecedentesEpidemiologicos && (
                  <div className="paciente-item full-width">
                    <span className="paciente-label">Antecedentes epidemiológicos</span>
                    <span className="paciente-valor">{caso.antecedentesEpidemiologicos}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contenido de la fase */}
          <div className="card">
            <div className="fase-header-content">
              <h2>{faseActualData.titulo}</h2>
              <span className="fase-tipo-badge">
                {TIPO_FASE_LABEL[faseActualData.tipoFase]}
              </span>
            </div>

            <div className="case-content">{faseActualData.contenido}</div>

            {/* Signos vitales de la fase */}
            {faseActualData.signosVitales && Object.values(faseActualData.signosVitales).some(v => v) && (
              <div className="case-section">
                <h3>Signos Vitales</h3>
                <div className="vitals-grid">
                  {Object.entries(faseActualData.signosVitales).map(([key, value]) =>
                    value ? (
                      <div key={key} className="vital-item">
                        <span className="vital-label">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="vital-value">{value}</span>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            )}

            {/* Datos de laboratorio estructurados */}
            {faseActualData.datosLaboratorio && (
              <div className="case-section">
                <h3>Resultados de Laboratorio</h3>
                <div className="lab-grid">
                  {Object.entries(faseActualData.datosLaboratorio).map(([key, value]) => (
                    <div key={key} className="lab-item">
                      <span className="lab-label">{key}</span>
                      <span className="lab-value">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recursos de la fase */}
            {faseActualData.recursos && faseActualData.recursos.length > 0 && (
              <div className="case-section">
                <h3>📎 Recursos de esta Fase</h3>
                <div className="resources-list">
                  {faseActualData.recursos.map(r => (
                    <a
                      key={r.id}
                      href={`http://localhost:5000/${r.rutaArchivo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="resource-link"
                    >
                      📄 {r.nombreArchivo}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Recursos generales del caso (solo en fase 1) */}
            {faseActiva === 0 && resources && resources.length > 0 && (
              <div className="case-section">
                <h3>📎 Recursos Generales</h3>
                <div className="resources-list">
                  {resources.map(r => (
                    <a
                      key={r.id}
                      href={`http://localhost:5000/${r.rutaArchivo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="resource-link"
                    >
                      📄 {r.nombreArchivo}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Formulario de respuesta ──────────────────────── */}
          {!fasesCompletadas.has(faseActiva) ? (
            <div className="card card-respuesta">
              <h2>Tu Respuesta — Fase {faseActiva + 1}</h2>

              {/* Pregunta principal */}
              <div className="form-group">
                <label className="pregunta-label">
                  {faseActualData.preguntaPrincipal}
                </label>
                <textarea
                  className="form-control"
                  rows="5"
                  placeholder="Escribe tu respuesta aquí..."
                  value={respuestaPrincipal}
                  onChange={(e) => setRespuestaPrincipal(e.target.value)}
                />
              </div>

              {/* Preguntas secundarias */}
              {faseActualData.preguntasSecundarias &&
                faseActualData.preguntasSecundarias.length > 0 && (
                  <div className="preguntas-secundarias">
                    <h4>Preguntas adicionales</h4>
                    {faseActualData.preguntasSecundarias.map((preg, idx) => (
                      <div key={idx} className="form-group">
                        <label className="pregunta-label">{preg}</label>
                        <textarea
                          className="form-control"
                          rows="3"
                          placeholder="Escribe tu respuesta..."
                          value={respuestasSecundarias[idx] || ''}
                          onChange={(e) => setRespuestasSecundarias(prev => ({
                            ...prev,
                            [idx]: e.target.value
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                )}

              {/* Campos extra en la última fase */}
              {esUltimaFase && (
                <div className="fase-final-section">
                  <h3>Diagnóstico y Tratamiento Final</h3>
                  <div className="form-group">
                    <label>Diagnóstico Definitivo *</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      placeholder="Tu diagnóstico final..."
                      value={diagnosticoFinal}
                      onChange={(e) => setDiagnosticoFinal(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Plan de Tratamiento *</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      placeholder="Tu plan de tratamiento..."
                      value={tratamientoFinal}
                      onChange={(e) => setTratamientoFinal(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Archivo Adjunto (Opcional)</label>
                    <input
                      type="file"
                      className="form-control"
                      onChange={(e) => setArchivoFinal(e.target.files[0])}
                    />
                  </div>
                </div>
              )}

              {/* Pista */}
              {faseActualData.pista && (
                <div className="pista-section">
                  {!pistaVisible ? (
                    <button
                      type="button"
                      className="btn btn-warning btn-sm"
                      onClick={handleSolicitarPista}
                    >
                      💡 Solicitar pista (-{faseActualData.puntosPenalizacionPista} pts)
                    </button>
                  ) : (
                    <div className="pista-contenido">
                      <strong>💡 Pista:</strong> {faseActualData.pista}
                    </div>
                  )}
                </div>
              )}

              {/* Botón continuar / enviar */}
              <div className="fase-actions">
                <button
                  type="button"
                  className={`btn ${esUltimaFase ? 'btn-success' : 'btn-primary'}`}
                  onClick={handleSubmitFase}
                  disabled={submitting}
                >
                  {submitting
                    ? 'Guardando...'
                    : esUltimaFase
                    ? '✓ Enviar Caso Completo'
                    : `Continuar a Fase ${faseActiva + 2} →`}
                </button>
              </div>
            </div>
          ) : (
            // Fase ya respondida — mostrar respuesta guardada
            <div className="card card-completada">
              <h3>✓ Fase {faseActiva + 1} Completada</h3>
              {respuestasGuardadas[faseActiva]?.principal && (
                <div className="respuesta-guardada">
                  <strong>{faseActualData.preguntaPrincipal}</strong>
                  <p>{respuestasGuardadas[faseActiva].principal}</p>
                </div>
              )}
              {faseActiva < totalFases - 1 && !fasesCompletadas.has(faseActiva + 1) && (
                <button
                  className="btn btn-primary"
                  onClick={() => irAFase(faseActiva + 1)}
                >
                  Ir a Fase {faseActiva + 2} →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SolveCase;