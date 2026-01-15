// /api/generate-upload-url.js

let db, bucket, admin;

// Detecta si está corriendo en Firebase Cloud Functions
const isFirebaseEnv = process.env.FUNCTION_TARGET || process.env.K_SERVICE;

if (isFirebaseEnv) {
  // Entorno Firebase Cloud Functions
  admin = require("firebase-admin");
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  db = admin.firestore();
  bucket = admin.storage().bucket();
  module.exports = { db, bucket, admin };
} else {
  // Entorno local/Vercel/otros
  const { firestore } = require("firebase-admin");
  const { initializeApp, cert, getApps } = require("firebase-admin/app");
  const { getStorage } = require("firebase-admin/storage");

  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CERT);

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: storageBucket,
    });
  }

  db = firestore();
  bucket = getStorage().bucket();
  module.exports = { db, bucket };
}
