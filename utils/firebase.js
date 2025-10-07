const db = require("../config/firebase");
const MediaFile = require("../models/media").MediaFile;

async function exist(hash) {
  // return null;
  // Revisar si ya existe en Firebase
  const doc = await db.collection("media").doc(hash).get();
  return doc.exists;
}
async function saveOnFirebase(hash, map) {
  const data = MediaFile.fromMap(map);
  await db.collection("media").doc(hash).set(data.toMap());
  return data;
}

exports.exist = exist;
exports.saveOnFirebase = saveOnFirebase;
