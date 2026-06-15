import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCase } from '../../services/api';
import Navbar from '../common/Navbar';
import './CreateCase.css';

// Tipos de fase disponibles con su etiqueta visible
const TIPOS_FASE = [
  { value: 'presentacion',       label: 'Presentación del Paciente' },
  { value: 'exploracion_fisica', label: 'Exploración Física' },
  { value: 'laboratorio',        label: 'Resultados de Laboratorio' },
  { value: 'imagenes',           label: 'Imágenes Diagnósticas' },
  { value: 'evolucion',          label: 'Evolución Clínica' },
  { value: 'diagnostico_final',  label: 'Diagnóstico y Tratamiento Final' },
];

// Fase vacía por defecto
const nuevaFase = (numero) => ({
  numeroFase: numero,
  tipoFase: 'presentacion',
  titulo: '',
  contenido: '',
  datosLaboratorio: '',
  signosVitales: {
    presionArterial: '',
    frecuenciaCardiaca: '',
    frecuenciaRespiratoria: '',
    temperatura: '',
    saturacionOxigeno: ''
  },
  preguntaPrincipal: '',
  preguntasSecundarias: [''],
  pista: '',
  puntosPenalizacionPista: 5,
  archivos: []
});

const CreateCase = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // ── Datos generales del caso ───────────────────────────────
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    pacienteEdad: '',
    pacienteSexo: '',
    pacienteOcupacion: '',
    antecedentesPersonales: '',
    antecedentesEpidemiologicos: '',
    motivoConsulta: '',
    tiempoEvolucion: '',
    diagnosticoCorrecto: '',
    tratamientoCorrecto: '',
    nivelDificultad: 'intermedio'
  });

  // ── Fases del caso ─────────────────────────────────────────
  const [fases, setFases] = useState([nuevaFase(1)]);

  // ── Pestaña activa en el editor de fases ──────────────────
  const [faseActiva, setFaseActiva] = useState(0);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // ── Manejo de fases ────────────────────────────────────────
  const agregarFase = () => {
    if (fases.length >= 6) {
      showMessage('error', 'El máximo de fases es 6');
      return;
    }
    const nuevasFases = [...fases, nuevaFase(fases.length + 1)];
    setFases(nuevasFases);
    setFaseActiva(nuevasFases.length - 1);
  };

  const eliminarFase = (index) => {
    if (fases.length === 1) {
      showMessage('error', 'El caso debe tener al menos una fase');
      return;
    }
    const nuevasFases = fases.filter((_, i) => i !== index)
      .map((f, i) => ({ ...f, numeroFase: i + 1 }));
    setFases(nuevasFases);
    setFaseActiva(Math.min(faseActiva, nuevasFases.length - 1));
  };

  const actualizarFase = (index, campo, valor) => {
    const nuevasFases = [...fases];
    nuevasFases[index] = { ...nuevasFases[index], [campo]: valor };
    setFases(nuevasFases);
  };

  const actualizarSignoVital = (index, campo, valor) => {
    const nuevasFases = [...fases];
    nuevasFases[index].signosVitales = {
      ...nuevasFases[index].signosVitales,
      [campo]: valor
    };
    setFases(nuevasFases);
  };

  const agregarPreguntaSecundaria = (faseIndex) => {
    const nuevasFases = [...fases];
    nuevasFases[faseIndex].preguntasSecundarias.push('');
    setFases(nuevasFases);
  };

  const actualizarPreguntaSecundaria = (faseIndex, pregIndex, valor) => {
    const nuevasFases = [...fases];
    nuevasFases[faseIndex].preguntasSecundarias[pregIndex] = valor;
    setFases(nuevasFases);
  };

  const eliminarPreguntaSecundaria = (faseIndex, pregIndex) => {
    const nuevasFases = [...fases];
    nuevasFases[faseIndex].preguntasSecundarias =
      nuevasFases[faseIndex].preguntasSecundarias.filter((_, i) => i !== pregIndex);
    setFases(nuevasFases);
  };

  const handleArchivosChange = (faseIndex, e) => {
    const archivos = Array.from(e.target.files);
    const nuevasFases = [...fases];
    nuevasFases[faseIndex].archivos = archivos;
    setFases(nuevasFases);
  };

  // ── Envío del formulario ───────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!formData.titulo || !formData.motivoConsulta) {
      showMessage('error', 'Título y motivo de consulta son obligatorios');
      return;
    }

    for (let i = 0; i < fases.length; i++) {
      if (!fases[i].titulo || !fases[i].contenido || !fases[i].preguntaPrincipal) {
        showMessage('error', `La fase ${i + 1} debe tener título, contenido y pregunta principal`);
        setFaseActiva(i);
        return;
      }
    }

    setLoading(true);

    try {
      const data = new FormData();

      // Datos generales del caso
      data.append('titulo', formData.titulo);
      data.append('descripcion', formData.descripcion);
      data.append('pacienteEdad', formData.pacienteEdad);
      data.append('pacienteSexo', formData.pacienteSexo);
      data.append('pacienteOcupacion', formData.pacienteOcupacion);
      data.append('antecedentesPersonales', formData.antecedentesPersonales);
      data.append('antecedentesEpidemiologicos', formData.antecedentesEpidemiologicos);
      data.append('motivoConsulta', formData.motivoConsulta);
      data.append('tiempoEvolucion', formData.tiempoEvolucion);
      data.append('diagnosticoCorrecto', formData.diagnosticoCorrecto);
      data.append('tratamientoCorrecto', formData.tratamientoCorrecto);
      data.append('nivelDificultad', formData.nivelDificultad);

      // Serializar fases sin los archivos
      const fasesData = fases.map(f => ({
        tipoFase: f.tipoFase,
        titulo: f.titulo,
        contenido: f.contenido,
        datosLaboratorio: f.datosLaboratorio
          ? (() => { try { return JSON.parse(f.datosLaboratorio); } catch { return null; } })()
          : null,
        signosVitales: Object.values(f.signosVitales).some(v => v)
          ? f.signosVitales
          : null,
        preguntaPrincipal: f.preguntaPrincipal,
        preguntasSecundarias: f.preguntasSecundarias.filter(p => p.trim()),
        pista: f.pista,
        puntosPenalizacionPista: f.puntosPenalizacionPista
      }));

      data.append('fases', JSON.stringify(fasesData));

      // Archivos por fase con fieldname que indica a qué fase pertenecen
      fases.forEach((fase, index) => {
        fase.archivos.forEach(archivo => {
          data.append(`recursos_fase_${index}`, archivo);
        });
      });

      await createCase(data);
      showMessage('success', 'Caso clínico creado exitosamente');
      setTimeout(() => navigate('/teacher/my-cases'), 2000);
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Error al crear caso clínico');
    } finally {
      setLoading(false);
    }
  };

  const faseActual = fases[faseActiva];

  return (
    <div>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <h1>Crear Caso Clínico</h1>
          <button className="btn btn-secondary" onClick={() => navigate('/teacher/dashboard')}>
            ← Volver al Dashboard
          </button>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}

        <form onSubmit={handleSubmit}>

          {/* ── SECCIÓN 1: Datos del Paciente ────────────────── */}
          <div className="card">
            <h2>Datos del Paciente</h2>

            <div className="form-group">
              <label>Título del Caso *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej: Paciente con dolor abdominal agudo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Descripción Breve</label>
              <textarea
                className="form-control"
                rows="2"
                placeholder="Resumen del caso para los estudiantes"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              />
            </div>

            <div className="vitals-grid">
              <div className="form-group">
                <label>Edad del Paciente</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Ej: 35"
                  min="0"
                  max="120"
                  value={formData.pacienteEdad}
                  onChange={(e) => setFormData({ ...formData, pacienteEdad: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Sexo</label>
                <select
                  className="form-control"
                  value={formData.pacienteSexo}
                  onChange={(e) => setFormData({ ...formData, pacienteSexo: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div className="form-group">
                <label>Ocupación</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: Agricultor"
                  value={formData.pacienteOcupacion}
                  onChange={(e) => setFormData({ ...formData, pacienteOcupacion: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Nivel de Dificultad</label>
                <select
                  className="form-control"
                  value={formData.nivelDificultad}
                  onChange={(e) => setFormData({ ...formData, nivelDificultad: e.target.value })}
                >
                  <option value="basico">Básico</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="avanzado">Avanzado</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Motivo de Consulta *</label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="¿Por qué consulta el paciente?"
                value={formData.motivoConsulta}
                onChange={(e) => setFormData({ ...formData, motivoConsulta: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Tiempo de Evolución</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej: 4 días de evolución"
                value={formData.tiempoEvolucion}
                onChange={(e) => setFormData({ ...formData, tiempoEvolucion: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Antecedentes Personales</label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Enfermedades previas, cirugías, medicamentos habituales..."
                value={formData.antecedentesPersonales}
                onChange={(e) => setFormData({ ...formData, antecedentesPersonales: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Antecedentes Epidemiológicos</label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Viajes recientes, contacto con animales, exposiciones ambientales..."
                value={formData.antecedentesEpidemiologicos}
                onChange={(e) => setFormData({ ...formData, antecedentesEpidemiologicos: e.target.value })}
              />
            </div>
          </div>

          {/* ── SECCIÓN 2: Diagnóstico correcto (solo docente) ── */}
          <div className="card card-docente">
            <h2>🔒 Diagnóstico Correcto <span className="badge-docente">Solo visible para el docente y la IA</span></h2>

            <div className="form-group">
              <label>Diagnóstico Correcto *</label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Diagnóstico definitivo del caso"
                value={formData.diagnosticoCorrecto}
                onChange={(e) => setFormData({ ...formData, diagnosticoCorrecto: e.target.value })}
              />
              <small className="form-text">
                La IA usará este diagnóstico para comparar con la respuesta del estudiante
              </small>
            </div>

            <div className="form-group">
              <label>Tratamiento Correcto *</label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Tratamiento adecuado para este caso"
                value={formData.tratamientoCorrecto}
                onChange={(e) => setFormData({ ...formData, tratamientoCorrecto: e.target.value })}
              />
            </div>
          </div>

          {/* ── SECCIÓN 3: Editor de Fases ───────────────────── */}
          <div className="card">
            <div className="fases-header">
              <h2>Fases del Caso ({fases.length}/6)</h2>
              <button
                type="button"
                className="btn btn-primary"
                onClick={agregarFase}
                disabled={fases.length >= 6}
              >
                + Agregar Fase
              </button>
            </div>

            <small className="form-text" style={{ marginBottom: '20px', display: 'block' }}>
              Organiza el caso en fases secuenciales. El estudiante irá respondiendo cada fase
              para avanzar a la siguiente, sin poder saltarse ninguna.
            </small>

            {/* Pestañas de fases */}
            <div className="fases-tabs">
              {fases.map((fase, index) => (
                <button
                  key={index}
                  type="button"
                  className={`fase-tab ${faseActiva === index ? 'active' : ''} ${
                    !fase.titulo || !fase.contenido || !fase.preguntaPrincipal ? 'incompleta' : 'completa'
                  }`}
                  onClick={() => setFaseActiva(index)}
                >
                  Fase {index + 1}
                  {fases.length > 1 && (
                    <span
                      className="fase-tab-delete"
                      onClick={(e) => { e.stopPropagation(); eliminarFase(index); }}
                    >
                      ×
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Editor de la fase activa */}
            <div className="fase-editor">
              <div className="form-row">
                <div className="form-group">
                  <label>Tipo de Fase *</label>
                  <select
                    className="form-control"
                    value={faseActual.tipoFase}
                    onChange={(e) => actualizarFase(faseActiva, 'tipoFase', e.target.value)}
                  >
                    {TIPOS_FASE.map(tipo => (
                      <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Título de la Fase *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Presentación inicial del paciente"
                    value={faseActual.titulo}
                    onChange={(e) => actualizarFase(faseActiva, 'titulo', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Contenido de la Fase *</label>
                <textarea
                  className="form-control"
                  rows="6"
                  placeholder={
                    faseActual.tipoFase === 'presentacion'
                      ? 'Describe la presentación inicial del paciente...'
                      : faseActual.tipoFase === 'laboratorio'
                      ? 'Describe los resultados de laboratorio...'
                      : faseActual.tipoFase === 'imagenes'
                      ? 'Describe los hallazgos en las imágenes...'
                      : 'Describe el contenido de esta fase...'
                  }
                  value={faseActual.contenido}
                  onChange={(e) => actualizarFase(faseActiva, 'contenido', e.target.value)}
                />
              </div>

              {/* Signos vitales — solo en fases de presentación o exploración */}
              {(faseActual.tipoFase === 'presentacion' || faseActual.tipoFase === 'exploracion_fisica') && (
                <div>
                  <label style={{ fontWeight: '600', marginBottom: '10px', display: 'block' }}>
                    Signos Vitales (opcional)
                  </label>
                  <div className="vitals-grid">
                    {[
                      { campo: 'presionArterial', label: 'Presión Arterial (mmHg)', placeholder: '120/80' },
                      { campo: 'frecuenciaCardiaca', label: 'Frecuencia Cardíaca (lpm)', placeholder: '72' },
                      { campo: 'frecuenciaRespiratoria', label: 'Frecuencia Respiratoria (rpm)', placeholder: '16' },
                      { campo: 'temperatura', label: 'Temperatura (°C)', placeholder: '36.5' },
                      { campo: 'saturacionOxigeno', label: 'Saturación O₂ (%)', placeholder: '98' },
                    ].map(sv => (
                      <div key={sv.campo} className="form-group">
                        <label>{sv.label}</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder={sv.placeholder}
                          value={faseActual.signosVitales[sv.campo]}
                          onChange={(e) => actualizarSignoVital(faseActiva, sv.campo, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Datos de laboratorio — solo en fase de laboratorio */}
              {faseActual.tipoFase === 'laboratorio' && (
                <div className="form-group">
                  <label>Datos de Laboratorio (JSON opcional)</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    placeholder='{"leucocitos": "6.91 x10⁹/L", "hemoglobina": "102.9 g/L", "plaquetas": "23 x10⁹/L"}'
                    value={faseActual.datosLaboratorio}
                    onChange={(e) => actualizarFase(faseActiva, 'datosLaboratorio', e.target.value)}
                  />
                  <small className="form-text">
                    Formato JSON. Si no sabes JSON, incluye los datos en el campo Contenido.
                  </small>
                </div>
              )}

              {/* Pregunta principal */}
              <div className="form-group">
                <label>Pregunta Principal de la Fase *</label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="Ej: ¿Cuál es tu sospecha diagnóstica inicial?"
                  value={faseActual.preguntaPrincipal}
                  onChange={(e) => actualizarFase(faseActiva, 'preguntaPrincipal', e.target.value)}
                />
              </div>

              {/* Preguntas secundarias */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ margin: 0 }}>Preguntas Secundarias (opcional)</label>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => agregarPreguntaSecundaria(faseActiva)}
                  >
                    + Agregar
                  </button>
                </div>
                {faseActual.preguntasSecundarias.map((preg, pregIndex) => (
                  <div key={pregIndex} className="pregunta-secundaria-row">
                    <input
                      type="text"
                      className="form-control"
                      placeholder={`Pregunta secundaria ${pregIndex + 1}`}
                      value={preg}
                      onChange={(e) => actualizarPreguntaSecundaria(faseActiva, pregIndex, e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => eliminarPreguntaSecundaria(faseActiva, pregIndex)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Pista */}
              <div className="form-group">
                <label>Pista (opcional)</label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="Pista que el estudiante puede solicitar (penaliza puntos)"
                  value={faseActual.pista}
                  onChange={(e) => actualizarFase(faseActiva, 'pista', e.target.value)}
                />
              </div>

              {faseActual.pista && (
                <div className="form-group">
                  <label>Puntos de penalización por usar la pista</label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    max="20"
                    value={faseActual.puntosPenalizacionPista}
                    onChange={(e) => actualizarFase(faseActiva, 'puntosPenalizacionPista', parseFloat(e.target.value))}
                    style={{ maxWidth: '150px' }}
                  />
                </div>
              )}

              {/* Archivos de la fase */}
              <div className="form-group">
                <label>Archivos de esta Fase (Imágenes, PDFs, Videos)</label>
                <input
                  type="file"
                  className="form-control"
                  multiple
                  accept="image/*,application/pdf,video/*"
                  onChange={(e) => handleArchivosChange(faseActiva, e)}
                />
                <small className="form-text">
                  Estos archivos se mostrarán solo cuando el estudiante llegue a esta fase
                </small>
                {faseActual.archivos.length > 0 && (
                  <div className="files-preview">
                    <h4>Archivos seleccionados ({faseActual.archivos.length})</h4>
                    <ul>
                      {faseActual.archivos.map((file, i) => (
                        <li key={i}>📎 {file.name} ({(file.size / 1024).toFixed(2)} KB)</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Acciones ─────────────────────────────────────── */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/teacher/dashboard')}
              disabled={loading}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? 'Creando...' : '✓ Crear Caso Clínico'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCase;