const mime = require("mime");
const {
  getThumbnailPathX400,
  getThumbnailPathX800,
  getUploadsPath,
  getVideoImagesPath,
  isThumbnail,
} = require("./local-paths");

async function processDeleteFile(file) {
  const filePath = file.name;
  // Agrega más extensiones según sea necesario
  if (!filePath.startsWith(getUploadsPath())) {
    return console.log("Ignorando archivo fuera de 'uploads/'.");
  }
  if (isThumbnail(filePath)) {
    return console.log("Ignorando archivo en " + filePath);
  }
  console.log("Procesando eliminación de archivo:", filePath);
  const fileName = file.name.split("/").pop();
  const hash = fileName.split(".")[0];
  try {
    // Eliminar miniaturas de video

    const ext = fileName.split(".").pop().toLowerCase();
    // Intentar eliminar todos los archivos sin detener si alguno no existe
    // @ts-ignore
    const type = mime.getType(ext);
    if (type.startsWith("image/") || type.startsWith("video/")) {
      const bucket = file.bucket;
      const thumb400Path = getThumbnailPathX400(hash);
      const thumb800Path = getThumbnailPathX800(hash);
      const deletePromises = [
        bucket
          .file(thumb400Path)
          .delete()
          .catch((err) => console.log("Error al eliminar thumbnail 400:", err)),
        bucket
          .file(thumb800Path)
          .delete()
          .catch((err) => console.log("Error al eliminar thumbnail 800:", err)),
      ];

      if (type?.startsWith("video/")) {
        const videImasgesPath = getVideoImagesPath(hash);
        deletePromises.push(
          bucket
            .file(videImasgesPath)
            .delete()
            .catch((err) =>
              console.log("Error al eliminar video images:", err),
            ),
        );
      }

      await Promise.all(deletePromises);
      console.log("Miniaturas eliminadas para el archivo:", file.name);
    }
  } catch (error) {
    console.error("Error al eliminar miniaturas:", error);
  }

  const { deleteFromFirestore } = require("./firestore-media");
  await deleteFromFirestore(hash);
  console.log("Metadatos eliminados de Firestore para el hash:", hash);
}

exports.processDeleteFile = processDeleteFile;
