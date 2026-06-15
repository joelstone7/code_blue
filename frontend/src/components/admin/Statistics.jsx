import { useState, useEffect } from 'react';
import { getAdminStats } from '../../services/api';
import Navbar from '../common/Navbar';
import './Statistics.css';

const Statistics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await getAdminStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="loading">Cargando estadísticas...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div>
        <Navbar />
        <div className="container">
          <div className="alert alert-error">Error al cargar estadísticas</div>
        </div>
      </div>
    );
  }

  const adminsActive   = stats.users?.find(u => u.rol === 'administrador' && u.activo)?.total || 0;
  const adminsInactive = stats.users?.find(u => u.rol === 'administrador' && !u.activo)?.total || 0;
  const teachersInactive = stats.users?.find(u => u.rol === 'docente' && !u.activo)?.total || 0;
  const studentsInactive = stats.users?.find(u => u.rol === 'estudiante' && !u.activo)?.total || 0;

  // ✅ PASO 6: Se agregan los nuevos campos al destructuring
  const {
    totalUsers,
    totalActiveUsers,
    teachersActive,
    studentsActive,
    activityRate,
    studentTeacherRatio,
    completionRate,
    avgCasesPerTeacher,
    studentTeacherRatioStatus,
    activityRateStatus,
    completionRateStatus,
    avgGradeStatus,
    avgGradeBarStatus
  } = stats.metrics;

  const avgGrade             = stats.avgGrade?.promedioGeneral || null;
  const totalSubmissions     = parseInt(stats.recentSubmissions?.totalEntregas) || 0;
  const completedSubmissions = parseInt(stats.recentSubmissions?.calificadas)   || 0;

  const totalCourses    = stats.courses?.totalCursos     || 0;
  const activeCourses   = stats.courses?.cursosActivos   || 0;
  const inactiveCourses = stats.courses?.cursosInactivos || 0;

  const totalCases    = stats.caseStatus?.totalCasos     || 0;
  const activeCases   = stats.caseStatus?.casosActivos   || 0;
  const inactiveCases = stats.caseStatus?.casosInactivos || 0;

  const ollamaIntegrated = stats.ollama?.integrated || false;
  const ollamaModel      = stats.ollama?.model      || 'No configurado';
  const ollamaStatus     = stats.ollama?.status     || 'Desconocido';

  return (
    <div>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <h1>Estadísticas Globales del Sistema</h1>
          <button className="btn btn-secondary" onClick={loadStats}>
            Actualizar
          </button>
        </div>

        {/* 👥 USUARIOS DEL SISTEMA */}
        <div className="stats-section">
          <h2>Usuarios del Sistema</h2>
          <div className="stats-grid">
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <div className="stat-icon"></div>
              <div className="stat-content">
                <h3>{adminsActive}</h3>
                <p>Administradores Activos</p>
                {adminsInactive > 0 && (
                  <small style={{ opacity: 0.85 }}>({adminsInactive} inactivos)</small>
                )}
              </div>
            </div>

            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
              <div className="stat-icon"></div>
              <div className="stat-content">
                <h3>{teachersActive}</h3>
                <p>Docentes Activos</p>
                {teachersInactive > 0 && (
                  <small style={{ opacity: 0.85 }}>({teachersInactive} inactivos)</small>
                )}
              </div>
            </div>

            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
              <div className="stat-icon"></div>
              <div className="stat-content">
                <h3>{studentsActive}</h3>
                <p>Estudiantes Activos</p>
                {studentsInactive > 0 && (
                  <small style={{ opacity: 0.85 }}>({studentsInactive} inactivos)</small>
                )}
              </div>
            </div>

            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
              <div className="stat-icon"></div>
              <div className="stat-content">
                <h3>{totalActiveUsers}/{totalUsers}</h3>
                <p>Total Usuarios</p>
                <small style={{ opacity: 0.85 }}>(Activos / Total)</small>
              </div>
            </div>
          </div>
        </div>

        {/* 📚 CURSOS Y ACTIVIDAD */}
        <div className="stats-section">
          <h2>Cursos y Actividad</h2>
          <div className="stats-grid">
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
              <div className="stat-icon"></div>
              <div className="stat-content">
                <h3>{activeCourses}</h3>
                <p>Cursos Activos</p>
                {inactiveCourses > 0 && (
                  <small style={{ opacity: 0.85 }}>({inactiveCourses} inactivos)</small>
                )}
              </div>
            </div>

            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f77062 0%, #fe5196 100%)' }}>
              <div className="stat-icon"></div>
              <div className="stat-content">
                <h3>{activeCases}</h3>
                <p>Casos Clínicos Activos</p>
                {inactiveCases > 0 && (
                  <small style={{ opacity: 0.85 }}>({inactiveCases} inactivos)</small>
                )}
              </div>
            </div>

            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' }}>
              <div className="stat-icon"></div>
              <div className="stat-content">
                <h3>{inactiveCourses}</h3>
                <p>Cursos Inactivos</p>
              </div>
            </div>

            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' }}>
              <div className="stat-icon"></div>
              <div className="stat-content">
                <h3>{ollamaIntegrated ? '✓' : '✗'}</h3>
                <p>IA Retroalimentación</p>
                <small style={{ opacity: 0.85 }}>{ollamaModel}</small>
              </div>
            </div>
          </div>
        </div>

        {/* 📈 RENDIMIENTO ACADÉMICO */}
        <div className="stats-section">
          <h2>Rendimiento Académico</h2>
          <div className="stats-grid">
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
              <div className="stat-icon"></div>
              <div className="stat-content">
                <h3>{avgGrade ? avgGrade.toFixed(2) : 'N/A'}</h3>
                <p>Promedio Global de Notas</p>
              </div>
            </div>

            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
              <div className="stat-icon"></div>
              <div className="stat-content">
                <h3>{totalSubmissions}</h3>
                <p>Entregas (Último mes)</p>
              </div>
            </div>

            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)' }}>
              <div className="stat-icon"></div>
              <div className="stat-content">
                <h3>{stats.recentSubmissions?.pendientes || 0}</h3>
                <p>Pendientes de Calificar</p>
              </div>
            </div>

            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
              <div className="stat-icon"></div>
              <div className="stat-content">
                <h3>{completedSubmissions}</h3>
                <p>Calificadas</p>
              </div>
            </div>
          </div>
        </div>

        {/* 📋 CASOS POR DOCENTE */}
        {stats.casesByTeacher && stats.casesByTeacher.length > 0 && (
          <div className="card">
            <h2>Casos Clínicos por Docente</h2>
            <p className="card-subtitle">Resumen de producción de contenido académico</p>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Docente</th>
                    <th>Total de Casos Creados</th>
                    <th>Rendimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.casesByTeacher.map((teacher, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td><strong>{teacher.nombre} {teacher.apellido}</strong></td>
                      <td><span className="number-badge">{teacher.totalCasos}</span></td>
                      <td>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min((teacher.totalCasos / Math.max(...stats.casesByTeacher.map(t => t.totalCasos))) * 100, 100)}%`
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="stats-summary-footer">
              <div className="summary-item">
                <span className="summary-label">Total Docentes Activos:</span>
                <span className="summary-value">{stats.casesByTeacher.length}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Promedio de Casos por Docente:</span>
                <span className="summary-value">{stats.metrics.avgCasesPerTeacher}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Docente con Más Casos:</span>
                <span className="summary-value">
                  {stats.casesByTeacher[0]?.nombre} {stats.casesByTeacher[0]?.apellido} ({stats.casesByTeacher[0]?.totalCasos})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 🎯 INDICADORES DE SALUD */}
        <div className="card">
          <h2>Indicadores de Salud del Sistema</h2>
          <div className="health-indicators">

            <div className="health-item">
              <div className="health-label">Tasa de Actividad de Usuarios</div>
              <div className="health-value">{activityRate}%</div>
              <div className="health-description">
                {totalActiveUsers} de {totalUsers} usuarios activos
              </div>
              <div className="health-bar">
                {/* ✅ PASO 6: Clase viene del backend */}
                <div
                  className={`health-bar-fill ${activityRateStatus}`}
                  style={{ width: `${activityRate}%` }}
                />
              </div>
            </div>

            <div className="health-item">
              <div className="health-label">Ratio Estudiante/Docente</div>
              <div className="health-value">
                {studentTeacherRatio !== null ? `${studentTeacherRatio}:1` : 'N/A'}
              </div>
              {/* ✅ PASO 6: Mensaje viene del backend */}
              <div className="health-description">{studentTeacherRatioStatus}</div>
            </div>

            <div className="health-item">
              <div className="health-label">Tasa de Completitud de Evaluaciones</div>
              <div className="health-value">{completionRate}%</div>
              <div className="health-description">
                {completedSubmissions} de {totalSubmissions} entregas calificadas
              </div>
              <div className="health-bar">
                {/* ✅ PASO 6: Clase viene del backend */}
                <div
                  className={`health-bar-fill ${completionRateStatus}`}
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            <div className="health-item">
              <div className="health-label">Rendimiento Académico Global</div>
              <div className="health-value">
                {avgGrade ? `${avgGrade.toFixed(1)}/100` : 'N/A'}
              </div>
              {/* ✅ PASO 6: Mensaje viene del backend */}
              <div className="health-description">{avgGradeStatus}</div>
              {avgGradeBarStatus && (
                <div className="health-bar">
                  {/* ✅ PASO 6: Clase viene del backend */}
                  <div
                    className={`health-bar-fill ${avgGradeBarStatus}`}
                    style={{ width: `${avgGrade}%` }}
                  />
                </div>
              )}
            </div>

          </div>
        </div>

        {/* 📋 RESUMEN EJECUTIVO */}
        <div className="card executive-summary">
          <h2>Resumen Ejecutivo</h2>
          <div className="summary-grid">
            <div className="summary-card">
              <h3>Estado General</h3>
              <p className="summary-status success">✓ Sistema Operativo</p>
              <ul className="summary-list">
                <li>{totalActiveUsers} usuarios activos de {totalUsers} totales</li>
                <li>{activeCourses} cursos activos</li>
                <li>{activeCases} casos clínicos disponibles</li>
                <li>IA: {ollamaIntegrated ? 'Integrada' : 'No integrada'}</li>
              </ul>
            </div>

            <div className="summary-card">
              <h3>Áreas de Atención</h3>
              <ul className="summary-list">
                {/* ✅ PASO 6: Lógica simplificada usando valores del backend */}
                {stats.metrics.activityRate < 60 && (
                  <li className="warning">⚠️ Baja tasa de actividad de usuarios</li>
                )}
                {stats.metrics.completionRate < 50 && (
                  <li className="warning">⚠️ Muchas entregas pendientes de calificar</li>
                )}
                {stats.metrics.avgGradeStatus === 'Necesita mejoras' && (
                  <li className="warning">⚠️ Rendimiento académico bajo</li>
                )}
                {!ollamaIntegrated && (
                  <li className="info">ℹ️ IA no integrada</li>
                )}
                {stats.metrics.activityRate >= 60 &&
                 stats.metrics.completionRate >= 50 &&
                 stats.metrics.avgGradeStatus !== 'Necesita mejoras' &&
                 ollamaIntegrated && (
                  <li className="success">✓ Todos los indicadores en rango óptimo</li>
                )}
              </ul>
            </div>

            <div className="summary-card">
              <h3>Métricas Clave</h3>
              <ul className="summary-list">
                <li>Promedio académico: {avgGrade ? avgGrade.toFixed(1) : 'N/A'}/100</li>
                <li>Ratio estudiante/docente: {studentTeacherRatio !== null ? `${studentTeacherRatio}:1` : 'N/A'}</li>
                <li>Tasa de completitud: {completionRate}%</li>
                <li>Entregas pendientes: {stats.recentSubmissions?.pendientes || 0}</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Statistics;