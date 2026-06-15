const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PhaseResponse = sequelize.define('RespuestaFase', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  respuestaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'respuesta_id',
    references: {
      model: 'respuestas_estudiantes',
      key: 'id'
    }
  },
  faseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'fase_id',
    references: {
      model: 'caso_fases',
      key: 'id'
    }
  },
  numeroFase: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'numero_fase'
  },
  respuestaPrincipal: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'respuesta_principal'
  },
  respuestasSecundarias: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'respuestas_secundarias'
  },
  usoPista: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'uso_pista'
  },
  tiempoFaseSegundos: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'tiempo_fase_segundos'
  },
  completada: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  fechaRespuesta: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_respuesta'
  }
}, {
  tableName: 'respuestas_fases',
  timestamps: false
});

module.exports = PhaseResponse;