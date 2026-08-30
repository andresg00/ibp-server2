const { existMedia } = require("./firestore-media");
const { bucket } = require("../config/firebase");

// Eliminar archivo de forma segura
const deleteFile = async (req, res) => {
  // Solo permitimos peticiones POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }

  try {
    // Recibimos el hash, ext y/o name del cliente
    const { id, ext: bodyExt, name: bodyName } = req.body;

    if (!id && !bodyName) {
      return res
        .status(400)
        .json({ error: 'Faltan los campos requeridos: "id" o "name".' });
    }

    let ext = bodyExt;
    const doc = id ? await existMedia(id) : { exists: false };

    if (doc.exists) {
      const data = doc.data();
      ext = data.ext || ext;
    }

    // Determinar la ruta exacta en Storage
    let filePathInStorage = bodyName;
    if (!filePathInStorage) {
      if (ext) {
        filePathInStorage = `uploads/${id}.${ext}`;
      } else {
        filePathInStorage = `uploads/${id}.jpg`;
      }
    }

    const file = bucket.file(filePathInStorage);
    try {
      // Eliminamos el archivo físico original de Storage
      await file.delete({ ignoreNotFound: true });
      console.log("Archivo eliminado de Storage:", filePathInStorage);

      // Si tenemos el hash, eliminar también posibles miniaturas residuales
      const hash = id || filePathInStorage.split("/").pop().split(".")[0];
      if (hash) {
        await bucket.file(`uploads/thumbnails-x400/${hash}.png`).delete({ ignoreNotFound: true }).catch(() => {});
        await bucket.file(`uploads/thumbnails-x800/${hash}.png`).delete({ ignoreNotFound: true }).catch(() => {});
        await bucket.file(`uploads/video-images/${hash}.png`).delete({ ignoreNotFound: true }).catch(() => {});
      }
    } catch (ex) {
      console.error("Aviso al eliminar archivo de Storage:", ex.message);
    }

    // Si el documento existía en Firestore, eliminarlo
    if (doc.exists) {
      await doc.ref.delete().catch(() => {});
    }

    res.status(200).json({ message: "Archivo y referencias eliminados correctamente." });
  } catch (error) {
    console.error("Error eliminando el archivo:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
};

module.exports = deleteFile;
