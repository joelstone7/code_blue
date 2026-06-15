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

  // ── Calificación del docente ───────────────────────────
  nota: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  comentariosDocente: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'comentarios_docente'
  },

  // ── Análisis de IA ─────────────────────────────────────
  iaAnalisisRazonamiento: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'ia_analisis_razonamiento'
  },
  // {"anamnesis": 80, "laboratorio": 60, "diagnostico": 70}
  iaCompetencias: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'ia_competencias'
  },
  // [{fase: 1, analisis: "...", aciertos: [], errores: []}]
  iaAnalisisFases: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'ia_analisis_fases'
  },
  iaFaseDiagnosticoEsperada: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'ia_fase_diagnostico_esperada'
  },
  iaFaseDiagnosticoReal: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'ia_fase_diagnostico_real'
  },
  // Preguntas para que el estudiante reflexione
  iaPreguntasReflexion: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'ia_preguntas_reflexion'
  },
  // Temas que debe estudiar
  iaRecomendaciones: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'ia_recomendaciones'
  },
  iaComparacionDiagnostico: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'ia_comparacion_diagnostico'
  },
  iaNotaSugerida: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    field: 'ia_nota_sugerida'
  },
  revisadaPorDocente: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'revisada_por_docente'
  },
  fechaRetroalimentacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_retroalimentacion'
  },
  fechaRevisionDocente: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fecha_revision_docente'
  }
}, {
  tableName: 'retroalimentaciones',
  timestamps: false
});

module.exports = Feedback;