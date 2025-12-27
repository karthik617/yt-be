import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

import yt from "./routes/yt-route.js";

const app = express();

/* -------------------- CORS -------------------- */
app.use(
  cors({
    origin: [
      "http://localhost:5175",
      "https://ytdownloader-frontend.onrender.com",
    ],
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  })
);

/* -------------------- RATE LIMIT -------------------- */
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
});
app.use(limiter);


/* -------------------- ROUTES -------------------- */
app.use("/", yt);

/* -------------------- HEALTH -------------------- */
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.get("/", (_, res) => {
  res.json({
    status: "ok",
    message: "YouTube Media Downloader API",
  });
});

export default app;
