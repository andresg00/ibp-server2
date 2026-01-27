const { GoogleGenerativeAI } = require("@google/generative-ai");

// Inicialización
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Asegúrate de usar el string exacto del modelo
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

/**
 * REFORMULAR TEXTO
 */
const reformulate = async (req, res) => {
  try {
    const { text, reglas } = req.body;

    // Prompt mejorado: Directo y sin explicaciones
    const prompt = `Actúa como un Ingeniero Residente experto. 
    Reformula el siguiente texto para un reporte técnico de obra. 
    REGLAS:
    1. Devuelve ÚNICAMENTE el texto reformulado.
    2. No incluyas introducciones como "Aquí tienes" ni explicaciones finales.
    3. Usa terminología técnica de construcción.
    OTRAS REGLAS: ${reglas}
    
    Texto a reformular: "${text}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const output = response.text().trim();

    res.status(200).json({ result: output });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * EJECUTAR ORDEN
 */
const execute = async (req, res) => {
  try {
    const { orden } = req.body;
    if (!orden) return res.status(400).json({ error: "Falta la orden" });

    // Instrucción de Sistema: Define el comportamiento global
    const prompt = `Instrucción del sistema: Eres un asistente técnico de ingeniería. 
    Responde a la solicitud del usuario de forma profesional y completa.
    
    REGLAS DE FORMATO:
    - NO uses negritas (asteriscos como **texto**).
    - NO uses Markdown.
    - NO uses listas con símbolos extraños.
    - Escribe en párrafos limpios o listas numeradas simples (1., 2., 3.).
    - La respuesta debe ser texto plano fluido.

    Solicitud del usuario: "${orden}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    // Limpieza adicional por si la IA ignora las instrucciones
    let cleanText = response
      .text()
      .replace(/\*\*/g, "") // Elimina negritas dobles
      .replace(/\*/g, "") // Elimina asteriscos simples
      .trim();

    res.status(200).json({ result: cleanText });
  } catch (error) {
    console.error("Error en execute:", error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * DESCRIBIR IMÁGENES
 */
const getDescription = async (req, res) => {
  try {
    const { images, rules, context } = req.body;

    if (!images || !Array.isArray(images)) {
      return res
        .status(400)
        .json({ error: "Faltan imágenes o formato inválido" });
    }

    // Construimos el prompt dinámicamente
    const prompt = `
  ERES UN INGENIEIRO RESIDENTE. TU MISIÓN ES REDACTAR UN REPORTE BASADO EN ESTE CONTEXTO:
  "${context}"

  REGLAS DE INTERPRETACIÓN:
  1. El CONTEXTO manda: Si el contexto dice "fundición", no digas "prefabricado". Si dice "triangulares", busca e identifica esas formas.
  2. Usa las imágenes para validar y enriquecer el reporte técnico, no para contradecir el contexto.
  3. REGLAS PERSONALIZADAS: ${rules || "Ninguna"}

  REGLAS DE FORMATO (ESTRICTAS):
  - Texto plano, sin Markdown (** o #).
  - Habla en primera persona o impersonal (ej: "Hemos fundido...", "Se completó la fundición...").
  - Prohibido decir "En la imagen se observa".
`;

    const result = await model.generateContent([prompt, ...images]);
    const response = await result.response;

    // Limpieza de seguridad para asegurar texto plano puro
    let cleanText = response
      .text()
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/#/g, "")
      .replace(/[\[\]]/g, "") // Elimina corchetes por si acaso
      .trim();

    res.status(200).json({ result: cleanText });
  } catch (error) {
    console.error("Error en Gemini (Description):", error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getDescription, execute, reformulate };
