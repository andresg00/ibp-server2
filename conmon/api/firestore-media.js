const { MediaFile } = require("../models/media");
const { db } = require("../config/firebase");
const e = require("express");
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
async function deleteFromFirestore(hash) {
  return await db.collection("media").doc(hash).delete();
}
exports.existMedia = existMedia;
exports.setMediaToFirestore = setMediaToFirestore;
exports.deleteFromFirestore = deleteFromFirestore;
