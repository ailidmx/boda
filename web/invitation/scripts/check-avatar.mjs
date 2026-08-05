// Check if a Cloudinary public id exists.
// Run: cd web/invitation && node scripts/check-avatar.mjs <public_id>
import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const publicId = process.argv[2] || "20260726_120055_wxzxpv";
try {
  const res = await cloudinary.api.resource(publicId);
  console.log(`FOUND: ${res.public_id} (${res.format}, ${res.width}x${res.height}, created ${res.created_at})`);
} catch (e) {
  console.log(`NOT FOUND: ${publicId} — ${e.error?.message || e.message}`);
}
process.exit(0);
