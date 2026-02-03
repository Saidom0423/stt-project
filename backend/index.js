import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import fetch from "node-fetch";
import mongoose from "mongoose";
import Transcription from "./models/Transcription.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ---------------- CORS (FIXED) ----------------
import cors from "cors";

/**
 * CORS must be FIRST middleware
 */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://stt-project.vercel.app",
    ],
    credentials: false,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-user-id"],
  })
);

/**
 * Handle preflight requests explicitly
 */
app.options("*", cors());

// ---------------- MIDDLEWARE ----------------
app.use(express.json());

// ---------------- DB ----------------
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// ---------------- MULTER ----------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// ---------------- ROUTES ----------------

// Health check
app.get("/", (req, res) => {
  res.json({ status: "Backend OK" });
});

// 🎙️ TRANSCRIBE
app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (!req.file)
      return res.status(400).json({ error: "No audio file provided" });

    const audioBuffer = fs.readFileSync(req.file.path);

    const response = await fetch(
      "https://api.deepgram.com/v1/listen?punctuate=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          "Content-Type": req.file.mimetype,
        },
        body: audioBuffer,
      }
    );

    if (!response.ok) {
      return res.status(502).json({ error: "STT service failed" });
    }

    const data = await response.json();
    const transcript =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript;

    if (!transcript)
      return res.status(400).json({ error: "No speech detected" });

    const saved = await Transcription.create({
      text: transcript,
      userId,
      mimetype: req.file.mimetype,
    });

    res.json({ transcript: saved.text, id: saved._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 📜 HISTORY
app.get("/history", async (req, res) => {
  const userId = req.headers["x-user-id"];
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const history = await Transcription.find({ userId }).sort({
    createdAt: -1,
  });

  res.json(history);
});

// 🗑️ DELETE HISTORY
app.delete("/history/:id", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const deleted = await Transcription.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!deleted) {
      return res.status(404).json({ error: "Transcription not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// ❌ 404
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ---------------- START ----------------
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
