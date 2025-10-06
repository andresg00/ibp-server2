const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const { PassThrough } = require("stream");
class MediaFile {
  constructor(data = {}) {
    this.format = data.format || "";
    this.id = data.id || data.asset_id || "";
    this.source = data.source || data.url || "";
    this.resourceType = data.resourceType || "image";
    this.width = data.width || 0;
    this.height = data.height || 0;
    this.size = data.size || data.bytes || 0;
    this.thumb = data.thumb?.url || data.thumb || null;
    this.medium = data.medium?.url || data.medium || null;
    this.createdAt = data.time
      ? new Date(data.time)
      : data.createdAt
      ? new Date(data.createdAt)
      : new Date(0);

    // Guardar cualquier dato extra dinámicamente
    // this.extra = {};
    // for (const key in data) {
    //   if (!(key in this)) this.extra[key] = data[key];
    // }
  }

  // Convertir a objeto plano
  toMap() {
    return {
      id: this.id,
      source: this.source,
      resourceType: this.resourceType,
      width: this.width,
      height: this.height,
      size: this.size,
      thumb: this.thumb,
      medium: this.medium,
      createdAt: this.createdAt.toISOString(),
      format: this.format,
      // ...this.extra, // todos los campos extras
    };
  }

  // Crear instancia desde un mapa/JSON
  static fromMap(map) {
    return new MediaFile(map);
  }

  copyWith(updates = {}) {
    return new MediaFile({ ...this.toMap(), ...updates });
  }
}

async function getVideoThumbnailBuffer(file) {
  return new Promise((resolve, reject) => {
    const tempPath = path.join(
      process.cwd(),
      "temp_video_" + Date.now() + ".mp4"
    );
    const bufferChunks = [];
    const stream = new PassThrough();

    if (file.buffer) fs.writeFileSync(tempPath, file.buffer);
    const input = file.path || tempPath;
    const name =
      (file.originalname?.replace(/\.[^/.]+$/, "") || "video") +
      "_thumbnail.png";

    ffmpeg(input)
      .frames(1)
      .format("image2pipe")
      .outputOptions("-vcodec", "png")
      .on("end", () => {
        const buffer = Buffer.concat(bufferChunks);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        resolve({
          buffer,
          originalname: name,
          mimetype: "image/png",
          size: buffer.length,
        });
      })
      .on("error", (err) => {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        reject(err);
      })
      .pipe(stream, { end: true });

    stream.on("data", (chunk) => bufferChunks.push(chunk));
    stream.on("error", reject);
  });
}

module.exports = { MediaFile, getVideoThumbnailBuffer };
