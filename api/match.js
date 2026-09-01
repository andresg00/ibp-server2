const {
  calculateMatchExpress,
  getCompatibleLotesExpress,
  getCompatibleDesignsExpress,
} = require("../conmon/api/intelligence-match");

module.exports = async function handler(req, res) {
  // Manejo inmediato del preflight CORS (peticiones OPTIONS)
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", ["GET", "POST", "OPTIONS"]);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).end();
  }

  const route = req.query.route;

  try {
    switch (route) {
      case "calculate-match":
        return await calculateMatchExpress(req, res);

      case "get-compatible-lotes":
        return await getCompatibleLotesExpress(req, res);

      case "get-compatible-designs":
        return await getCompatibleDesignsExpress(req, res);

      default:
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        return res
          .status(400)
          .json({ error: "Acción de Match no válida o no especificada." });
    }
  } catch (error) {
    console.error(`Error en api/match (${route}):`, error);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
};
