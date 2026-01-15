const { MediaFile } = require("../models/media");
const { db } = require("../config/firebase");
async function existMedia(hash) {
  // return null;
  // Revisar si ya existe en Firebase
  const doc = await db.collection("media").doc(hash).get();
  return doc;
}
async function setMediaToFirestore(hash, map) {
  const data = MediaFile.fromMap(map);
  await db.collection("media").doc(hash).set(data.toMap());
  return data;
}

exports.existMedia = existMedia;
exports.setMediaToFirestore = setMediaToFirestore;
