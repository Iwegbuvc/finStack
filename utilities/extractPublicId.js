// utils/extractPublicId.js
const extractPublicId = function(url) {
  if (!url) return null;

  const parts = url.split("/");
  const filename = parts[parts.length - 1]; // file.jpg
  const publicId = filename.split(".")[0];  // file

  return publicId;
}

module.exports = extractPublicId