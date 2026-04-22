const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CaseAssignment = sequelize.define('AsignacionCaso', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  casoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'caso_id',
    references: {
      model: 'casos_clinicos',
      key: 'id'
    }
  },
  cursoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'curso_id',
    references: {
      model: 'cursos',
      key: 'id'
    }
  },
  fechaAsignacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_asignacion'
  },
  fechaVencimiento: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fecha_vencimiento'
  },
  fechaLimite: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fecha_limite'
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'asignaciones_casos',
  timestamps: false
});

module.exports = CaseAssignment;