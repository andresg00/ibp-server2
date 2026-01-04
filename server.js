const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
require("dotenv").config();

const cors = require("cors"); // <-- 1. Importar 'cors'
// Configuración de CORS
app.use(
  cors({
    origin: "http://localhost:4200", // <-- 2. Permitir solo el origen de tu Angular
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true, // Si usas cookies o tokens de autenticación
  })
);
// const uploadRoutes = require("./routes/upload");
// const testUrlStream = require("./api/extract-metadata").testUrlStream;
// getFromFirebase = require("./video-analizer").getFromFirebase;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importa la función desde tu controlador
const generateUploadUrl = require("../conmon/api/generate-upload-url"); // Importa la función directamente
const deleteFile = require("../conmon/api/delete-file"); // Importa la función directamente
const checkMedia = require("../conmon/api/get-file").checkMedia; // Importa la función directamente
const { getDocument, getCollection } = require("../conmon/api/get-document"); // Importa la función directamente
// --- AQUÍ ESTÁ LA CLAVE ---
// Crea la ruta exacta que tu app de Flutter está buscando
app.post("/api/generate-upload-url", generateUploadUrl);
app.post("/api/delete-file", deleteFile);
app.post("/api/check-media", checkMedia);
app.post("/api/document", getDocument);
app.post("/api/collection", getCollection);

// Rutas
// app.use("/upload", uploadRoutes);

app.get("/", (req, res) => res.send("Servidor funcionando 🚀"));

app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
