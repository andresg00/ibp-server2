const { db } = require("../config/firebase");
// --- Configuración de Firebase Admin ---
// Leemos las credenciales desde las variables de entorno de Vercel

// Esta es la función principal que Vercel ejecutará
const getDocument = async (req, res) => {
  // Solo permitimos peticiones POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }
  try {
    const { path } = req.body;

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

const getDocumentWhithPassword = async (req, res) => {
  // Solo permitimos peticiones POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }
  try {
    const { path, password } = req.body;
    if (!path || !password) {
      return res.status(400).json({
        error: "Faltan parámetros en el cuerpo de la solicitud.",
      });
    }
    let isValid = await verifyPassword(path, password);
    if (!isValid) {
      return res.status(403).json({ error: "Contraseña incorrecta." });
    }
    return getDocument(req, res);
  } catch (error) {
    console.error("Error al obtener el documento:", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};
const verifyPassword = async (path, password) => {
  return password === path;
};
const getCollectionWhithPassword = async (req, res) => {
  // Solo permitimos peticiones POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }
  try {
    const { path, password } = req.body;
    if (!path || !password) {
      return res.status(400).json({
        error: "Faltan parámetros en el cuerpo de la solicitud.",
      });
    }
    let isValid = await verifyPassword(path, password);
    if (!isValid) {
      return res.status(403).json({ error: "Contraseña incorrecta." });
    }
    return getCollection(req, res);
  } catch (error) {
    console.error("Error al obtener el documento:", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};
const validAccessKeys = [
  "aB3xK9mN2pL7qR5sT8vW4yZ1uC6dE0fG",
  "hI9jK2lM5nO8pQ1rS4tU7vW3xY6zA0bC",
  "dE7fG2hI5jK8lM1nO4pQ9rS2tU5vW8xY",
  "zAb3Cd6eF9gH2iJ5kL8mN1oP4qR7sT0uV",
  "wX3yZ6aB9cD2eF5gH8iJ1kL4mN7oP0qR",
  undefined,
  null,
]; // Ejemplo de claves válidas
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
module.exports.getDocumentWhithPassword = getDocumentWhithPassword;
module.exports.getCollectionWhithPassword = getCollectionWhithPassword;
