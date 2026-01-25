class MediaFile {
  constructor(data = {}) {
    this.ext = data.format || data.ext || "";
    this.id = data.id || data.asset_id || "";
    this.source = data.source || data.url || "";
    this.type = data.resourceType || data.type || "application/octet-stream";
    this.size = data.size || data.bytes || 0;
    if (this.type.startsWith("image/") || this.type.startsWith("video/")) {
      this.width = data.width || 0;
      this.height = data.height || 0;
      this.thumb = data.thumb?.url || data.thumb || null;
      this.thumbs400 = data.thumbs400?.url || data.thumbs400 || null;
      this.thumbs800 = data.thumbs800?.url || data.thumbs800 || null;
    }
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
    // Opción 1: Poner un valor nulo si la fecha es inválida
    const validDate =
      this.createdAt instanceof Date && !isNaN(this.createdAt.getTime())
        ? this.createdAt.toISOString()
        : new Date().toISOString();
    const map = {};

    if (this.source) map.source = this.source;
    if (this.type) map.type = this.type;
    if (this.width) map.width = this.width;
    if (this.height) map.height = this.height;
    if (this.size) map.size = this.size;
    if (this.thumb) map.thumb = this.thumb;
    if (this.thumbs400) map.thumbs400 = this.thumbs400;
    if (this.thumbs800) map.thumbs800 = this.thumbs800;
    if (this.ext) map.ext = this.ext;
    if (this.id) map.id = this.id;

    map.createdAt = validDate;

    return map;
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
