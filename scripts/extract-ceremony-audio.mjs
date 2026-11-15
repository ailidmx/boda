#!/usr/bin/env node
/**
 * Extract the ceremony track's audio from a LOCAL file you already own.
 *
 * Why this exists: the Ceremonia Player needs an audio clock, but the track is
 * copyrighted. Nothing here downloads from Spotify/YouTube and nothing is
 * committed or hosted — you point this script at a file on your machine (for
 * example a video you recorded) and it writes an MP3 into `tmp/`, which is
 * ignored by git.
 *
 * Usage (dry run by default, prints the ffmpeg command):
 *   npm run audio:extract -- --input ~/Movies/ceremonia.mov --start 0 --duration 630
 *   npm run audio:extract -- --input ~/Movies/ceremonia.mov --execute
 *
 * Options:
 *   --input <path>     Required. Local audio/video file.
 *   --start <seconds>  Optional seek (default 0).
 *   --duration <secs>  Optional length to keep (default: to the end).
 *   --bitrate <kbps>   MP3 bitrate (default 192).
 *   --name <basename>  Output file name without extension (default: ceremonia-audio).
 *   --out <path>       Output folder (default tmp/ceremony-audio).
 *   --execute          Actually run ffmpeg.
 *
 * Guard rails: the output folder must NOT be inside `web/` (that is what gets
 * published to Firebase Hosting), so a copyrighted track cannot accidentally
 * ship with the invitation. URLs are refused outright: this is not a
 * YouTube/Spotify downloader.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

function parseArgs(argv) {
  const args = { execute: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    if (key === "execute") {
      args.execute = true;
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Falta el valor de --${key}`);
    }
    args[key] = value;
    i += 1;
  }
  return args;
}

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

/**
 * The tool works on local files only. Refuse URLs so nobody mistakes it for a
 * YouTube/Spotify downloader: YouTube's terms forbid downloading, and the
 * ceremony track is a copyrighted commercial recording.
 */
function assertLocalInput(value) {
  const remote = /^(https?|ftp):\/\//iu.test(value);
  const knownHost = /^(www\.)?(youtube\.com|youtu\.be|music\.youtube\.com|spotify\.com|open\.spotify\.com)\//iu.test(
    value,
  );
  if (remote || knownHost) {
    fail(
      "Esto NO descarga audio de internet (YouTube, Spotify, etc.).\n" +
        "YouTube prohíbe la descarga en sus términos y este track es una grabación con derechos.\n" +
        "Consigue el archivo por una vía legal (compra, copia del CD o grabación propia)\n" +
        "y pásalo como ruta local: --input /ruta/a/tu/archivo.mp3",
    );
  }
}


function toNumber(value, fallback, label) {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) fail(`--${label} debe ser un número ≥ 0`);
  return n;
}

function assertSafeOutput(outDir) {
  const resolved = resolve(outDir);
  const insideWeb = relative(join(repoRoot, "web"), resolved);
  if (!insideWeb.startsWith("..") && !isAbsolute(insideWeb)) {
    fail(
      `La salida no puede estar dentro de web/ (se publica en Firebase Hosting): ${resolved}\n` +
        "Usa la carpeta por defecto (tmp/ceremony-audio) o una ruta fuera del repo.",
    );
  }
  return resolved;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) fail("Falta --input <archivo local>. Este script no descarga audio.");

  assertLocalInput(args.input);

  const input = resolve(args.input.replace(/^~(?=\/)/u, process.env.HOME ?? "~"));
  if (!existsSync(input)) fail(`No existe el archivo de entrada: ${input}`);
  const stats = statSync(input);
  if (!stats.isFile()) fail(`La entrada no es un archivo: ${input}`);

  const start = toNumber(args.start, 0, "start");
  const duration = toNumber(args.duration, 0, "duration");
  const bitrate = Math.min(320, Math.max(64, toNumber(args.bitrate, 192, "bitrate")));
  const name = (args.name || "ceremonia-audio").replace(/[^\w.-]+/gu, "-");
  const outDir = assertSafeOutput(args.out || join(repoRoot, "tmp", "ceremony-audio"));
  const outFile = join(outDir, `${name}.mp3`);

  const ffmpegArgs = ["-y"];
  if (start > 0) ffmpegArgs.push("-ss", String(start));
  ffmpegArgs.push("-i", input);
  if (duration > 0) ffmpegArgs.push("-t", String(duration));
  ffmpegArgs.push("-vn", "-acodec", "libmp3lame", "-b:a", `${bitrate}k`, outFile);

  console.log("\n🐚 Ceremonia · extracción de audio local");
  console.log(`   entrada   ${input} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`   salida    ${outFile}`);
  if (start) console.log(`   inicio    ${start}s`);
  if (duration) console.log(`   duración  ${duration}s`);
  console.log(`   comando   ffmpeg ${ffmpegArgs.join(" ")}\n`);

  const probe = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  if (probe.error) {
    const message =
      "ffmpeg no está instalado. Instálalo con `brew install ffmpeg` y vuelve a intentarlo.\n" +
      "Este script no descarga audio: solo convierte un archivo que ya tienes.";
    if (args.execute) fail(message);
    console.warn(`\n⚠ ${message}\n`);
  }

  if (!args.execute) {
    console.log("Modo simulación. Añade --execute para generar el MP3.\n");
    return;
  }

  mkdirSync(outDir, { recursive: true });
  const run = spawnSync("ffmpeg", ffmpegArgs, { stdio: "inherit" });
  if (run.status !== 0) fail(`ffmpeg terminó con código ${run.status}.`);

  const size = statSync(outFile).size;
  console.log(`\n✅ Listo: ${outFile} (${(size / 1024 / 1024).toFixed(1)} MB)`);
  console.log("   Importa ese archivo desde /dashboard/ceremonia → “Importar audio local”.");
  console.log("   Queda solo en tu navegador (IndexedDB); no se sube ni se commitea.\n");
}

main();
