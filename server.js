const express = require("express");
const app = express();
// Aumenta el límite a 10MB o 50MB dependiendo de cuántas fotos envíes
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const PORT = process.env.PORT || 3000;
require("dotenv").config();
const cors = require("cors"); // <-- 1. Importar 'cors'
const allowedOrigins = [
  "http://localhost:4200",
  "https://i-b-p-3facd.web.app",
  "https://i-b-p-3facd.firebaseapp.com", // Firebase suele dar dos dominios
];

app.use(
  cors({
    origin: "*",

    // function (origin, callback) {
    //   // Permitir peticiones sin origen (como apps móviles o Postman)
    //   if (!origin) return callback(null, true);

    //   if (allowedOrigins.indexOf(origin) === -1) {
    //     const msg =
    //       "El policy de CORS para este sitio no permite acceso desde el origen especificado.";
    //     return callback(new Error(msg), false);
    //   }
    //   return callback(null, true);
    // },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
// const uploadRoutes = require("./routes/upload");
// const testUrlStream = require("./api/extract-metadata").testUrlStream;
// getFromFirebase = require("./video-analizer").getFromFirebase;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importa la función desde tu controlador
const generateUploadUrl = require("./conmon/api/generate-upload-url"); // Importa la función directamente
const deleteFile = require("./conmon/api/delete-file"); // Importa la función directamente
const checkMedia = require("./conmon/api/get-file").checkMedia; // Importa la función directamente
const {
  getDescription,
  execute,
  reformulate,
} = require("./conmon/api/ai-rest-api");
const {
  getDocumentExpress,
  getListExpress,
  setDocumentExpress,
  setListExpress,
  getMyProjectsExpress,
  verifyProjectOwnershipExpress,
  claimProjectExpress,
} = require("./conmon/api/firebase-firestore"); // Importa la función directamente
const getAlbumImages =
  require("./conmon/photos/phots-public-album").getAlbumImages; // Importa la función directamente
const { getWeather } = require("./conmon/api/open_weather_map"); // Importa la función directamente

app.post("/api/get-weather", getWeather);
app.post("/api/get-album-images", getAlbumImages);
app.post("/api/generate-upload-url", generateUploadUrl);
app.post("/api/delete-file", deleteFile);
app.post("/api/check-media", checkMedia);
app.get("/api/get-document", getDocumentExpress);
app.get("/api/get-list", getListExpress);
app.get("/api/get-my-projects", getMyProjectsExpress);
app.get("/api/verify-project-ownership", verifyProjectOwnershipExpress);
app.post("/api/claim-project", claimProjectExpress);
app.post("/api/set-document", setDocumentExpress);
app.post("/api/set-list", setListExpress);
app.post("/api/ai-description", getDescription);
app.post("/api/ai-execute", execute);
app.post("/api/ai-reformulate", reformulate);

const {
  searchMaterials,
  updateMaterial,
} = require("./conmon/api/materials-search");
app.get("/api/search-materials", searchMaterials);
app.post("/api/update-material", updateMaterial);

app.get("/", (req, res) => res.send("Servidor funcionando 🚀"));
// app.get("/favicon.ico", (req, res) => res.sendStatus(204));
// app.get("/favicon.png", (req, res) => res.sendStatus(204));
app.get(["/favicon.ico", "/favicon.png"], (req, res) => {
  res.status(204).end(); // No Content, sin warning
});
// compressExistingImages();
// repairEventPhotos();
// refreshExpiredMediaUrls("media");
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
