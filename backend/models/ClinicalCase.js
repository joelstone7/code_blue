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
  docenteId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'docente_id',
    references: { model: 'usuarios', key: 'id' }
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },

  // ── Datos del paciente ─────────────────────────────────────
  pacienteEdad: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'paciente_edad'
  },
  pacienteSexo: {
    type: DataTypes.ENUM('masculino', 'femenino', 'otro'),
    allowNull: true,
    field: 'paciente_sexo'
  },
  pacienteOcupacion: {
    type: DataTypes.STRING(200),
    allowNull: true,
    field: 'paciente_ocupacion'
  },

  // ── Antecedentes ───────────────────────────────────────────
  antecedentesPersonales: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'antecedentes_personales'
  },
  antecedentesEpidemiologicos: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'antecedentes_epidemiologicos'
  },

  // ── Motivo de consulta ─────────────────────────────────────
  motivoConsulta: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'motivo_consulta'
  },
  tiempoEvolucion: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'tiempo_evolucion'
  },

  // ── Diagnóstico correcto (solo docente e IA) ───────────────
  diagnosticoCorrecto: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'diagnostico_correcto'
  },
  tratamientoCorrecto: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'tratamiento_correcto'
  },

  // ── Configuración del caso ─────────────────────────────────
  nivelDificultad: {
    type: DataTypes.ENUM('basico', 'intermedio', 'avanzado'),
    defaultValue: 'intermedio',
    field: 'nivel_dificultad'
  },
  totalFases: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'total_fases'
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