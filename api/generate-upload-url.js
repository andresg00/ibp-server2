const { bucket } = require("../config/firebase");
const { existMedia } = require("../api/firestore-media");
const { processFile } = require("../api/prosses-media");
// --- Configuración de Firebase Admin ---
// Leemos las credenciales desde las variables de entorno de Vercel

// Esta es la función principal que Vercel ejecutará
const generateUploadUrl = async (req, res) => {
  // Solo permitimos peticiones POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }

  try {
    // 1. Recibimos el nombre y tipo del archivo desde el cliente
    const { hash, fileName, contentType } = req.body;

    if (!fileName || !contentType) {
      return res
        .status(400)
        .json({ error: 'Faltan los campos "fileName" o "contentType".' });
    }

    const endPoint = contentType.split("/")[0];
    if (!["image", "video", "audio"].includes(endPoint)) {
      return res.status(400).json({
        error: 'El campo "contentType" debe ser de tipo imagen, video o audio.',
      });
    }
    const doc = await existMedia(hash);
    if (doc.exists) {
      const data = doc.data();
      data.id = doc.id;
      return res.status(200).json({ message: "El archivo ya existe.", data });
    }
    const fileExtension = fileName.includes(".")
      ? "." + fileName.split(".").pop()
      : "";
    const filePathInStorage = `uploads/${hash}${fileExtension}`;
    const file = bucket.file(filePathInStorage);
    const [exists] = await file.exists();
    if (exists) {
      await processFile(hash, fileExtension, contentType);
      const doc = await existMedia(hash);
      const data = doc.data();
      data.id = doc.id;
      return res
        .status(200)
        .json({ message: "El archivo ya existe en storage.", data });
    }
    // 2. Configuramos la URL firmada
    const options = {
      version: "v4",
      action: "write", // 'write' significa que la URL es para SUBIR un archivo
      expires: Date.now() + 10 * 60 * 1000, // El link será válido por 10 minutos
      contentType: contentType, // El tipo de archivo debe coincidir
    };

    // 3. Generamos la URL y la enviamos de vuelta al cliente
    const [signedUrl] = await file.getSignedUrl(options);

    res.status(200).json({ signedUrl: signedUrl });
  } catch (error) {
    console.error("Error generando la URL firmada:", error);
    res.status(500).json({ error: "No se pudo generar la URL de subida." });
  }
};
module.exports = generateUploadUrl;
