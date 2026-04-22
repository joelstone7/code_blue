import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminStats } from '../../services/api';
import Navbar from '../common/Navbar';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await getAdminStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Cargando estadísticas...</div>;
  }

  const totalUsers = stats?.users?.reduce((sum, user) => sum + user.total, 0) || 0;
  const admins = stats?.users?.find(u => u.rol === 'administrador')?.total || 0;
  const teachers = stats?.users?.find(u => u.rol === 'docente')?.total || 0;
  const students = stats?.users?.find(u => u.rol === 'estudiante')?.total || 0;

  return (
    <div>
      <Navbar />
      <div className="container">
        <h1>Panel de Administración</h1>
        
        <div className="stats-grid">
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <h3>{admins}</h3>
            <p>Administradores</p>
          </div>
          
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <h3>{teachers}</h3>
            <p>Docentes</p>
          </div>
          
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <h3>{students}</h3>
            <p>Estudiantes</p>
          </div>
          
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <h3>{stats?.courses?.totalCursos || 0}</h3>
            <p>Cursos Activos</p>
          </div>
        </div>

        <div className="card">
          <h2>Gestión del Sistema</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '20px' }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/admin/users')}
              style={{ padding: '20px', height: 'auto' }}
            >
              <div></div>
              <div>Gestionar Usuarios</div>
            </button>
            
            <button
              className="btn btn-success"
              onClick={() => navigate('/admin/courses')}
              style={{ padding: '20px', height: 'auto' }}
            >
              <div></div>
              <div>Gestionar Cursos</div>
            </button>
            
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/admin/statistics')}
              style={{ padding: '20px', height: 'auto' }}
            >
              <div></div>
              <div>Estadísticas Globales</div>
            </button>
          </div>
        </div>

        {stats?.casesByTeacher && stats.casesByTeacher.length > 0 && (
          <div className="card">
            <h2>Casos Clínicos por Docente</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Docente</th>
                  <th>Total de Casos</th>
                </tr>
              </thead>
              <tbody>
                {stats.casesByTeacher.map((teacher, index) => (
                  <tr key={index}>
                    <td>{teacher.nombre} {teacher.apellido}</td>
                    <td>{teacher.totalCasos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="card">
          <h2>Resumen de Actividad</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <h4>Casos Activos</h4>
              <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#28a745' }}>
                {stats?.caseStatus?.casosActivos || 0}
              </p>
            </div>
            <div>
              <h4>Casos Inactivos</h4>
              <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#dc3545' }}>
                {stats?.caseStatus?.casosInactivos || 0}
              </p>
            </div>
            <div>
              <h4>Promedio de Notas</h4>
              <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#0066cc' }}>
                {stats?.avgGrade?.promedioGeneral 
                  ? (typeof stats.avgGrade.promedioGeneral === 'number'
                      ? stats.avgGrade.promedioGeneral.toFixed(2)
                      : parseFloat(stats.avgGrade.promedioGeneral).toFixed(2))
                  : 'N/A'}
              </p>
            </div>
            <div>
              <h4>Entregas (último mes)</h4>
              <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffc107' }}>
                {stats?.recentSubmissions?.totalEntregas || 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;