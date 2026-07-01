const { db } = require("../config/firebase");
const { pushNotification } = require("./notifications");

function handleCORS(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
}

const applyJob = async (req, res) => {
  handleCORS(req, res);
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }

  const uid = req.headers["authorization"];
  if (!uid) {
    return res.status(401).json({ error: "No autorizado. Falta cabecera Authorization." });
  }

  const { especialidad, experiencia, ciudad, portfolio, disponibilidad, mensaje, contactPermiso } = req.body || {};

  if (!especialidad || experiencia === undefined || !ciudad || !disponibilidad || !mensaje || !contactPermiso) {
    return res.status(400).json({ error: "Faltan campos requeridos en la postulación o no se aceptó el permiso de contacto." });
  }

  try {
    const userRef = db.collection("users").doc(uid);
    const appRef = db.collection("applications").doc(uid);
    
    // Obtener datos del usuario
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }
    const userData = userDoc.data();

    const appData = {
      especialidad,
      experiencia: Number(experiencia),
      ciudad,
      portfolio: portfolio || "",
      disponibilidad,
      mensaje,
      contactPermiso: Boolean(contactPermiso),
      email: userData.email || "",
      nombre: userData.nombre || "",
      telefono: userData.telefono || "",
      uid,
      status: "pendiente",
      createdAt: new Date().toISOString()
    };

    // Actualizar base de datos
    await db.runTransaction(async (transaction) => {
      transaction.set(appRef, appData, { merge: true });
      transaction.update(userRef, {
        postulacionStatus: "pendiente",
        updatedAt: new Date().toISOString()
      });
    });

    // Enviar notificación a los administradores
    const notificationData = {
      title: "Nueva Postulación Laboral",
      body: `${userData.nombre || 'Un usuario'} se ha postulado como ${especialidad} en ${ciudad}.`
    };

    // Guardar notificación en Firestore en la colección notifications-V2 para registro histórico
    const notifRef = db.collection("notifications-V2").doc();
    await notifRef.set({
      ...notificationData,
      createdAt: new Date().toISOString(),
      type: "job_application",
      userUid: uid
    });

    // Disparar push notification FCM
    await pushNotification(notificationData);

    return res.status(200).json({
      status: "success",
      message: "Postulación enviada correctamente."
    });

  } catch (error) {
    console.error("Error al procesar postulación:", error);
    return res.status(500).json({ error: "Error interno al procesar la postulación." });
  }
};

module.exports = { applyJob };
