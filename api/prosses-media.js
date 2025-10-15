const mime = require("mime");
const { getThumbnailPath, getUploadsPath } = require("../api/local-paths");
async function saveThumbnailToStorage(bucket, tempThumbnailPath, hash) {
  const { getVideoThumbnailRoute } = require("./api/local-paths");
  const thumbnailPathInStorage = getVideoThumbnailRoute(hash, ".png");
  // Subir el thumbnail al bucket en la ruta correcta
  const thumbnailUploadResult = await bucket.upload(tempThumbnailPath, {
    destination: thumbnailPathInStorage,
    metadata: { contentType: "image/png" },
  });

  const thumbnailFile = thumbnailUploadResult[0];
  const { getUrl } = require("./api/extract-url-from-firebase-file");
  const thumbnailUrl = await getUrl(thumbnailFile.name, "03-09-2491");

  console.log("Thumbnail subido. URL:", thumbnailUrl);
  return thumbnailUrl;
}
async function processFile(file) {
  //   const bucket = admin.storage().bucket(object.bucket);
  //   const file = bucket.file("....");
  const filePath = file.name;
  // Agrega más extensiones según sea necesario
  if (!filePath.startsWith(getUploadsPath())) {
    return console.log("Ignorando archivo fuera de 'uploads/'.");
  }
  if (filePath.startsWith(getThumbnailPath())) {
    return console.log("Ignorando archivo en 'thumbnails/'.");
  }
  const fileName = filePath.split("/").pop();
  const ext = fileName.split(".").pop().toLowerCase();
  const contentType =
    file.metadata.contentType ||
    mime.getType(ext) ||
    "application/octet-stream";
  // if (fileName.startsWith("thumb_")) {
  //   return console.log("Ignorando thumbnail.");
  // }
  if (contentType.startsWith("video/")) {
    // generar thumbnail
    const { extractFrameFromVideo } = require("./api/extract-frame");
    const { getUrl } = require("./api/extract-url-from-firebase-file");
    const url = await getUrl(filePath, "03-09-2491");
    const frame = await extractFrameFromVideo(url);
    let thumbUrl = null;
    const hash = fileName.split(".")[0];
    if (frame) {
      const bucket = file.bucket;
      thumbUrl = await saveThumbnailToStorage(bucket, frame, hash);

      console.log("Thumbnail generado y subido:", thumbUrl);
    } else {
      console.log("No se pudo extraer el frame del video.");
    }

    const { getMetadata } = require("./api/extract-video-metadata-from-url");
    const metadata = await getMetadata(url);
    metadata.thumb = thumbUrl;
    metadata.source = url;
    metadata.format = ext;
    console.log("Metadatos extraídos:", metadata);
    const { setMediaToFirestore } = require("./api/firestore-media");
    const media = await setMediaToFirestore(hash, metadata);
    console.log("Metadatos guardados en Firestore:", media);
  } else if (contentType.startsWith("image/")) {
    // procesar imagen
    const { imageMetadata } = require("./api/extract-image-metadata-from-url");
    const { getUrl } = require("./api/extract-url-from-firebase-file");
    const url = await getUrl(filePath, "03-09-2491");
    const metadata = await imageMetadata(url);
    if (metadata) {
      metadata.source = url;
      metadata.format = ext;
      console.log("Metadatos EXIF extraídos:", metadata);
      const hash = fileName.split(".")[0];
      const { setMediaToFirestore } = require("./api/firestore-media");
      const media = await setMediaToFirestore(hash, metadata);
      console.log("Metadatos guardados en Firestore:", media);
    }
  }
  //  else if (contentType.startsWith("audio/")) {
  //   //procesar audio
  // }
  else {
    return console.log("Tipo de archivo no soportado:", contentType);
  }
  return console.log("Proceso completado.");
}
exports.processFile = processFile;
