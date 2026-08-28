const apiKey = process.env.GOOGLEAPIKEY;
const placeId = process.env.PLACE_ID;

/**
 * Controlador para obtener las reseñas de Google Places de un negocio (INNOVACOP).
 * Realiza la petición a la API de Google, limpia los datos, y aplica caché agresiva.
 * Si falla, retorna un array vacío [] con estatus 200 de forma segura.
 */
const getReviews = async (req, res) => {
  // Manejo de cabeceras CORS
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", ["GET", "OPTIONS"]);
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(405).json({ error: "Método no permitido. Usa GET." });
  }

  try {
    if (!apiKey || !placeId) {
      throw new Error("Variables de entorno GOOGLEAPIKEY o PLACE_ID no configuradas en el servidor.");
    }

    const queryParams = new URLSearchParams({
      place_id: placeId,
      fields: "reviews,name",
      key: apiKey,
      language: "es"
    });

    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.search = queryParams.toString();

    const response = await fetch(url.href);
    if (!response.ok) {
      throw new Error(`Petición HTTP fallida con estatus: ${response.status}`);
    }

    const data = await response.json();
    if (data.status !== "OK") {
      throw new Error(`Google API respondió con estatus: ${data.status}. Mensaje: ${data.error_message || "Sin detalles"}`);
    }

    const rawReviews = data.result?.reviews || [];
    const mappedReviews = rawReviews.map((r) => ({
      autor: r.author_name || "Anónimo",
      fotoPerfil: r.profile_photo_url || "",
      estrellas: r.rating || 0,
      fecha: r.relative_time_description || "",
      texto: r.text || ""
    }));

    // Caché en Edge/Vercel: 2 horas (s-maxage=7200) y revalidación en segundo plano de 1 hora (stale-while-revalidate=3600)
    res.setHeader("Cache-Control", "public, s-maxage=7200, stale-while-revalidate=3600");
    return res.status(200).json(mappedReviews);

  } catch (error) {
    console.error("Error al obtener reseñas de Google Places:", error.message);    
    // Fallback: Retorna un array vacío con estatus 200 para no romper el frontend
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(200).json([]);
  }
};

module.exports = {
  getReviews
};
