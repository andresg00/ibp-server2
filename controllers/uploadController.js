const axios = require("axios");
// const fs = require("fs");
const mime = require("mime-types");
const FormData = require("form-data");
const { getBufferHash } = require("../utils/hash");
const db = require("../config/firebase");
const MediaFile = require("../models/media").MediaFile;
const getVideoThumbnailBuffer =
  require("../models/media").getVideoThumbnailBuffer;
function getHash(file) {
  const buffer = file.buffer;
  const hash = getBufferHash(buffer);
  return hash;
}
//
async function exist(hash) {
  // return null;
  // Revisar si ya existe en Firebase
  const doc = await db.collection("media").doc(hash).get();
  if (doc.exists) return doc.data();
  return null;
}
async function saveOnFirebase(hash, map) {
  const data = MediaFile.fromMap(map);
  await db.collection("media").doc(hash).set(data.toMap());
  return data;
}

function isVideo(path) {
  const videoExtensions = [".mp4", ".mov", ".avi", ".wmv", ".flv", ".mkv"];
  const ext = path.slice(((path.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
  return videoExtensions.includes(`.${ext}`);
}
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se envió archivo" });
    }

    // --- INICIO DEL BLOQUE DE DEPURACIÓN ---
    console.log("--- INICIANDO DEPURACIÓN DE UPLOAD EN ONRENDER ---");
    console.log("1. ¿Existe req.file?", !!req.file);
    // Mostramos el objeto req.file sin el buffer para no llenar el log
    console.log("2. Metadata de req.file:", {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      encoding: req.file.encoding,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
    console.log("3. ¿Existe el buffer dentro de req.file?", !!req.file.buffer);
    console.log(
      "4. Tamaño del buffer (bytes):",
      req.file.buffer ? req.file.buffer.length : "Buffer no encontrado"
    );
    console.log(
      "5. ¿API Key de ImgBB está disponible?:",
      process.env.IMGBB_API_KEY ? "Sí, encontrada." : "NO, FALTA LA API KEY."
    );
    console.log("--- FIN DE LA DEPURACIÓN ---");
    // --- FIN DEL BLOQUE DE DEPURACIÓN ---

    if (isVideo(req.file.originalname)) {
      return this.uploadVideo(req, res);
    }
    let hash = getHash(req.file);
    let isSaved = await exist(hash);
    if (isSaved) {
      return res.json({
        data: { ...isSaved },
        message: "Imagen ya subida",
      });
    }

    const imgbbApiKey = process.env.IMGBB_API_KEY;
    if (!imgbbApiKey) {
      return res.status(500).json({
        error: "No se encontró la API key de ImgBB en las variables de entorno",
      });
    }

    // --- NUEVA ESTRATEGIA: USAR BASE64 ---

    // 1. Convertir el buffer de la imagen a una cadena de texto Base64.
    const imageAsBase64 = req.file.buffer.toString("base64");

    // 2. Crear el cuerpo de la petición como 'URL Encoded'.
    // Usamos URLSearchParams para manejar esto correctamente.
    const params = new URLSearchParams();
    params.append("image", imageAsBase64);

    // 3. Realizar la petición POST.
    const response = await axios.post(
      `https://api.imgbb.com/1/upload?key=${imgbbApiKey}`,
      params, // Enviamos los parámetros URL-encoded
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    // --- FIN DE LA NUEVA ESTRATEGIA ---

    if (response.status === 200 && response.data && response.data.data) {
      // const imageData = response.data.data;
      let media = await saveOnFirebase(hash, response.data.data);
      media.resourceType = "image"; // asegurar que es imagen

      res.json({ data: media, message: "Imagen subida a ImgBB" });
    } else {
      res.status(500).json({
        error: "Error subiendo imagen a ImgBB",
        details: response.data,
      });
    }
  } catch (e) {
    let message = e && e.toString ? e.toString() : String(e);
    // Oculta la API key en el mensaje de error si aparece
    message = message.replace(
      new RegExp(process.env.IMGBB_API_KEY, "g"),
      "APIKEY..."
    );
    console.error("Error en uploadToImgBB:", message);
    res.status(500).json({ error: "Error subiendo imagen a ImgBB" });
  }
};

exports.uploadVideo = async (req, res) => {
  try {
    // if (!req.file)
    //   return res.status(400).json({ error: "No se envió archivo" });
    const CLOUDINARY_PRESET = process.env.UPLOAD_PRESET;
    const CLOUDINARY_CLOUD_NAME = process.env.CLOUD_NAME;
    let hash = getHash(req.file);
    let isSaved = await exist(hash);
    if (isSaved)
      return res.json({
        data: { ...isSaved },
        message: "Imagen ya subida",
      });

    // Preparar formulario con preset
    const form = new FormData();
    form.append("file", req.file.buffer, { filename: req.file.originalname });
    form.append("upload_preset", CLOUDINARY_PRESET);

    // Subir a Cloudinary vía HTTP
    const response = await axios.post(
      "https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD_NAME + "/upload",
      form,
      { headers: form.getHeaders() }
    );
    let data = response.data;
    data.resourceType = "video"; // asegurar que es video
    const media = MediaFile.fromMap(data);

    let thumb = await getVideoThumbnailBuffer(req.file);
    if (thumb && thumb.buffer) {
      await this.uploadImage(
        { file: thumb },
        {
          json: (data) => {
            media.thumb = data.data.source;
          },
        }
      );
    }
    await saveOnFirebase(hash, media.toMap());

    res.json({ data: media, message: "Video subido" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error subiendo video" });
  }
};
