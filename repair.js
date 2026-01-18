const admin = require("firebase-admin");
const { getDownloadURL } = require("firebase-admin/storage");

// Inicializa Firebase (asegúrate de tener las credenciales configuradas)
const db = admin.firestore();
const bucket = admin.storage().bucket();

async function repairEventPhotos() {
  console.log("🚀 Iniciando reparación de URLs en la colección 'projects'...");

  try {
    // 1. Obtener todos los proyectos
    const projectsSnap = await db.collection("projects").get();

    for (const projectDoc of projectsSnap.docs) {
      // 2. Obtener todos los eventos dentro de cada proyecto
      const eventsSnap = await projectDoc.ref.collection("events").get();

      for (const eventDoc of eventsSnap.docs) {
        const eventData = eventDoc.data();

        // Verificamos si el evento tiene el campo 'photos' y es un array
        if (eventData.photos && Array.isArray(eventData.photos)) {
          let hasChanged = false;

          // 3. Procesar cada foto en la lista
          const updatedPhotos = await Promise.all(
            eventData.photos.map(async (photo) => {
              // Si la URL es antigua (contiene 'GoogleAccessId')
              if (photo.source && photo.source.includes("GoogleAccessId")) {
                // Extraemos el nombre del archivo de la URL o usamos el ID si lo tienes
                // Basado en tu ejemplo: uploads/HASH.jpg
                // Intentamos reconstruir el path desde la URL:
                const fileName = photo.source
                  .split("/uploads/")[1]
                  .split("?")[0];
                const filePath = `uploads/${fileName}`;

                try {
                  const fileRef = bucket.file(filePath);
                  const newUrl = await getDownloadURL(fileRef);

                  console.log(
                    `✅ URL reparada para la foto en evento: ${eventDoc.id}`
                  );
                  hasChanged = true;
                  return { ...photo, source: newUrl }; // Retornamos la foto con la URL nueva
                } catch (err) {
                  console.error(
                    `❌ No se encontró el archivo en Storage: ${filePath}`
                  );
                  return photo; // Si falla, dejamos la original
                }
              }
              return photo; // Si ya era permanente, no hacemos nada
            })
          );

          // 4. Guardar los cambios en el documento del evento
          if (hasChanged) {
            await eventDoc.ref.update({ photos: updatedPhotos });
          }
        }
      }
    }
    console.log("✨ Proceso completado.");
  } catch (error) {
    console.error("error general:", error);
  }
}

module.exports.repairEventPhotos = repairEventPhotos;
