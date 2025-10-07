const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
require("dotenv").config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importa la función desde tu controlador
const generateUploadUrl = require("./api/generate-upload-url"); // Importa la función directamente

// --- AQUÍ ESTÁ LA CLAVE ---
// Crea la ruta exacta que tu app de Flutter está buscando
app.post("/api/generate-upload-url", generateUploadUrl);

// Rutas
const uploadRoutes = require("./routes/upload");
app.use("/upload", uploadRoutes);

app.get("/", (req, res) => res.send("Servidor funcionando 🚀"));

app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
