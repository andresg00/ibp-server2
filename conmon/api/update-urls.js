const { db, bucket } = require("../config/firebase");
const { getUrl } = require("./extract-url-from-firebase-file");
const { getUploadsPath } = require("./local-paths");
/**
 * Función para actualizar URLs de medios expiradas o próximas a expirar.
 * @param {string} collectionPath - El nombre de la colección (ej: 'media' o 'uploads')
 */
// async function refreshExpiredMediaUrls(collectionPath) {
//   try {
//     // 1. Obtener todos los documentos de la colección
//     const snapshot = await db.collection(collectionPath).get();

//     if (snapshot.empty) {
//       console.log("No se encontraron documentos.");
//       return;
//     }

//     const batch = db.batch();
//     let count = 0;

//     for (const doc of snapshot.docs) {
//       const data = doc.data();
//       const currentSource = data.source;

//       // 2. Verificar si la URL contiene parámetros de Google Access (URL temporal)
//       if (currentSource && currentSource.includes("GoogleAccessId")) {
//         // Aquí extraemos el nombre del archivo del path de la URL o de un campo del doc
//         // Si tu URL es de Firebase Storage, el nombre suele estar entre /o/ y ?
//         const fileName = decodeURIComponent(
//           currentSource.split("/o/")[1].split("?")[0],
//         );

//         // 3. Obtener la nueva URL (usando tu lógica de bucket)
//         // Nota: Asegúrate de tener configurado el bucket de storage
//         const bucket = admin.storage().bucket();
//         const file = bucket.file(fileName);

//         // Generamos una nueva URL firmada (ejemplo a 10 años o permanente)
//         const [newUrl] = await getUrl(fileName);

//         // 4. Agregar la actualización al batch
//         batch.update(doc.ref, { source: newUrl });
//         count++;

//         // Firestore limita los batches a 500 operaciones
//         if (count === 500) {
//           await batch.commit();
//           console.log("Batch intermedio de 500 documentos procesado.");
//         }
//       }
//     }

//     // 5. Commit final de los cambios restantes
//     if (count > 0) {
//       await batch.commit();
//       console.log(`Se actualizaron exitosamente ${count} URLs.`);
//     } else {
//       console.log("No se encontraron URLs que necesitaran actualización.");
//     }
//   } catch (error) {
//     console.error("Error al actualizar las URLs:", error);
//   }
// }
async function refreshExpiredMediaUrls(collectionPath) {
  try {
    // Definimos el dominio de las URLs que suelen ser temporales
    const expiredDomain = "https://storage.googleapis.com";

    console.log("Buscando documentos con URLs que expiran...");

    // FILTRO DE FIRESTORE: Trae solo lo que empiece por el dominio de Google Storage
    const snapshot = await db
      .collection(collectionPath)
      .where("url", ">=", expiredDomain)
      .where("url", "<=", expiredDomain + "\uf8ff")
      .get();

    if (snapshot.empty) {
      console.log("No se encontraron URLs del dominio storage.googleapis.com.");
      return;
    }

    const batch = db.batch();

    let updatedCount = 0;

    for (const doc of snapshot.docs) {
      const currentSource = doc.data().url;

      // VALIDACIÓN: Si contiene GoogleAccessId, confirmamos que es temporal
      // Si NO lo contiene, es una URL permanente o pública y la ignoramos
      if (currentSource.includes("GoogleAccessId")) {
        try {
          const ext = doc.data().ext || "";
          const file =
            doc.id + (ext.startsWith(".") ? ext : ext ? "." + ext : "");
          // Extraemos el nombre del objeto/archivo
          // Las URLs suelen tener este formato: .../bucket-name/o/folder%2Farchivo.jpg?params...
          //   const parts = currentSource.split("/o/");
          //   if (parts.length < 2) continue; // Por seguridad si la URL está mal formada

          //   const fileNameWithParams = parts[1].split("?")[0];
          //   const decodedPath = decodeURIComponent(fileNameWithParams);

          // Generamos la nueva URL con expiración extendida

          const url = await getUrl(getUploadsPath() + file);

          batch.update(doc.ref, { url: url });
          updatedCount++;
        } catch (fileError) {
          console.error(
            `Error procesando archivo en doc ${doc.id}:`,
            fileError.message,
          );
        }
      }

      // Límite de batch de Firestore
      if (updatedCount > 0 && updatedCount % 500 === 0) {
        await batch.commit();
        console.log("Batch de 500 documentos procesado...");
      }
    }

    if (updatedCount > 0) {
      await batch.commit();
      console.log(
        `✅ Proceso terminado. Se actualizaron ${updatedCount} URLs temporales.`,
      );
    } else {
      console.log(
        "Se encontraron documentos, pero todos tenían URLs permanentes.",
      );
    }
  } catch (error) {
    console.error("❌ Error general en la función:", error);
  }
}
exports.refreshExpiredMediaUrls = refreshExpiredMediaUrls;
// Ejecutar la función
// refreshExpiredMediaUrls('media');
//1e1a828593061593b2951a825bcc27f728d9269a1b6a0f675bc3da79c8c04e83
//34fbcd64f7345bab14b55fee5f892081ba1c1c001e67bc4ea8a06d3939174c15
