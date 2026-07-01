const { db, admin } = require("../config/firebase");

// Utility to parse cookies from Request headers
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    if (parts.length >= 2) {
      list[parts.shift().trim()] = decodeURIComponent(parts.join("="));
    }
  });
  return list;
}

// Utility to serialize a cookie into a Set-Cookie header string
function serializeCookie(name, val, options = {}) {
  let str = `${name}=${encodeURIComponent(val)}`;
  if (options.maxAge !== undefined) {
    str += `; Max-Age=${Math.floor(options.maxAge)}`;
  }
  if (options.expires) {
    str += `; Expires=${options.expires.toUTCString()}`;
  }
  if (options.httpOnly) {
    str += "; HttpOnly";
  }
  if (options.secure) {
    str += "; Secure";
  }
  if (options.sameSite) {
    const sameSite = typeof options.sameSite === "string" ? options.sameSite.toLowerCase() : options.sameSite;
    if (sameSite === "lax") str += "; SameSite=Lax";
    else if (sameSite === "strict") str += "; SameSite=Strict";
    else if (sameSite === "none") str += "; SameSite=None";
  }
  if (options.path) {
    str += `; Path=${options.path}`;
  }
  return str;
}

// Helper to configure CORS dynamically for authenticated requests
function handleCORS(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
}

// POST /api/register
const register = async (req, res) => {
  handleCORS(req, res);
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }

  const { nombre, idToken, telefono, intencion } = req.body || {};
  if (!idToken) {
    return res.status(400).json({ error: "Falta el idToken en el cuerpo de la petición." });
  }

  try {
    // 1. Verify the idToken
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email } = decodedToken;
    const finalNombre = nombre || decodedToken.name || "";

    // 2. Save user profile to Firestore
    await db.collection("users").doc(uid).set({
      nombre: finalNombre,
      email,
      uid,
      telefono: telefono || "",
      intencion: intencion || "",
      postulacionStatus: "",
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 3. Create Session Cookie (24 hours default)
    const expiresIn = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

    // 4. Inject session cookie
    const isDev = req.headers.host && req.headers.host.includes("localhost");
    const cookieOptions = {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: !isDev,
      sameSite: "Lax",
      path: "/"
    };
    
    res.setHeader("Set-Cookie", serializeCookie("session", sessionCookie, cookieOptions));

    // 5. Respond
    return res.status(201).json({
      status: "success",
      user: { uid, email, nombre: finalNombre, telefono: telefono || "", intencion: intencion || "", postulacionStatus: "" }
    });
  } catch (error) {
    console.error("Error en registro de usuario:", error);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(error.code === "auth/argument-error" || error.code === "auth/invalid-id-token" ? 400 : 500).json({
      error: error.message || "Error al procesar el registro."
    });
  }
};

// POST /api/login
const login = async (req, res) => {
  handleCORS(req, res);
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }

  const { idToken, rememberMe } = req.body || {};
  if (!idToken) {
    return res.status(400).json({ error: "Falta el idToken en el cuerpo de la petición." });
  }

  try {
    // 1. Verify the idToken
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email } = decodedToken;

    // 2. Dynamic expiration calculation
    const isRemembered = rememberMe === true || rememberMe === "true";
    const expiresIn = isRemembered
      ? 14 * 24 * 60 * 60 * 1000 // 14 days
      : 24 * 60 * 60 * 1000;      // 24 hours

    // 3. Create session cookie
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

    // 4. Inject session cookie
    const isDev = req.headers.host && req.headers.host.includes("localhost");
    const cookieOptions = {
      httpOnly: true,
      secure: !isDev,
      sameSite: "Lax",
      path: "/"
    };

    if (isRemembered) {
      cookieOptions.maxAge = expiresIn / 1000;
    }

    res.setHeader("Set-Cookie", serializeCookie("session", sessionCookie, cookieOptions));

    // 5. Retrieve name from Firestore
    let finalNombre = decodedToken.name || "";
    let finalTelefono = "";
    let finalIntencion = "";
    let finalPostulacionStatus = "";
    try {
      const userDoc = await db.collection("users").doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        finalNombre = userData.nombre || finalNombre;
        finalTelefono = userData.telefono || "";
        finalIntencion = userData.intencion || "";
        finalPostulacionStatus = userData.postulacionStatus || "";
      }
    } catch (dbErr) {
      console.warn("Error retrieving user from firestore:", dbErr.message);
    }

    // 6. Respond
    return res.status(200).json({
      status: "success",
      user: { uid, email, nombre: finalNombre, telefono: finalTelefono, intencion: finalIntencion, postulacionStatus: finalPostulacionStatus }
    });
  } catch (error) {
    console.error("Error en inicio de sesión:", error);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(error.code === "auth/argument-error" || error.code === "auth/invalid-id-token" ? 400 : 500).json({
      error: error.message || "Error al procesar el inicio de sesión."
    });
  }
};

// POST /api/logout
const logout = async (req, res) => {
  handleCORS(req, res);
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }

  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionCookie = cookies.session;

    if (sessionCookie) {
      try {
        const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie);
        const uid = decodedClaims.sub;
        await admin.auth().revokeRefreshTokens(uid);
      } catch (verifyErr) {
        console.warn("Token de sesión expirado o inválido durante logout:", verifyErr.message);
      }
    }

    // Clear session cookie in the browser
    const isDev = req.headers.host && req.headers.host.includes("localhost");
    const clearCookieOptions = {
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      secure: !isDev,
      sameSite: "Lax",
      path: "/"
    };

    res.setHeader("Set-Cookie", serializeCookie("session", "", clearCookieOptions));

    return res.status(200).json({
      status: "success",
      message: "Sesión cerrada correctamente"
    });
  } catch (error) {
    console.error("Error en logout:", error);
    return res.status(500).json({ error: "Error al cerrar la sesión." });
  }
};

// checkAuth Middleware (works for Vercel functions and Express middlewares)
const checkAuth = async (req, res, next) => {
  handleCORS(req, res);
  const cookies = parseCookies(req.headers.cookie);
  const sessionCookie = cookies.session;

  if (!sessionCookie) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(401).json({ error: "No autorizado. Sesión no encontrada." });
  }

  try {
    // True specifies that we should check if the session cookie was revoked
    const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
    req.user = decodedClaims;

    if (typeof next === "function") {
      return next();
    }
    return decodedClaims;
  } catch (error) {
    console.error("Error verificando cookie de sesión en middleware:", error.message);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(401).json({ error: "No autorizado. Sesión inválida o expirada." });
  }
};

module.exports = {
  register,
  login,
  logout,
  checkAuth,
  parseCookies,
  serializeCookie
};
