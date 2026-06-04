const generateUploadUrl = require("../conmon/api/generate-upload-url");
const deleteFile = require("../conmon/api/delete-file");
const { db } = require("../conmon/config/firebase");
const { getAlbum } = require("../conmon/photos/phots-public-album");

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
      case "generate-upload-url": {
        if (req.method !== "POST") {
          res.setHeader("Allow", ["POST"]);
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          return res.status(405).json({ error: "Método no permitido. Usa POST." });
        }
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        return await generateUploadUrl(req, res);
      }

      case "delete-file": {
        if (req.method !== "POST") {
          res.setHeader("Allow", ["POST"]);
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          return res.status(405).json({ error: "Método no permitido. Usa POST." });
        }
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        return await deleteFile(req, res);
      }

      case "check-media": {
        if (req.method !== "GET" && req.method !== "POST") {
          res.setHeader("Allow", ["GET", "POST"]);
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          return res.status(405).json({ error: "Método no permitido. Usa GET o POST." });
        }
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        
        const hash = req.method === "POST" ? req.body?.hash : req.query?.hash;
        if (!hash) {
          return res.status(400).json({ error: "Falta el parámetro 'hash'." });
        }

        const doc = await db.collection("media").doc(hash).get();
        if (!doc.exists) {
          return res.status(202).json({ status: "PENDING" });
        } else {
          return res.status(200).json({ status: "COMPLETE", data: doc.data() });
        }
      }

      case "get-album-images": {
        if (req.method !== "GET" && req.method !== "POST") {
          res.setHeader("Allow", ["GET", "POST"]);
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          return res.status(405).json({ error: "Método no permitido. Usa GET o POST." });
        }

        const url = req.method === "POST" ? req.body?.url : req.query?.url;
        if (!url) {
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          return res.status(400).json({ error: "Falta la URL del álbum ('url')." });
        }

        const albumData = await getAlbum(url);
        if (!albumData) {
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          return res.status(404).json({ error: "No se encontraron datos para el álbum." });
        }

        if (req.method === "GET") {
          res.setHeader("Cache-Control", "public, max-age=60, s-maxage=3600, stale-while-revalidate=7200");
        } else {
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        }
        return res.status(200).json(albumData);
      }

      default:
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        return res.status(400).json({ error: "Acción de Storage no válida o no especificada." });
    }
  } catch (error) {
    console.error(`Error en api/storage (${route}):`, error);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message || "Error interno de storage." });
    }
  }
};
