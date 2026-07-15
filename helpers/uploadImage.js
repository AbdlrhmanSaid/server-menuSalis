// helpers/uploadImage.js
import imagekit from "../config/imagekit.js";
import { toFile } from "@imagekit/nodejs";

/**
 * Upload a buffer to ImageKit
 * @param {Buffer} fileBuffer - The file buffer from multer
 * @param {string} folder - The folder to upload to (e.g. "companies", "products")
 * @param {string} [fileName] - Optional custom filename
 * @returns {Promise<{fileId: string, url: string}>} - The uploaded file info
 */
export async function uploadImage(fileBuffer, folder, fileName) {
  const result = await imagekit.files.upload({
    file: await toFile(fileBuffer, fileName || `${folder}_${Date.now()}`),
    fileName: fileName || `${folder}_${Date.now()}`,
    folder: `/${folder}`,
  });

  return {
    fileId: result.fileId,
    url: result.url,
  };
}

/**
 * Delete a file from ImageKit by fileId
 * @param {string} fileId - The ImageKit fileId
 */
export async function deleteImage(fileId) {
  if (!fileId) return;
  try {
    await imagekit.files.delete(fileId);
  } catch (error) {
    console.error("❌ Failed to delete image from ImageKit:", error.message);
  }
}
