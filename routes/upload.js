const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer(); // archivos en memoria
const uploadController = require("../controllers/uploadController");

// IMPORTANTE: 'file' debe coincidir con la key que envías desde Flutter
// Usa rutas diferentes para imagen y video
router.post("/", upload.single("file"), uploadController.uploadImage);
// router.post("/video", upload.single("file"), uploadController.uploadVideo);

module.exports = router;
