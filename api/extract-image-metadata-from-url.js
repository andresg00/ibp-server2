const { exiftool } = require("exiftool-vendored");
const fetch = require("node-fetch"); // Asegúrate de tenerlo: npm i node-fetch
const fs = require("fs").promises;
const path = require("path");
const os = require("os");

/**
 * Extrae metadatos de una URL descargando solo el encabezado a un buffer.
 * Este método evita los problemas de rutas en Windows.
 * @param {string} imageUrl La URL de la imagen.
 * @returns {Promise<object|null>} Los metadatos, o null si no se encuentran.
 */
async function getMetadataFromUrl(imageUrl) {
  try {
    // 1. Descargamos solo los primeros 128 KB. Es más que suficiente para EXIF.
    const response = await fetch(imageUrl, {
      headers: { Range: "bytes=0-131071" }, // 128 * 1024 - 1
    });

    if (!response.ok) {
      throw new Error(
        `Error al descargar el encabezado: ${response.statusText}`
      );
    }

    // 2. Convertimos la respuesta en un Buffer de Node.js.
    // Creamos un buffer con los datos de la imagen
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // Guardamos el buffer en un archivo temporal
    const tempFilePath = path.join(os.tmpdir(), `imgmeta_${Date.now()}.jpg`);
    await fs.writeFile(tempFilePath, imageBuffer);

    // 3. Pasamos el buffer directamente a ExifTool. Ahora no hay URLs que malinterpretar.
    const metadata = await exiftool.read(tempFilePath);
    return {
      createdAt: metadata.CreateDate || null,
      ext: path.extname(tempFilePath),
      height: metadata.ImageHeight || null,
      width: metadata.ImageWidth || null,
      size: metadata.FileSize ? metadata.FileSize.replace(/\D/g, "") : null,
      type: "image",
      //   thumbnail: metadata.PreviewImage || null,
    };
  } catch (error) {
    // Manejo elegante para imágenes que no contienen metadatos.
    if (
      error instanceof SyntaxError &&
      error.message.includes("Unexpected end of JSON input")
    ) {
      console.warn(
        `Advertencia: La imagen en ${imageUrl} no contiene metadatos EXIF.`
      );
      return null;
    }
    // Lanza cualquier otro error para ser manejado más arriba.
    throw error;
  }
}

exports.imageMetadata = getMetadataFromUrl;
