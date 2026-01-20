class MediaFile {
  constructor(data = {}) {
    this.ext = data.format || data.ext || "";
    this.id = data.id || data.asset_id || "";
    this.source = data.source || data.url || "";
    this.type = data.resourceType || data.type || "application/octet-stream";
    this.width = data.width || 0;
    this.height = data.height || 0;
    this.size = data.size || data.bytes || 0;
    this.thumb = data.thumb?.url || data.thumb || null;
    this.thumbs400 = data.thumbs400?.url || data.thumbs400 || null;
    this.thumbs800 = data.thumbs800?.url || data.thumbs800 || null;
    // this.medium = data.medium?.url || data.medium || null;
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
    const validDate =
      this.createdAt instanceof Date && !isNaN(this.createdAt)
        ? this.createdAt.toISOString()
        : new Date().toISOString();
    return {
      id: this.id,
      source: this.source,
      type: this.type,
      width: this.width,
      height: this.height,
      size: this.size,
      thumb: this.thumb,
      thumbs400: this.thumbs400,
      thumbs800: this.thumbs800,
      // medium: this.medium,
      createdAt: validDate,
      ext: this.ext,
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
module.exports = { MediaFile };
