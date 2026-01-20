function getUploadsPath() {
  return "uploads/";
}

function getThumbnailPathX400(id) {
  return `${getUploadsPath()}thumbnails-x400/` + id + ".png";
}

function getThumbnailPathX800(id) {
  return `${getUploadsPath()}thumbnails-x800/` + id + ".png";
}
function isThumbnail(filePath) {
  // Verificamos si la ruta contiene alguna de las subcarpetas de miniaturas
  return (
    filePath.includes("thumbnails-x400/") ||
    filePath.includes("thumbnails-x800/") ||
    filePath.includes("video-images/")
  );
}
function getVideoImagesPath(id) {
  return `${getUploadsPath()}video-images/` + id + ".png";
}

exports.getVideoImagesPath = getVideoImagesPath;
exports.getUploadsPath = getUploadsPath;
exports.isThumbnail = isThumbnail;
exports.getThumbnailPathX400 = getThumbnailPathX400;
exports.getThumbnailPathX800 = getThumbnailPathX800;
