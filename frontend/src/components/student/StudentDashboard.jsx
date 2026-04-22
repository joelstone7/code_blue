import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudentStats, getStudentCourses, getCasesByCourse } from '../../services/api';
import Navbar from '../common/Navbar';

const StudentDashboard = () => {
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, coursesRes] = await Promise.all([
        getStudentStats(),
        getStudentCourses()
      ]);
      setStats(statsRes.data);
      setCourses(coursesRes.data.courses);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🔧 NUEVA FUNCIÓN: Encuentra el asignacionId correcto para resolver el caso
  const handleResolveCase = async (pendingCase) => {
    try {
      // Buscar el curso que contiene este caso
      const course = courses.find(c => c.nombre === pendingCase.nombreCurso);
      
      if (!course) {
        console.error('Curso no encontrado');
        return;
      }

      // Obtener los casos del curso para encontrar el asignacionId correcto
      const casesRes = await getCasesByCourse(course.id);
      const caseInCourse = casesRes.data.cases.find(c => c.titulo === pendingCase.tituloCaso);
      
      if (caseInCourse && caseInCourse.asignacionId) {
        // Navegar con el asignacionId correcto
        navigate(`/student/solve/${caseInCourse.asignacionId}`);
      } else {
        console.error('No se encontró el caso en el curso');
      }
    } catch (error) {
      console.error('Error al resolver caso:', error);
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

  return (
    <div>
      <Navbar />
      <div className="container">
        <h1>Mi Panel de Estudiante</h1>
        
        <div className="stats-grid">
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <div className="stat-icon"></div>
            <div className="stat-content">
              <h3>{stats?.courses?.totalCursos || 0}</h3>
              <p>Cursos Inscritos</p>
            </div>
          </div>
          
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <div className="stat-icon"></div>
            <div className="stat-content">
              <h3>{stats?.cases?.casosDisponibles || 0}</h3>
              <p>Casos Disponibles</p>
            </div>
          </div>
          
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <div className="stat-icon"></div>
            <div className="stat-content">
              <h3>{stats?.cases?.casosCompletados || 0}</h3>
              <p>Casos Completados</p>
            </div>
          </div>
          
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <div className="stat-icon"></div>
            <div className="stat-content">
              <h3>
                {stats?.avgGrade?.promedioNotas 
                  ? (typeof stats.avgGrade.promedioNotas === 'number' 
                      ? stats.avgGrade.promedioNotas.toFixed(2) 
                      : parseFloat(stats.avgGrade.promedioNotas).toFixed(2))
                  : 'N/A'}
              </h3>
              <p>Promedio de Notas</p>
            </div>
          </div>
        </div>

        {stats?.pending && stats.pending.length > 0 && (
          <div className="card" style={{ backgroundColor: '#fff3cd', borderLeft: '4px solid #ffc107' }}>
            <h2>Casos Pendientes</h2>
            <p style={{ color: '#856404', marginBottom: '20px' }}>
              Tienes {stats.pending.length} caso(s) clínico(s) sin resolver
            </p>
            <table className="table">
              <thead>
                <tr>
                  <th>Caso</th>
                  <th>Curso</th>
                  <th>Fecha Vencimiento</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {stats.pending.map((item, index) => {
                  const isOverdue = item.fecha_vencimiento && new Date(item.fecha_vencimiento) < new Date();
                  return (
                    <tr key={index}>
                      <td>{item.tituloCaso}</td>
                      <td>{item.nombreCurso}</td>
                      <td>
                        {item.fecha_vencimiento ? 
                          new Date(item.fecha_vencimiento).toLocaleDateString() : 
                          'Sin fecha límite'
                        }
                      </td>
                      <td>
                        <span className={`badge ${isOverdue ? 'badge-danger' : 'badge-warning'}`}>
                          {isOverdue ? 'Vencido' : 'Pendiente'}
                        </span>
                      </td>
                      <td>
                        {/* 🔧 CORREGIDO: Ahora usa la función handleResolveCase */}
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleResolveCase(item)}
                        >
                          Resolver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="card">
          <h2>Mis Cursos</h2>
          {courses.length === 0 ? (
            <div className="empty-state">
              <p>No estás inscrito en ningún curso aún</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
              {courses.map((course) => (
                <div key={course.id} className="card" style={{ margin: 0, cursor: 'pointer' }} onClick={() => navigate(`/student/course/${course.id}`)}>
                  <h3>{course.nombre}</h3>
                  <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                    {course.codigo} - {course.semestre} {course.anio}
                  </p>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                  >
                    Ver Casos
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {stats?.recentGrades && stats.recentGrades.length > 0 && (
          <div className="card">
            <h2>Últimas Calificaciones</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Caso</th>
                  <th>Curso</th>
                  <th>Nota</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentGrades.map((item, index) => (
                  <tr key={index}>
                    <td>{item.tituloCaso}</td>
                    <td>{item.nombreCurso}</td>
                    <td>
                      <span className={`badge ${
                        item.nota >= 70 ? 'badge-success' : 
                        item.nota >= 50 ? 'badge-warning' : 
                        'badge-danger'
                      }`}>
                        {item.nota}/100
                      </span>
                    </td>
                    <td>{new Date(item.fecha_retroalimentacion).toLocaleDateString()}</td>
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

export default StudentDashboard;