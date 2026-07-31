/**
 * Fetch photo URLs from a public Google Photos album.
 *
 * Usage:
 *   node scripts/fetch-photos.mjs
 *
 * Outputs a JSON array of image URLs to stdout.
 *
 * The album must be publicly accessible (anyone with the link can view).
 *
 * Google Photos serves images at:
 *   https://lh3.googleusercontent.com/d/{imageId}=w{width}-h{height}
 *
 * We extract image IDs from the album page's HTML/JS data.
 */

const ALBUM_URL =
  "https://photos.google.com/share/AF1QipPwlASeUg3t4y8FiPBOQaJW8IfZnn0OmvvM0ieVaEJeP6BN7JOCiZIFSZM_BoVcJA?key=cXlTRzRPa3FvLTAzZzZaYkdDb0pGM05wZ0dsREVB";

async function fetchAlbumPage() {
  const response = await fetch(ALBUM_URL);
  const html = await response.text();
  return html;
}

/**
 * Extract image IDs from the Google Photos album page.
 * Google Photos embeds image data in the page source as:
 *   "https://lh3.googleusercontent.com/lh/.../s{size}/..."
 * or in JSON config blobs.
 */
function extractImageIds(html) {
  const ids = new Set();

  // Pattern 1: Look for lh3.googleusercontent.com URLs with image IDs
  // Google Photos uses patterns like:
  //   https://lh3.googleusercontent.com/pw/AP1GczP...=w{width}-h{height}-no
  //   https://lh3.googleusercontent.com/d/{imageId}
  const urlRegex =
    /https:\/\/lh3\.googleusercontent\.com\/(pw|d)\/([a-zA-Z0-9_-]+)/g;
  let match;
  while ((match = urlRegex.exec(html)) !== null) {
    ids.add(match[2]);
  }

  // Pattern 2: Look for AF1Qip... style IDs (Google Photos internal IDs)
  const idRegex = /[A-Za-z0-9_-]{30,}/g;
  while ((match = idRegex.exec(html)) !== null) {
    const id = match[0];
    // Filter out obviously non-image IDs (too short or contain patterns)
    if (id.length >= 30 && !id.includes("=") && !id.startsWith("AF1Qip")) {
      // These are potential image IDs
    }
  }

  return [...ids];
}

/**
 * Build direct image URLs from IDs.
 * Google Photos direct URLs format:
 *   https://lh3.googleusercontent.com/d/{imageId}=w{width}-h{height}
 */
function buildImageUrls(ids, width = 800, height = 800) {
  return ids.map(
    (id) =>
      `https://lh3.googleusercontent.com/d/${id}=w${width}-h${height}-no`
  );
}

async function main() {
  try {
    console.log("Fetching album page...");
    const html = await fetchAlbumPage();
    console.log(`Page size: ${(html.length / 1024).toFixed(1)} KB`);

    const ids = extractImageIds(html);
    console.log(`Found ${ids.length} potential image IDs`);

    if (ids.length === 0) {
      console.log("No image IDs found via regex. Trying alternative approach...");

      // Alternative: Look for the photo data in the page's JSON config
      // Google Photos stores photo data in window.WIZ_global_data or similar
      const dataRegex = /"([A-Za-z0-9_-]{40,})"/g;
      let match;
      const longIds = new Set();
      while ((match = dataRegex.exec(html)) !== null) {
        const id = match[1];
        if (id.length >= 40 && !id.includes("=")) {
          longIds.add(id);
        }
      }
      console.log(`Found ${longIds.size} long IDs`);

      // Build URLs using the AF1Qip prefix pattern
      const urls = [...longIds].slice(0, 50).map(
        (id) =>
          `https://lh3.googleusercontent.com/d/${id}=w800-h800-no`
      );

      console.log("\nSample URLs:");
      urls.slice(0, 5).forEach((url) => console.log(`  ${url}`));

      // Save to file
      const fs = await import("fs");
      fs.writeFileSync(
        "media/photos-album.json",
        JSON.stringify(urls, null, 2)
      );
      console.log(`\nSaved ${urls.length} URLs to media/photos-album.json`);
      return;
    }

    const urls = buildImageUrls(ids);
    console.log("\nSample URLs:");
    urls.slice(0, 5).forEach((url) => console.log(`  ${url}`));

    // Save to file
    const fs = await import("fs");
    const outputPath = "media/photos-album.json";
    fs.writeFileSync(outputPath, JSON.stringify(urls, null, 2));
    console.log(`\nSaved ${urls.length} URLs to ${outputPath}`);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main();
