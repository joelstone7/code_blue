import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCaseById, updateCase, deleteCase } from '../../services/api';
import Navbar from '../common/Navbar';
import './CaseDetails.css';

const CaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [caseData, setCaseData] = useState(null);
  const [resources, setResources] = useState([]);
  const [assignments, setAssignments] = useState([]);
  
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

  useEffect(() => {
    loadCaseDetails();
  }, [id]);

  const loadCaseDetails = async () => {
    try {
      setLoading(true);
      console.log('Cargando detalles del caso ID:', id);
      
      const response = await getCaseById(id);
      console.log('Datos del caso:', response.data);
      
      const { case: caseInfo, resources: caseResources, assignments: caseAssignments } = response.data;
      
      setCaseData(caseInfo);
      setResources(caseResources || []);
      setAssignments(caseAssignments || []);
      
      // Inicializar form con datos del caso
      setFormData({
        titulo: caseInfo.titulo || '',
        descripcion: caseInfo.descripcion || '',
        historiaClinica: caseInfo.historiaClinica || '',
        signosVitales: caseInfo.signosVitales || {
          presionArterial: '',
          frecuenciaCardiaca: '',
          frecuenciaRespiratoria: '',
          temperatura: '',
          saturacionOxigeno: ''
        }
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

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancelEdit = () => {
    // Restaurar datos originales
    setFormData({
      titulo: caseData.titulo || '',
      descripcion: caseData.descripcion || '',
      historiaClinica: caseData.historiaClinica || '',
      signosVitales: caseData.signosVitales || {
        presionArterial: '',
        frecuenciaCardiaca: '',
        frecuenciaRespiratoria: '',
        temperatura: '',
        saturacionOxigeno: ''
      }
    });
    setEditing(false);
  };

  const handleSave = async () => {
    try {
      if (!formData.titulo || !formData.historiaClinica) {
        showMessage('error', 'Título e historia clínica son obligatorios');
        return;
      }

      console.log('Guardando cambios del caso...');
      
      await updateCase(id, {
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        historiaClinica: formData.historiaClinica,
        signosVitales: JSON.stringify(formData.signosVitales)
      });

      showMessage('success', 'Caso actualizado exitosamente');
      setEditing(false);
      loadCaseDetails(); // Recargar datos
      
    } catch (error) {
      console.error('Error al actualizar caso:', error);
      showMessage('error', error.response?.data?.error || 'Error al actualizar caso');
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`¿Estás seguro de eliminar el caso "${caseData.titulo}"?\n\nEsta acción no se puede deshacer.`)) {
      try {
        await deleteCase(id);
        showMessage('success', 'Caso eliminado exitosamente');
        setTimeout(() => navigate('/teacher/my-cases'), 2000);
      } catch (error) {
        console.error('Error al eliminar caso:', error);
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
            <h1>
              {editing ? 'Editando Caso' : 'Detalles del Caso'}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {!editing ? (
              <>
                <button className="btn btn-primary" onClick={handleEdit}>
                  Editar Caso
                </button>
                <button className="btn btn-danger" onClick={handleDelete}>
                  Eliminar Caso
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-success" onClick={handleSave}>
                  Guardar Cambios
                </button>
                <button className="btn btn-secondary" onClick={handleCancelEdit}>
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* INFORMACIÓN GENERAL */}
        <div className="card">
          <h2>Información General</h2>
          
          <div className="form-group">
            <label>Título del Caso *</label>
            {editing ? (
              <input
                type="text"
                className="form-control"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              />
            ) : (
              <div className="detail-value">{caseData.titulo}</div>
            )}
          </div>

          <div className="form-group">
            <label>Descripción Breve</label>
            {editing ? (
              <textarea
                className="form-control"
                rows="3"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              />
            ) : (
              <div className="detail-value">{caseData.descripcion || 'Sin descripción'}</div>
            )}
          </div>

          <div className="form-group">
            <label>Historia Clínica Completa *</label>
            {editing ? (
              <textarea
                className="form-control"
                rows="8"
                value={formData.historiaClinica}
                onChange={(e) => setFormData({ ...formData, historiaClinica: e.target.value })}
              />
            ) : (
              <div className="detail-value historia-clinica">{caseData.historiaClinica}</div>
            )}
          </div>

          <div className="info-row">
            <div className="info-item">
              <span className="info-label">Estado:</span>
              <span className={`badge ${caseData.activo ? 'badge-success' : 'badge-danger'}`}>
                {caseData.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Creado:</span>
              <span className="info-value">{new Date(caseData.fechaCreacion).toLocaleDateString()}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Última actualización:</span>
              <span className="info-value">{new Date(caseData.fechaActualizacion).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* SIGNOS VITALES */}
        <div className="card">
          <h2>Signos Vitales</h2>
          <div className="vitals-grid">
            <div className="form-group">
              <label>Presión Arterial (mmHg)</label>
              {editing ? (
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: 120/80"
                  value={formData.signosVitales.presionArterial || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    signosVitales: { ...formData.signosVitales, presionArterial: e.target.value }
                  })}
                />
              ) : (
                <div className="detail-value">
                  {formData.signosVitales.presionArterial || 'No registrado'}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Frecuencia Cardíaca (lpm)</label>
              {editing ? (
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: 72"
                  value={formData.signosVitales.frecuenciaCardiaca || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    signosVitales: { ...formData.signosVitales, frecuenciaCardiaca: e.target.value }
                  })}
                />
              ) : (
                <div className="detail-value">
                  {formData.signosVitales.frecuenciaCardiaca || 'No registrado'}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Frecuencia Respiratoria (rpm)</label>
              {editing ? (
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: 16"
                  value={formData.signosVitales.frecuenciaRespiratoria || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    signosVitales: { ...formData.signosVitales, frecuenciaRespiratoria: e.target.value }
                  })}
                />
              ) : (
                <div className="detail-value">
                  {formData.signosVitales.frecuenciaRespiratoria || 'No registrado'}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Temperatura (°C)</label>
              {editing ? (
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: 36.5"
                  value={formData.signosVitales.temperatura || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    signosVitales: { ...formData.signosVitales, temperatura: e.target.value }
                  })}
                />
              ) : (
                <div className="detail-value">
                  {formData.signosVitales.temperatura || 'No registrado'}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Saturación de O₂ (%)</label>
              {editing ? (
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: 98"
                  value={formData.signosVitales.saturacionOxigeno || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    signosVitales: { ...formData.signosVitales, saturacionOxigeno: e.target.value }
                  })}
                />
              ) : (
                <div className="detail-value">
                  {formData.signosVitales.saturacionOxigeno || 'No registrado'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RECURSOS MULTIMEDIA */}
        <div className="card">
          <h2>Recursos Multimedia ({resources.length})</h2>
          {resources.length === 0 ? (
            <p className="empty-text">No hay recursos adjuntos a este caso</p>
          ) : (
            <div className="resources-grid">
              {resources.map((resource) => (
                <div key={resource.id} className="resource-card">
                  <div className="resource-icon">
                    {resource.tipoRecurso === 'imagen' && ''}
                    {resource.tipoRecurso === 'pdf' && ''}
                    {resource.tipoRecurso === 'video' && ''}
                    {resource.tipoRecurso === 'otro' && ''}
                  </div>
                  <div className="resource-info">
                    <p className="resource-name">{resource.nombreArchivo}</p>
                    <p className="resource-size">
                      {(resource.tamanioBytes / 1024).toFixed(2)} KB
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
          )}
          {editing && (
            <div className="alert alert-info" style={{ marginTop: '20px' }}>
              ℹ️ Para modificar los recursos, debes crear un nuevo caso o contactar al administrador
            </div>
          )}
        </div>

        {/* ASIGNACIONES */}
        {assignments.length > 0 && (
          <div className="card">
            <h2>Asignaciones a Cursos ({assignments.length})</h2>
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
                {assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>{assignment.nombreCurso}</td>
                    <td>{assignment.codigoCurso}</td>
                    <td>{new Date(assignment.fecha_asignacion).toLocaleDateString()}</td>
                    <td>
                      {assignment.fecha_vencimiento 
                        ? new Date(assignment.fecha_vencimiento).toLocaleDateString()
                        : 'Sin fecha'}
                    </td>
                    <td>
                      <span className={`badge ${assignment.activo ? 'badge-success' : 'badge-danger'}`}>
                        {assignment.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseDetails;