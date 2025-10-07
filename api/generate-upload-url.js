// /api/generate-upload-url.js
// Usamos 'require' en lugar de 'import'
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");
const { exist } = require("../utils/firebase");
// --- Configuración de Firebase Admin ---
// Leemos las credenciales desde las variables de entorno de Vercel
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CERT);
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET; // ej: "mi-proyecto.appspot.com"

// Inicializamos Firebase Admin SOLO si no se ha hecho antes
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: storageBucket,
  });
}
// --- Fin de la Configuración ---

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
    if (exist(hash) == true) {
      return res
        .status(200)
        .json({ message: "El archivo ya existe.", hash: hash });
    }
    const bucket = getStorage().bucket();
    const fileExtension = fileName.includes(".")
      ? "." + fileName.split(".").pop()
      : "";
    const filePathInStorage = `uploads/${hash}${fileExtension}`;
    const file = bucket.file(filePathInStorage);

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
