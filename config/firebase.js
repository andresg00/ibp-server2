const admin = require("firebase-admin");
// const serviceAccount = require('../firebase-admin.json');

const cert = JSON.parse(process.env.FIREBASE_ADMIN_CERT);
admin.initializeApp({
  credential: admin.credential.cert(cert),
});

const db = admin.firestore();

module.exports = db;
