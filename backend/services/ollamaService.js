const axios = require('axios');

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const MODEL_NAME = process.env.OLLAMA_MODEL || 'llama2';

/**
 * Genera retroalimentación automática usando Ollama
 */
async function generateFeedback(caseData, studentResponse, timeSpent = null) {
  try {
    console.log('🤖 Intentando conectar con Ollama en:', OLLAMA_API_URL);
    console.log('📊 Modelo:', MODEL_NAME);
    
    // Construir el prompt para la IA
    const prompt = buildPrompt(caseData, studentResponse, timeSpent);

    console.log('📤 Enviando prompt a Ollama...');
    console.log('⏱️  Timeout configurado: 120 segundos');

    // Llamar a Ollama con configuración OPTIMIZADA para modelos pequeños
    const response = await axios.post(`${OLLAMA_API_URL}/api/generate`, {
      model: MODEL_NAME,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,        // Creatividad moderada
        top_p: 0.9,             // Diversidad de respuestas
        top_k: 40,              // 🔧 NUEVO: Limita opciones (más rápido)
        num_predict: 400,       // 🔧 OPTIMIZADO: Menos tokens = más rápido
        repeat_penalty: 1.1,    // 🔧 NUEVO: Evita repeticiones
        stop: ['\n\n\n', '---'] // 🔧 NUEVO: Para cuando termina
      }
    }, {
      timeout: 120000, // 🔧 OPTIMIZADO: 2 minutos (suficiente para modelos pequeños)
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('✅ Respuesta recibida de Ollama');

    if (response.data && response.data.response) {
      const feedback = response.data.response.trim();
      
      if (feedback.length > 50) { // Validar que no sea una respuesta vacía
        console.log('✅ Feedback generado correctamente (' + feedback.length + ' caracteres)');
        console.log('📝 Preview:', feedback.substring(0, 150) + '...');
        return {
          success: true,
          feedback: feedback,
          model: MODEL_NAME
        };
      }
    }

    throw new Error('Respuesta inválida o vacía de Ollama');
  } catch (error) {
    console.error('❌ Error al generar retroalimentación con Ollama:', error.message);
    
    // Si es error de conexión, lo indicamos claramente
    if (error.code === 'ECONNREFUSED') {
      console.error('⚠️  Ollama no está corriendo. Inicia con: ollama serve');
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.error('⏱️  Timeout: El modelo está tardando demasiado. Modelo actual:', MODEL_NAME);
      console.error('   💡 Solución: Usa un modelo más rápido en .env:');
      console.error('      OLLAMA_MODEL=llama3.2:1b');
    }
    
    // Retornar retroalimentación por defecto si falla la IA
    return {
      success: false,
      feedback: generateDefaultFeedback(studentResponse),
      error: error.message
    };
  }
}

/**
 * Construye el prompt ULTRA OPTIMIZADO para modelos pequeños
 */
function buildPrompt(caseData, studentResponse, timeSpent) {
  const signosVitales = caseData.signosVitales 
    ? JSON.stringify(caseData.signosVitales) 
    : 'No disponibles';

  // 🔧 PROMPT ULTRA OPTIMIZADO: Corto, directo, instrucciones claras
  return `Eres un médico docente experto. Evalúa brevemente esta respuesta de estudiante de medicina.

CASO: ${caseData.titulo}
Historia: ${caseData.historiaClinica.substring(0, 300)}...
Signos vitales: ${signosVitales}

RESPUESTA DEL ESTUDIANTE:
Diagnóstico: ${studentResponse.diagnostico || 'No dado'}
Tratamiento: ${studentResponse.tratamiento || 'No dado'}
${timeSpent ? `Tiempo: ${timeSpent} min` : ''}

Proporciona retroalimentación en 3 secciones cortas:

1. EVALUACIÓN: Analiza si el diagnóstico y tratamiento son correctos
2. FORTALEZAS Y MEJORAS: Indica qué hizo bien y qué puede mejorar
3. RECOMENDACIONES: Sugiere 2-3 acciones concretas

Sé específico pero conciso (máximo 250 palabras):`;
}

/**
 * Genera retroalimentación por defecto si Ollama falla
 */
function generateDefaultFeedback(studentResponse) {
  return `📋 **Retroalimentación Automática**

Tu respuesta ha sido registrada correctamente. 

**Diagnóstico:**
${studentResponse.diagnostico ? '✓ Diagnóstico proporcionado.' : '⚠ No se proporcionó diagnóstico.'}

**Tratamiento:**
${studentResponse.tratamiento ? '✓ Tratamiento propuesto.' : '⚠ No se proporcionó tratamiento.'}

**Recomendaciones Generales:**
- Revisa los signos vitales y su interpretación
- Considera diagnósticos diferenciales
- Verifica que el tratamiento sea apropiado según guías clínicas
- No olvides solicitar exámenes complementarios pertinentes

⚠️ **Nota:** La retroalimentación con IA no está disponible en este momento. El docente revisará tu respuesta y proporcionará retroalimentación detallada pronto.`;
}

/**
 * Genera sugerencia de nota basada en análisis de IA (opcional)
 */
async function suggestGrade(caseData, studentResponse, feedback) {
  try {
    const prompt = `Como docente de medicina, califica de 0 a 100 esta respuesta.

Caso: ${caseData.titulo}
Respuesta: Diagnóstico: ${studentResponse.diagnostico}, Tratamiento: ${studentResponse.tratamiento}

Retroalimentación: ${feedback.substring(0, 200)}

Responde SOLO con un número (ejemplo: 75):`;

    const response = await axios.post(`${OLLAMA_API_URL}/api/generate`, {
      model: MODEL_NAME,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 5,  // 🔧 Solo necesita 1-3 tokens
        top_k: 10
      }
    }, {
      timeout: 30000
    });

    const gradeText = response.data.response.trim();
    const grade = parseInt(gradeText);

    if (isNaN(grade) || grade < 0 || grade > 100) {
      console.log('⚠️  Nota inválida generada:', gradeText);
      return 70; // Nota por defecto
    }

    console.log('✅ Nota sugerida por IA:', grade);
    return grade;
  } catch (error) {
    console.error('Error al sugerir nota:', error.message);
    return 70; // Nota por defecto en caso de error
  }
}

/**
 * Verifica si Ollama está disponible
 */
async function checkOllamaAvailability() {
  try {
    const response = await axios.get(`${OLLAMA_API_URL}/api/tags`, {
      timeout: 5000
    });
    
    console.log('✅ Ollama disponible. Modelos instalados:');
    if (response.data.models) {
      response.data.models.forEach(model => {
        console.log(`   - ${model.name} (tamaño: ${(model.size / 1e9).toFixed(2)} GB)`);
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