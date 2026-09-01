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
    origin: function (origin, callback) {
      // Permitir peticiones sin origen (como apps móviles, Postman o backend-to-backend)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith("http://localhost:")) {
        return callback(null, true);
      }

      const msg = "La política de CORS para este sitio no permite acceso desde el origen especificado.";
      return callback(new Error(msg), false);
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Desactivar caché global para peticiones de la API
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  next();
});

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
  getFirstDocumentExpress,
  getLastDocumentExpress,
  setDocumentExpress,
  setListExpress,

} = require("./conmon/api/firebase-firestore"); // Importa la función directamente
const { getMyProjectsExpress,
  verifyProjectOwnershipExpress,
  claimProjectExpress,
  unclaimProjectExpress, } = require("./conmon/api/project-members");
const getAlbumImages =
  require("./conmon/photos/phots-public-album").getAlbumImages; // Importa la función directamente
const { getWeather, getWeatherHistory } = require("./conmon/api/open_weather_map"); // Importa la función directamente
const { register, login, logout } = require("./conmon/api/auth");
const { applyJob, simulateAdminResponse } = require("./conmon/api/apply");
const { getReviews } = require("./conmon/api/reviews");

app.post("/api/get-weather", getWeather);
app.post("/api/get-weather-history", getWeatherHistory);
app.post("/api/register", register);
app.post("/api/login", login);
app.post("/api/logout", logout);
app.post("/api/apply", applyJob);
app.post("/api/admin/simulate-response", simulateAdminResponse);
app.get("/api/reviews", getReviews);
app.post("/api/get-album-images", getAlbumImages);
app.post("/api/generate-upload-url", generateUploadUrl);
app.post("/api/delete-file", deleteFile);
app.post("/api/check-media", checkMedia);
app.get("/api/get-document", getDocumentExpress);
app.get("/api/get-list", getListExpress);
app.get("/api/get-first-document", getFirstDocumentExpress);
app.get("/api/get-last-document", getLastDocumentExpress);
app.get("/api/get-my-projects", getMyProjectsExpress);
app.get("/api/verify-project-ownership", verifyProjectOwnershipExpress);
app.post("/api/claim-project", claimProjectExpress);
app.post("/api/unclaim-project", unclaimProjectExpress);
app.post("/api/set-document", setDocumentExpress);
app.post("/api/set-list", setListExpress);
app.post("/api/ai-description", getDescription);
app.post("/api/ai-execute", execute);
app.post("/api/ai-reformulate", reformulate);

const {
  searchMaterials,
  updateMaterial,
} = require("./conmon/api/materials-search");
const {
  calculateMatchExpress,
  getCompatibleLotesExpress,
  getCompatibleDesignsExpress,
} = require("./conmon/api/intelligence-match");
app.get("/api/search-materials", searchMaterials);
app.post("/api/update-material", updateMaterial);

// Endpoints de Intelligence Match (compatibilidad entre lotes y proyectos modulares)
app.get("/api/calculate-match", calculateMatchExpress);
app.post("/api/calculate-match", calculateMatchExpress);
app.get("/api/get-compatible-lotes", getCompatibleLotesExpress);
app.post("/api/get-compatible-lotes", getCompatibleLotesExpress);
app.get("/api/get-compatible-designs", getCompatibleDesignsExpress);
app.post("/api/get-compatible-designs", getCompatibleDesignsExpress);

app.get("/", (req, res) => res.send("Servidor funcionando 🚀"));
// app.get("/favicon.ico", (req, res) => res.sendStatus(204));
// app.get("/favicon.png", (req, res) => res.sendStatus(204));
app.get(["/favicon.ico", "/favicon.png"], (req, res) => {
  res.status(204).end(); // No Content, sin warning
});
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
