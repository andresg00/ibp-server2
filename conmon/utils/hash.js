const crypto = require("crypto");

/**
 * Recibe un buffer y devuelve el hash SHA256
 * @param {Buffer} buffer
 * @returns {string} hash
 */
exports.getBufferHash = (buffer) => {
  return crypto.createHash("sha256").update(buffer).digest("hex");
};
