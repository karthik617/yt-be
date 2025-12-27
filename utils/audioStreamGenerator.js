// utils/audioStreamGenerator.js
import { pipeProcess } from "./pipeProcess.js";

export function audioStreamGenerator(req, res, url, format) {
  let mime, ext, ffmpegArgs;

  if (format === "mp3") {
    mime = "audio/mpeg";
    ext = "mp3";
    ffmpegArgs = [
      "-loglevel", "error",
      "-i", "pipe:0",
      "-vn",
      "-c:a", "libmp3lame",
      "-b:a", "192k",
      "-f", "mp3",
      "pipe:1",
    ];
  } else {
    mime = "audio/mp4";
    ext = "mp4";
    ffmpegArgs = [
      "-loglevel", "error",
      "-i", "pipe:0",
      "-vn",
      "-c:a", "copy",
      "-movflags", "frag_keyframe+empty_moov+faststart",
      "-f", "mp4",
      "pipe:1",
    ];
  }

  const ytdlpArgs = [
    "--no-playlist",
    "--no-progress",
    "--concurrent-fragments", "1",
    "--throttled-rate", "100K",
    "-f", "bestaudio",
    "-o", "-",
    url,
  ];

  res.setHeader("Content-Type", mime);
  pipeProcess(ytdlpArgs, ffmpegArgs, res, req);
}
