const mime = require("mime");
const { getUrl } = require("./extract-url-from-firebase-file");
const {
  getThumbnailPathX400,
  getThumbnailPathX800,
  getUploadsPath,
  getVideoImagesPath,
  isThumbnail,
} = require("./local-paths");
const { setMediaToFirestore } = require("./firestore-media");
async function generateThumbs(file, data) {
  const filePath = file.name;
  const hash = filePath.split("/").pop().split(".")[0];
  const bucket = file.bucket;
  const x400ThumbPath = getThumbnailPathX400(hash);
  const x800ThumbPath = getThumbnailPathX800(hash);

  const { getThumbnails, getThumbnailsFromBufer } = require("./extract-frame");
  var res;
  if (data instanceof Buffer) {
    res = await getThumbnailsFromBufer(data, [200, 400]);
  } else {
    res = await getThumbnails(data, [200, 400]);
  }
  const thumb400 = res[0];
  const thumb800 = res[1];
  let thumb400Url;
  let thumb800Url;
  if (thumb400) {
    // await bucket.upload(thumb400, { destination: x400ThumbPath });
    thumb400Url = await saveToStorage(bucket, thumb400, x400ThumbPath);
  }
  if (thumb800) {
    // await bucket.upload(thumb800, { destination: x800ThumbPath });
    thumb800Url = await saveToStorage(bucket, thumb800, x800ThumbPath);
  }
  return { thumb400: thumb400Url, thumb800: thumb800Url };
}
async function saveToStorage(bucket, filePath, savedPath) {
  // Subir el thumbnail al bucket en la ruta correcta
  const contentType =
    // @ts-ignore
    mime.getType(filePath.split(".").pop().toLowerCase()) ||
    "application/octet-stream";
  const thumbnailUploadResult = await bucket.upload(filePath, {
    destination: savedPath,
    metadata: { contentType: contentType },
  });

  const thumbnailFile = thumbnailUploadResult[0];
  const thumbnailUrl = await getUrl(thumbnailFile.name);

  console.log("Thumbnail subido. URL:", thumbnailUrl);
  return thumbnailUrl;
}
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
async function processFile(file) {
  // compressExistingImages();
  //   const bucket = admin.storage().bucket(object.bucket);
  //   const file = bucket.file("....");
  const filePath = file.name;
  // Agrega más extensiones según sea necesario
  if (!filePath.startsWith(getUploadsPath())) {
    return console.log("Ignorando archivo fuera de 'uploads/'.");
  }
  if (isThumbnail(filePath)) {
    return console.log("Ignorando archivo en " + filePath);
  }
  const fileName = filePath.split("/").pop();
  const ext = fileName.split(".").pop().toLowerCase();

  try {
    const [metadata] = await file.getMetadata();
    // Ahora 'file.metadata' ya no estará vacío,
    // y también puedes usar la variable 'metadata' directamente.
    file.metadata = metadata;
  } catch (error) {
    console.error("Error al obtener metadatos del archivo:", error);
    return;
  }

  const contentType =
    file.metadata.contentType ||
    // @ts-ignore
    mime.getType(ext) ||
    "application/octet-stream";
  // if (fileName.startsWith("thumb_")) {
  //   return console.log("Ignorando thumbnail.");
  // }

  // console.log("Metadatos del archivo:", file.metadata);
  const meta = file.metadata.metadata || {};
  const customMetadata = {};
  // Recorremos todas las llaves dinámicamente
  Object.keys(meta).forEach((key) => {
    try {
      // Intentamos decodificar el valor por si trae eñes/tildes
      customMetadata[key] = decodeURIComponent(meta[key]);
    } catch (e) {
      // Si falla la decodificación, usamos el valor original
      customMetadata[key] = meta[key];
    }
  });
  console.log(
    "Metadatos personalizados recibidos del cliente:",
    customMetadata,
  );

  if (contentType.startsWith("video/")) {
    // generar thumbnail
    const hash = fileName.split(".")[0];
    const thumbnailPathInStorage = getVideoImagesPath(hash);
    const bucket = file.bucket;
    let imagePreview = null;
    let frameBuffer = null;

    const url = await getUrl(filePath);
    const exist = await bucket.file(thumbnailPathInStorage).exists();
    if (!exist[0]) {
      const { extractFrameFromVideo } = require("./extract-frame");
      const frame = await extractFrameFromVideo(url);

      if (frame) {
        const fs = require("fs");
        const bucket = file.bucket;
        frameBuffer = await fs.promises.readFile(frame);
        imagePreview = await saveToStorage(
          bucket,
          frame,
          thumbnailPathInStorage,
        );

        console.log("Thumbnail generado y subido:", imagePreview);
      } else {
        console.log("No se pudo extraer el frame del video.");
      }
    } else {
      imagePreview = await getUrl(thumbnailPathInStorage);
    }
    try {
      const { getMetadata } = require("./extract-video-metadata-from-url");
      const metadata = await getMetadata(url);
      const thumbs = await generateThumbs(file, frameBuffer);
      metadata.thumbs400 = thumbs.thumb400;
      metadata.thumbs800 = thumbs.thumb800;
      metadata.thumb = imagePreview;
      metadata.source = url;
      metadata.ext = ext;
      metadata.type = contentType;

      console.log("Metadatos (VIDEO) extraídos:", metadata);
      const media = await setMediaToFirestore(hash, {
        ...metadata,
        meta: customMetadata,
      });
      console.log("Metadatos (VIDEO) guardados en Firestore:", media);
    } catch (error) {
      console.error("Error al extraer metadatos de video:", error);
    }
  } else if (contentType.startsWith("image/")) {
    // procesar imagen
    const { getMetadataFromUrl } = require("./extract-image-metadata-from-url");
    const url = await getUrl(filePath);

    const metadata = await getMetadataFromUrl(url);
    const thumbs = await generateThumbs(file, url);
    metadata.thumbs400 = thumbs.thumb400;
    metadata.thumbs800 = thumbs.thumb800;
    if (metadata) {
      metadata.source = url;
      metadata.ext = ext;
      metadata.type = contentType;
      console.log("Metadatos (EXIF) extraídos:", metadata);
      const hash = fileName.split(".")[0];
      const media = await setMediaToFirestore(hash, {
        ...metadata,
        meta: customMetadata,
      });
      console.log("Metadatos (EXIF) guardados en Firestore:", media);
    }
  } else {
    const metadata = {};
    const url = await getUrl(filePath);
    metadata.source = url;
    metadata.ext = ext;
    metadata.type = contentType;
    metadata.size = file.metadata.size || 0;
    metadata.createdAt = file.metadata.timeCreated || new Date().toISOString();
    const hash = fileName.split(".")[0];
    const media = await setMediaToFirestore(hash, {
      ...metadata,
      meta: customMetadata,
    });

    console.log(
      "Metadatos guardados en Firestore para otro tipo de archivo:",
      media,
    );
  }
  return console.log("Proceso completado.");
}

exports.processFile = processFile;
exports.processDeleteFile = processDeleteFile;
