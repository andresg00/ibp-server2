const { fetchDocument, fetchCollection, setDocument, setList } = require("../conmon/api/get-document");

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
      case "get-document": {
        if (req.method !== "GET") {
          res.setHeader("Allow", ["GET"]);
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          return res.status(405).json({ error: "Método no permitido. Usa GET para get-document." });
        }
        const { path, accessKey } = req.query;
        // Soporte opcional para enviar la clave en cabeceras HTTP (autorización estándar, x-access-key o accesskey literal)
        const headerKey = req.headers['authorization'] || req.headers['x-access-key'] || req.headers['accesskey'];
        const finalKey = headerKey || accessKey;
        const normalizedKey = (finalKey === "undefined" || finalKey === "") ? undefined : finalKey;

        const document = await fetchDocument(path, normalizedKey);
        res.setHeader("Cache-Control", "public, max-age=10, s-maxage=60, stale-while-revalidate=600");
        return res.status(200).json({ document });
      }

      case "get-list": {
        if (req.method !== "GET") {
          res.setHeader("Allow", ["GET"]);
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          return res.status(405).json({ error: "Método no permitido. Usa GET para get-list." });
        }
        const { path, accessKey, filter, order } = req.query;
        const headerKey = req.headers['authorization'] || req.headers['x-access-key'] || req.headers['accesskey'];
        const finalKey = headerKey || accessKey;
        const normalizedKey = (finalKey === "undefined" || finalKey === "") ? undefined : finalKey;

        // Pasamos filter y order para aplicar ordenamientos y búsquedas dinámicas en Firestore
        const documents = await fetchCollection(path, normalizedKey, filter, order);
        res.setHeader("Cache-Control", "public, max-age=10, s-maxage=60, stale-while-revalidate=600");
        return res.status(200).json({ documents });
      }

      case "set-document": {
        if (req.method !== "POST") {
          res.setHeader("Allow", ["POST"]);
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          return res.status(405).json({ error: "Método no permitido. Usa POST para set-document." });
        }
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        const { path, data, accessKey } = req.body;
        const result = await setDocument(path, data, accessKey);
        return res.status(200).json(result);
      }

      case "set-list": {
        if (req.method !== "POST") {
          res.setHeader("Allow", ["POST"]);
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          return res.status(405).json({ error: "Método no permitido. Usa POST para set-list." });
        }
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        const { path, list, accessKey } = req.body;
        const result = await setList(path, list, accessKey);
        return res.status(200).json(result);
      }

      default:
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        return res.status(400).json({ error: "Acción de Firebase no válida o no especificada." });
    }
  } catch (error) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    if (error.message === "UNAUTHORIZED") {
      return res.status(403).json({ error: "Clave de acceso inválida." });
    }
    if (error.message === "MISSING_PATH") {
      return res.status(400).json({ error: "Falta el parámetro 'path'." });
    }
    if (error.message === "MISSING_DATA") {
      return res.status(400).json({ error: "Faltan los datos del documento ('data')." });
    }
    if (error.message === "MISSING_LIST") {
      return res.status(400).json({ error: "Falta la lista de documentos ('list')." });
    }
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ error: "Documento no encontrado." });
    }
    console.error(`Error en api/firebase (${route}):`, error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};
