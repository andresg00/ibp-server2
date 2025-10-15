const { extractFrameFromVideo } = require("./api/extract-frame");
const { getMetadata } = require("./api/extract-video-metadata-from-url");
const { getUrl } = require("./api/extract-url-from-firebase-file");
const { imageMetadata } = require("./api/extract-image-metadata-from-url");
const { getfile } = require("./api/get-file");
// --- EJEMPLO DE USO ---
// Puedes usar la misma URL de antes o cualquier otra.
// Asegúrate de que FFmpeg esté disponible en la ruta de tu sistema
// o especifica la ruta completa:
// ffmpeg.setFfmpegPath('/ruta/a/tu/ffmpeg');
// ffmpeg.setFfprobePath('/ruta/a/tu/ffprobe');
// --- EJEMPLO DE USO ---
// Una URL de una imagen que se sabe que tiene datos GPS y EXIF.
const imageUrlWithExif =
  "https://images-assets.nasa.gov/image/JSC-20160920-PH_JNB01_0002/JSC-20160920-PH_JNB01_0002~orig.JPG";

async function getFromFirebase() {
  //   const url = await getUrl(
  //     "uploads/2e2e700015afe9a55428ea7a0c913d4ba09ff991badede1b82af8c8015a86362.jpg"
  //   );
  //   //   console.log("URL obtenida de Firebase:");
  //   //   const metadata = await getMetadata(url);
  //   //   console.log("Metadatos extraídos:", metadata);
  //   //   extractFrameFromVideo(url);
  //   const metadata = await imageMetadata(url);
  //   console.log("Metadatos EXIF extraídos:", metadata);
  // const file = getfile(
  //   "uploads/007cf19e119683d4fb9b7c6b55a200494af6865ca0281a8c8c2042c510c528c7.jpg"
  // );
}

getFromFirebase();

module.exports = { getFromFirebase };
