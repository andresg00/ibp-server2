const { db, bucket } = require("../config/firebase");
const sharp = require("sharp");
const { getUrl } = require("./extract-url-from-firebase-file");
const { imageMetadata } = require("./extract-image-metadata-from-url.js");
const path = require("path"); // Para construir rutas de archivo
const os = require("os");
const {
  getThumbnailPathX400,
  getThumbnailPathX800,
  isThumbnail,
} = require("./local-paths");

async function saveToStorage(bucket, filePath, savedPath) {
  // Subir el thumbnail al bucket en la ruta correcta
  const thumbnailUploadResult = await bucket.upload(filePath, {
    destination: savedPath,
    metadata: { contentType: "image/png" },
  });

  const thumbnailFile = thumbnailUploadResult[0];
  const thumbnailUrl = await getUrl(thumbnailFile.name);

  console.log("Thumbnail subido. URL:", thumbnailUrl);
  return thumbnailUrl;
}
/**
 * Obtiene una miniatura de la imagen desde una URL y la redimensiona.
 * @param {string} imageUrl La URL de la imagen.
 * @returns {Promise<string[]>} Array de rutas de miniaturas, o array vacío si hay error.
 */
async function getThumbnails(imageUrl, widths = [200, 400]) {
  try {
    // 1. DESCARGA ÚNICA
    const response = await fetch(imageUrl);
    if (!response.ok)
      throw new Error(`Error al descargar: ${response.statusText}`);

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    return await getThumbnailsFromBufer(imageBuffer, widths);
  } catch (error) {
    console.error(
      `❌ Error crítico en getThumbnails (descargando la imagen): ${error.message}`,
    );
    return [];
  }
}
async function getThumbnailsFromBufer(imageBuffer, widths = [200, 400]) {
  try {
    const uniqueName = `${Date.now()}.jpg`;
    // 2. PROCESAMIENTO PARALELO (Más rápido que un bucle for)
    const processingPromises = widths.map(async (width) => {
      try {
        // Generamos nombre basado solo en el ancho
        const thumbnailName = `x${width}_${uniqueName}`;
        const thumbnailPath = path.join(os.tmpdir(), thumbnailName);

        await sharp(imageBuffer)
          .resize(width) // Al pasar solo un valor, Sharp mantiene la proporción (aspect ratio)
          .toFile(thumbnailPath);

        console.log(`✅ Miniatura de ancho ${width}px creada.`);
        return thumbnailPath;
      } catch (err) {
        console.error(`❌ Error procesando ancho ${width}:`, err.message);
        return null;
      }
    });

    // Esperamos a que todas las conversiones terminen
    const results = await Promise.all(processingPromises);

    // Filtramos los nulos en caso de que alguna escala haya fallado
    return results.filter((path) => path !== null);
  } catch (error) {
    console.error(
      `❌ Error crítico en getThumbnails (prosesando la imagen): ${error.message}`,
    );
    return [];
  }
}

async function generateThumbs(file, data) {
  const filePath = file.name;
  const hash = filePath.split("/").pop().split(".")[0];
  const bucket = file.bucket;
  const x400ThumbPath = getThumbnailPathX400(hash);
  const x800ThumbPath = getThumbnailPathX800(hash);
  // Verificar si las miniaturas ya existen
  const x800File = bucket.file(x800ThumbPath);
  const x400File = bucket.file(x400ThumbPath);
  const exist = await Promise.all([x400File.exists(), x800File.exists()]);

  if (exist[0][0] && exist[1][0]) {
    console.log(`ℹ️  Las miniaturas ya existen para ${hash}`);
    return {
      thumb400: await getUrl(x400ThumbPath),
      thumb800: await getUrl(x800ThumbPath),
    };
  }

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
async function compressExistingImages() {
  console.log("=== Iniciando optimización de imágenes pesadas ===");

  try {
    // 1. Listar todos los archivos en la carpeta uploads
    const [files] = await bucket.getFiles({ prefix: "uploads/" });

    let totalSaved = 0;
    let processedCount = 0;
    files.sort(
      (a, b) => parseInt(b.metadata.size, 10) - parseInt(a.metadata.size, 10),
    );
    for (const file of files) {
      // Ignorar si es una miniatura o si no es imagen
      if (isThumbnail(file.name) || !file.name.match(/\.(jpg|jpeg|png)$/i)) {
        continue;
      }

      // 2. Filtrar por tamaño (> 1MB)
      const metadata = file.metadata;
      const sizeInBytes = parseInt(metadata.size.toString(), 10);

      if (sizeInBytes > 1024 * 1024) {
        // 1MB
        const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
        console.log(`\nPROCESANDO: ${file.name} (${sizeInMB} MB)`);

        // 3. Descargar el archivo a un Buffer
        const [inputBuffer] = await file.download();
        console.log(`🔽 Archivo descargado. Tamaño original: ${sizeInMB} MB`);
        // 4. Comprimir con Sharp (Equivalente a tu lógica de Flutter)
        // Usamos .jpeg({ quality: 70, mozjpeg: true }) para máxima compresión sin pérdida visual notable

        try {
          const outputBuffer = await sharp(inputBuffer)
            .resize({
              width: 1080,
              height: 1920,
              fit: "inside", // Mantiene proporción sin recortar
              withoutEnlargement: true, // No agranda si la imagen es pequeña
            })
            .jpeg({
              quality: 70,
              progressive: true,
              mozjpeg: true, // Optimización extra
            })
            .toBuffer();
          console.log(`🔧 Compresión realizada.`);

          // 5. Sobreescribir el archivo en Storage
          await file.save(outputBuffer, {
            metadata: {
              contentType: "image/jpeg",
            },
          });
          console.log(`🔼 Archivo subido de nuevo a Storage.`);
          await addTumbs(file, outputBuffer);

          const newSize = outputBuffer.length / (1024 * 1024);
          const saved = sizeInBytes / (1024 * 1024) - newSize;
          totalSaved += saved;
          processedCount++;

          console.log(
            `✅ COMPLETADO: Nuevo tamaño: ${newSize.toFixed(2)} MB (Ahorro: ${saved.toFixed(2)} MB)`,
          );
        } catch (err) {
          console.error(`❌ Error comprimiendo ${file.name}:`, err.message);
        }
      } else {
        const url = await getUrl(file.name);
        await addTumbs(file, url);
      }
    }

    console.log(`\n=== RESUMEN ===`);
    console.log(`Imágenes procesadas: ${processedCount}`);
    console.log(`Ahorro total de espacio: ${totalSaved.toFixed(2)} MB`);
  } catch (error) {
    console.error("Error en el proceso de compresión masiva:", error);
  }
}
async function addTumbs(file, bufferOrUrl) {
  const hash = file.name.replace("uploads/", "").split(".")[0];
  const doc = await db.collection("media").doc(hash).get();
  if (doc.exists) {
    const data = doc.data() || {};
    const mediaFile = require("../models/media").MediaFile.fromMap(data);
    if (!mediaFile.thumbs400 || !mediaFile.thumbs800) {
      console.log(`⚠️  Archivo ${hash} sin miniaturas. Generando...`);
      await generateThumbs(file, bufferOrUrl).then((thumbs) => {
        mediaFile.thumbs400 = thumbs.thumb400 || "";
        mediaFile.thumbs800 = thumbs.thumb800 || "";
        const data = mediaFile.toMap();
        db.collection("media").doc(hash).set(data);
        console.log(`⚠️  Miniaturas añadidas para el archivo ${hash}.`);
      });
    } else {
      console.log(`ℹ️  El archivo ${hash} ya tiene miniaturas.`);
    }
  } else {
    console.log(`⚠️  Archivo ${hash} no tiene metadatos previos.`);
    const url =
      typeof bufferOrUrl === "string" ? bufferOrUrl : await getUrl(file.name);
    const metadata = await imageMetadata(url);
    // const doc = db.collection("media").doc(hash);
    const mediaFile = require("../models/media").MediaFile.fromMap(metadata);
    await generateThumbs(file, bufferOrUrl).then((thumbs) => {
      mediaFile.thumbs400 = thumbs.thumb400 || "";
      mediaFile.thumbs800 = thumbs.thumb800 || "";
      const data = mediaFile.toMap();
      db.collection("media").doc(hash).set(data);
      console.log("Metadatos agregados.");
      console.log(`⚠️  Miniaturas creadas y añadidas para el archivo ${hash}.`);
    });
  }
}
// Ejecutar el script
exports.compressExistingImages = compressExistingImages;
