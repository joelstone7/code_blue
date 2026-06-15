import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCaseById, updateCase, updatePhase, deleteCase } from '../../services/api';
import Navbar from '../common/Navbar';
import './CaseDetails.css';

const TIPO_FASE_LABEL = {
  presentacion:       'Presentación del Paciente',
  exploracion_fisica: 'Exploración Física',
  laboratorio:        'Resultados de Laboratorio',
  imagenes:           'Imágenes Diagnósticas',
  evolucion:          'Evolución Clínica',
  diagnostico_final:  'Diagnóstico y Tratamiento Final'
};

const CaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [caseData, setCaseData] = useState(null);
  const [phases, setPhases] = useState([]);
  const [resources, setResources] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [editingGeneral, setEditingGeneral] = useState(false);
  const [formGeneral, setFormGeneral] = useState({});

  const [editingPhaseId, setEditingPhaseId] = useState(null);
  const [formPhase, setFormPhase] = useState({});

  const [faseActiva, setFaseActiva] = useState(0);

  useEffect(() => {
    loadCaseDetails();
  }, [id]);

  const loadCaseDetails = async () => {
    try {
      setLoading(true);
      const response = await getCaseById(id);
      const { case: caseInfo, phases: caseFases, resources: caseResources, assignments: caseAssignments } = response.data;

      setCaseData(caseInfo);
      setPhases(caseFases || []);
      setResources(caseResources || []);
      setAssignments(caseAssignments || []);

      setFormGeneral({
        titulo:                     caseInfo.titulo || '',
        descripcion:                caseInfo.descripcion || '',
        pacienteEdad:               caseInfo.pacienteEdad || '',
        pacienteSexo:               caseInfo.pacienteSexo || '',
        pacienteOcupacion:          caseInfo.pacienteOcupacion || '',
        antecedentesPersonales:     caseInfo.antecedentesPersonales || '',
        antecedentesEpidemiologicos: caseInfo.antecedentesEpidemiologicos || '',
        motivoConsulta:             caseInfo.motivoConsulta || '',
        tiempoEvolucion:            caseInfo.tiempoEvolucion || '',
        diagnosticoCorrecto:        caseInfo.diagnosticoCorrecto || '',
        tratamientoCorrecto:        caseInfo.tratamientoCorrecto || '',
        nivelDificultad:            caseInfo.nivelDificultad || 'intermedio'
      });
    } catch (error) {
      console.error('Error al cargar detalles:', error);
      showMessage('error', 'Error al cargar detalles del caso');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleSaveGeneral = async () => {
    if (!formGeneral.titulo || !formGeneral.motivoConsulta) {
      showMessage('error', 'Título y motivo de consulta son obligatorios');
      return;
    }
    try {
      await updateCase(id, formGeneral);
      showMessage('success', 'Caso actualizado exitosamente');
      setEditingGeneral(false);
      loadCaseDetails();
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Error al actualizar caso');
    }
  };

  const handleEditPhase = (phase) => {
    setEditingPhaseId(phase.id);
    setFormPhase({
      titulo:              phase.titulo || '',
      contenido:           phase.contenido || '',
      preguntaPrincipal:   phase.preguntaPrincipal || '',
      pista:               phase.pista || '',
      puntosPenalizacionPista: phase.puntosPenalizacionPista || 5
    });
  };

  const handleSavePhase = async () => {
    if (!formPhase.titulo || !formPhase.contenido || !formPhase.preguntaPrincipal) {
      showMessage('error', 'Título, contenido y pregunta principal son obligatorios');
      return;
    }
    try {
      await updatePhase(id, editingPhaseId, formPhase);
      showMessage('success', 'Fase actualizada exitosamente');
      setEditingPhaseId(null);
      loadCaseDetails();
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Error al actualizar fase');
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`¿Estás seguro de eliminar el caso "${caseData.titulo}"?`)) {
      try {
        await deleteCase(id);
        showMessage('success', 'Caso eliminado exitosamente');
        setTimeout(() => navigate('/teacher/my-cases'), 2000);
      } catch (error) {
        showMessage('error', 'Error al eliminar caso');
      }
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="loading">Cargando detalles del caso...</div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div>
        <Navbar />
        <div className="container">
          <div className="alert alert-error">Caso no encontrado</div>
          <button className="btn btn-primary" onClick={() => navigate('/teacher/my-cases')}>
            ← Volver a Mis Casos
          </button>
        </div>
      </div>
    );
  }

  const faseActualData = phases[faseActiva];

  return (
    <div>
      <Navbar />
      <div className="container">

        <div className="page-header">
          <div>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/teacher/my-cases')}
              style={{ marginBottom: '10px' }}
            >
              ← Volver a Mis Casos
            </button>
            <h1>Detalles del Caso</h1>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-danger" onClick={handleDelete}>
              Eliminar Caso
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}

        <div className="card">
          <div className="card-header-actions">
            <h2>Información General</h2>
            {!editingGeneral ? (
              <button className="btn btn-primary btn-sm" onClick={() => setEditingGeneral(true)}>
                Editar
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-success btn-sm" onClick={handleSaveGeneral}>
                  Guardar
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditingGeneral(false)}>
                  Cancelar
                </button>
              </div>
            )}
          </div>

          <div className="detail-grid">
            <div className="form-group">
              <label>Título *</label>
              {editingGeneral ? (
                <input
                  type="text"
                  className="form-control"
                  value={formGeneral.titulo}
                  onChange={(e) => setFormGeneral({ ...formGeneral, titulo: e.target.value })}
                />
              ) : (
                <div className="detail-value">{caseData.titulo}</div>
              )}
            </div>

            <div className="form-group">
              <label>Nivel de Dificultad</label>
              {editingGeneral ? (
                <select
                  className="form-control"
                  value={formGeneral.nivelDificultad}
                  onChange={(e) => setFormGeneral({ ...formGeneral, nivelDificultad: e.target.value })}
                >
                  <option value="basico">Básico</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="avanzado">Avanzado</option>
                </select>
              ) : (
                <div className="detail-value">
                  <span className={`badge badge-dificultad badge-${caseData.nivelDificultad}`}>
                    {caseData.nivelDificultad || 'intermedio'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Descripción</label>
            {editingGeneral ? (
              <textarea
                className="form-control"
                rows="2"
                value={formGeneral.descripcion}
                onChange={(e) => setFormGeneral({ ...formGeneral, descripcion: e.target.value })}
              />
            ) : (
              <div className="detail-value">{caseData.descripcion || 'Sin descripción'}</div>
            )}
          </div>

          <h3 className="subsection-title">Datos del Paciente</h3>
          <div className="detail-grid">
            <div className="form-group">
              <label>Edad</label>
              {editingGeneral ? (
                <input
                  type="number"
                  className="form-control"
                  value={formGeneral.pacienteEdad}
                  onChange={(e) => setFormGeneral({ ...formGeneral, pacienteEdad: e.target.value })}
                />
              ) : (
                <div className="detail-value">{caseData.pacienteEdad || 'No registrado'}</div>
              )}
            </div>

            <div className="form-group">
              <label>Sexo</label>
              {editingGeneral ? (
                <select
                  className="form-control"
                  value={formGeneral.pacienteSexo}
                  onChange={(e) => setFormGeneral({ ...formGeneral, pacienteSexo: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                </select>
              ) : (
                <div className="detail-value capitalize">
                  {caseData.pacienteSexo || 'No registrado'}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Ocupación</label>
              {editingGeneral ? (
                <input
                  type="text"
                  className="form-control"
                  value={formGeneral.pacienteOcupacion}
                  onChange={(e) => setFormGeneral({ ...formGeneral, pacienteOcupacion: e.target.value })}
                />
              ) : (
                <div className="detail-value">{caseData.pacienteOcupacion || 'No registrado'}</div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Motivo de Consulta *</label>
            {editingGeneral ? (
              <textarea
                className="form-control"
                rows="3"
                value={formGeneral.motivoConsulta}
                onChange={(e) => setFormGeneral({ ...formGeneral, motivoConsulta: e.target.value })}
              />
            ) : (
              <div className="detail-value">{caseData.motivoConsulta}</div>
            )}
          </div>

          <div className="form-group">
            <label>Tiempo de Evolución</label>
            {editingGeneral ? (
              <input
                type="text"
                className="form-control"
                value={formGeneral.tiempoEvolucion}
                onChange={(e) => setFormGeneral({ ...formGeneral, tiempoEvolucion: e.target.value })}
              />
            ) : (
              <div className="detail-value">{caseData.tiempoEvolucion || 'No registrado'}</div>
            )}
          </div>

          <div className="form-group">
            <label>Antecedentes Personales</label>
            {editingGeneral ? (
              <textarea
                className="form-control"
                rows="3"
                value={formGeneral.antecedentesPersonales}
                onChange={(e) => setFormGeneral({ ...formGeneral, antecedentesPersonales: e.target.value })}
              />
            ) : (
              <div className="detail-value">
                {caseData.antecedentesPersonales || 'No registrado'}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Antecedentes Epidemiológicos</label>
            {editingGeneral ? (
              <textarea
                className="form-control"
                rows="3"
                value={formGeneral.antecedentesEpidemiologicos}
                onChange={(e) => setFormGeneral({ ...formGeneral, antecedentesEpidemiologicos: e.target.value })}
              />
            ) : (
              <div className="detail-value">
                {caseData.antecedentesEpidemiologicos || 'No registrado'}
              </div>
            )}
          </div>

          <div className="card-docente" style={{ marginTop: '20px' }}>
            <h3>
              🔒 Diagnóstico Correcto
              <span className="badge-docente">Solo visible para el docente</span>
            </h3>
            <div className="form-group">
              <label>Diagnóstico Correcto</label>
              {editingGeneral ? (
                <textarea
                  className="form-control"
                  rows="3"
                  value={formGeneral.diagnosticoCorrecto}
                  onChange={(e) => setFormGeneral({ ...formGeneral, diagnosticoCorrecto: e.target.value })}
                />
              ) : (
                <div className="detail-value">
                  {caseData.diagnosticoCorrecto || 'No registrado'}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Tratamiento Correcto</label>
              {editingGeneral ? (
                <textarea
                  className="form-control"
                  rows="3"
                  value={formGeneral.tratamientoCorrecto}
                  onChange={(e) => setFormGeneral({ ...formGeneral, tratamientoCorrecto: e.target.value })}
                />
              ) : (
                <div className="detail-value">
                  {caseData.tratamientoCorrecto || 'No registrado'}
                </div>
              )}
            </div>
          </div>

          <div className="info-row" style={{ marginTop: '20px' }}>
            <div className="info-item">
              <span className="info-label">Estado</span>
              <span className={`badge ${caseData.activo ? 'badge-success' : 'badge-danger'}`}>
                {caseData.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Total Fases</span>
              <span className="info-value">{caseData.totalFases}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Creado</span>
              <span className="info-value">
                {new Date(caseData.fechaCreacion).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Fases del Caso ({phases.length})</h2>
          <p className="card-subtitle">
            Haz clic en una fase para ver su contenido. Usa el botón Editar para modificarla.
          </p>

          <div className="fases-tabs-viewer">
            {phases.map((fase, index) => (
              <button
                key={fase.id}
                className={`fase-tab-view ${faseActiva === index ? 'active' : ''}`}
                onClick={() => {
                  setFaseActiva(index);
                  setEditingPhaseId(null);
                }}
              >
                <span>{index + 1}</span>
                <span className="fase-tab-tipo">
                  {TIPO_FASE_LABEL[fase.tipoFase] || `Fase ${index + 1}`}
                </span>
              </button>
            ))}
          </div>

          {faseActualData && (
            <div className="fase-viewer">
              <div className="fase-viewer-header">
                <div>
                  <h3>{faseActualData.titulo}</h3>
                  <span className="fase-tipo-badge">
                    {TIPO_FASE_LABEL[faseActualData.tipoFase]}
                  </span>
                </div>
                {editingPhaseId !== faseActualData.id ? (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleEditPhase(faseActualData)}
                  >
                    Editar Fase
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-success btn-sm" onClick={handleSavePhase}>
                      Guardar
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setEditingPhaseId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              {editingPhaseId === faseActualData.id ? (
                <div className="fase-edit-form">
                  <div className="form-group">
                    <label>Título de la Fase *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formPhase.titulo}
                      onChange={(e) => setFormPhase({ ...formPhase, titulo: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Contenido *</label>
                    <textarea
                      className="form-control"
                      rows="6"
                      value={formPhase.contenido}
                      onChange={(e) => setFormPhase({ ...formPhase, contenido: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Pregunta Principal *</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={formPhase.preguntaPrincipal}
                      onChange={(e) => setFormPhase({ ...formPhase, preguntaPrincipal: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Pista (opcional)</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={formPhase.pista}
                      onChange={(e) => setFormPhase({ ...formPhase, pista: e.target.value })}
                    />
                  </div>
                  {formPhase.pista && (
                    <div className="form-group">
                      <label>Penalización por pista (puntos)</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        max="20"
                        value={formPhase.puntosPenalizacionPista}
                        onChange={(e) => setFormPhase({
                          ...formPhase,
                          puntosPenalizacionPista: parseFloat(e.target.value)
                        })}
                        style={{ maxWidth: '120px' }}
                      />
                    </div>
                  )}
                  <div className="alert alert-info" style={{ marginTop: '10px' }}>
                    ℹ️ Para modificar recursos de la fase, elimina y recrea el caso.
                  </div>
                </div>
              ) : (
                <div className="fase-view-content">
                  <div className="form-group">
                    <label>Contenido</label>
                    <div className="detail-value historia-clinica">
                      {faseActualData.contenido}
                    </div>
                  </div>

                  {faseActualData.signosVitales &&
                    Object.values(faseActualData.signosVitales).some(v => v) && (
                    <div className="form-group">
                      <label>Signos Vitales</label>
                      <div className="vitals-grid">
                        {Object.entries(faseActualData.signosVitales).map(([key, val]) =>
                          val ? (
                            <div key={key} className="vital-item-small">
                              <span className="vital-label">{key}</span>
                              <span className="vital-value">{val}</span>
                            </div>
                          ) : null
                        )}
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Pregunta Principal</label>
                    <div className="detail-value pregunta-highlight">
                      {faseActualData.preguntaPrincipal}
                    </div>
                  </div>

                  {faseActualData.preguntasSecundarias &&
                    faseActualData.preguntasSecundarias.length > 0 && (
                    <div className="form-group">
                      <label>Preguntas Secundarias</label>
                      <ul className="preguntas-list">
                        {faseActualData.preguntasSecundarias.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {faseActualData.pista && (
                    <div className="form-group">
                      <label>Pista (-{faseActualData.puntosPenalizacionPista} pts)</label>
                      <div className="detail-value pista-value">{faseActualData.pista}</div>
                    </div>
                  )}

                  {faseActualData.recursos && faseActualData.recursos.length > 0 && (
                    <div className="form-group">
                      <label>Recursos ({faseActualData.recursos.length})</label>
                      <div className="resources-grid">
                        {faseActualData.recursos.map(r => (
                          <div key={r.id} className="resource-card">
                            <div className="resource-icon">
                              {r.tipoRecurso === 'imagen' ? '🖼️' :
                               r.tipoRecurso === 'pdf'    ? '📄' :
                               r.tipoRecurso === 'video'  ? '🎥' : '📎'}
                            </div>
                            <div className="resource-info">
                              <p className="resource-name">{r.nombreArchivo}</p>
                              <p className="resource-size">
                                {r.tamanioBytes
                                  ? `${(r.tamanioBytes / 1024).toFixed(2)} KB`
                                  : ''}
                              </p>
                            </div>
                            <a
                              href={`http://localhost:5000/${r.rutaArchivo}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-primary btn-sm"
                            >
                              Ver
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {resources.length > 0 && (
          <div className="card">
            <h2>Recursos Generales ({resources.length})</h2>
            <div className="resources-grid">
              {resources.map((resource) => (
                <div key={resource.id} className="resource-card">
                  <div className="resource-icon">
                    {resource.tipoRecurso === 'imagen' ? '🖼️' :
                     resource.tipoRecurso === 'pdf'    ? '📄' :
                     resource.tipoRecurso === 'video'  ? '🎥' : '📎'}
                  </div>
                  <div className="resource-info">
                    <p className="resource-name">{resource.nombreArchivo}</p>
                    <p className="resource-size">
                      {resource.tamanioBytes
                        ? `${(resource.tamanioBytes / 1024).toFixed(2)} KB`
                        : ''}
                    </p>
                  </div>
                  <a
                    href={`http://localhost:5000/${resource.rutaArchivo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                  >
                    Ver
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {assignments.length > 0 && (
          <div className="card">
            <h2>Asignaciones a Cursos ({assignments.length})</h2>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Curso</th>
                    <th>Código</th>
                    <th>Fecha Asignación</th>
                    <th>Fecha Vencimiento</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id}>
                      <td>{a.nombreCurso}</td>
                      <td>{a.codigoCurso}</td>
                      <td>{new Date(a.fecha_asignacion).toLocaleDateString()}</td>
                      <td>
                        {a.fecha_vencimiento
                          ? new Date(a.fecha_vencimiento).toLocaleDateString()
                          : 'Sin fecha'}
                      </td>
                      <td>
                        <span className={`badge ${a.activo ? 'badge-success' : 'badge-danger'}`}>
                          {a.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseDetails;