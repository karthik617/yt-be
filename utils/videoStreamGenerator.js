// utils/videoStreamGenerator.js
import { pipeProcess } from "./pipeProcess.js";

export function videoStreamGenerator(req, res, url, quality) {
  let fmt;

  if (quality === "720p") {
    fmt = "bv*[height<=720]+ba/best";
  } else if (quality === "1080p") {
    fmt = "bv*[height<=1080]+ba/best";
  } else {
    fmt = "bv*+ba/best";
  }

  const ytdlpArgs = [
    "--no-playlist",
    "--concurrent-fragments", "1",
    "--throttled-rate", "100K",
    "-f", fmt,
    "-o", "-",
    url,
  ];

  const ffmpegArgs = [
    "-i", "pipe:0",
    "-movflags", "frag_keyframe+empty_moov+faststart",
    "-c", "copy",
    "-f", "mp4",
    "pipe:1",
  ];

  res.setHeader("Content-Type", "video/mp4");
  pipeProcess(ytdlpArgs, ffmpegArgs, res, req);
}
