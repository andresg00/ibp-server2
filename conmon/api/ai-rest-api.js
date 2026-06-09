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
    console.error("Error en reformulate:", error.message);

    if (error.message.includes("429")) {
      return res.status(429).json({
        error:
          "Has agotado el límite de peticiones gratuitas. Por favor, espera un momento antes de intentar de nuevo.",
      });
    }

    res
      .status(500)
      .json({ error: "Error interno del servidor al procesar la solicitud." });
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

    // Prompt optimizado con mayor control de contexto y estructura rígida
    const prompt = `
  [ROL]
  Eres un Ingeniero Residente de obra civil. Tu tarea es redactar un fragmento de reporte técnico diario.

  [CONTEXTO OBLIGATORIO]
  "${context}"

  [REGLAS DE NEGOCIO - CRÍTICAS]
  1. El CONTEXTO técnico es sagrado y obligatorio. Si el contexto indica que el mortero/concreto vaciado es un "mortero de apoyo para placafácil", el reporte DEBE especificar textualmente que su función es servir de soporte o apoyo para la posterior instalación del sistema de entrepiso Placafácil. Prohibido cambiar el propósito técnico por suposiciones como "solado de limpieza".
  2. Integra la información visual de las imágenes únicamente para describir el entorno, la forma geométrica (ej. vaciado triangular/esquinero), las guías metálicas y los taludes, pero NUNCA para contradecir o ignorar el propósito descrito en el CONTEXTO.
  3. REGLAS PERSONALIZADAS DEL USUARIO: ${rules || "Ninguna"}

  [REGLAS DE ESTILO Y FORMATO (ESTRICTAS)]
  - Redacta en un único párrafo continuo.
  - Usa primera persona del plural (ej: "Procedimos a...", "Realizamos...") o lenguaje impersonal (ej: "Se ejecutó...").
  - NO uses formato Markdown (están prohibidos los asteriscos **, *, almohadillas #, guiones o listas).
  - PROHIBIDO usar frases de IA como "En la imagen se observa", "Se aprecia", "Como se ve en la foto". Describe directamente la obra.

  [INICIO DEL REPORTE]
`;

    const result = await model.generateContent([prompt, ...images]);
    const response = await result.response;

    // Limpieza de seguridad robusta para asegurar texto plano puro
    let cleanText = response
      .text()
      .replace(/[\*#_\[\]`\-]/g, "") // Limpia múltiples caracteres de markdown de un solo golpe
      .replace(/\s+/g, " ") // Normaliza espacios dobles o saltos de línea extraños
      .trim();

    res.status(200).json({ result: cleanText });
  } catch (error) {
    console.error("Error en Gemini (Description):", error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getDescription, execute, reformulate };
