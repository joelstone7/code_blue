const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Feedback = sequelize.define('Retroalimentacion', {
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
  docenteId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'docente_id',
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  nota: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  comentarios: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fechaRetroalimentacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_retroalimentacion'
  }
}, {
  tableName: 'retroalimentaciones',
  timestamps: false
});

module.exports = Feedback;