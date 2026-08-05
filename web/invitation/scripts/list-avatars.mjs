// List all assets in the Cloudinary boda/avatars folder.
// Run: cd web/invitation && node scripts/list-avatars.mjs
import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const res = await cloudinary.api.resources({
  type: "upload",
  prefix: "boda/avatars/",
  max_results: 500,
});
console.log(`Found ${res.resources.length} avatars:`);
for (const r of res.resources) {
  console.log(`  ${r.public_id}  (${r.format}, ${r.width}x${r.height}, ${r.bytes} bytes, created ${r.created_at})`);
}
process.exit(0);
