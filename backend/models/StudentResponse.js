const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StudentResponse = sequelize.define('RespuestaEstudiante', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  asignacionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'asignacion_id',
    references: {
      model: 'asignaciones_casos',
      key: 'id'
    }
  },
  estudianteId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'estudiante_id',
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  diagnostico: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tratamiento: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  respuestasPreguntas: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'respuestas_preguntas'
  },
  archivoAdjunto: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'archivo_adjunto'
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'enviado', 'calificado'),
    defaultValue: 'pendiente'
  },
  fechaEnvio: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fecha_envio'
  },
  fechaCreacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_creacion'
  },
  fechaActualizacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_actualizacion'
  }
}, {
  tableName: 'respuestas_estudiantes',
  timestamps: false
});

module.exports = StudentResponse;