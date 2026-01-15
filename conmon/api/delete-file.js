const { existMedia } = require("./firestore-media");
const { getVideoThumbnailRoute } = require("./local-paths");
const { bucket } = require("../config/firebase");
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
    const doc = await existMedia(id);
    if (!doc.exists) {
      return res.status(404).json({ error: "El archivo no existe." });
    }
    const data = doc.data();
    deleteFile2(data, id);
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
async function deleteFile2(data, id) {
  const mediaFile = require("../models/media").MediaFile.fromMap(data);
  const type = mediaFile.type;
  if (type.toLowerCase().startsWith("video")) {
    //delete video thumbnail
    const thumbnailPathInStorage = getVideoThumbnailRoute(id, ".png");
    const thumbnailFile = bucket.file(thumbnailPathInStorage);
    try {
      await thumbnailFile.delete();
      console.log("Thumbnail del video eliminado.");
    } catch (err) {
      console.error("Error eliminando thumbnail del video:", err);
    }
  }

  const ext = mediaFile.ext;
  const filePathInStorage = `uploads/${id}.${ext}`;
  const file = bucket.file(filePathInStorage);
  try {
    // Eliminamos el archivo
    await file.delete();
    console.log("Archivo eliminado:", filePathInStorage);
  } catch (ex) {
    console.error("Error eliminando metadatos en Firestore:", ex);
  }
}

module.exports = deleteFile;
