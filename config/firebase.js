// /api/generate-upload-url.js

const { firestore } = require("firebase-admin");
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");

// --- Configuración de Firebase Admin ---
// Leemos las credenciales desde las variables de entorno de Vercel
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET; // ej: "mi-proyecto.appspot.com"
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CERT);

// Inicializamos Firebase Admin SOLO si no se ha hecho antes
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: storageBucket,
  });
}

const db = firestore();
const bucket = getStorage().bucket();
module.exports = { db, bucket };
