const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
require("dotenv").config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
const uploadRoutes = require("./routes/upload");
app.use("/upload", uploadRoutes);

app.get("/", (req, res) => res.send("Servidor funcionando 🚀"));

app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
