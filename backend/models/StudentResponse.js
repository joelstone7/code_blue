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
  // Fase en la que está actualmente
  faseActual: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'fase_actual'
  },
  estado: {
    type: DataTypes.ENUM('en_progreso', 'enviado', 'calificado'),
    defaultValue: 'en_progreso'
  },
  tiempoTotalMinutos: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'tiempo_total_minutos'
  },
  // Respuesta final (última fase)
  diagnosticoFinal: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'diagnostico_final'
  },
  tratamientoFinal: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'tratamiento_final'
  },
  archivoAdjunto: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'archivo_adjunto'
  },
  fechaInicio: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_inicio'
  },
  fechaEnvio: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fecha_envio'
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