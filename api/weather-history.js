const { obtenerClimaHistorico } = require("../conmon/api/open_weather_map");

module.exports = async function handler(req, res) {
  // Manejo inmediato del preflight CORS (peticiones OPTIONS)
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", ["GET", "POST", "OPTIONS"]);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).end();
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(405).json({ error: "Método no permitido. Usa GET o POST." });
  }

  try {
    const lat = req.method === "POST" ? req.body?.lat : req.query?.lat;
    const lon = req.method === "POST" ? req.body?.lon : req.query?.lon;
    const dt = req.method === "POST" ? req.body?.dt : req.query?.dt;

    if (lat === undefined || lon === undefined || dt === undefined) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      return res.status(400).json({ error: "Faltan los parámetros requeridos 'lat', 'lon' y 'dt'." });
    }

    const weatherData = await obtenerClimaHistorico(lat, lon, dt);

    if (req.method === "GET") {
      // Como los datos históricos no cambian, podemos cachearlos de manera más agresiva
      res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600");
    } else {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    }

    return res.status(200).json(weatherData);
  } catch (error) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(500).json({ error: error.message });
  }
};
