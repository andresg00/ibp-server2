const ffmpeg = require("fluent-ffmpeg");
const path = require("path"); // Para construir rutas de archivo
const os = require("os");
const sharp = require("sharp");

// Asegúrate de que FFmpeg esté disponible en la ruta de tu sistema
// o especifica la ruta completa:
// ffmpeg.setFfmpegPath('/ruta/a/tu/ffmpeg');
// ffmpeg.setFfprobePath('/ruta/a/tu/ffprobe');

/**
 * Extrae un fotograma de un video en una URL y lo guarda como imagen.
 * @param {string} videoUrl La URL del video.
 * @param {number} timeInSeconds El momento en segundos para extraer el fotograma (0 para el inicio).
 * @returns {Promise<string>} Una promesa que se resuelve con la ruta de la imagen generada.
 */

async function extractFrameFromVideo(videoUrl, timeInSeconds = 0) {
  const outputFileName = "frame.jpg";
  const outputImagePath = path.join(os.tmpdir(), outputFileName);
  return new Promise((resolve, reject) => {
    console.log("Iniciando comando ffmpeg...");

    ffmpeg(videoUrl)
      // 1. AÑADIMOS ESTA LÍNEA PARA ACTIVAR EL MODO DEPURACIÓN
      // .addOption("-loglevel", "debug")
      .screenshots({
        timestamps: [timeInSeconds],
        filename: path.basename(outputImagePath),
        folder: path.dirname(outputImagePath),
        // size: "320x240",
      })
      .on("end", function () {
        console.log(
          `\n✅ Fotograma extraído y guardado en: ${outputImagePath}`,
        );
        resolve(outputImagePath);
      })
      .on("error", function (err, stdout, stderr) {
        console.error(`\n❌ Error al extraer fotograma:`, err.message);
        // Imprimimos el final del log de error para más pistas
        console.error("FFmpeg stderr:", stderr);
        reject(err);
      });
    // // 2. AÑADIMOS ESTE LISTENER PARA VER EL "DIARIO DE TRABAJO"
    // .on("stderr", function (stderrLine) {
    //   // Imprimimos cada línea que ffmpeg nos reporta
    //   console.log(stderrLine);
    // });
  });
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
// async function getThumbnailsFromBufer(imageBuffer, widths = [200, 400]) {
//   try {
//     const uniqueName = `${Date.now()}.jpg`;
//     // 2. PROCESAMIENTO PARALELO (Más rápido que un bucle for)
//     const processingPromises = widths.map(async (width) => {
//       try {
//         // Generamos nombre basado solo en el ancho
//         const thumbnailName = `x${width}_${uniqueName}`;
//         const thumbnailPath = path.join(os.tmpdir(), thumbnailName);

//         await sharp(imageBuffer)
//           .resize(width) // Al pasar solo un valor, Sharp mantiene la proporción (aspect ratio)
//           .toFile(thumbnailPath);

//         console.log(`✅ Miniatura de ancho ${width}px creada.`);
//         return thumbnailPath;
//       } catch (err) {
//         console.error(`❌ Error procesando ancho ${width}:`, err.message);
//         return null;
//       }
//     });

//     // Esperamos a que todas las conversiones terminen
//     const results = await Promise.all(processingPromises);

//     // Filtramos los nulos en caso de que alguna escala haya fallado
//     return results.filter((path) => path !== null);
//   } catch (error) {
//     console.error(
//       `❌ Error crítico en getThumbnails (prosesando la imagen): ${error.message}`,
//     );
//     return [];
//   }
// }

async function getThumbnailsFromBufer(imageBuffer, widths = [200, 400]) {
  try {
    // 1. CAMBIO CLAVE: Usamos extensión .webp
    const uniqueName = `${Date.now()}.webp`;

    const processingPromises = widths.map(async (width) => {
      try {
        const thumbnailName = `x${width}_${uniqueName}`;
        const thumbnailPath = path.join(os.tmpdir(), thumbnailName);

        await sharp(imageBuffer)
          .resize(width)
          // 2. CONFIGURACIÓN WEBP:
          // quality: 80 es el estándar de la industria (buen balance peso/calidad).
          // effort: 6 hace que tarde unos milisegundos más en crearla, pero comprime mejor el archivo final.
          .webp({ quality: 80, effort: 4 })
          .toFile(thumbnailPath);

        console.log(`✅ Miniatura WebP de ancho ${width}px creada.`);
        return thumbnailPath;
      } catch (err) {
        console.error(`❌ Error procesando ancho ${width}:`, err.message);
        return null;
      }
    });

    const results = await Promise.all(processingPromises);
    return results.filter((path) => path !== null);
  } catch (error) {
    console.error(`❌ Error crítico en getThumbnails: ${error.message}`);
    return [];
  }
}
exports.extractFrameFromVideo = extractFrameFromVideo;
exports.getThumbnails = getThumbnails;
exports.getThumbnailsFromBufer = getThumbnailsFromBufer;
