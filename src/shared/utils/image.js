/**
 * Builds a data URL from an image buffer and mime type
 * @param {Object} options Options
 * @param {Buffer} options.buffer Image buffer
 * @param {string} options.mimeType Image mime type
 * @returns {string} Data URL
 */
function buildDataUrl({ buffer, mimeType }) {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

module.exports = { buildDataUrl };