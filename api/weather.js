const { obtenerClima, obtenerClimaPorUbicacion } = require("../conmon/api/open_weather_map");

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
    const city = req.method === "POST" ? req.body?.city : req.query?.city;
    const lat = req.method === "POST" ? req.body?.lat : req.query?.lat;
    const lon = req.method === "POST" ? req.body?.lon : req.query?.lon;

    let weatherData;
    if (city) {
      weatherData = await obtenerClima(city);
    } else if (lat && lon) {
      weatherData = await obtenerClimaPorUbicacion(lat, lon);
    } else {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      return res.status(400).json({ error: "Falta el parámetro 'city' o 'lat' y 'lon'." });
    }

    if (req.method === "GET") {
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=600, stale-while-revalidate=1800");
    } else {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    }

    return res.status(200).json(weatherData);
  } catch (error) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(500).json({ error: error.message });
  }
};
