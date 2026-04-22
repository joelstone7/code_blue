import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCase } from '../../services/api';
import Navbar from '../common/Navbar';
import './CreateCase.css';

const CreateCase = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    historiaClinica: '',
    signosVitales: {
      presionArterial: '',
      frecuenciaCardiaca: '',
      frecuenciaRespiratoria: '',
      temperatura: '',
      saturacionOxigeno: ''
    }
  });

  const [preguntas, setPreguntas] = useState([]);
  const [files, setFiles] = useState([]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleAddPregunta = () => {
    setPreguntas([...preguntas, {
      tipoPregunta: 'abierta',
      enunciado: '',
      opciones: ['', '', '', ''],
      respuestaCorrecta: '',
      puntos: 10
    }]);
  };

  const handleRemovePregunta = (index) => {
    setPreguntas(preguntas.filter((_, i) => i !== index));
  };

  const handlePreguntaChange = (index, field, value) => {
    const newPreguntas = [...preguntas];
    newPreguntas[index][field] = value;
    setPreguntas(newPreguntas);
  };

  const handleOpcionChange = (preguntaIndex, opcionIndex, value) => {
    const newPreguntas = [...preguntas];
    newPreguntas[preguntaIndex].opciones[opcionIndex] = value;
    setPreguntas(newPreguntas);
  };

  const handleFilesChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.titulo || !formData.historiaClinica) {
      showMessage('error', 'Título e historia clínica son obligatorios');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('titulo', formData.titulo);
      data.append('descripcion', formData.descripcion);
      data.append('historiaClinica', formData.historiaClinica);
      data.append('signosVitales', JSON.stringify(formData.signosVitales));
      data.append('preguntas', JSON.stringify(preguntas));

      // Agregar archivos
      files.forEach((file) => {
        data.append('recursos', file);
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
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="card">
            <h2>Información General</h2>

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

            <div className="form-group">
              <label>Historia Clínica Completa *</label>
              <textarea
                className="form-control"
                rows="8"
                placeholder="Incluye: motivo de consulta, antecedentes, evolución, examen físico, etc."
                value={formData.historiaClinica}
                onChange={(e) => setFormData({ ...formData, historiaClinica: e.target.value })}
                required
              />
              <small className="form-text">Describe el caso completo que verán los estudiantes</small>
            </div>
          </div>

          <div className="card">
            <h2>Signos Vitales</h2>
            <div className="vitals-grid">
              <div className="form-group">
                <label>Presión Arterial (mmHg)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: 120/80"
                  value={formData.signosVitales.presionArterial}
                  onChange={(e) => setFormData({
                    ...formData,
                    signosVitales: { ...formData.signosVitales, presionArterial: e.target.value }
                  })}
                />
              </div>

              <div className="form-group">
                <label>Frecuencia Cardíaca (lpm)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: 72"
                  value={formData.signosVitales.frecuenciaCardiaca}
                  onChange={(e) => setFormData({
                    ...formData,
                    signosVitales: { ...formData.signosVitales, frecuenciaCardiaca: e.target.value }
                  })}
                />
              </div>

              <div className="form-group">
                <label>Frecuencia Respiratoria (rpm)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: 16"
                  value={formData.signosVitales.frecuenciaRespiratoria}
                  onChange={(e) => setFormData({
                    ...formData,
                    signosVitales: { ...formData.signosVitales, frecuenciaRespiratoria: e.target.value }
                  })}
                />
              </div>

              <div className="form-group">
                <label>Temperatura (°C)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: 36.5"
                  value={formData.signosVitales.temperatura}
                  onChange={(e) => setFormData({
                    ...formData,
                    signosVitales: { ...formData.signosVitales, temperatura: e.target.value }
                  })}
                />
              </div>

              <div className="form-group">
                <label>Saturación de O₂ (%)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: 98"
                  value={formData.signosVitales.saturacionOxigeno}
                  onChange={(e) => setFormData({
                    ...formData,
                    signosVitales: { ...formData.signosVitales, saturacionOxigeno: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Preguntas del Caso ({preguntas.length})</h2>
              <button type="button" className="btn btn-primary" onClick={handleAddPregunta}>
                Agregar Pregunta
              </button>
            </div>

            {preguntas.length === 0 ? (
              <div className="empty-state">
                <p>No hay preguntas agregadas. Las preguntas ayudan a evaluar el entendimiento del estudiante.</p>
                <button type="button" className="btn btn-primary" onClick={handleAddPregunta}>
                  Agregar Primera Pregunta
                </button>
              </div>
            ) : (
              preguntas.map((pregunta, index) => (
                <div key={index} className="pregunta-card">
                  <div className="pregunta-header">
                    <h3>Pregunta {index + 1}</h3>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRemovePregunta(index)}
                    >
                      Eliminar
                    </button>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Tipo de Pregunta</label>
                      <select
                        className="form-control"
                        value={pregunta.tipoPregunta}
                        onChange={(e) => handlePreguntaChange(index, 'tipoPregunta', e.target.value)}
                      >
                        <option value="abierta">Abierta (respuesta libre)</option>
                        <option value="cerrada">Cerrada (opción múltiple)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Puntos</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        value={pregunta.puntos}
                        onChange={(e) => handlePreguntaChange(index, 'puntos', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Enunciado de la Pregunta</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Escribe la pregunta..."
                      value={pregunta.enunciado}
                      onChange={(e) => handlePreguntaChange(index, 'enunciado', e.target.value)}
                      required
                    />
                  </div>

                  {pregunta.tipoPregunta === 'cerrada' && (
                    <>
                      <label>Opciones de Respuesta</label>
                      {pregunta.opciones.map((opcion, opIndex) => (
                        <div key={opIndex} className="form-group">
                          <input
                            type="text"
                            className="form-control"
                            placeholder={`Opción ${opIndex + 1}`}
                            value={opcion}
                            onChange={(e) => handleOpcionChange(index, opIndex, e.target.value)}
                          />
                        </div>
                      ))}

                      <div className="form-group">
                        <label>Respuesta Correcta</label>
                        <select
                          className="form-control"
                          value={pregunta.respuestaCorrecta}
                          onChange={(e) => handlePreguntaChange(index, 'respuestaCorrecta', e.target.value)}
                        >
                          <option value="">Seleccionar...</option>
                          {pregunta.opciones.map((opcion, opIndex) => (
                            opcion && <option key={opIndex} value={opcion}>Opción {opIndex + 1}: {opcion}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="card">
            <h2>Recursos Multimedia</h2>
            <div className="form-group">
              <label>Adjuntar Archivos (Imágenes, PDFs, Videos)</label>
              <input
                type="file"
                className="form-control"
                multiple
                accept="image/*,application/pdf,video/*"
                onChange={handleFilesChange}
              />
              <small className="form-text">
                Puedes subir múltiples archivos: radiografías, exámenes de laboratorio, etc.
              </small>
            </div>

            {files.length > 0 && (
              <div className="files-preview">
                <h4>Archivos seleccionados ({files.length})</h4>
                <ul>
                  {files.map((file, index) => (
                    <li key={index}>
                      📎 {file.name} ({(file.size / 1024).toFixed(2)} KB)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

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