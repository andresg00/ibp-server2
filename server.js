const express = require("express");
const app = express();
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
      // Permitir peticiones sin origen (como apps móviles o Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "El policy de CORS para este sitio no permite acceso desde el origen especificado.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
  })
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
  getDocument,
  getCollection,
  getCollectionWhithPassword,
  getDocumentWhithPassword,
} = require("./conmon/api/get-document"); // Importa la función directamente
// --- AQUÍ ESTÁ LA CLAVE ---
// Crea la ruta exacta que tu app de Flutter está buscando
app.post("/api/generate-upload-url", generateUploadUrl);
app.post("/api/delete-file", deleteFile);
app.post("/api/check-media", checkMedia);
app.post("/api/document", getDocument);
app.post("/api/collection", getCollection);
app.post("/api/document-with-password", getDocumentWhithPassword);
app.post("/api/collection-with-password", getCollectionWhithPassword);

// Rutas
// app.use("/upload", uploadRoutes);

app.get("/", (req, res) => res.send("Servidor funcionando 🚀"));
// app.get("/favicon.ico", (req, res) => res.sendStatus(204));
// app.get("/favicon.png", (req, res) => res.sendStatus(204));
app.get(["/favicon.ico", "/favicon.png"], (req, res) => {
  res.status(204).end(); // No Content, sin warning
});

app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
