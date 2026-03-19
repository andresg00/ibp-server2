const API_KEY = process.env.OPENWEATHERMAP_KEY;

/**
 * Obtiene datos del clima de una API pública.
 * @param {string} city - Nombre de la ciudad
 * @returns {Promise<Object>} Datos del clima
 */
async function obtenerClima(city) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&lang=es&units=metric`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Error al obtener datos del clima");
    }

    const data = await response.json();
    return climaJson(data);
  } catch (error) {
    throw new Error(`Error al obtener datos del clima: ${error.message}`);
  }
}

/**
 * Obtiene datos del clima usando coordenadas de latitud y longitud.
 * @param {number} lat - Latitud
 * @param {number} lon - Longitud
 * @returns {Promise<Object>} Datos del clima
 */
async function obtenerClimaPorUbicacion(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&lang=es&units=metric`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Error al obtener datos del clima por ubicación");
    }

    const data = await response.json();
    return climaJson(data);
  } catch (error) {
    throw new Error(
      `Error al obtener datos del clima por ubicación: ${error.message}`,
    );
  }
}

/**
 * Transforma los datos del clima al formato requerido.
 * @param {Object} data - Datos del API
 * @returns {Object} Datos formateados
 */
function climaJson(data) {
  return {
    temperatura: data.main.temp,
    humedad: data.main.humidity,
    descripcion: data.weather[0].description,
    vientoVelocidad: data.wind.speed,
  };
}
const getWeather = async (req, res) => {
  // Solo permitimos peticiones POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }
  const { city, lat, lon } = req.body;
  try {
    let weatherData;
    if (city) {
      weatherData = await obtenerClima(city);
    } else if (lat && lon) {
      weatherData = await obtenerClimaPorUbicacion(lat, lon);
    } else {
      return res
        .status(400)
        .json({ error: "Falta el parámetro 'city' o 'lat' y 'lon'." });
    }
    res.status(200).json(weatherData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getWeather };
