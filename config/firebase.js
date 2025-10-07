// /api/generate-upload-url.js

const { firestore } = require("firebase-admin");
const { initializeApp, cert, getApps } = require("firebase-admin/app");

// --- Configuración de Firebase Admin ---
// Leemos las credenciales desde las variables de entorno de Vercel
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CERT);
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET; // ej: "mi-proyecto.appspot.com"

// Inicializamos Firebase Admin SOLO si no se ha hecho antes
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: storageBucket,
  });
}
// --- Fin de la Configuración ---

const db = firestore();

module.exports = db;
