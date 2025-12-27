import fs from "fs";
import os from "os";
import path from "path";
import archiver from "archiver";
import { spawnSync } from "child_process";

export function downloadToTemp(url, audioOnly, title) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "yt-"));
  const ext = audioOnly ? "mp3" : "mp4";
  const output = path.join(tempDir, `${title}.${ext}`);

  const args = [
    "--no-playlist",
    "-o", output,
    "-f", audioOnly ? "bestaudio" : "best",
    url,
  ];

  if (audioOnly) {
    args.push(
      "--extract-audio",
      "--audio-format", "mp3",
      "--audio-quality", "192K"
    );
  }

  spawnSync("yt-dlp", args, { stdio: "inherit" });

  const files = fs.readdirSync(tempDir).map(f => path.join(tempDir, f));
  return { tempDir, files };
}

export function zipStream(res, filePaths) {
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(res);

  for (const file of filePaths) {
    archive.file(file, { name: path.basename(file) });
  }

  archive.finalize();
}
