const { searchMaterials, updateMaterial } = require("../conmon/api/materials-search");

module.exports = async function handler(req, res) {
  // Manejo inmediato del preflight CORS (peticiones OPTIONS)
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", ["GET", "POST", "OPTIONS"]);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).end();
  }

  const route = req.query.route;

  try {
    if (route === "search-materials") {
      if (req.method !== "GET") {
        res.setHeader("Allow", ["GET"]);
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        return res.status(405).json({ error: "Método no permitido. Usa GET." });
      }

      // Interceptamos res.json para aplicar Cache-Control solo en respuestas exitosas
      const originalJson = res.json;
      res.json = function (body) {
        if (res.statusCode >= 200 && res.statusCode < 300 && body && body.success !== false) {
          res.setHeader("Cache-Control", "public, max-age=60, s-maxage=1800, stale-while-revalidate=3600");
        } else {
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        }
        return originalJson.call(this, body);
      };

      return await searchMaterials(req, res);
    } else if (route === "update-material") {
      if (req.method !== "POST") {
        res.setHeader("Allow", ["POST"]);
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        return res.status(405).json({ error: "Método no permitido. Usa POST." });
      }
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      return await updateMaterial(req, res);
    } else {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      return res.status(400).json({ error: "Acción de materiales no válida o no especificada." });
    }
  } catch (error) {
    console.error(`Error en api/materials (${route}):`, error);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
};
