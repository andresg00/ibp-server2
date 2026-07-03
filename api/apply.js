const { applyJob, simulateAdminResponse } = require("../conmon/api/apply");

module.exports = async function handler(req, res) {
  // Manejo inmediato del preflight CORS (peticiones OPTIONS)
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", ["POST", "OPTIONS"]);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).end();
  }

  const route = req.query.route;

  try {
    switch (route) {
      case "apply":
        return await applyJob(req, res);
      case "simulate-response":
        return await simulateAdminResponse(req, res);
      default:
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        return res.status(400).json({ error: "Ruta de postulación no válida o no especificada." });
    }
  } catch (error) {
    console.error(`Error en api/apply (${route}):`, error);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message || "Error interno del servidor en postulación." });
    }
  }
};
