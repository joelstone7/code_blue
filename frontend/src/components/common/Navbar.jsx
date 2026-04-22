import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h2>Sistema de Casos Clínicos</h2>
          <span className="navbar-subtitle">UNIFRANZ</span>
        </div>
        
        <div className="navbar-user">
          <div className="user-info">
            <span className="user-name">{user?.nombre} {user?.apellido}</span>
            <span className="user-role">
              {user?.rol === 'administrador' && 'Administrador'}
              {user?.rol === 'docente' && 'Docente'}
              {user?.rol === 'estudiante' && 'Estudiante'}
            </span>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            Cerrar Sesión
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;