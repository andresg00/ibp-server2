class MediaFile {
  constructor(data = {}) {
    this.ext = data.format || data.ext || "";
    this.id = data.id || data.asset_id || "";
    this.source = data.source || data.url || "";
    this.type = data.resourceType || data.type || "image";
    this.width = data.width || 0;
    this.height = data.height || 0;
    this.size = data.size || data.bytes || 0;
    this.thumb = data.thumb?.url || data.thumb || null;
    this.medium = data.medium?.url || data.medium || null;
    this.delete_url = data.delete_url || null;
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
      type: this.resourceType,
      width: this.width,
      height: this.height,
      size: this.size,
      thumb: this.thumb,
      medium: this.medium,
      createdAt: this.createdAt.toISOString(),
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
