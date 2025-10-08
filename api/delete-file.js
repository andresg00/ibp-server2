const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");
const { exist } = require("../utils/firebase");

// Configuración de Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CERT);
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: storageBucket,
  });
}

// Eliminar archivo de forma segura
const deleteFile = async (req, res) => {
  // Solo permitimos peticiones POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }

  try {
    // Recibimos el hash y ext del cliente
    const { id } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ error: 'Faltan los campos "hash" o "ext".' });
    }

    // Verificamos si el archivo existe
    const doc = await exist(id);
    if (!doc.exists) {
      return res.status(404).json({ error: "El archivo no existe." });
    }

    const type = doc.data().type;
    if (typeof type === "string" && type.toLowerCase().startsWith("video")) {
      //delete video thumbnail
      const thumbnailFileName = `thumb_${id}${doc.data().ext}.png`;
      const thumbnailPathInStorage = `thumbnails/${thumbnailFileName}`;
      const thumbnailFile = getStorage().bucket().file(thumbnailPathInStorage);
      try {
        await thumbnailFile.delete();
      } catch (err) {
        console.error("Error eliminando thumbnail del video:", err);
      }
    }

    // Eliminar metadatos del archivo en Firebase (por ejemplo, Firestore)
    const ext = doc.data().ext;
    const filePathInStorage = `uploads/${id}${ext}`;
    const bucket = getStorage().bucket();
    const file = bucket.file(filePathInStorage);
    try {
      // Eliminamos el archivo
      await file.delete();
    } catch (ex) {
      console.error("Error eliminando metadatos en Firestore:", ex);
    }
    try {
      // Luego eliminamos los metadatos en Firestore
      await doc.ref.delete();
    } catch (ex2) {
      console.error("Error eliminando metadatos en Firestore:", ex2);
    }

    res.status(200).json({ message: "Archivo eliminado correctamente." });
  } catch (error) {
    console.error("Error eliminando el archivo:", error);
    res.status(500).json({ error: "No se pudo eliminar el archivo." });
  }
};

module.exports = deleteFile;
