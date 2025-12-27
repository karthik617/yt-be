import { execFile } from "child_process";

export default function ytdlpInfo(url) {
  return new Promise((resolve, reject) => {
    execFile(
      "yt-dlp",
      [
        "-J", // 🔑 JSON output               
        "--no-playlist",
        "--skip-download",
        "--no-warnings",
        url,
      ],
      { maxBuffer: 10 * 1024 * 1024 }, // avoid buffer overflow
      (err, stdout, stderr) => {
        if (err) {
          return reject(
            new Error(stderr?.toString() || err.message)
          );
        }

        try {
          const info = JSON.parse(stdout);
          resolve(info);
        } catch (e) {
          reject(
            new Error("yt-dlp did not return valid JSON")
          );
        }
      }
    );
  });
}
