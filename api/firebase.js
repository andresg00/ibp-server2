const {
  fetchDocument,
  fetchCollection,
  fetchFirstDocument,
  fetchLastDocument,

  setDocument,
  setList,
} = require("../conmon/api/firebase-firestore");
const { fetchMyProjects,
  verifyProjectOwnership,
  claimProject,
  unclaimProject, } = require("../conmon/api/project-members");
module.exports = async function handler(req, res) {
  // Manejo inmediato del preflight CORS (peticiones OPTIONS)
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", ["GET", "POST", "OPTIONS"]);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).end();
  }

  const route = req.query.route;

  try {
    switch (route) {
      case "get-document": {
        if (req.method !== "GET") {
          res.setHeader("Allow", ["GET"]);
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          return res
            .status(405)
            .json({ error: "Método no permitido. Usa GET para get-document." });
        }
        const { path } = req.query;
        const finalKey = req.headers["authorization"];
        const normalizedKey =
          finalKey === "undefined" || finalKey === "" ? undefined : finalKey;

        const document = await fetchDocument(path, normalizedKey);
        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate",
        );
        return res.status(200).json({ document });
      }

      case "get-list": {
        if (req.method !== "GET") {
          res.setHeader("Allow", ["GET"]);
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          return res
            .status(405)
            .json({ error: "Método no permitido. Usa GET para get-list." });
        }
        const { path, filter, order } = req.query;
        const finalKey = req.headers["authorization"];
        const normalizedKey =
          finalKey === "undefined" || finalKey === "" ? undefined : finalKey;

        const documents = await fetchCollection(
          path,
          normalizedKey,
          filter,
          order,
        );
        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate",
        );
        return res.status(200).json({ documents });
      }

      case "get-first-document": {
        if (req.method !== "GET") {
          res.setHeader("Allow", ["GET"]);
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          return res
            .status(405)
            .json({ error: "Método no permitido. Usa GET para get-first-document." });
        }
        const { path, filter, order } = req.query;
        const finalKey = req.headers["authorization"];
        const normalizedKey =
          finalKey === "undefined" || finalKey === "" ? undefined : finalKey;

        const document = await fetchFirstDocument(
          path,
          normalizedKey,
          filter,
          order,
        );
        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate",
        );
        return res.status(200).json({ document });
      }

      case "get-last-document": {
        if (req.method !== "GET") {
          res.setHeader("Allow", ["GET"]);
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          return res
            .status(405)
            .json({ error: "Método no permitido. Usa GET para get-last-document." });
        }
        const { path, filter, order } = req.query;
        const finalKey = req.headers["authorization"];
        const normalizedKey =
          finalKey === "undefined" || finalKey === "" ? undefined : finalKey;

        const document = await fetchLastDocument(
          path,
          normalizedKey,
          filter,
          order,
        );
        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate",
        );
        return res.status(200).json({ document });
      }

      case "get-my-projects": {
        if (req.method !== "GET") {
          res.setHeader("Allow", ["GET"]);
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          return res.status(405).json({
            error: "Método no permitido. Usa GET para get-my-projects.",
          });
        }
        const uid = req.query.uid || req.query.userId || req.query.userUid || req.query.useruid;

        const projects = await fetchMyProjects(uid);
        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate",
        );
        return res.status(200).json({ projects });
      }

      case "verify-project-ownership": {
        if (req.method !== "GET") {
          res.setHeader("Allow", ["GET"]);
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          return res.status(405).json({
            error:
              "Método no permitido. Usa GET para verify-project-ownership.",
          });
        }
        const { projectId } = req.query;
        const uid = req.query.uid || req.query.userId || req.query.userUid || req.query.useruid;

        const result = await verifyProjectOwnership(projectId, uid);
        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate",
        );
        return res.status(200).json(result);
      }

      case "claim-project": {
        if (req.method !== "POST") {
          res.setHeader("Allow", ["POST"]);
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          return res.status(405).json({
            error: "Método no permitido. Usa POST para claim-project.",
          });
        }
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        const { projectId, accessKey: bodyKey } = req.body;
        const uid = req.body.uid || req.body.userId || req.body.userUid || req.body.useruid;
        const headerKey = req.headers["authorization"];
        const accessKey = headerKey || bodyKey;

        const result = await claimProject(projectId, uid, accessKey);
        return res.status(200).json(result);
      }

      case "unclaim-project": {
        if (req.method !== "POST") {
          res.setHeader("Allow", ["POST"]);
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          return res.status(405).json({
            error: "Método no permitido. Usa POST para unclaim-project.",
          });
        }
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        const projectId = req.body?.projectId;
        const uid = req.body?.uid || req.body?.userId || req.body?.userUid || req.body?.useruid;

        const result = await unclaimProject(projectId, uid);
        return res.status(200).json(result);
      }

      case "set-document": {
        if (req.method !== "POST") {
          res.setHeader("Allow", ["POST"]);
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          return res.status(405).json({
            error: "Método no permitido. Usa POST para set-document.",
          });
        }
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        const { path, data } = req.body;
        const accessKey = req.headers["authorization"];
        const result = await setDocument(path, data, accessKey);
        return res.status(200).json(result);
      }

      case "set-list": {
        if (req.method !== "POST") {
          res.setHeader("Allow", ["POST"]);
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          return res
            .status(405)
            .json({ error: "Método no permitido. Usa POST para set-list." });
        }
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        const { path, list } = req.body;
        const accessKey = req.headers["authorization"];
        const result = await setList(path, list, accessKey);
        return res.status(200).json(result);
      }

      default:
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        return res
          .status(400)
          .json({ error: "Acción de Firebase no válida o no especificada." });
    }
  } catch (error) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    if (error.message === "UNAUTHORIZED") {
      return res.status(403).json({ error: "Clave de acceso inválida." });
    }
    if (error.message === "MISSING_PATH") {
      return res.status(400).json({ error: "Falta el parámetro 'path'." });
    }
    if (error.message === "MISSING_PROJECT_ID") {
      return res.status(400).json({ error: "Falta el parámetro 'projectId'." });
    }
    if (error.message === "MISSING_USER_ID") {
      return res.status(400).json({ error: "Falta el parámetro 'uid'." });
    }
    if (error.message === "MISSING_DATA") {
      return res
        .status(400)
        .json({ error: "Faltan los datos del documento ('data')." });
    }
    if (error.message === "MISSING_LIST") {
      return res
        .status(400)
        .json({ error: "Falta la lista de documentos ('list')." });
    }
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ error: "Proyecto no encontrado." });
    }
    console.error(`Error en api/firebase (${route}):`, error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};
