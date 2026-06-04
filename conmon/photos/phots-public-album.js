function getJsonJs(html) {
  const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g);

  let jsonData = null;

  if (scriptMatches) {
    scriptMatches.forEach((script) => {
      if (script.includes("AF_initDataCallback")) {
        const match = script.match(/\{key:.*\}/);
        if (match) {
          jsonData = match[0];
        }
      }
    });
  }

  return jsonData;
}

const extractData = (fn, defaultValue = null) => {
  try {
    return fn();
  } catch (e) {
    return defaultValue;
  }
};

const prossesAlbumData = (data) => {
  if (!data) return { images: [] };

  const album = extractData(() => data.data[3], []);
  const albumId = extractData(() => album[0], null);
  const albumTitle = extractData(() => album[1], null);
  const fromDate = extractData(() => album[2][0], null);
  const toDate = extractData(() => album[2][1], null);
  const created = extractData(() => album[2][4], null);
  const key = extractData(() => album[19], null);
  const thumbnail = extractData(() => album[4][0], null);
  let images = [];

  const ims = extractData(() => data.data[1], []);
  if (!Array.isArray(ims))
    return { created, albumTitle, fromDate, toDate, albumId, key, images };

  ims.forEach((entry) => {
    images.push({
      id: extractData(() => entry[0]),
      url: extractData(() => entry[1][0]),
      width: extractData(() => entry[1][1]),
      height: extractData(() => entry[1][2]),
      created: extractData(() => entry[2]),
      other: extractData(() => entry[4]),
      uploaded: extractData(() => entry[5]),
    });
  });

  return {
    created,
    thumbnail,
    albumTitle,
    fromDate,
    toDate,
    albumId,
    key,
    images,
  };
};

function getId(url) {
  return url.replace(/\/$/, "").split("/").pop();
}
const axios = require("axios");

async function getAlbum(url) {
  try {
    const id = getId(url);
    const response = await axios.get(`https://photos.app.goo.gl/${id}`);
    const html = response.data;

    let jsonData = getJsonJs(html);

    if (!jsonData) {
      console.log("No se encontraron datos.");
      return null;
    }
    // 1. Reemplazar comillas simples por dobles
    jsonData = jsonData.replace(/'/g, '"');

    // 2. Agregar comillas dobles a las claves que no las tienen
    jsonData = jsonData.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
    // Limpiar y convertir a JSON válido
    const parsedData = JSON.parse(jsonData);

    if (!parsedData.data || !Array.isArray(parsedData.data)) return null;

    // Extraer imágenes
    const images = prossesAlbumData(parsedData);
    images["url"] = url;
    return images;
  } catch (error) {
    console.error("Error obteniendo los datos:", error);
    return null;
  }
}

const getAlbumImages = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Falta la URL del álbum" });

    const albumData = await getAlbum(url);
    if (albumData) {
      return res.status(200).json(albumData); // Corregido: Retornar respuesta HTTP en vez de solo devolver los datos
    } else {
      return res.status(404).json({
        error: "No se encontraron datos para el álbum proporcionado.",
      });
    }
  } catch (error) {
    console.error("Error en getAlbumImages:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAlbum,
  getAlbumImages
};
