
const { db } = require("../config/firebase");
// Cargar las claves de acceso autorizadas desde el entorno

/**
 * Valida la clave específica de un proyecto (placeholder para implementación diferida).
 * @param {string} projectId ID del proyecto.
 * @param {string} accessKey Clave del proyecto enviada por el cliente.
 * @returns {boolean} Verdadero si es válida.
 */
async function validateProjectKey(projectId, accessKey) {
    const doc = await db.doc("private/projects").get();
    if (!doc.exists) {
        throw new Error("NOT_FOUND");
    }
    const privateData = doc.data() || {};
    const keys = privateData.keys || {};
    return keys[projectId] && keys[projectId] === accessKey;
}
/**
 * Lógica pura para obtener los proyectos específicos de un usuario en Firestore.
 */
async function fetchMyProjects(uid) {
    if (!uid) {
        throw new Error("MISSING_USER_ID");
    }

    const snapshot = await db
        .collection("project-members")
        .where("owners", "array-contains", uid)
        .get();
    const projects = [];
    for (const doc of snapshot.docs) {
        const projectId = doc.id;
        const projectDoc = await db.collection("projects").doc(projectId).get();
        if (projectDoc.exists) {
            projects.push({ id: projectId, ...projectDoc.data() });
        } else {
            projects.push({ id: projectId, ...doc.data() });
        }
    }
    return projects;
}

/**
 * Lógica pura para verificar si un proyecto pertenece a un usuario.
 */
async function verifyProjectOwnership(projectId, uid) {
    if (!projectId) {
        throw new Error("MISSING_PROJECT_ID");
    }
    if (!uid) {
        throw new Error("MISSING_USER_ID");
    }

    const doc = await db.collection("project-members").doc(projectId).get();
    if (!doc.exists) {
        return false;
    }
    const data = doc.data();
    // Comparamos contra uid y ownerId para dar mayor cobertura
    const owned = data.owners?.includes(uid) || false;
    return owned;
}

/**
 * Lógica pura para reclamar/asignar un proyecto a un usuario en Firestore.
 */
async function claimProject(projectId, uid, accessKey) {
    if (!(await validateProjectKey(projectId, accessKey))) {
        throw new Error("UNAUTHORIZED");
    }
    if (!projectId) {
        throw new Error("MISSING_PROJECT_ID");
    }
    if (!uid) {
        throw new Error("MISSING_USER_ID");
    }

    const docRef = db.collection("project-members").doc(projectId);
    const doc = await docRef.get();
    if (!doc.exists) {
        await db.collection("project-members").doc(projectId).set({
            owners: [uid],
        });
        return { success: true };
    }
    const data = doc.data();
    const owners = data.owners || [];
    if (owners.includes(uid)) {
        return { success: false, message: "Project already claimed" };
    }
    owners.push(uid);
    await docRef.update({ owners });
    return { success: true };
}

const getMyProjectsExpress = async (req, res) => {
    if (req.method !== "GET") {
        res.setHeader("Allow", ["GET"]);
        return res.status(405).json({ error: "Método no permitido. Usa GET." });
    }

    const uid = req.query?.uid || req.query?.userId || req.query?.userUid || req.query?.useruid;

    try {
        const projects = await fetchMyProjects(uid);
        return res.status(200).json({ projects });
    } catch (error) {
        if (error.message === "UNAUTHORIZED") {
            return res.status(403).json({ error: "Clave de acceso inválida." });
        }
        if (error.message === "MISSING_USER_ID") {
            return res.status(400).json({ error: "Falta el parámetro 'uid'." });
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

    const { projectId } = req.query;
    const uid = req.query?.uid || req.query?.userId || req.query?.userUid || req.query?.useruid;

    try {
        const result = await verifyProjectOwnership(projectId, uid);
        return res.status(200).json(result);
    } catch (error) {
        if (error.message === "UNAUTHORIZED") {
            return res.status(403).json({ error: "Clave de acceso inválida." });
        }
        if (error.message === "MISSING_PROJECT_ID") {
            return res.status(400).json({ error: "Falta el parámetro 'projectId'." });
        }
        if (error.message === "MISSING_USER_ID") {
            return res.status(400).json({ error: "Falta el parámetro 'uid'." });
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

    const { projectId, accessKey: bodyKey } = req.body;
    const uid = req.body?.uid || req.body?.userId || req.body?.userUid || req.body?.useruid;
    const headerKey = req.headers["authorization"];
    const accessKey = headerKey || bodyKey;

    try {
        const result = await claimProject(projectId, uid, accessKey);
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
            return res.status(400).json({ error: "Falta el parámetro 'uid'." });
        }
        if (error.message === "NOT_FOUND") {
            return res.status(404).json({ error: "Proyecto no encontrado." });
        }
        console.error("Error en claimProjectExpress:", error);
        return res.status(500).json({ error: "Error interno del servidor." });
    }
};

async function unclaimProject(projectId, uid) {
    if (!projectId) {
        throw new Error("MISSING_PROJECT_ID");
    }
    if (!uid) {
        throw new Error("MISSING_USER_ID");
    }

    const docRef = db.collection("project-members").doc(projectId);
    const doc = await docRef.get();
    if (!doc.exists) {
        return { success: false, message: "Project not claimed or not found" };
    }
    
    const data = doc.data();
    const owners = data.owners || [];
    if (!owners.includes(uid)) {
        return { success: false, message: "User is not an owner of this project" };
    }

    const updatedOwners = owners.filter(id => id !== uid);
    if (updatedOwners.length === 0) {
        await docRef.delete();
    } else {
        await docRef.update({ owners: updatedOwners });
    }
    return { success: true };
}

const unclaimProjectExpress = async (req, res) => {
    if (req.method !== "POST" && req.method !== "DELETE") {
        res.setHeader("Allow", ["POST", "DELETE"]);
        return res.status(405).json({ error: "Método no permitido. Usa POST o DELETE." });
    }

    const projectId = req.body?.projectId || req.query?.projectId;
    const uid = req.body?.uid || req.body?.userId || req.body?.userUid || req.body?.useruid || req.query?.uid;

    try {
        const result = await unclaimProject(projectId, uid);
        return res.status(200).json(result);
    } catch (error) {
        if (error.message === "MISSING_PROJECT_ID") {
            return res.status(400).json({ error: "Falta el parámetro 'projectId'." });
        }
        if (error.message === "MISSING_USER_ID") {
            return res.status(400).json({ error: "Falta el parámetro 'uid'." });
        }
        console.error("Error en unclaimProjectExpress:", error);
        return res.status(500).json({ error: "Error interno del servidor." });
    }
};

module.exports = {
    fetchMyProjects,
    verifyProjectOwnership,
    claimProject,
    unclaimProject,
    getMyProjectsExpress,
    verifyProjectOwnershipExpress,
    claimProjectExpress,
    unclaimProjectExpress
};