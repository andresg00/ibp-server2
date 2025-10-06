const axios = require("axios");
// const fs = require("fs");

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

    const form = new FormData();

    // FORMA CORRECTA: Envía el buffer directamente.
    // La librería se encarga de todo. Añadir el filename es una buena práctica.
    form.append("image", req.file.buffer, { filename: req.file.originalname });

    // FORMA INCORRECTA (la que tienes ahora):
    // form.append("image", req.file.buffer.toString("base64"));

    const response = await axios.post(
      `https://api.imgbb.com/1/upload?key=${imgbbApiKey}`,
      form,
      {
        headers: {
          ...form.getHeaders(), // Esto es crucial para que axios envíe los encabezados correctos de multipart/form-data
        },
      }
    );

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
    console.error("Error en uploadToImgBB:", e);
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
