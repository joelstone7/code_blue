import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../../services/api';
import Navbar from '../common/Navbar';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    rol: 'estudiante',
    activo: true
  });

  // Al montar el componente
  useEffect(() => {
    loadUsers();
  }, []);

  // Debounce de 400ms sobre el searchTerm
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Cuando cambian los filtros, recargar desde el backend
  useEffect(() => {
    loadUsers();
  }, [searchDebounce, filterRole]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterRole) params.rol = filterRole;

      const response = await getUsers(params);
      setUsers(response.data.users);
    } catch (error) {
      showMessage('error', 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        password: '',
        rol: user.rol,
        activo: user.activo
      });
    } else {
      setEditingUser(null);
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        rol: 'estudiante',
        activo: true
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      rol: 'estudiante',
      activo: true
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editingUser && !formData.password) {
      showMessage('error', 'La contraseña es obligatoria para nuevos usuarios');
      return;
    }

    try {
      if (editingUser) {
        const dataToUpdate = { ...formData };
        if (!dataToUpdate.password) {
          delete dataToUpdate.password;
        }
        await updateUser(editingUser.id, dataToUpdate);
        showMessage('success', 'Usuario actualizado exitosamente');
      } else {
        await createUser(formData);
        showMessage('success', 'Usuario creado exitosamente');
      }
      closeModal();
      loadUsers();
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Error al guardar usuario');
    }
  };

  const handleDelete = async (userId, userName) => {
    if (window.confirm(`¿Estás seguro de desactivar al usuario ${userName}?`)) {
      try {
        await deleteUser(userId);
        showMessage('success', 'Usuario desactivado exitosamente');
        loadUsers();
      } catch (error) {
        showMessage('error', 'Error al desactivar usuario');
      }
    }
  };

  const getRoleBadgeClass = (rol) => {
    switch (rol) {
      case 'administrador': return 'badge-danger';
      case 'docente': return 'badge-info';
      case 'estudiante': return 'badge-success';
      default: return 'badge-secondary';
    }
  };

  const getRoleLabel = (rol) => {
    switch (rol) {
      case 'administrador': return 'Administrador';
      case 'docente': return 'Docente';
      case 'estudiante': return 'Estudiante';
      default: return rol;
    }
  };

  if (loading) {
    return <div className="loading">Cargando usuarios...</div>;
  }

  return (
    <div>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <h1>Gestión de Usuarios</h1>
          <button className="btn btn-primary" onClick={() => openModal()}>
            Crear Usuario
          </button>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="card">
          <div className="filters">
            <div className="filter-group">
              <input
                type="text"
                className="form-control"
                placeholder="🔍 Buscar por nombre, apellido o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <select
                className="form-control"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="">Todos los roles</option>
                <option value="administrador">Administrador</option>
                <option value="docente">Docente</option>
                <option value="estudiante">Estudiante</option>
              </select>
            </div>
          </div>

          <div className="stats-summary">
            <div className="stat-item">
              <span className="stat-label">Total Usuarios:</span>
              <span className="stat-value">{users.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Administradores:</span>
              <span className="stat-value">{users.filter(u => u.rol === 'administrador').length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Docentes:</span>
              <span className="stat-value">{users.filter(u => u.rol === 'docente').length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Estudiantes:</span>
              <span className="stat-value">{users.filter(u => u.rol === 'estudiante').length}</span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre Completo</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Fecha Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center">
                      No se encontraron usuarios
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.nombre} {user.apellido}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`badge ${getRoleBadgeClass(user.rol)}`}>
                          {getRoleLabel(user.rol)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${user.activo ? 'badge-success' : 'badge-danger'}`}>
                          {user.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>{new Date(user.fechaCreacion).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => openModal(user)}
                            title="Editar"
                          >
                            ✏️
                          </button>
                          {user.activo && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(user.id, `${user.nombre} ${user.apellido}`)}
                              title="Desactivar"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h2>
                <button className="modal-close" onClick={closeModal}>×</button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nombre *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Apellido *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.apellido}
                      onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Email Institucional *</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="ejemplo@unifranz.edu.bo"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                  <small className="form-text">Solo correos @unifranz.edu.bo</small>
                </div>

                <div className="form-group">
                  <label>
                    Contraseña {editingUser ? '(dejar en blanco para mantener actual)' : '*'}
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder={editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                  />
                  {!editingUser && (
                    <small className="form-text">Mínimo 6 caracteres</small>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Rol *</label>
                    <select
                      className="form-control"
                      value={formData.rol}
                      onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                      required
                    >
                      <option value="estudiante">Estudiante</option>
                      <option value="docente">Docente</option>
                      <option value="administrador">Administrador</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Estado</label>
                    <select
                      className="form-control"
                      value={formData.activo}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.value === 'true' })}
                    >
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingUser ? 'Actualizar' : 'Crear'} Usuario
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;