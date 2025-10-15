const ffmpeg = require("fluent-ffmpeg");

async function getMetadata(url) {
  return new Promise((resolve, reject) => {
    // ffprobe analiza la URL sin descargar todo el archivo.
    ffmpeg.ffprobe(url, (err, metadata) => {
      if (err) {
        return reject(err);
      }

      // La información de la pista de video suele estar en el array 'streams'
      const videoStream = metadata.streams.find(
        (s) => s.codec_type === "video"
      );

      if (!videoStream) {
        return reject(new Error("No se encontró una pista de video."));
      }

      const result = {
        duration: videoStream.duration || metadata.format.duration,
        width: videoStream.width,
        height: videoStream.height,
        codec: videoStream.codec_name,
        bitrate: metadata.format.bit_rate,
        size: metadata.format.size,
        // ¡Y muchos otros datos!
      };

      resolve(result);
    });
  });
}
exports.getMetadata = getMetadata;
