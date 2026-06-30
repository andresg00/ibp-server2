const API_KEY = process.env.OPENWEATHERMAP_KEY;

/**
 * Verifica si la clave de la API está configurada.
 * @throws {Error} Si la clave no está definida
 */
function verificarApiKey() {
  if (!API_KEY) {
    throw new Error("La clave API de OpenWeatherMap (OPENWEATHERMAP_KEY) no está configurada.");
  }
}

/**
 * Valida y parsea coordenadas de latitud y longitud.
 * @param {any} lat - Latitud a validar
 * @param {any} lon - Longitud a validar
 * @returns {{lat: number, lon: number}} Coordenadas parseadas
 * @throws {Error} Si alguna coordenada es inválida o no está definida
 */
function validarCoordenadas(lat, lon) {
  if (lat === undefined || lat === null || lon === undefined || lon === null) {
    throw new Error("Los parámetros 'lat' y 'lon' son requeridos.");
  }

  const parsedLat = parseFloat(lat);
  const parsedLon = parseFloat(lon);

  if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
    throw new Error("La latitud debe ser un número válido entre -90 y 90.");
  }
  if (isNaN(parsedLon) || parsedLon < -180 || parsedLon > 180) {
    throw new Error("La longitud debe ser un número válido entre -180 y 180.");
  }

  return { lat: parsedLat, lon: parsedLon };
}

/**
 * Valida y parsea el timestamp de Unix.
 * @param {any} dt - Timestamp a validar
 * @returns {number} Timestamp en segundos (Unix time)
 * @throws {Error} Si el timestamp es inválido o no está definido
 */
function validarTimestamp(dt) {
  if (dt === undefined || dt === null) {
    throw new Error("El parámetro 'dt' es requerido.");
  }

  let parsedDt = parseInt(dt, 10);

  if (isNaN(parsedDt) || parsedDt <= 0) {
    throw new Error("El timestamp 'dt' debe ser un número de Unix válido.");
  }

  // Si el timestamp está en milisegundos (más de 10 dígitos, ej. 13 dígitos), lo convertimos a segundos
  if (parsedDt > 9999999999) {
    parsedDt = Math.floor(parsedDt / 1000);
  }

  return parsedDt;
}

/**
 * Transforma los datos del clima actual al formato requerido.
 * @param {Object} data - Datos del API de OpenWeather
 * @returns {Object} Datos formateados
 */
function climaJson(data) {
  return {
    temperatura: data.main?.temp,
    humedad: data.main?.humidity,
    descripcion: data.weather?.[0]?.description || "Sin descripción",
    vientoVelocidad: data.wind?.speed,
  };
}

/**
 * Transforma los datos del clima histórico al formato requerido.
 * @param {Object} data - Datos del API One Call 3.0 Time Machine
 * @returns {Object} Datos formateados
 */
function climaHistoricoJson(data) {
  if (!data || !Array.isArray(data.data) || data.data.length === 0) {
    throw new Error("No se encontraron datos climáticos para la fecha y ubicación especificadas.");
  }
  const item = data.data[0];
  return {
    temperatura: item.temp,
    humedad: item.humidity,
    descripcion: item.weather?.[0]?.description || "Sin descripción",
    vientoVelocidad: item.wind_speed,
  };
}

/**
 * Obtiene datos del clima de una API pública por nombre de ciudad.
 * @param {string} city - Nombre de la ciudad
 * @returns {Promise<Object>} Datos del clima actual
 */
async function obtenerClima(city) {
  verificarApiKey();

  if (!city || typeof city !== "string" || city.trim() === "") {
    throw new Error("El nombre de la ciudad es requerido y debe ser un texto válido.");
  }

  const queryParams = new URLSearchParams({
    q: city.trim(),
    appid: API_KEY,
    lang: "es",
    units: "metric"
  });

  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.search = queryParams.toString();

  try {
    const response = await fetch(url.href);

    if (!response.ok) {
      throw new Error(`Error en la llamada a OpenWeather: ${response.statusText}`);
    }

    const data = await response.json();
    return climaJson(data);
  } catch (error) {
    throw new Error(`Error al obtener datos del clima: ${error.message}`);
  }
}

/**
 * Obtiene datos del clima usando coordenadas de latitud y longitud.
 * @param {number|string} lat - Latitud
 * @param {number|string} lon - Longitud
 * @returns {Promise<Object>} Datos del clima actual
 */
async function obtenerClimaPorUbicacion(lat, lon) {
  verificarApiKey();
  const coords = validarCoordenadas(lat, lon);

  const queryParams = new URLSearchParams({
    lat: coords.lat.toString(),
    lon: coords.lon.toString(),
    appid: API_KEY,
    lang: "es",
    units: "metric"
  });

  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.search = queryParams.toString();

  try {
    const response = await fetch(url.href);

    if (!response.ok) {
      throw new Error(`Error en la llamada a OpenWeather: ${response.statusText}`);
    }

    const data = await response.json();
    return climaJson(data);
  } catch (error) {
    throw new Error(`Error al obtener datos del clima por ubicación: ${error.message}`);
  }
}

/**
 * Obtiene datos históricos del clima usando coordenadas y un timestamp de Unix.
 * @param {number|string} lat - Latitud
 * @param {number|string} lon - Longitud
 * @param {number|string} dt - Timestamp Unix (en segundos o milisegundos)
 * @returns {Promise<Object>} Datos del clima histórico
 */
async function obtenerClimaHistorico(lat, lon, dt) {
  verificarApiKey();
  const coords = validarCoordenadas(lat, lon);
  const parsedDt = validarTimestamp(dt);

  const queryParams = new URLSearchParams({
    lat: coords.lat.toString(),
    lon: coords.lon.toString(),
    dt: parsedDt.toString(),
    appid: API_KEY,
    lang: "es",
    units: "metric"
  });

  const url = new URL("https://api.openweathermap.org/data/3.0/onecall/timemachine");
  url.search = queryParams.toString();

  try {
    const response = await fetch(url.href);

    if (!response.ok) {
      throw new Error(`Error en la llamada a OpenWeather Time Machine: ${response.statusText}`);
    }

    const data = await response.json();
    return climaHistoricoJson(data);
  } catch (error) {
    throw new Error(`Error al obtener datos del clima histórico: ${error.message}`);
  }
}

/**
 * Controlador de Express para obtener el clima actual.
 */
const getWeather = async (req, res) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido. Usa GET o POST." });
  }

  // Soporta tanto body (POST viejo) como query (GET nuevo)
  const city = req.body?.city || req.query?.city;
  const lat = req.body?.lat || req.query?.lat;
  const lon = req.body?.lon || req.query?.lon;

  try {
    let weatherData;
    if (city) {
      weatherData = await obtenerClima(city);
    } else if (lat !== undefined && lon !== undefined) {
      weatherData = await obtenerClimaPorUbicacion(lat, lon);
    } else {
      return res.status(400).json({ error: "Falta el parámetro 'city' o 'lat' y 'lon'." });
    }
    res.status(200).json(weatherData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Controlador de Express para obtener el clima histórico.
 */
const getWeatherHistory = async (req, res) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido. Usa GET o POST." });
  }

  // Soporta tanto body (POST viejo) como query (GET nuevo)
  const lat = req.body?.lat || req.query?.lat;
  const lon = req.body?.lon || req.query?.lon;
  const dt = req.body?.dt || req.query?.dt;

  try {
    const weatherData = await obtenerClimaHistorico(lat, lon, dt);
    res.status(200).json(weatherData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getWeather,
  getWeatherHistory,
  obtenerClima,
  obtenerClimaPorUbicacion,
  obtenerClimaHistorico,
};
