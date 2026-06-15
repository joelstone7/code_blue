const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CasePhase = sequelize.define('FaseCaso', {
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
  numeroFase: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'numero_fase'
  },
  tipoFase: {
    type: DataTypes.ENUM(
      'presentacion',
      'exploracion_fisica',
      'laboratorio',
      'imagenes',
      'evolucion',
      'diagnostico_final'
    ),
    allowNull: false,
    field: 'tipo_fase'
  },
  titulo: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  contenido: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  datosLaboratorio: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'datos_laboratorio'
  },
  signosVitales: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'signos_vitales'
  },
  preguntaPrincipal: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'pregunta_principal'
  },
  preguntasSecundarias: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'preguntas_secundarias'
  },
  pista: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  puntosPenalizacionPista: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 5.00,
    field: 'puntos_penalizacion_pista'
  },
  fechaCreacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_creacion'
  }
}, {
  tableName: 'caso_fases',
  timestamps: false
});

module.exports = CasePhase;