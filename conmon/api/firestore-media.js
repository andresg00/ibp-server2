const { validateDate } = require("../models/media");
const { db } = require("../config/firebase");
async function existMedia(hash) {
  // return null;
  // Revisar si ya existe en Firebase
  const doc = await db.collection("media").doc(hash).get();
  return doc;
}
async function setMediaToFirestore(hash, map) {
  try {
    const date = validateDate(map.createdAt);
    map.createdAt = date;
    await db.collection("media").doc(hash).set(map);
  } catch (error) {
    console.error(`❌ Error crítico en setMediaToFirestore: ${error.message}`);
  }
  return map;
}
async function deleteFromFirestore(hash) {
  return await db.collection("media").doc(hash).delete();
}
exports.existMedia = existMedia;
exports.setMediaToFirestore = setMediaToFirestore;
exports.deleteFromFirestore = deleteFromFirestore;
