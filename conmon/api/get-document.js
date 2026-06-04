const { db, admin } = require("../config/firebase");

// --- Configuración de Firebase Admin ---
let validAccessKeys = [];
try {
  validAccessKeys = JSON.parse(process.env.FIREBASE_ACCESS_KEYS || "[]");
} catch (e) {
  console.warn(
    "Advertencia: No se pudo parsear FIREBASE_ACCESS_KEYS:",
    e.message,
  );
}
if (!validAccessKeys.includes(undefined)) {
  validAccessKeys.push(undefined);
}

/**
 * Lógica pura para obtener un documento de Firestore.
 */
async function fetchDocument(path, accessKey) {
  if (!validAccessKeys.includes(accessKey)) {
    throw new Error("UNAUTHORIZED");
  }
  if (!path) {
    throw new Error("MISSING_PATH");
  }

  const docRef = db.doc(path);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new Error("NOT_FOUND");
  }
  return { id: doc.id, ...doc.data() };
}

/**
 * Lógica pura para obtener una colección/lista de Firestore.
 */
async function fetchCollection(path, accessKey) {
  if (!validAccessKeys.includes(accessKey)) {
    throw new Error("UNAUTHORIZED");
  }
  if (!path) {
    throw new Error("MISSING_PATH");
  }

  const collectionRef = db.collection(path);
  const snapshot = await collectionRef.get();
  const documents = [];
  snapshot.forEach((doc) => {
    documents.push({ id: doc.id, ...doc.data() });
  });
  return documents;
}

/**
 * Lógica pura para escribir/actualizar un documento en Firestore.
 */
async function setDocument(path, data, accessKey) {
  if (!validAccessKeys.includes(accessKey)) {
    throw new Error("UNAUTHORIZED");
  }
  if (!path) {
    throw new Error("MISSING_PATH");
  }
  if (!data) {
    throw new Error("MISSING_DATA");
  }

  const docRef = db.doc(path);
  if (path.startsWith("contact-MS-v2")) {
    await pusNotification(data);
  }
  await docRef.set(data, { merge: true });
  return { id: docRef.id };
}
async function pusNotification(data) {
  try {
    // Tu servidor va directo al grano:
    const deviceDoc = await db.collection("devices").doc("admin_device").get();
    const fcmToken = deviceDoc.data()?.fcmToken;

    if (!fcmToken) {
      console.log("No hay un token FCM registrado para este dispositivo.");
      return;
    }

    // 3. Construir la notificación usando las propiedades de tu objeto 'data'
    const payload = {
      token: fcmToken,
      notification: {
        title: `Nuevo: ${data.service}`, // Ejemplo: "Nuevo: reparaciones"
        body: `${data.name} dice: ${data.message.substring(0, 60)}...`, // Muestra un fragmento del mensaje
      },
      // Datos extra en segundo plano para que Flutter los use si necesitas abrir una pantalla específica
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        client_name: data.name,
        client_phone: data.phone,
        client_email: data.email,
        service_type: data.service,
        type: "lead_contact",
      },
    };

    // 4. Enviar el disparo a FCM
    const response = await admin.messaging().send(payload);
    console.log(
      "Notificación enviada con éxito a WorkDiary. ID del mensaje:",
      response,
    );
  } catch (error) {
    console.error("Error al procesar la notificación push:", error);
  }
}

/**
 * Lógica pura para realizar escritura en lote (batch set) de una lista de documentos.
 */
async function setList(path, list, accessKey) {
  if (!validAccessKeys.includes(accessKey)) {
    throw new Error("UNAUTHORIZED");
  }
  if (!path) {
    throw new Error("MISSING_PATH");
  }
  if (!list || !Array.isArray(list)) {
    throw new Error("MISSING_LIST");
  }

  const batch = db.batch();
  const collectionRef = db.collection(path);

  list.forEach((item) => {
    let docRef;
    if (item.id) {
      docRef = collectionRef.doc(item.id);
    } else {
      docRef = collectionRef.doc();
    }
    const { id, ...data } = item;
    batch.set(docRef, data, { merge: true });
  });

  await batch.commit();
  return { count: list.length };
}

// --- Controladores para Servidor Express (Compatibilidad Monolito) ---

const getDocumentExpress = async (req, res) => {
  // Soporta tanto query (GET) como body (POST)
  const path = req.query?.path || req.body?.path;
  const accessKey = req.query?.accessKey || req.body?.accessKey;
  const normalizedKey =
    accessKey === "undefined" || accessKey === "" ? undefined : accessKey;

  try {
    const document = await fetchDocument(path, normalizedKey);
    return res.status(200).json({ document });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return res.status(403).json({ error: "Clave de acceso inválida." });
    }
    if (error.message === "MISSING_PATH") {
      return res.status(400).json({ error: "Falta el parámetro 'path'." });
    }
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ error: "Documento no encontrado." });
    }
    console.error("Error al obtener el documento (Express):", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

const getListExpress = async (req, res) => {
  const path = req.query?.path || req.body?.path;
  const accessKey = req.query?.accessKey || req.body?.accessKey;
  const normalizedKey =
    accessKey === "undefined" || accessKey === "" ? undefined : accessKey;

  try {
    const documents = await fetchCollection(path, normalizedKey);
    return res.status(200).json({ documents });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return res.status(403).json({ error: "Clave de acceso inválida." });
    }
    if (error.message === "MISSING_PATH") {
      return res.status(400).json({ error: "Falta el parámetro 'path'." });
    }
    console.error("Error al obtener la lista/colección (Express):", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

const setDocumentExpress = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }
  try {
    const { path, data, accessKey } = req.body;
    const result = await setDocument(path, data, accessKey);
    return res.status(200).json(result);
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return res.status(403).json({ error: "Clave de acceso inválida." });
    }
    if (error.message === "MISSING_PATH") {
      return res.status(400).json({ error: "Falta el parámetro 'path'." });
    }
    if (error.message === "MISSING_DATA") {
      return res.status(400).json({ error: "Faltan los datos ('data')." });
    }
    console.error("Error al guardar el documento (Express):", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

const setListExpress = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }
  try {
    const { path, list, accessKey } = req.body;
    const result = await setList(path, list, accessKey);
    return res.status(200).json(result);
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return res.status(403).json({ error: "Clave de acceso inválida." });
    }
    if (error.message === "MISSING_PATH") {
      return res.status(400).json({ error: "Falta el parámetro 'path'." });
    }
    if (error.message === "MISSING_LIST") {
      return res.status(400).json({ error: "Falta la lista ('list')." });
    }
    console.error("Error al guardar la lista (Express):", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

module.exports = {
  fetchDocument,
  fetchCollection,
  setDocument,
  setList,
  getDocumentExpress,
  getListExpress,
  setDocumentExpress,
  setListExpress,
};
