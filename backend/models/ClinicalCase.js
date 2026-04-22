const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ClinicalCase = sequelize.define('CasoClinico', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  titulo: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  historiaClinica: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'historia_clinica'
  },
  signosVitales: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'signos_vitales'
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
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
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
  tableName: 'casos_clinicos',
  timestamps: false
});

module.exports = ClinicalCase;