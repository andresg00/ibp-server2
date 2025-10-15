const { db, bucket } = require("../config/firebase");
const checkMedia = async (req, res) => {
  const { hash } = req.body;

  try {
    const docRef = db.collection("media").doc(hash);
    let doc = await docRef.get();

    // Espera hasta que el documento exista (máx 30s)
    const maxWait = 60000;
    const interval = 500;
    let waited = 0;

    while (!doc.exists && waited < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, interval));
      doc = await docRef.get();
      waited += interval;
    }

    if (!doc.exists) {
      res.status(202).send({ status: "PENDING" });
    } else {
      res.status(200).json({ status: "COMPLETE", data: doc.data() });
    }
  } catch (error) {
    res.status(500).send({ error: "Error al verificar el documento." });
  }
};
function getfile(name) {
  return bucket.file(name);
}
exports.checkMedia = checkMedia;
exports.getfile = getfile;
