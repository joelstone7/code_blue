import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTeacherStats, getPendingResponses } from '../../services/api';
import Navbar from '../common/Navbar';

const TeacherDashboard = () => {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Cargando datos del dashboard...');

      // Cargar estadísticas y entregas pendientes
      const [statsRes, pendingRes] = await Promise.all([
        getTeacherStats(),
        getPendingResponses()
      ]);

      console.log('Stats Response:', statsRes.data);
      console.log('Pending Response:', pendingRes.data);

      setStats(statsRes.data);
      setPending(pendingRes.data.pending || []);

    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
      console.error('Error details:', error.response?.data);
      setError('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="loading">Cargando dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Navbar />
        <div className="container">
          <div className="alert alert-error">{error}</div>
          <button className="btn btn-primary" onClick={loadData}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="container">
        <h1>Panel del Docente</h1>
        
        <div className="stats-grid">
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <h3>{stats?.courses?.totalCursos || 0}</h3>
            <p>Cursos Asignados</p>
          </div>
          
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <h3>{stats?.cases?.totalCasos || 0}</h3>
            <p>Casos Creados</p>
          </div>
          
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <h3>{stats?.submissions?.pendientes || 0}</h3>
            <p>Entregas Pendientes</p>
          </div>
          
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <h3>
              {stats?.avgGrade?.promedioNotas 
                ? parseFloat(stats.avgGrade.promedioNotas).toFixed(2) 
                : 'N/A'}
            </h3>
            <p>Promedio de Notas</p>
          </div>
        </div>

        <div className="card">
          <h2>Acciones Rápidas</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '20px' }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/teacher/create-case')}
              style={{ padding: '20px', height: 'auto' }}
            >
              <div></div>
              <div>Crear Caso Clínico</div>
            </button>
            
            <button
              className="btn btn-success"
              onClick={() => navigate('/teacher/my-cases')}
              style={{ padding: '20px', height: 'auto' }}
            >
              <div></div>
              <div>Mis Casos</div>
            </button>
            
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/teacher/courses')}
              style={{ padding: '20px', height: 'auto' }}
            >
              <div></div>
              <div>Mis Cursos</div>
            </button>
            
            <button
              className="btn btn-danger"
              onClick={() => navigate('/teacher/review')}
              style={{ padding: '20px', height: 'auto', position: 'relative' }}
            >
              <div></div>
              <div>Revisar Entregas</div>
              {pending.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: '#fff',
                  color: '#dc3545',
                  borderRadius: '50%',
                  padding: '5px 10px',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  {pending.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {pending.length > 0 && (
          <div className="card">
            <h2>Entregas Pendientes de Calificación</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Caso</th>
                  <th>Curso</th>
                  <th>Fecha de Envío</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pending.slice(0, 10).map((item) => (
                  <tr key={item.id}>
                    <td>{item.nombre} {item.apellido}</td>
                    <td>{item.tituloCaso}</td>
                    <td>{item.nombreCurso}</td>
                    <td>{new Date(item.fecha_envio).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate('/teacher/review')}
                      >
                        Revisar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pending.length > 10 && (
              <div style={{ marginTop: '15px', textAlign: 'center' }}>
                <button 
                  className="btn btn-secondary"
                  onClick={() => navigate('/teacher/review')}
                >
                  Ver todas las entregas ({pending.length})
                </button>
              </div>
            )}
          </div>
        )}

        {stats?.topCases && stats.topCases.length > 0 && (
          <div className="card">
            <h2>Mis Casos Más Asignados</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Título del Caso</th>
                  <th>Veces Asignado</th>
                  <th>Total Respuestas</th>
                </tr>
              </thead>
              <tbody>
                {stats.topCases.map((item, index) => (
                  <tr key={index}>
                    <td>{item.titulo}</td>
                    <td>{item.vecesAsignado}</td>
                    <td>{item.totalRespuestas}</td>
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

export default TeacherDashboard;