const { GoogleGenAI } = require('@google/genai');
const { db } = require("./firebase-firestore");
const { FieldPath } = require("firebase-admin/firestore");

// Inicialización oficial con el SDK moderno unificado de Google
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = 'gemini-2.5-flash';

/**
 * REFORMULAR TEXTO
 * Modifica notas rápidas tomadas en obra a un lenguaje técnico formal.
 */
const reformulate = async (req, res) => {
  try {
    const { text, reglas } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Falta el texto a reformular." });
    }

    const prompt = `Actúa como un Ingeniero Residente experto. 
    Reformula el siguiente texto para un reporte técnico de obra. 
    REGLAS:
    1. Devuelve ÚNICAMENTE el texto reformulado.
    2. No incluyas introducciones como "Aquí tienes" ni explicaciones finales.
    3. Usa terminología técnica de construcción.
    OTRAS REGLAS: ${reglas || "Ninguna"}
    
    Texto a reformular: "${text}"`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });


    // 6. Limpieza final redundante de caracteres Markdown residuales
    let cleanText = response.text.replace(/[\*#\[\]]/g, "").trim();

    // 7. Humanizar el texto
    cleanText = await humanizar(cleanText);

    res.status(200).json({ result: cleanText });
  } catch (error) {
    console.error("Error en reformulate:", error.message);

    if (error.message.includes("429")) {
      return res.status(429).json({
        error: "Has agotado el límite de peticiones gratuitas. Por favor, espera un momento antes de intentar de nuevo.",
      });
    }

    res.status(500).json({ error: "Error interno del servidor al procesar la solicitud." });
  }
};

/**
 * EJECUTAR ORDEN
 * Asistente de ingeniería general para resolver dudas o procesar solicitudes en texto plano.
 */
const execute = async (req, res) => {
  try {
    const { orden } = req.body;
    if (!orden) return res.status(400).json({ error: "Falta la orden" });

    const prompt = `Instrucción del sistema: Eres un asistente técnico de ingeniería. 
    Responde a la solicitud del usuario de forma profesional y completa.
    
    REGLAS DE FORMATO:
    - NO uses negritas (asteriscos como **texto**).
    - NO uses Markdown.
    - NO uses listas con símbolos extraños.
    - Escribe en párrafos limpios o listas numeradas simples (1., 2., 3.).
    - La respuesta debe ser texto plano fluido.

    Solicitud del usuario: "${orden}"`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    let cleanText = response.text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .trim();
    // humanizar el texto
    cleanText = await humanizar(cleanText);

    res.status(200).json({ result: cleanText });
  } catch (error) {
    console.error("Error en execute:", error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * DESCRIBIR IMÁGENES 
 * Descarga miniaturas de 400px en paralelo, convierte a Base64 en RAM y procesa con Gemini.
 * Consumo en disco = 0 KB. Blindado a máximo 3 imágenes.
 */
const getDescription = async (req, res) => {
  try {
    let { images, ids, rules, context } = req.body;

    // 1. DEFENSA EN PROFUNDIDAD: Limitamos estrictamente a un máximo de 3 elementos en el servidor
    if (ids && Array.isArray(ids)) {
      ids = ids.slice(0, 3);
    }
    if (images && Array.isArray(images)) {
      images = images.slice(0, 3);
    }

    // 2. Si vienen IDs de Firestore, resolvemos las URLs de sus miniaturas de 400px
    if (ids && ids.length > 0) {
      const snapshot = await db
        .collection("media")
        .where(FieldPath.documentId(), "in", ids)
        .get();

      images = snapshot.docs
        .map(doc => doc.data().thumbs400)
        .filter(url => url !== undefined && url !== null);
    }

    // Validación por si los arreglos quedaron vacíos tras los filtros
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Faltan las URLs de las imágenes o los IDs son inválidos." });
    }

    // 3. Descarga asíncrona de las miniaturas en PARALELO directo a la memoria RAM
    const imagePromises = images.map(async (url) => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const arrayBuffer = await response.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');

        let mimeType = 'image/jpeg';
        if (url.toLowerCase().includes('.png')) mimeType = 'image/png';
        if (url.toLowerCase().includes('.webp')) mimeType = 'image/webp';

        return {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        };
      } catch (e) {
        console.error(`Error procesando la URL [${url}]:`, e.message);
        return null; // Retornamos null para ignorar las descargas fallidas de forma limpia
      }
    });

    const resolvedImages = await Promise.all(imagePromises);
    const imageParts = resolvedImages.filter(part => part !== null);

    if (imageParts.length === 0) {
      return res.status(400).json({ error: "No se pudo procesar ninguna imagen para el análisis." });
    }

    // 4. Prompt Técnico de Ingeniería Estricto
    const prompt = `
  ERES UN INGENIERO RESIDENTE. TU MISIÓN ES REDACTAR UN REPORTE BASADO EN ESTE CONTEXTO:
  "${context || "Reporte técnico rutinario de inspección de obra."}"

  REGLAS DE INTERPRETACIÓN:
  1. El CONTEXTO manda: Si el contexto dice "fundición", no digas "prefabricado". Si dice "triangulares", busca e identifica esas formas.
  2. Usa las imágenes para validar y enriquecer el reporte técnico, no para contradecir el contexto.
  3. REGLAS PERSONALIZADAS: ${rules || "Ninguna"}

  REGLAS DE FORMATO (ESTRICTAS):
  - Texto plano, sin Markdown (** o #).
  - Habla en primera persona o impersonal (ej: "Hemos fundido...", "Se completó la fundición...").
  - Prohibido decir "En la imagen se observa".
`;

    // 5. Petición directa combinando el prompt de ingeniería y los bloques Base64
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [prompt, ...imageParts],
    });

    // 6. Limpieza final redundante de caracteres Markdown residuales
    let cleanText = response.text.replace(/[\*#\[\]]/g, "").trim();

    // 7. Humanizar el texto
    cleanText = await humanizar(cleanText);

    res.status(200).json({ result: cleanText });

  } catch (error) {
    console.error("Error general en getDescription:", error.message);
    res.status(500).json({ error: "Error interno al procesar la descripción de imágenes." });
  }
};
//humanizar el texto
async function humanizar(text) {
  const prompt = `Actúa como un redactor técnico experto y un comunicador profesional. Tengo un texto técnico generado por IA que suena demasiado robótico, rígido y predecible. Necesito que lo reescribas para "humanizarlo", aplicando los siguientes criterios obligatorios:

1. Fluidez y Naturalidad: Utiliza un lenguaje más cercano, directo y orgánico. Evita transiciones mecánicas cliché de las IA (como "En resumen", "Por lo tanto", "Es crucial recordar", "En este sentido").
2. Preservación Técnica: Conserva intactos todos los términos técnicos, siglas, métricas, nombres de procesos, metodologías y la precisión conceptual del texto original. No simplifiques el fondo del mensaje.
3. Ritmo Humano: Varía la longitud de las oraciones. Combina frases cortas e impactantes con oraciones más largas y fluidas para que la lectura tenga un ritmo natural.
4. Voz Activa: Prioriza la voz activa sobre la pasiva para dar más fuerza, claridad y dinamismo al texto.
5. Tono: Mantén un tono profesional, serio y corporativo, pero como si fuera escrito por un ingeniero o especialista humano con años de experiencia, no por una máquina.

Por favor, reescribe el siguiente texto aplicando estas reglas:

${text}`
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    let cleanText = response.text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .trim();

    return cleanText;
  } catch (error) {
    console.error("Error en execute:", error.message);
    return null;
  }
}

module.exports = { getDescription, execute, reformulate, humanizar };