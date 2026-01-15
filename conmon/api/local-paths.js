function getUploadsPath() {
  return "uploads/";
}
function getThumbnailPath() {
  return `${getUploadsPath()}video-thumbnails/`;
}
function getVideoThumbnailRoute(hash, ext) {
  //delete video thumbnail
  const thumbnailFileName = `${hash}${ext}`;
  const thumbnailPathInStorage = `${getThumbnailPath()}${thumbnailFileName}`;
  return thumbnailPathInStorage;
}
exports.getThumbnailPath = getThumbnailPath;
exports.getUploadsPath = getUploadsPath;
exports.getVideoThumbnailRoute = getVideoThumbnailRoute;
