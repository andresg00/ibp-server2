const { db } = require("../config/firebase");
const { pushNotification } = require("./notifications");
const { verifyProjectOwnership } = require("./project-members");

async function validateAccess(path, uid) {
  // Limpiamos slashes sobrantes
  const cleanPath = path.replace(/^\/+|\/+$/g, '');
  const parts = cleanPath.split('/');

  if (parts[0] === 'projects') {

    // CASO 1: Acceso a la lista completa ("projects") o a un proyecto específico ("projects/123")
    // Si parts.length es 1 o 2, es contenido totalmente público.
    if (parts.length <= 2) {
      return true;
    }

    // CASO 2: Intentan acceder a subcolecciones profundas sin estar autenticados
    if (!uid) {
      return false; // Bloqueado. Cualquier subcolección requiere una cuenta válida
    }

    // CASO 3: Acceso a subcolecciones privadas (ej. "projects/123/finanzas")
    // parts.length es mayor a 2, por lo que verificamos propiedad en el servidor
    if (parts.length > 2) {
      const projectId = parts[1];
      return await verifyProjectOwnership(projectId, uid);
    }
  }

  return false;
}
/**
 * Lógica pura para obtener un documento de Firestore.
 */
async function fetchDocument(path, uid) {
  if (!(await validateAccess(path, uid))) {
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
 * Lógica pura para obtener una colección/lista de Firestore con filtros y ordenamientos dinámicos.
 */
async function fetchCollection(path, uid, filter, order) {
  if (!(await validateAccess(path, uid))) {
    throw new Error("UNAUTHORIZED");
  }
  if (!path) {
    throw new Error("MISSING_PATH");
  }

  let queryRef = db.collection(path);

  // Aplicar filtros dinámicos (enviados como JSON stringificado desde Angular/Vite)

  if (filter) {
    let parsedFilter;
    try {
      parsedFilter = typeof filter === "string" ? JSON.parse(filter) : filter;
    } catch (e) {
      console.warn("Fallo al parsear filter JSON:", e.message);
    }

    if (Array.isArray(parsedFilter)) {
      parsedFilter.forEach((f) => {
        if (f.field && f.operator && f.value !== undefined) {
          queryRef = queryRef.where(f.field, f.operator, f.value);
        }
      });
    }
  }

  // Aplicar orden dinámico
  if (order) {
    let parsedOrder;
    try {
      parsedOrder = typeof order === "string" ? JSON.parse(order) : order;
    } catch (e) {
      console.warn("Fallo al parsear order JSON:", e.message);
    }

    if (parsedOrder) {
      if (typeof parsedOrder === "string") {
        queryRef = queryRef.orderBy(parsedOrder);
      } else if (parsedOrder.field) {
        queryRef = queryRef.orderBy(
          parsedOrder.field,
          parsedOrder.direction || "asc",
        );
      }
    }
  }

  const snapshot = await queryRef.get();
  const documents = [];
  snapshot.forEach((doc) => {
    documents.push({ id: doc.id, ...doc.data() });
  });
  if (path == 'projects' || path == 'projects/') {
    const webVisibleProjects = documents.filter((doc) => doc.webVisible === true);
    //devolver solo poryectos visbles en la web
    return webVisibleProjects;
  }
  return documents;
}

/**
 * Lógica pura para obtener el primer documento de Firestore basado en filtros y ordenamiento.
 */
async function fetchFirstDocument(path, uid, filter, order) {
  if (!(await validateAccess(path, uid))) {
    throw new Error("UNAUTHORIZED");
  }
  if (!path) {
    throw new Error("MISSING_PATH");
  }

  let queryRef = db.collection(path);

  // Aplicar filtros dinámicos (enviados como JSON stringificado desde Angular/Vite)
  if (filter) {
    let parsedFilter;
    try {
      parsedFilter = typeof filter === "string" ? JSON.parse(filter) : filter;
    } catch (e) {
      console.warn("Fallo al parsear filter JSON:", e.message);
    }

    if (Array.isArray(parsedFilter)) {
      parsedFilter.forEach((f) => {
        if (f.field && f.operator && f.value !== undefined) {
          queryRef = queryRef.where(f.field, f.operator, f.value);
        }
      });
    }
  }

  // Aplicar orden dinámico
  if (order) {
    let parsedOrder;
    try {
      parsedOrder = typeof order === "string" ? JSON.parse(order) : order;
    } catch (e) {
      console.warn("Fallo al parsear order JSON:", e.message);
    }

    if (parsedOrder) {
      if (typeof parsedOrder === "string") {
        queryRef = queryRef.orderBy(parsedOrder);
      } else if (parsedOrder.field) {
        queryRef = queryRef.orderBy(
          parsedOrder.field,
          parsedOrder.direction || "asc",
        );
      }
    }
  }

  const snapshot = await queryRef.limit(1).get();
  if (snapshot.empty) {
    throw new Error("NOT_FOUND");
  }
  let document;
  snapshot.forEach((doc) => {
    document = { id: doc.id, ...doc.data() };
  });
  return document;
}

/**
 * Lógica pura para obtener el último documento de Firestore basado en filtros y ordenamiento.
 */
async function fetchLastDocument(path, uid, filter, order) {
  if (!(await validateAccess(path, uid))) {
    throw new Error("UNAUTHORIZED");
  }
  if (!path) {
    throw new Error("MISSING_PATH");
  }

  let queryRef = db.collection(path);

  // Aplicar filtros dinámicos (enviados como JSON stringificado desde Angular/Vite)
  if (filter) {
    let parsedFilter;
    try {
      parsedFilter = typeof filter === "string" ? JSON.parse(filter) : filter;
    } catch (e) {
      console.warn("Fallo al parsear filter JSON:", e.message);
    }

    if (Array.isArray(parsedFilter)) {
      parsedFilter.forEach((f) => {
        if (f.field && f.operator && f.value !== undefined) {
          queryRef = queryRef.where(f.field, f.operator, f.value);
        }
      });
    }
  }

  // Para obtener el último documento, invertimos el ordenamiento dinámico.
  // Si no se especifica ordenamiento, ordenamos por "__name__" (ID de documento) en orden descendente.
  if (order) {
    let parsedOrder;
    try {
      parsedOrder = typeof order === "string" ? JSON.parse(order) : order;
    } catch (e) {
      console.warn("Fallo al parsear order JSON:", e.message);
    }

    if (parsedOrder) {
      if (typeof parsedOrder === "string") {
        queryRef = queryRef.orderBy(parsedOrder, "desc");
      } else if (parsedOrder.field) {
        const originalDirection = parsedOrder.direction || "asc";
        const invertedDirection = originalDirection === "asc" ? "desc" : "asc";
        queryRef = queryRef.orderBy(parsedOrder.field, invertedDirection);
      }
    }
  } else {
    queryRef = queryRef.orderBy("__name__", "desc");
  }

  const snapshot = await queryRef.limit(1).get();
  if (snapshot.empty) {
    throw new Error("NOT_FOUND");
  }
  let document;
  snapshot.forEach((doc) => {
    document = { id: doc.id, ...doc.data() };
  });
  return document;
}

/**
 * Lógica pura para escribir/actualizar un documento en Firestore.
 */
async function setDocument(path, data, uid) {
  if (!(await validateAccess(path, uid))) {
    throw new Error("UNAUTHORIZED");
  }
  if (!path) {
    throw new Error("MISSING_PATH");
  }
  if (!data) {
    throw new Error("MISSING_DATA");
  }

  // 1. Limpiar la ruta (quitar barras al inicio o final si existen) y dividirla
  const cleanPath = path.replace(/^\/|\/$/g, '');
  const segments = cleanPath.split('/');

  let finalPath = cleanPath;

  // 2. Si el número de segmentos es IMPAR, significa que apunta a una colección (falta el ID)
  if (segments.length % 2 !== 0) {
    // Generamos un ID automático usando el SDK de Firestore para esa colección
    const autoId = db.collection(cleanPath).doc().id;
    finalPath = `${cleanPath}/${autoId}`;
  }

  // 3. Tu lógica específica para notificaciones (usando el path limpio o validando el inicio)
  if (finalPath.startsWith("notifications-V2")) {
    await pushNotification(data);
  }

  // 4. Escribir en Firestore con la ruta definitiva (que ahora seguro es de un documento)
  const docRef = db.doc(finalPath);
  await docRef.set(data, { merge: true });

  return { id: docRef.id };
}

/**
 * Lógica pura para realizar escritura en lote (batch set) de una lista de documentos.
 */
async function setList(path, list, uid) {
  if (!(await validateAccess(path, uid))) {
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
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Método no permitido. Usa GET." });
  }

  const path = req.query?.path;
  const uid = req.headers["authorization"];
  const normalizedUid =
    uid === "undefined" || uid === "" ? undefined : uid;

  try {
    const document = await fetchDocument(path, normalizedUid);
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
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Método no permitido. Usa GET." });
  }

  const { path, filter, order } = req.query;
  const accessKey = req.headers["authorization"];
  const normalizedKey =
    accessKey === "undefined" || accessKey === "" ? undefined : accessKey;

  try {
    const documents = await fetchCollection(path, normalizedKey, filter, order);
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

const getFirstDocumentExpress = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Método no permitido. Usa GET." });
  }

  const { path, filter, order } = req.query;
  const accessKey = req.headers["authorization"];
  const normalizedKey =
    accessKey === "undefined" || accessKey === "" ? undefined : accessKey;

  try {
    const document = await fetchFirstDocument(path, normalizedKey, filter, order);
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
    console.error("Error al obtener el primer documento (Express):", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

const getLastDocumentExpress = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Método no permitido. Usa GET." });
  }

  const { path, filter, order } = req.query;
  const accessKey = req.headers["authorization"];
  const normalizedKey =
    accessKey === "undefined" || accessKey === "" ? undefined : accessKey;

  try {
    const document = await fetchLastDocument(path, normalizedKey, filter, order);
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
    console.error("Error al obtener el último documento (Express):", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

const setDocumentExpress = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }
  try {
    const { path, data } = req.body;
    const accessKey = req.headers["authorization"];
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
    const { path, list } = req.body;
    const accessKey = req.headers["authorization"];
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
  db,
  fetchDocument,
  fetchCollection,
  fetchFirstDocument,
  fetchLastDocument,
  setDocument,
  setList,
  getDocumentExpress,
  getListExpress,
  getFirstDocumentExpress,
  getLastDocumentExpress,
  setDocumentExpress,
  setListExpress,
  getDocument: getDocumentExpress, // Compatibilidad legacy
  getCollection: getListExpress, // Compatibilidad legacy
};
