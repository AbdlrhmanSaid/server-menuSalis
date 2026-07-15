// config/imagekit.js
import ImageKit from "@imagekit/nodejs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from project root (one level up from config/)
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

console.log("🖼️  ImageKit configured:", {
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY ? "✅ SET" : "❌ MISSING",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY ? "✅ SET" : "❌ MISSING",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "❌ MISSING",
});

export default imagekit;
