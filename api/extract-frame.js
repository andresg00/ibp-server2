const ffmpeg = require("fluent-ffmpeg");
const path = require("path"); // Para construir rutas de archivo
const os = require("os");

// Asegúrate de que FFmpeg esté disponible en la ruta de tu sistema
// o especifica la ruta completa:
// ffmpeg.setFfmpegPath('/ruta/a/tu/ffmpeg');
// ffmpeg.setFfprobePath('/ruta/a/tu/ffprobe');

/**
 * Extrae un fotograma de un video en una URL y lo guarda como imagen.
 * @param {string} videoUrl La URL del video.
 * @param {string} outputImagePath La ruta donde se guardará la imagen (ej. 'thumbnail.jpg').
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
          `\n✅ Fotograma extraído y guardado en: ${outputImagePath}`
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

exports.extractFrameFromVideo = extractFrameFromVideo;
