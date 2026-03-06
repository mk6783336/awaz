import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import Groq from "groq-sdk";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
// edge-tts-node removed — using Google Gemini TTS instead

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || "3000", 10);
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_change_me";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

const DAILY_TTS_LIMIT = 10; // Free limit per user per day

// ─── Database ────────────────────────────────────────────
const db = new Database(path.join(process.cwd(), "awaz.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    plan TEXT DEFAULT 'free',
    credits INTEGER DEFAULT 10000,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audio_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    text TEXT NOT NULL,
    voice TEXT NOT NULL,
    duration REAL DEFAULT 0,
    audio_data BLOB,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS daily_usage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    usage_date TEXT NOT NULL,
    tts_count INTEGER DEFAULT 0,
    UNIQUE(user_id, usage_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// ─── Types ───────────────────────────────────────────────
interface AuthUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  credits: number;
  created_at: string;
}
interface AuthRequest extends Request {
  user?: AuthUser;
}

// ─── Auth Middleware ──────────────────────────────────────
function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = db
      .prepare(
        "SELECT id,name,email,plan,credits,created_at FROM users WHERE id=?"
      )
      .get(decoded.userId) as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ─── Daily Limit Helpers ──────────────────────────────────
function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]; // "2026-03-06"
}

function getDailyUsage(userId: string): number {
  const today = getTodayDate();
  const row = db
    .prepare(
      "SELECT tts_count FROM daily_usage WHERE user_id=? AND usage_date=?"
    )
    .get(userId, today) as { tts_count: number } | undefined;
  return row?.tts_count ?? 0;
}

function incrementDailyUsage(userId: string): void {
  const today = getTodayDate();
  db.prepare(`
    INSERT INTO daily_usage (id, user_id, usage_date, tts_count)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(user_id, usage_date)
    DO UPDATE SET tts_count = tts_count + 1
  `).run(uuidv4(), userId, today);
}

function getRemainingToday(userId: string): number {
  return Math.max(0, DAILY_TTS_LIMIT - getDailyUsage(userId));
}

// ─── Voice Map (Google Gemini prebuilt voices) ────────────
const VOICE_MAP: Record<string, string> = {
  ayesha: "Aoede",   // Female
  bilal: "Charon",   // Male
  tariq: "Fenrir",   // Male
  zain: "Orus",      // Male
  fatima: "Kore",    // Female
};

// ─── WAV Header Helper ────────────────────────────────────
function createWavHeader(dataSize: number, sampleRate: number, channels: number, bitsPerSample: number): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);

  header.write("RIFF", 0);                          // ChunkID
  header.writeUInt32LE(36 + dataSize, 4);           // ChunkSize
  header.write("WAVE", 8);                           // Format
  header.write("fmt ", 12);                          // Subchunk1ID
  header.writeUInt32LE(16, 16);                     // Subchunk1Size (PCM)
  header.writeUInt16LE(1, 20);                      // AudioFormat (PCM)
  header.writeUInt16LE(channels, 22);               // NumChannels
  header.writeUInt32LE(sampleRate, 24);             // SampleRate
  header.writeUInt32LE(byteRate, 28);               // ByteRate
  header.writeUInt16LE(blockAlign, 32);             // BlockAlign
  header.writeUInt16LE(bitsPerSample, 34);          // BitsPerSample
  header.write("data", 36);                          // Subchunk2ID
  header.writeUInt32LE(dataSize, 40);               // Subchunk2Size

  return header;
}

// ─── Sanitize ─────────────────────────────────────────────
function sanitizeText(text: string): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").trim();
}
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Start Server ─────────────────────────────────────────
async function startServer() {
  const app = express();

  app.use(compression());
  app.use(express.json({ limit: "10mb" }));

  // CORS
  app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
    if (_req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Rate limiters
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: "Too many attempts. Try again in 15 minutes." },
  });
  const ttsLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 60,
    message: { error: "Too many requests. Try again later." },
  });
  const chatLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 120,
    message: { error: "Chat rate limit reached. Try again later." },
  });

  // ═══ AUTH ═════════════════════════════════════════════════
  app.post(
    "/api/auth/register",
    authLimiter,
    async (req: Request, res: Response) => {
      try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
          res.status(400).json({ error: "All fields are required" });
          return;
        }
        if (!isValidEmail(email)) {
          res.status(400).json({ error: "Invalid email format" });
          return;
        }
        if (password.length < 8) {
          res
            .status(400)
            .json({ error: "Password must be at least 8 characters" });
          return;
        }
        if (
          db.prepare("SELECT id FROM users WHERE email=?").get(email)
        ) {
          res
            .status(400)
            .json({ error: "An account with this email already exists" });
          return;
        }
        const id = uuidv4();
        db.prepare(
          "INSERT INTO users (id,name,email,password_hash) VALUES (?,?,?,?)"
        ).run(
          id,
          name.trim(),
          email.trim().toLowerCase(),
          await bcrypt.hash(password, 10)
        );
        const token = jwt.sign({ userId: id }, JWT_SECRET, {
          expiresIn: "7d",
        });
        const user = db
          .prepare(
            "SELECT id,name,email,plan,credits,created_at FROM users WHERE id=?"
          )
          .get(id);
        res.json({ token, user });
      } catch (err: any) {
        console.error("Register error:", err);
        res.status(500).json({ error: "Registration failed" });
      }
    }
  );

  app.post(
    "/api/auth/login",
    authLimiter,
    async (req: Request, res: Response) => {
      try {
        const { email, password } = req.body;
        if (!email || !password) {
          res.status(400).json({ error: "Email and password are required" });
          return;
        }
        const row = db
          .prepare("SELECT * FROM users WHERE email=?")
          .get(email.trim().toLowerCase()) as any;
        if (!row || !(await bcrypt.compare(password, row.password_hash))) {
          res.status(401).json({ error: "Invalid email or password" });
          return;
        }
        const token = jwt.sign({ userId: row.id }, JWT_SECRET, {
          expiresIn: "7d",
        });
        res.json({
          token,
          user: {
            id: row.id,
            name: row.name,
            email: row.email,
            plan: row.plan,
            credits: row.credits,
            created_at: row.created_at,
          },
        });
      } catch (err: any) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Login failed" });
      }
    }
  );

  app.get(
    "/api/auth/me",
    authenticateToken as any,
    (req: AuthRequest, res: Response) => {
      res.json({ user: req.user });
    }
  );

  // ═══ TTS (Google Gemini TTS — Free & Reliable) ═══════════
  app.post(
    "/api/tts",
    authenticateToken as any,
    ttsLimiter,
    async (req: AuthRequest, res: Response) => {
      try {
        const {
          text: rawText,
          voiceName = "bilal",
        } = req.body;

        const text = sanitizeText(rawText || "");

        if (!text) {
          res.status(400).json({ error: "Text is required" });
          return;
        }
        if (text.length > 1000) {
          res
            .status(400)
            .json({ error: "Text must be under 1000 characters" });
          return;
        }

        // ── Daily limit check ──────────────────────────────
        const usedToday = getDailyUsage(req.user!.id);
        if (usedToday >= DAILY_TTS_LIMIT) {
          res.status(429).json({
            error: `Daily limit reached. You can generate ${DAILY_TTS_LIMIT} voices per day for free. Resets at midnight! 🌙`,
            remaining: 0,
            limit: DAILY_TTS_LIMIT,
            resetsAt: "midnight UTC",
          });
          return;
        }

        const voice = VOICE_MAP[voiceName.toLowerCase()] || "Kore";

        // ── Generate with Google Gemini TTS ─────────────────
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice,
                },
              },
            },
          },
        });

        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!audioData) {
          throw new Error("No audio data received from Gemini");
        }

        // Gemini returns raw PCM data (24kHz, 16-bit, mono) — wrap in WAV header
        const pcmBuffer = Buffer.from(audioData, "base64");
        const wavHeader = createWavHeader(pcmBuffer.length, 24000, 1, 16);
        const audioBuffer = Buffer.concat([wavHeader, pcmBuffer]);
        const duration = pcmBuffer.length / (24000 * 2); // 24kHz * 2 bytes per sample

        // ── Save to DB ────────────────────────────────────
        const historyId = uuidv4();
        db.prepare(
          "INSERT INTO audio_history (id,user_id,text,voice,duration,audio_data) VALUES (?,?,?,?,?,?)"
        ).run(
          historyId,
          req.user!.id,
          text,
          voiceName,
          duration,
          audioBuffer
        );

        // ── Increment daily usage ─────────────────────────
        incrementDailyUsage(req.user!.id);
        const remaining = getRemainingToday(req.user!.id);

        res.set("Content-Type", "audio/wav");
        res.set("X-Audio-Id", historyId);
        res.set("X-Audio-Duration", duration.toFixed(2));
        res.set("X-Daily-Remaining", remaining.toString());
        res.set("X-Daily-Limit", DAILY_TTS_LIMIT.toString());
        res.send(audioBuffer);
      } catch (err: any) {
        console.error("TTS error:", err);
        res.status(500).json({
          error: `Voice generation failed: ${err.message}. Please try again.`,
        });
      }
    }
  );

  // ═══ DAILY USAGE STATUS ════════════════════════════════════
  app.get(
    "/api/tts/usage",
    authenticateToken as any,
    (req: AuthRequest, res: Response) => {
      const used = getDailyUsage(req.user!.id);
      const remaining = Math.max(0, DAILY_TTS_LIMIT - used);
      res.json({
        used,
        remaining,
        limit: DAILY_TTS_LIMIT,
        date: getTodayDate(),
        resetsAt: "midnight UTC",
      });
    }
  );

  // ═══ SCRIPT GENERATION ════════════════════════════════════
  app.post(
    "/api/generate-script",
    authenticateToken as any,
    chatLimiter,
    async (req: AuthRequest, res: Response) => {
      try {
        const { prompt } = req.body;
        if (!prompt) {
          res.status(400).json({ error: "Prompt is required" });
          return;
        }
        if (!GROQ_API_KEY) {
          res.status(500).json({ error: "AI not configured" });
          return;
        }
        const groq = new Groq({ apiKey: GROQ_API_KEY });
        const c = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content:
                "You are an Urdu script writer. Generate natural, flowing Urdu text based on the user request. Return ONLY the Urdu text, no explanation, no English.",
            },
            { role: "user", content: prompt },
          ],
          model: "llama-3.1-8b-instant",
        });
        res.json({ text: c.choices[0]?.message?.content || "" });
      } catch (err: any) {
        console.error("Script error:", err);
        res
          .status(500)
          .json({ error: `Script generation failed: ${err.message}` });
      }
    }
  );

  // ═══ AI CHAT ═══════════════════════════════════════════════
  app.post(
    "/api/chat",
    authenticateToken as any,
    chatLimiter,
    async (req: AuthRequest, res: Response) => {
      try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) {
          res.status(400).json({ error: "Messages array is required" });
          return;
        }
        if (!GROQ_API_KEY) {
          res.status(500).json({ error: "AI not configured" });
          return;
        }
        const groq = new Groq({ apiKey: GROQ_API_KEY });
        const c = await groq.chat.completions.create({
          messages: [
            {
              role: "system" as const,
              content:
                "You are Awaz AI, a helpful assistant that speaks both Urdu and English. You are built into Awaz, a Pakistani TTS platform. Keep responses concise as they will be spoken aloud. Always respond in the same language the user writes in.",
            },
            ...messages,
          ],
          model: "llama-3.1-8b-instant",
        });
        res.json({ reply: c.choices[0]?.message?.content || "" });
      } catch (err: any) {
        console.error("Chat error:", err);
        res
          .status(500)
          .json({ error: `Chat failed: ${err.message}` });
      }
    }
  );

  // ═══ HISTORY ═══════════════════════════════════════════════
  app.get(
    "/api/history",
    authenticateToken as any,
    (req: AuthRequest, res: Response) => {
      const rows = db
        .prepare(
          "SELECT id,user_id,text,voice,duration,created_at FROM audio_history WHERE user_id=? ORDER BY created_at DESC"
        )
        .all(req.user!.id);
      res.json({ history: rows });
    }
  );

  app.get(
    "/api/history/:id/audio",
    authenticateToken as any,
    (req: AuthRequest, res: Response) => {
      const row = db
        .prepare(
          "SELECT audio_data FROM audio_history WHERE id=? AND user_id=?"
        )
        .get(req.params.id, req.user!.id) as any;
      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.set("Content-Type", "audio/mpeg");
      res.send(row.audio_data);
    }
  );

  app.delete(
    "/api/history/:id",
    authenticateToken as any,
    (req: AuthRequest, res: Response) => {
      const r = db
        .prepare(
          "DELETE FROM audio_history WHERE id=? AND user_id=?"
        )
        .run(req.params.id, req.user!.id);
      if (r.changes === 0) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json({ success: true });
    }
  );

  // ═══ USER ══════════════════════════════════════════════════
  app.get(
    "/api/user/credits",
    authenticateToken as any,
    (req: AuthRequest, res: Response) => {
      const row = db
        .prepare("SELECT credits FROM users WHERE id=?")
        .get(req.user!.id) as any;
      const used = getDailyUsage(req.user!.id);
      const remaining = Math.max(0, DAILY_TTS_LIMIT - used);
      res.json({
        credits: row?.credits ?? 0,
        dailyUsed: used,
        dailyRemaining: remaining,
        dailyLimit: DAILY_TTS_LIMIT,
      });
    }
  );

  app.post(
    "/api/user/update",
    authenticateToken as any,
    (req: AuthRequest, res: Response) => {
      try {
        const { name, email } = req.body;
        if (!name?.trim()) {
          res.status(400).json({ error: "Name is required" });
          return;
        }
        if (email && !isValidEmail(email)) {
          res.status(400).json({ error: "Invalid email format" });
          return;
        }
        if (email && email.toLowerCase() !== req.user!.email) {
          if (
            db
              .prepare(
                "SELECT id FROM users WHERE email=? AND id!=?"
              )
              .get(email.toLowerCase(), req.user!.id)
          ) {
            res.status(400).json({ error: "Email already taken" });
            return;
          }
        }
        db.prepare(
          "UPDATE users SET name=?, email=? WHERE id=?"
        ).run(
          name.trim(),
          (email || req.user!.email).toLowerCase(),
          req.user!.id
        );
        const u = db
          .prepare(
            "SELECT id,name,email,plan,credits,created_at FROM users WHERE id=?"
          )
          .get(req.user!.id);
        res.json({ user: u });
      } catch (err: any) {
        res.status(500).json({ error: "Update failed" });
      }
    }
  );

  app.post(
    "/api/user/change-password",
    authenticateToken as any,
    async (req: AuthRequest, res: Response) => {
      try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
          res
            .status(400)
            .json({ error: "Both passwords are required" });
          return;
        }
        if (newPassword.length < 8) {
          res.status(400).json({
            error: "New password must be at least 8 characters",
          });
          return;
        }
        const row = db
          .prepare("SELECT password_hash FROM users WHERE id=?")
          .get(req.user!.id) as any;
        if (
          !(await bcrypt.compare(currentPassword, row.password_hash))
        ) {
          res
            .status(401)
            .json({ error: "Current password is incorrect" });
          return;
        }
        db.prepare(
          "UPDATE users SET password_hash=? WHERE id=?"
        ).run(await bcrypt.hash(newPassword, 10), req.user!.id);
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ error: "Password change failed" });
      }
    }
  );

  // ═══ STATIC / VITE ═════════════════════════════════════════
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_req, res) =>
      res.sendFile(path.join(__dirname, "dist", "index.html"))
    );
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n  🎙️  Awaz server running at http://localhost:${PORT}`);
    console.log(`  📊  Daily TTS limit: ${DAILY_TTS_LIMIT} per user\n`);
  });
}

startServer().catch(console.error);
