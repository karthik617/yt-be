import express from "express";
import { spawn } from "child_process";
import { pipeline } from "stream";
import ytdlpInfo from "../utils/yt.js";
import { downloadToTemp, zipStream } from "../utils/playlistStreamGenerator.js";
import { audioStreamGenerator } from "../utils/audioStreamGenerator.js";
import { videoStreamGenerator } from "../utils/videoStreamGenerator.js";
const router = express.Router();

/* -------------------------------- AUDIO DOWNLOAD -------------------------------- */
router.get("/download/audio", async (req, res) => {
  try {
    const { url, format = "mp3" } = req.query;
    if (!url) return res.status(400).json({ error: "Missing url" });

    const info = await ytdlpInfo(url);
    const safeTitle = info.title.replace(/[^\w\s-_]/g, "");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeTitle}.${format}"`
    );
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    audioStreamGenerator(req, res, url, format);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Failed to process request",
    });
  }
});

/* -------------------------------- VIDEO DOWNLOAD -------------------------------- */
router.get("/download/video", async (req, res) => {
  try {
    const { url, quality = "auto" } = req.query;
    if (!url) return res.status(400).json({ error: "Missing url" });

    const info = await ytdlpInfo(url);
    const safeTitle = info.title.replace(/[^\w\s-_]/g, "");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeTitle}.mp4"`
    );
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    videoStreamGenerator(req, res, url, quality);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Failed to process request",
    });
  }
});

/* -------------------------------- VIDEO STREAM -------------------------------- */
router.get("/stream/video", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing url" });

  const info = await ytdlpInfo(url);
  const safeTitle = info.title.replace(/[^\w\s-_]/g, "");

  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Content-Disposition", `inline; filename="${safeTitle}.mp4"`);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

  const ytdlp = spawn("yt-dlp", [
    "--no-playlist",
    "-f",
    "bestvideo[height<=720]+bestaudio/best",
    "-o",
    "-",
    url,
  ],{ stdio: ["pipe", "pipe", "pipe"] });

  const ffmpeg = spawn("ffmpeg", [
    "-i",
    "pipe:0",
    "-movflags",
    "frag_keyframe+empty_moov+faststart",
    "-c",
    "copy",
    "-f",
    "mp4",
    "pipe:1",
  ],{ stdio: ["pipe", "pipe", "pipe"] });



  // ❗ Handle client disconnect
  const cleanup = () => {
    if (!ytdlp.killed) ytdlp.kill("SIGKILL");
    if (!ffmpeg.killed) ffmpeg.kill("SIGKILL");
  };

  req.on("close", cleanup);
  res.on("close", cleanup);

  // 🔑 THIS IS THE KEY FIX
  res.socket?.on("error", err => {
    if (err.code !== "EPIPE") console.error(err);
    cleanup();
  });

  // Safe pipeline (prevents EPIPE crash)
  pipeline(
    ytdlp.stdout,
    ffmpeg.stdin,
    err => err && cleanup()
  );

  pipeline(
    ffmpeg.stdout,
    res,
    err => err && cleanup()
  );

  // Optional logging
  ytdlp.stderr.on("data", d => console.log("[yt-dlp]", d.toString()));
  ffmpeg.stderr.on("data", d => console.log("[ffmpeg]", d.toString()));
});

/* -------------------------------- AUDIO STREAM -------------------------------- */
router.get("/stream/audio", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing url" });

  const info = await ytdlpInfo(url);
  const safeTitle = info.title.replace(/[^\w\s-_]/g, "");

  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Disposition", `inline; filename="${safeTitle}.mp3"`);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

  const ytdlp = spawn("yt-dlp", [
    "--no-playlist",
    "-f",
    "bestaudio",
    "-o",
    "-",
    url,
  ],{ stdio: ["pipe", "pipe", "pipe"] });

  const ffmpeg = spawn("ffmpeg", [
    "-i",
    "pipe:0",
    "-vn",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "192k",
    "-f",
    "mp3",
    "pipe:1",
  ],{ stdio: ["pipe", "pipe", "pipe"] });


  // ❗ Handle client disconnect
  const cleanup = () => {
    if (!ytdlp.killed) ytdlp.kill("SIGKILL");
    if (!ffmpeg.killed) ffmpeg.kill("SIGKILL");
  };

  // 🔑 THIS IS THE KEY FIX
  res.socket?.on("error", err => {
    if (err.code !== "EPIPE") console.error(err);
    cleanup();
  });

  req.on("close", cleanup);
  res.on("close", cleanup);

  // Safe pipeline (prevents EPIPE crash)
  pipeline(
    ytdlp.stdout,
    ffmpeg.stdin,
    err => err && cleanup()
  );

  pipeline(
    ffmpeg.stdout,
    res,
    err => err && cleanup()
  );

  // Optional logging
  ytdlp.stderr.on("data", d => console.log("[yt-dlp]", d.toString()));
  ffmpeg.stderr.on("data", d => console.log("[ffmpeg]", d.toString()));
});

/* -------------------------------- PLAYLIST -------------------------------- */
router.get("/download/playlist", async (req, res) => {
  try {
    const { url, audio_only = "true" } = req.query;
    if (!url) return res.status(400).json({ error: "Missing url" });

    const details = await ytdlpInfo(url);
    const safeTitle = details.title.replace(/[^\w\s-_]/g, "");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeTitle}.${format}"`
    );
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    // Fetch entries via yt-dlp JSON
    const meta = spawnSync("yt-dlp", ["--flat-playlist", "-J", url]);
    const info = JSON.parse(meta.stdout.toString());

    const allFiles = [];
    const tempDirs = [];

    for (const entry of info.entries.slice(0, 10)) {
      const videoUrl = `https://youtube.com/watch?v=${entry.id}`;
      const { tempDir, files } = downloadToTemp(
        videoUrl,
        audio_only === "true",
        entry.title || entry.id
      );
      tempDirs.push(tempDir);
      allFiles.push(...files);
    }

    zipStream(res, allFiles);

    res.on("close", () => {
      tempDirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true }));
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Failed to process request",
    });
  }
});

export default router;
