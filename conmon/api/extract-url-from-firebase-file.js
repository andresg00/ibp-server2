const { bucket: _bucket } = require("../config/firebase");

// async function getUrl(
//   FILE_NAME = "uploads/701dd89849365f63a8a4a30bae93cd5a3a481208a2dc5f92cede60b9bbc553f2.mp4",
//   expired = Date.now() + 15 * 60 * 1000,
// ) {
//   let verison = "v4";
//   const MAX_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos
//   if (Date.parse(expired) - Date.now() > MAX_EXPIRE_MS) {
//     verison = "v2";
//   }
//   console.log("Iniciando prueba de stream desde Cloud Storage...");

//   const file = _bucket.file(FILE_NAME);

//   console.log(`Intentando leer el archivo: ${FILE_NAME}`);
//   const [exists] = await file.exists();
//   if (!exists) {
//     console.error("El archivo no existe en el bucket.");
//     return;
//   }
//   const url = await file.getSignedUrl({
//     action: "read",
//     version: verison, // ¡Esta es la línea mágica!
//     expires: expired, // 15 minutos
//   });
//   return url[0];
// }
const { getDownloadURL } = require("firebase-admin/storage");

async function getUrl(FILE_NAME) {
  console.log("Obteniendo URL permanente desde Firebase Storage...");

  try {
    const file = _bucket.file(FILE_NAME);

    // 1. Verificamos si el archivo existe
    const [exists] = await file.exists();
    if (!exists) {
      console.error(`El archivo no existe en el bucket: ${FILE_NAME}`);
      return null;
    }

    // 2. Obtenemos la URL de descarga permanente
    // Esta URL incluye un token de descarga que no expira
    const url = await getDownloadURL(file);

    console.log(`URL obtenida con éxito para: ${FILE_NAME}`);
    return url;
  } catch (error) {
    console.error("Error al obtener la URL permanente:", error);
    return null;
  }
}
module.exports = { getUrl };
