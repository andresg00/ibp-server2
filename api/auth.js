const { register, login, logout } = require("../conmon/api/auth");

module.exports = async function handler(req, res) {
  // Manejo inmediato del preflight CORS (peticiones OPTIONS)
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", ["POST", "OPTIONS"]);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Set-Cookie");
    
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
      case "register":
        return await register(req, res);
      case "login":
        return await login(req, res);
      case "logout":
        return await logout(req, res);
      default:
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        return res.status(400).json({ error: "Ruta de autenticación no válida o no especificada." });
    }
  } catch (error) {
    console.error(`Error en api/auth (${route}):`, error);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message || "Error interno del servidor en autenticación." });
    }
  }
};
