import { spawn } from "child_process";

export function pipeProcess(ytdlpArgs, ffmpegArgs, res, req) {
  const ytdlp = spawn("yt-dlp", ytdlpArgs, {
    stdio: ["ignore", "pipe", "pipe"],
  });

  const ffmpeg = spawn("ffmpeg", ffmpegArgs, {
    stdio: ["pipe", "pipe", "pipe"],
  });

  ytdlp.stdout.pipe(ffmpeg.stdin);
  ffmpeg.stdout.pipe(res);

  // Debug logs (optional)
  ytdlp.stderr.on("data", d =>
    console.error("[yt-dlp]", d.toString())
  );
  ffmpeg.stderr.on("data", d =>
    console.error("[ffmpeg]", d.toString())
  );

  // ❗ Handle client disconnect
  const cleanup = () => {
    if (!ytdlp.killed) ytdlp.kill("SIGKILL");
    if (!ffmpeg.killed) ffmpeg.kill("SIGKILL");
  };

  req.on("close", cleanup);
  res.on("close", cleanup);

  // ❗ Prevent EPIPE crash
  res.on("error", err => {
    if (err.code !== "EPIPE") console.error(err);
    cleanup();
  });

  // 🔑 THIS IS THE KEY FIX
  res.socket?.on("error", err => {
    if (err.code !== "EPIPE") console.error(err);
    cleanup();
  });

  ffmpeg.stdout.on("error", () => cleanup());
  ytdlp.stdout.on("error", () => cleanup());

  // Optional logging
  ytdlp.stderr.on("data", d => console.log("[yt-dlp]", d.toString()));
  ffmpeg.stderr.on("data", d => console.log("[ffmpeg]", d.toString()));
}
