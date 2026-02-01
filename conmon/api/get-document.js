const { db } = require("../config/firebase");
// --- Configuración de Firebase Admin ---
// Leemos las credenciales desde las variables de entorno de Vercel
// const validAccessKeys = process.env.FIREBASE_ACCESS_KEYS;
const validAccessKeys = JSON.parse(process.env.FIREBASE_ACCESS_KEYS);
// validAccessKeys.push(undefined);
// Esta es la función principal que Vercel ejecutará
const getDocument = async (req, res) => {
  // Solo permitimos peticiones POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }
  try {
    const { path, accessKey } = req.body;
    if (!validAccessKeys.includes(accessKey)) {
      return res.status(403).json({ error: "Clave de acceso inválida." });
    }

    if (!path) {
      return res.status(400).json({
        error: "Falta el parámetro 'path' en el cuerpo de la solicitud.",
      });
    }
    const docRef = db.doc(path);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Documento no encontrado." });
    }
    return res.status(200).json({ document: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error("Error al obtener el documento:", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

const getCollection = async (req, res) => {
  // Solo permitimos peticiones POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }
  try {
    const { path, accessKey } = req.body;
    if (!validAccessKeys.includes(accessKey)) {
      return res.status(403).json({ error: "Clave de acceso inválida." });
    }
    if (!path) {
      return res.status(400).json({
        error: "Falta el parámetro 'path' en el cuerpo de la solicitud.",
      });
    }
    const collectionRef = db.collection(path);
    const snapshot = await collectionRef.get();
    const documents = [];
    snapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    return res.status(200).json({ documents });
  } catch (error) {
    console.error("Error al obtener la colección:", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};
module.exports.getDocument = getDocument;
module.exports.getCollection = getCollection;
