const { getDescription, execute, reformulate } = require("../conmon/api/ai-rest-api");

module.exports = async function handler(req, res) {
  // Manejo inmediato del preflight CORS (peticiones OPTIONS)
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", ["GET", "POST", "OPTIONS"]);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  // Identificamos la ruta/acción mediante el parámetro inyectado route o desde el body
  const route = req.query.route || req.body?.route;

  try {
    switch (route) {
      case "description":
        return await getDescription(req, res);
      case "execute":
        return await execute(req, res);
      case "reformulate":
        return await reformulate(req, res);
      default:
        return res.status(400).json({ error: "Acción de IA no válida o no especificada." });
    }
  } catch (error) {
    console.error(`Error procesando acción de IA (${route}):`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
};
