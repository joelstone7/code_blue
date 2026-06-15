const axios = require('axios');

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const MODEL_NAME = process.env.OLLAMA_MODEL || 'llama3.2:1b';

// ─────────────────────────────────────────────────────────────
// Genera retroalimentación completa con análisis por fases
// Ahora recibe todas las respuestas del estudiante fase por fase
// y el diagnóstico correcto del docente para comparar
// ─────────────────────────────────────────────────────────────
async function generateFeedback(caseData, studentResponse, timeSpent = null) {
  try {
    console.log('🤖 Intentando conectar con Ollama en:', OLLAMA_API_URL);
    console.log('📊 Modelo:', MODEL_NAME);

    const prompt = buildPrompt(caseData, studentResponse, timeSpent);

    console.log('📤 Enviando prompt a Ollama...');

    const response = await axios.post(`${OLLAMA_API_URL}/api/generate`, {
      model: MODEL_NAME,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.3,      // ← bajar de 0.7 a 0.3 (más determinístico)
        top_p: 0.9,
        top_k: 40,
        num_predict: 1200,     // ← subir de 800 a 1200 (evita truncamiento)
        repeat_penalty: 1.1,
        stop: ['\n\n\n', '---FIN---']
      }
    }, {
      timeout: 180000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('✅ Respuesta recibida de Ollama');

    if (response.data && response.data.response) {
      const rawText = response.data.response.trim();

      if (rawText.length > 50) {
        console.log('✅ Feedback generado (' + rawText.length + ' caracteres)');

        // Intentar parsear como JSON estructurado
        const parsed = parseStructuredFeedback(rawText);

        if (parsed) {
          console.log('✅ Feedback estructurado parseado correctamente');
          return {
            success: true,
            ...parsed,
            model: MODEL_NAME
          };
        }

        // Si no pudo parsear como JSON, devolver como texto plano
        console.log('⚠️ No se pudo parsear JSON, devolviendo texto plano');
        return {
          success: true,
          analisisRazonamiento: rawText,
          competencias: null,
          analisisFases: null,
          preguntasReflexion: null,
          recomendaciones: null,
          comparacionDiagnostico: null,
          notaSugerida: null,
          model: MODEL_NAME
        };
      }
    }

    throw new Error('Respuesta inválida o vacía de Ollama');
  } catch (error) {
    console.error('❌ Error al generar retroalimentación con Ollama:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('⚠️  Ollama no está corriendo. Inicia con: ollama serve');
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.error('⏱️  Timeout: El modelo está tardando demasiado.');
      console.error('   💡 Solución: Usa OLLAMA_MODEL=llama3.2:1b en .env');
    }

    return {
      success: false,
      analisisRazonamiento: generateDefaultFeedback(studentResponse),
      competencias: null,
      analisisFases: null,
      preguntasReflexion: null,
      recomendaciones: null,
      comparacionDiagnostico: null,
      notaSugerida: null,
      error: error.message
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Construye el prompt con todas las respuestas por fase
// Pide a la IA que devuelva JSON estructurado
// ─────────────────────────────────────────────────────────────
function buildPrompt(caseData, studentResponse, timeSpent) {
  // Construir resumen de respuestas por fase
  const fasesResumen = studentResponse.respuestasPorFase
    ? studentResponse.respuestasPorFase.map(f =>
        `Fase ${f.numero_fase} (${f.tipo_fase}): ${f.respuesta_principal || 'Sin respuesta'}${f.uso_pista ? ' [USÓ PISTA]' : ''}`
      ).join('\n')
    : 'No disponible';

  return `Eres un médico docente experto evaluando a un estudiante de medicina. 
Analiza su razonamiento clínico fase por fase y genera retroalimentación educativa.

CASO CLÍNICO: ${caseData.titulo}
Motivo de consulta: ${caseData.motivoConsulta || 'No disponible'}
Antecedentes: ${caseData.antecedentesPersonales || 'No disponible'}
Dificultad: ${caseData.nivelDificultad || 'intermedio'}
Total de fases: ${caseData.totalFases || 1}

DIAGNÓSTICO CORRECTO: ${caseData.diagnosticoCorrecto || 'No especificado'}
TRATAMIENTO CORRECTO: ${caseData.tratamientoCorrecto || 'No especificado'}

RESPUESTAS DEL ESTUDIANTE POR FASE:
${fasesResumen}

DIAGNÓSTICO FINAL DEL ESTUDIANTE: ${studentResponse.diagnosticoFinal || 'No dado'}
TRATAMIENTO FINAL DEL ESTUDIANTE: ${studentResponse.tratamientoFinal || 'No dado'}
${timeSpent ? `TIEMPO TOTAL: ${timeSpent} minutos` : ''}

Responde ÚNICAMENTE con el objeto JSON a continuación. Sin explicaciones, sin texto antes ni después, sin bloques de código, solo el JSON puro:
{
  "analisisRazonamiento": "Análisis general del razonamiento clínico del estudiante en 3-4 oraciones",
  "competencias": {
    "anamnesis": 0,
    "interpretacionLaboratorio": 0,
    "diagnosticoDiferencial": 0,
    "planDiagnostico": 0,
    "razonamientoClinico": 0,
    "decisionTerapeutica": 0
  },
  "analisisFases": [
    {
      "fase": 1,
      "analisis": "Análisis breve de la respuesta en esta fase",
      "aciertos": ["acierto 1"],
      "errores": ["error 1"]
    }
  ],
  "comparacionDiagnostico": "Comparación entre diagnóstico correcto y el del estudiante",
  "preguntasReflexion": [
    "¿Pregunta reflexiva 1?",
    "¿Pregunta reflexiva 2?",
    "¿Pregunta reflexiva 3?"
  ],
  "recomendaciones": [
    "Tema específico a reforzar 1",
    "Tema específico a reforzar 2"
  ],
  "notaSugerida": 0
}

Las competencias van de 0 a 100. La notaSugerida va de 0 a 100.`;
}

// ─────────────────────────────────────────────────────────────
// Intenta parsear la respuesta de la IA como JSON estructurado
// La IA a veces agrega texto antes o después del JSON
// ─────────────────────────────────────────────────────────────
function parseStructuredFeedback(rawText) {
  // Limpiar caracteres problemáticos comunes del modelo
  let text = rawText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ') // caracteres de control
    .trim();

  // Intento 1: parsear directo
  try {
    const result = JSON.parse(text);
    if (result.analisisRazonamiento) return result;
  } catch {}

  // Intento 2: extraer el bloque JSON más grande
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const result = JSON.parse(jsonMatch[0]);
      if (result.analisisRazonamiento) return result;
    } catch {}
  }

  // Intento 3: buscar desde la primera { hasta la última }
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try {
      const result = JSON.parse(text.slice(start, end + 1));
      if (result.analisisRazonamiento) return result;
    } catch {}
  }

  // Intento 4: reparar JSON truncado — agrega cierre si falta
  if (start !== -1) {
    let partial = text.slice(start);
    // contar llaves abiertas vs cerradas
    let open = 0;
    for (const ch of partial) {
      if (ch === '{') open++;
      if (ch === '}') open--;
    }
    // agregar llaves faltantes
    partial += '}'.repeat(Math.max(0, open));
    try {
      const result = JSON.parse(partial);
      if (result.analisisRazonamiento) return result;
    } catch {}
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// Retroalimentación por defecto cuando la IA no está disponible
// ─────────────────────────────────────────────────────────────
function generateDefaultFeedback(studentResponse) {
  const fasesCompletadas = studentResponse.respuestasPorFase
    ? studentResponse.respuestasPorFase.length
    : 0;

  return `📋 Tu caso ha sido registrado correctamente.

Completaste ${fasesCompletadas} fase(s) del caso clínico.

**Diagnóstico final:** ${studentResponse.diagnosticoFinal ? '✓ Proporcionado' : '⚠ No proporcionado'}
**Tratamiento final:** ${studentResponse.tratamientoFinal ? '✓ Proporcionado' : '⚠ No proporcionado'}

El docente revisará tu respuesta y proporcionará retroalimentación detallada pronto.

⚠️ La retroalimentación automática con IA no está disponible en este momento.`;
}

// ─────────────────────────────────────────────────────────────
// Sugiere una nota numérica basada en el análisis previo
// Se usa como apoyo al docente, no como nota final
// ─────────────────────────────────────────────────────────────
async function suggestGrade(caseData, studentResponse, analisisPrevio) {
  try {
    const prompt = `Como docente de medicina, asigna una nota de 0 a 100 a este estudiante.

Caso: ${caseData.titulo}
Diagnóstico correcto: ${caseData.diagnosticoCorrecto || 'No especificado'}
Diagnóstico del estudiante: ${studentResponse.diagnosticoFinal || 'No dado'}
Tratamiento del estudiante: ${studentResponse.tratamientoFinal || 'No dado'}
Análisis previo: ${analisisPrevio ? analisisPrevio.substring(0, 200) : 'No disponible'}

Responde SOLO con un número entero entre 0 y 100:`;

    const response = await axios.post(`${OLLAMA_API_URL}/api/generate`, {
      model: MODEL_NAME,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 5,
        top_k: 10
      }
    }, { timeout: 30000 });

    const gradeText = response.data.response.trim();
    const grade = parseInt(gradeText);

    if (isNaN(grade) || grade < 0 || grade > 100) {
      console.log('⚠️  Nota inválida generada:', gradeText);
      return 70;
    }

    console.log('✅ Nota sugerida por IA:', grade);
    return grade;
  } catch (error) {
    console.error('Error al sugerir nota:', error.message);
    return 70;
  }
}

// ─────────────────────────────────────────────────────────────
// Verifica si Ollama está disponible y qué modelos tiene
// ─────────────────────────────────────────────────────────────
async function checkOllamaAvailability() {
  try {
    const response = await axios.get(`${OLLAMA_API_URL}/api/tags`, {
      timeout: 5000
    });

    console.log('✅ Ollama disponible. Modelos instalados:');
    if (response.data.models) {
      response.data.models.forEach(model => {
        console.log(`   - ${model.name} (${(model.size / 1e9).toFixed(2)} GB)`);
      });
    }

    return {
      available: true,
      models: response.data.models || []
    };
  } catch (error) {
    console.error('Ollama no disponible:', error.message);
    return {
      available: false,
      error: error.message
    };
  }
}

module.exports = {
  generateFeedback,
  suggestGrade,
  checkOllamaAvailability
};