const { db } = require("../config/firebase");

/**
 * Valida la clave específica de un proyecto (placeholder para implementación diferida).
 * @param {string} projectId ID del proyecto.
 * @param {string} accessKey Clave del proyecto enviada por el cliente.
 * @returns {boolean} Verdadero si es válida.
 */
async function validateProjectKey(projectId, accessKey) {
  const private = await fetchDocument("private/projects");
  const keys = private.keys;
  return keys[projectId] && keys[projectId] === accessKey;
}
// PRO-438W-8HFNF
function validateAcces(path, userId) {
  return true;
}
/**
 * Lógica pura para obtener un documento de Firestore.
 */
async function fetchDocument(path, accessKey) {
  if (!validateAcces(accessKey)) {
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
async function fetchCollection(path, accessKey, filter, order) {
  if (!validateAcces(accessKey)) {
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
  return documents;
}

/**
 * Lógica pura para obtener los proyectos específicos de un usuario en Firestore.
 */
async function fetchMyProjects(userId) {
  if (!userId) {
    throw new Error("MISSING_USER_ID");
  }

  // Buscamos los proyectos donde el campo userId sea igual al parámetro de consulta
  const snapshot = await db
    .collection("projects")
    .where("userId", "==", userId)
    .get();
  const projects = [];
  snapshot.forEach((doc) => {
    projects.push({ id: doc.id, ...doc.data() });
  });
  return projects;
}

/**
 * Lógica pura para verificar si un proyecto pertenece a un usuario.
 */
async function verifyProjectOwnership(projectId, userId) {
  if (!projectId) {
    throw new Error("MISSING_PROJECT_ID");
  }
  if (!userId) {
    throw new Error("MISSING_USER_ID");
  }

  const doc = await db.collection("projects").doc(projectId).get();
  if (!doc.exists) {
    return { owned: false, message: "Project not found" };
  }
  const data = doc.data();
  // Comparamos contra userId y ownerId para dar mayor cobertura
  const owned = data.userId === userId || data.ownerId === userId;
  return owned;
}

/**
 * Lógica pura para reclamar/asignar un proyecto a un usuario en Firestore.
 */
async function claimProject(projectId, userId, accessKey) {
  if (!(await validateProjectKey(projectId, accessKey))) {
    throw new Error("UNAUTHORIZED");
  }
  if (!projectId) {
    throw new Error("MISSING_PROJECT_ID");
  }
  if (!userId) {
    throw new Error("MISSING_USER_ID");
  }

  const docRef = db.collection("projects").doc(projectId);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new Error("NOT_FOUND");
  }

  await docRef.update({ userId: userId });
  return { success: true };
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
  await docRef.set(data, { merge: true });
  return { id: docRef.id };
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
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Método no permitido. Usa GET." });
  }

  const path = req.query?.path;
  const accessKey = req.headers["authorization"];
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

const getMyProjectsExpress = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Método no permitido. Usa GET." });
  }

  const userId = req.query?.userId;

  try {
    const projects = await fetchMyProjects(userId);
    return res.status(200).json(projects);
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return res.status(403).json({ error: "Clave de acceso inválida." });
    }
    if (error.message === "MISSING_USER_ID") {
      return res.status(400).json({ error: "Falta el parámetro 'userId'." });
    }
    console.error("Error en getMyProjectsExpress:", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

const verifyProjectOwnershipExpress = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Método no permitido. Usa GET." });
  }

  const { projectId, userId } = req.query;

  try {
    const result = await verifyProjectOwnership(projectId, userId);
    return res.status(200).json(result);
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return res.status(403).json({ error: "Clave de acceso inválida." });
    }
    if (error.message === "MISSING_PROJECT_ID") {
      return res.status(400).json({ error: "Falta el parámetro 'projectId'." });
    }
    if (error.message === "MISSING_USER_ID") {
      return res.status(400).json({ error: "Falta el parámetro 'userId'." });
    }
    console.error("Error en verifyProjectOwnershipExpress:", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

const claimProjectExpress = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }

  const { projectId, userId, accessKey: bodyKey } = req.body;
  const headerKey = req.headers["authorization"];
  const accessKey = headerKey || bodyKey;

  try {
    const result = await claimProject(projectId, userId, accessKey);
    return res.status(200).json(result);
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return res
        .status(403)
        .json({ error: "Clave de acceso de proyecto inválida." });
    }
    if (error.message === "MISSING_PROJECT_ID") {
      return res.status(400).json({ error: "Falta el parámetro 'projectId'." });
    }
    if (error.message === "MISSING_USER_ID") {
      return res.status(400).json({ error: "Falta el parámetro 'userId'." });
    }
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ error: "Proyecto no encontrado." });
    }
    console.error("Error en claimProjectExpress:", error);
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
  fetchDocument,
  fetchCollection,
  fetchMyProjects,
  verifyProjectOwnership,
  claimProject,
  validateProjectKey,
  getDocumentExpress,
  getListExpress,
  getMyProjectsExpress,
  verifyProjectOwnershipExpress,
  claimProjectExpress,
  setDocumentExpress,
  setListExpress,
  getDocument: getDocumentExpress, // Compatibilidad legacy
  getCollection: getListExpress, // Compatibilidad legacy
};
