const { db } = require("../config/firebase");

// Constantes de catálogo para viabilidad Eco y Smart
const TOTAL_DESIGN_ECO_FEATURES = 6;
const TOTAL_DESIGN_SMART_FEATURES = 7;
const TOTAL_LOTE_ECO_QUESTIONS = 4;
const TOTAL_LOTE_SMART_QUESTIONS = 3;

/**
 * Normaliza cadenas de texto para comparaciones seguras (sin espacios extra, en minúsculas).
 */
function normalizeStr(str) {
  if (typeof str !== "string") return "";
  return str.trim().toLowerCase();
}

/**
 * Verifica si la vía de acceso es compatible con la logística de entrega del módulo.
 */
function checkLogistics(loteAccess, designMethod) {
  const l = normalizeStr(loteAccess);
  const d = normalizeStr(designMethod);

  // Si no está definido el requerimiento o la vía del lote, asumimos que es compatible para no romper retrocompatibilidad.
  if (!d || d === "acceso limitado" || !l) return true;

  if (d === "camión mediano" || d === "camion mediano") {
    return (
      l === "camión pesado" ||
      l === "camion pesado" ||
      l === "camión mediano" ||
      l === "camion mediano"
    );
  }
  if (d === "camión pesado" || d === "camion pesado") {
    return l === "camión pesado" || l === "camion pesado";
  }
  return true;
}

/**
 * Evalúa si un diseño cumple con el criterio de sello Eco.
 */
function isDesignEco(proyecto) {
  if (!proyecto) return false;
  if (typeof proyecto.isEco === "boolean") return proyecto.isEco;
  const features = Array.isArray(proyecto.ecoFeatures) ? proyecto.ecoFeatures : [];
  return features.length >= TOTAL_DESIGN_ECO_FEATURES / 2.0;
}

/**
 * Evalúa si un diseño cumple con el criterio de sello Smart.
 */
function isDesignSmart(proyecto) {
  if (!proyecto) return false;
  if (typeof proyecto.isSmart === "boolean") return proyecto.isSmart;
  const features = Array.isArray(proyecto.smartFeatures) ? proyecto.smartFeatures : [];
  return features.length >= TOTAL_DESIGN_SMART_FEATURES / 2.0;
}

/**
 * Evalúa si un lote cumple con el criterio de viabilidad Eco.
 */
function isLoteEco(lote) {
  if (!lote) return false;
  if (typeof lote.isEco === "boolean") return lote.isEco;
  const features = Array.isArray(lote.ecoFeatures) ? lote.ecoFeatures : [];
  return features.length >= TOTAL_LOTE_ECO_QUESTIONS / 2.0;
}

/**
 * Evalúa si un lote cumple con el criterio de viabilidad Smart.
 */
function isLoteSmart(lote) {
  if (!lote) return false;
  if (typeof lote.isSmart === "boolean") return lote.isSmart;
  const features = Array.isArray(lote.smartFeatures) ? lote.smartFeatures : [];
  return features.length >= TOTAL_LOTE_SMART_QUESTIONS / 2.0;
}

/**
 * Calcula el desglose detallado del emparejamiento con el sistema de pesos de Fase 2.
 */
function calculateMatch(lote = {}, proyecto = {}) {
  const minAreaRequired = Number(proyecto.minAreaRequired) || 0.0;
  const loteArea = Number(lote.area) || 0.0;

  // --- RESTRICCIONES ABSOLUTAS (Filtros Duros) ---

  // 1. Área Mínima
  const areaMatch = minAreaRequired === 0 || loteArea >= minAreaRequired;

  // 2. Dimensiones Físicas (Ancho útil: frente - retiro lateral; Fondo útil: fondo - retiros frontal/posterior)
  const frontage = Number(lote.frontage) || 0.0;
  const sideSetback = Number(lote.sideSetback) || 0.0;
  const depth = Number(lote.depth) || 0.0;
  const frontSetback = Number(lote.frontSetback) || 0.0;
  const rearSetback = Number(lote.rearSetback) || 0.0;

  const usableWidth = frontage > 0 ? frontage - sideSetback : 0.0;
  const usableDepth = depth > 0 ? depth - (frontSetback + rearSetback) : 0.0;

  const widthRequired = Number(proyecto.widthRequired) || 0.0;
  const depthRequired = Number(proyecto.depthRequired) || 0.0;

  const dimensionsMatch =
    (widthRequired === 0 || usableWidth >= widthRequired) &&
    (depthRequired === 0 || usableDepth >= depthRequired);

  // 3. Niveles permitidos
  const maxFloorsAllowed = Number(lote.maxFloorsAllowed) || 0;
  const floorsCount = Number(proyecto.floorsCount) || 0;

  const floorsMatch =
    maxFloorsAllowed === 0 ||
    floorsCount === 0 ||
    maxFloorsAllowed >= floorsCount;

  const areaDiff = loteArea - minAreaRequired;

  // Si falla cualquier restricción absoluta, la compatibilidad física es 0.0%
  if (!areaMatch || !dimensionsMatch || !floorsMatch) {
    return {
      score: 0.0,
      areaMatch,
      dimensionsMatch,
      floorsMatch,
      topographyMatch: false,
      logisticsMatch: false,
      servicesScore: 0.0,
      zoningMatch: false,
      ecoMatch: false,
      smartMatch: false,
      areaDiff,
    };
  }

  // --- CÁLCULO DE PESOS PONDERADOS ---

  // 1. Topografía (25%)
  const loteTopo = normalizeStr(lote.topography);
  const compatibleTopography = Array.isArray(proyecto.compatibleTopography)
    ? proyecto.compatibleTopography
    : [];
  const topographyMatch = compatibleTopography.some(
    (t) => normalizeStr(t) === loteTopo
  );
  const topographyScore = topographyMatch ? 25.0 : 0.0;

  // 2. Logística / Acceso Vial (20%)
  const logisticsMatch = checkLogistics(
    lote.accessRoadType,
    proyecto.deliveryMethod
  );
  const logisticsScore = logisticsMatch ? 20.0 : 0.0;

  // 3. Servicios Públicos (25%)
  let servicesScore = 25.0;
  const requiredServices = Array.isArray(proyecto.requiredServices)
    ? proyecto.requiredServices
    : [];
  if (requiredServices.length > 0) {
    let matchCount = 0;
    const loteServices = lote.services && typeof lote.services === "object" ? lote.services : {};
    for (const service of requiredServices) {
      const key = normalizeStr(service);
      if (loteServices[key] === true) {
        matchCount++;
      }
    }
    servicesScore = (matchCount / requiredServices.length) * 25.0;
  }

  // 4. Zonificación Legal (10%)
  const loteZoning = normalizeStr(lote.zoning);
  const allowedZoning = Array.isArray(proyecto.allowedZoning)
    ? proyecto.allowedZoning
    : [];
  const zoningMatch =
    allowedZoning.length === 0 ||
    allowedZoning.some((z) => normalizeStr(z) === loteZoning);
  const zoningScore = zoningMatch ? 10.0 : 0.0;

  // 5. Eco Compatibilidad (10%)
  const ecoDesign = isDesignEco(proyecto);
  const ecoLote = isLoteEco(lote);
  const ecoMatch = !ecoDesign || ecoLote;
  const ecoScore = ecoMatch ? 10.0 : 0.0;

  // 6. Smart Compatibilidad (10%)
  const smartDesign = isDesignSmart(proyecto);
  const smartLote = isLoteSmart(lote);
  const smartMatch = !smartDesign || smartLote;
  const smartScore = smartMatch ? 10.0 : 0.0;

  const totalScore =
    topographyScore +
    logisticsScore +
    servicesScore +
    zoningScore +
    ecoScore +
    smartScore;

  const clampedScore = Math.min(100.0, Math.max(0.0, totalScore));

  return {
    score: clampedScore,
    areaMatch: true,
    dimensionsMatch: true,
    floorsMatch: true,
    topographyMatch,
    logisticsMatch,
    servicesScore,
    zoningMatch,
    ecoMatch,
    smartMatch,
    areaDiff,
  };
}

/**
 * Obtiene un Lote por su ID desde Firestore.
 */
async function fetchLoteById(loteId) {
  if (!loteId || typeof loteId !== "string") {
    throw new Error("INVALID_LOTE_ID");
  }
  const doc = await db.collection("lotes-v2").doc(loteId.trim()).get();
  if (!doc.exists) {
    throw new Error(`LOTE_NOT_FOUND: ${loteId}`);
  }
  return { id: doc.id, ...doc.data() };
}

/**
 * Obtiene un Diseño Modular por su ID desde Firestore.
 */
async function fetchDesignById(designId) {
  if (!designId || typeof designId !== "string") {
    throw new Error("INVALID_DESIGN_ID");
  }
  const doc = await db.collection("proyectos-modulares-v2").doc(designId.trim()).get();
  if (!doc.exists) {
    throw new Error(`DESIGN_NOT_FOUND: ${designId}`);
  }
  return { id: doc.id, ...doc.data() };
}

/**
 * Obtiene los IDs de los diseños modulares compatibles con un terreno dado su loteId.
 */
async function getCompatibleDesigns(loteId) {
  const lote = await fetchLoteById(loteId);

  const snapshot = await db.collection("proyectos-modulares-v2").get();
  const results = [];

  snapshot.forEach((doc) => {
    const design = { id: doc.id, ...doc.data() };
    const match = calculateMatch(lote, design);
    if (match.score >= 50.0) {
      results.push({
        id: design.id,
        name: design.name || "",
        score: match.score,
      });
    }
  });

  // Ordenar por compatibilidad DESC y alfabéticamente por nombre ASC
  results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return normalizeStr(a.name).localeCompare(normalizeStr(b.name));
  });

  return results.map((r) => r.id);
}

/**
 * Obtiene los IDs de los terrenos viables para un diseño modular dado su designId.
 */
async function getCompatibleLotes(designId) {
  const design = await fetchDesignById(designId);

  const snapshot = await db.collection("lotes-v2").get();
  const results = [];

  snapshot.forEach((doc) => {
    const lote = { id: doc.id, ...doc.data() };
    const match = calculateMatch(lote, design);
    if (match.score >= 50.0) {
      results.push({
        id: lote.id,
        name: lote.name || "",
        score: match.score,
      });
    }
  });

  // Ordenar por compatibilidad DESC y alfabéticamente por nombre ASC
  results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return normalizeStr(a.name).localeCompare(normalizeStr(b.name));
  });

  return results.map((r) => r.id);
}

// --- Controladores para Servidor Express / Rest API ---

/**
 * Endpoint para calcular el match entre un lote y un diseño recibiendo únicamente IDs.
 */
const calculateMatchExpress = async (req, res) => {
  try {
    const loteId = req.body?.loteId || req.query?.loteId;
    const designId =
      req.body?.designId ||
      req.body?.proyectoId ||
      req.query?.designId ||
      req.query?.proyectoId;

    if (!loteId) {
      return res.status(400).json({ error: "Falta el identificador 'loteId'." });
    }
    if (!designId) {
      return res.status(400).json({ error: "Falta el identificador 'designId'." });
    }

    const [lote, design] = await Promise.all([
      fetchLoteById(loteId),
      fetchDesignById(designId),
    ]);

    const result = calculateMatch(lote, design);
    const isMatch = result.score >= 50.0;

    return res.status(200).json({
      success: true,
      isMatch,
      matchResult: result,
    });
  } catch (error) {
    if (error.message && error.message.startsWith("LOTE_NOT_FOUND")) {
      return res.status(404).json({ error: "Lote no encontrado." });
    }
    if (error.message && error.message.startsWith("DESIGN_NOT_FOUND")) {
      return res.status(404).json({ error: "Diseño modular no encontrado." });
    }
    console.error("Error al calcular match (Express):", error);
    return res.status(500).json({ error: "Error interno al calcular compatibilidad.", details: error.message });
  }
};

/**
 * Endpoint para obtener únicamente los IDs de los lotes compatibles con un diseño.
 */
const getCompatibleLotesExpress = async (req, res) => {
  try {
    const designId =
      req.body?.designId ||
      req.body?.proyectoId ||
      req.query?.designId ||
      req.query?.proyectoId;

    if (!designId) {
      return res.status(400).json({ error: "Falta el identificador 'designId'." });
    }

    const ids = await getCompatibleLotes(designId);
    return res.status(200).json({
      success: true,
      count: ids.length,
      ids,
    });
  } catch (error) {
    if (error.message && error.message.startsWith("DESIGN_NOT_FOUND")) {
      return res.status(404).json({ error: "Diseño modular no encontrado." });
    }
    console.error("Error al obtener lotes compatibles (Express):", error);
    return res.status(500).json({ error: "Error interno al obtener lotes compatibles.", details: error.message });
  }
};

/**
 * Endpoint para obtener únicamente los IDs de los diseños modulares compatibles con un lote.
 */
const getCompatibleDesignsExpress = async (req, res) => {
  try {
    const loteId = req.body?.loteId || req.query?.loteId;

    if (!loteId) {
      return res.status(400).json({ error: "Falta el identificador 'loteId'." });
    }

    const ids = await getCompatibleDesigns(loteId);
    return res.status(200).json({
      success: true,
      count: ids.length,
      ids,
    });
  } catch (error) {
    if (error.message && error.message.startsWith("LOTE_NOT_FOUND")) {
      return res.status(404).json({ error: "Lote no encontrado." });
    }
    console.error("Error al obtener diseños compatibles (Express):", error);
    return res.status(500).json({ error: "Error interno al obtener diseños compatibles.", details: error.message });
  }
};

module.exports = {
  calculateMatch,
  getCompatibleDesigns,
  getCompatibleLotes,
  calculateMatchExpress,
  getCompatibleLotesExpress,
  getCompatibleDesignsExpress,
};
