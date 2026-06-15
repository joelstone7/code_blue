const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CaseResource = sequelize.define('RecursoCaso', {
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
  // NULL = recurso general del caso
  // con valor = recurso de una fase específica
  faseId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'fase_id',
    references: {
      model: 'caso_fases',
      key: 'id'
    }
  },
  tipoRecurso: {
    type: DataTypes.ENUM('imagen', 'pdf', 'video', 'otro'),
    allowNull: false,
    field: 'tipo_recurso'
  },
  nombreArchivo: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'nombre_archivo'
  },
  rutaArchivo: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'ruta_archivo'
  },
  tamanioBytes: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'tamanio_bytes'
  },
  descripcion: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  fechaSubida: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_subida'
  }
}, {
  tableName: 'recursos_caso',
  timestamps: false
});

module.exports = CaseResource;