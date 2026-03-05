import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || "3000", 10);
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_change_me";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

// ─── Database ───────────────────────────────────────────
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
`);

// ─── Types ──────────────────────────────────────────────
interface AuthUser {
  id: string; name: string; email: string;
  plan: string; credits: number; created_at: string;
}
interface AuthRequest extends Request { user?: AuthUser; }

// ─── Auth Middleware ─────────────────────────────────────
function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) { res.status(401).json({ error: "Authentication required" }); return; }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = db.prepare("SELECT id,name,email,plan,credits,created_at FROM users WHERE id=?").get(decoded.userId) as AuthUser | undefined;
    if (!user) { res.status(401).json({ error: "User not found" }); return; }
    req.user = user;
    next();
  } catch { res.status(401).json({ error: "Invalid or expired token" }); }
}

// ─── WAV Helper (24kHz, 16-bit mono) ────────────────────
function pcmToWav(pcmBuffer: Buffer): Buffer {
  const sampleRate = 24000;
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataLength = pcmBuffer.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);
  return Buffer.concat([header, pcmBuffer]);
}

const VOICE_MAP: Record<string, string> = {
  ayesha: "Kore", bilal: "Puck", tariq: "Charon", zain: "Fenrir", fatima: "Zephyr",
};

// ─── Sanitize ───────────────────────────────────────────
function sanitizeText(text: string): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").trim();
}
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Start Server ───────────────────────────────────────
async function startServer() {
  const app = express();

  app.use(compression());
  app.use(express.json({ limit: "10mb" }));

  // CORS
  app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
    if (_req.method === "OPTIONS") { res.sendStatus(200); return; }
    next();
  });

  // Rate limiters
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: "Too many attempts. Try again in 15 minutes." } });
  const ttsLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 60, message: { error: "TTS rate limit reached. Try again later." } });
  const chatLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 120, message: { error: "Chat rate limit reached. Try again later." } });

  // ═══ AUTH ═══════════════════════════════════════════════
  app.post("/api/auth/register", authLimiter, async (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) { res.status(400).json({ error: "All fields are required" }); return; }
      if (!isValidEmail(email)) { res.status(400).json({ error: "Invalid email format" }); return; }
      if (password.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }
      if (db.prepare("SELECT id FROM users WHERE email=?").get(email)) {
        res.status(400).json({ error: "An account with this email already exists" }); return;
      }
      const id = uuidv4();
      db.prepare("INSERT INTO users (id,name,email,password_hash) VALUES (?,?,?,?)").run(id, name.trim(), email.trim().toLowerCase(), await bcrypt.hash(password, 10));
      const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: "7d" });
      const user = db.prepare("SELECT id,name,email,plan,credits,created_at FROM users WHERE id=?").get(id);
      res.json({ token, user });
    } catch (err: any) { console.error("Register error:", err); res.status(500).json({ error: "Registration failed" }); }
  });

  app.post("/api/auth/login", authLimiter, async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) { res.status(400).json({ error: "Email and password are required" }); return; }
      const row = db.prepare("SELECT * FROM users WHERE email=?").get(email.trim().toLowerCase()) as any;
      if (!row || !(await bcrypt.compare(password, row.password_hash))) {
        res.status(401).json({ error: "Invalid email or password" }); return;
      }
      const token = jwt.sign({ userId: row.id }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, user: { id: row.id, name: row.name, email: row.email, plan: row.plan, credits: row.credits, created_at: row.created_at } });
    } catch (err: any) { console.error("Login error:", err); res.status(500).json({ error: "Login failed" }); }
  });

  app.get("/api/auth/me", authenticateToken as any, (req: AuthRequest, res: Response) => {
    res.json({ user: req.user });
  });

  // ═══ TTS ═══════════════════════════════════════════════
  app.post("/api/tts", authenticateToken as any, ttsLimiter, async (req: AuthRequest, res: Response) => {
    try {
      const { text: rawText, voiceName = "bilal", speed = "Normal", pitch = "Normal", style = "Neutral" } = req.body;
      const text = sanitizeText(rawText || "");
      if (!text) { res.status(400).json({ error: "Text is required" }); return; }
      if (text.length > 1000) { res.status(400).json({ error: "Text must be under 1000 characters" }); return; }
      if (!req.user || req.user.credits <= 0) { res.status(402).json({ error: "Insufficient credits. Please upgrade your plan." }); return; }
      if (!GEMINI_API_KEY) { res.status(500).json({ error: "TTS not configured. Missing GEMINI_API_KEY." }); return; }

      const geminiVoice = VOICE_MAP[voiceName.toLowerCase()] || "Puck";
      let instruction = "Read the following Urdu text naturally and fluently.";
      if (style !== "Neutral") instruction += ` Use a ${style.toLowerCase()} tone.`;
      if (speed !== "Normal") instruction += ` Speak at a ${speed.toLowerCase()} pace.`;
      if (pitch !== "Normal") instruction += ` Use a ${pitch.toLowerCase()} pitch.`;

      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

      // Retry up to 3 times with backoff for network issues
      let response: any;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ role: "user", parts: [{ text: `${instruction}\n\n${text}` }] }],
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: geminiVoice } } },
            },
          });
          break; // success
        } catch (retryErr: any) {
          const isNetwork = retryErr.message?.includes("fetch failed") || retryErr.message?.includes("ECONNRESET") || retryErr.message?.includes("Timeout");
          console.error(`TTS attempt ${attempt}/3 failed:`, retryErr.message);
          if (attempt === 3 || !isNetwork) {
            throw retryErr;
          }
          // Wait before retry: 2s, 4s
          await new Promise(r => setTimeout(r, attempt * 2000));
        }
      }

      const audioPart = response?.candidates?.[0]?.content?.parts?.[0];
      if (!audioPart?.inlineData?.data) { res.status(500).json({ error: "No audio data received from TTS" }); return; }

      const pcmBuffer = Buffer.from(audioPart.inlineData.data, "base64");
      const wavBuffer = pcmToWav(pcmBuffer);
      const duration = pcmBuffer.length / (24000 * 2);

      db.prepare("UPDATE users SET credits=credits-100 WHERE id=?").run(req.user.id);
      const historyId = uuidv4();
      db.prepare("INSERT INTO audio_history (id,user_id,text,voice,duration,audio_data) VALUES (?,?,?,?,?,?)").run(historyId, req.user.id, text, voiceName, duration, wavBuffer);

      res.set("Content-Type", "audio/wav");
      res.set("X-Audio-Id", historyId);
      res.set("X-Audio-Duration", duration.toFixed(2));
      res.send(wavBuffer);
    } catch (err: any) {
      console.error("TTS error:", err);
      const isNetwork = err.message?.includes("fetch failed") || err.message?.includes("ECONNRESET") || err.message?.includes("Timeout");
      const msg = isNetwork
        ? "Network error: cannot reach Google Gemini. Check your internet/VPN and try again."
        : `TTS failed: ${err.message}`;
      res.status(isNetwork ? 503 : 500).json({ error: msg });
    }
  });

  // ═══ SCRIPT GENERATION ════════════════════════════════
  app.post("/api/generate-script", authenticateToken as any, chatLimiter, async (req: AuthRequest, res: Response) => {
    try {
      const { prompt } = req.body;
      if (!prompt) { res.status(400).json({ error: "Prompt is required" }); return; }
      if (!GROQ_API_KEY) { res.status(500).json({ error: "AI not configured" }); return; }
      const groq = new Groq({ apiKey: GROQ_API_KEY });
      const c = await groq.chat.completions.create({
        messages: [
          { role: "system", content: "You are an Urdu script writer. Generate natural, flowing Urdu text based on the user's request. Return ONLY the Urdu text, no explanation, no English." },
          { role: "user", content: prompt },
        ],
        model: "llama-3.1-8b-instant",
      });
      res.json({ text: c.choices[0]?.message?.content || "" });
    } catch (err: any) { console.error("Script error:", err); res.status(500).json({ error: `Script generation failed: ${err.message}` }); }
  });

  // ═══ AI CHAT ══════════════════════════════════════════
  app.post("/api/chat", authenticateToken as any, chatLimiter, async (req: AuthRequest, res: Response) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) { res.status(400).json({ error: "Messages array is required" }); return; }
      if (!GROQ_API_KEY) { res.status(500).json({ error: "AI not configured" }); return; }
      const groq = new Groq({ apiKey: GROQ_API_KEY });
      const c = await groq.chat.completions.create({
        messages: [
          { role: "system" as const, content: "You are Awaz AI, a helpful assistant that speaks both Urdu and English. You are built into Awaz, a Pakistani TTS platform. Keep responses concise as they will be spoken aloud. Always respond in the same language the user writes in." },
          ...messages,
        ],
        model: "llama-3.1-8b-instant",
      });
      res.json({ reply: c.choices[0]?.message?.content || "" });
    } catch (err: any) { console.error("Chat error:", err); res.status(500).json({ error: `Chat failed: ${err.message}` }); }
  });

  // ═══ HISTORY ══════════════════════════════════════════
  app.get("/api/history", authenticateToken as any, (req: AuthRequest, res: Response) => {
    const rows = db.prepare("SELECT id,user_id,text,voice,duration,created_at FROM audio_history WHERE user_id=? ORDER BY created_at DESC").all(req.user!.id);
    res.json({ history: rows });
  });

  app.get("/api/history/:id/audio", authenticateToken as any, (req: AuthRequest, res: Response) => {
    const row = db.prepare("SELECT audio_data FROM audio_history WHERE id=? AND user_id=?").get(req.params.id, req.user!.id) as any;
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.set("Content-Type", "audio/wav");
    res.send(row.audio_data);
  });

  app.delete("/api/history/:id", authenticateToken as any, (req: AuthRequest, res: Response) => {
    const r = db.prepare("DELETE FROM audio_history WHERE id=? AND user_id=?").run(req.params.id, req.user!.id);
    if (r.changes === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ success: true });
  });

  // ═══ USER ═════════════════════════════════════════════
  app.get("/api/user/credits", authenticateToken as any, (req: AuthRequest, res: Response) => {
    const row = db.prepare("SELECT credits FROM users WHERE id=?").get(req.user!.id) as any;
    res.json({ credits: row?.credits ?? 0 });
  });

  app.post("/api/user/update", authenticateToken as any, (req: AuthRequest, res: Response) => {
    try {
      const { name, email } = req.body;
      if (!name?.trim()) { res.status(400).json({ error: "Name is required" }); return; }
      if (email && !isValidEmail(email)) { res.status(400).json({ error: "Invalid email format" }); return; }
      if (email && email.toLowerCase() !== req.user!.email) {
        if (db.prepare("SELECT id FROM users WHERE email=? AND id!=?").get(email.toLowerCase(), req.user!.id)) {
          res.status(400).json({ error: "Email already taken" }); return;
        }
      }
      db.prepare("UPDATE users SET name=?, email=? WHERE id=?").run(name.trim(), (email || req.user!.email).toLowerCase(), req.user!.id);
      const u = db.prepare("SELECT id,name,email,plan,credits,created_at FROM users WHERE id=?").get(req.user!.id);
      res.json({ user: u });
    } catch (err: any) { res.status(500).json({ error: "Update failed" }); }
  });

  app.post("/api/user/change-password", authenticateToken as any, async (req: AuthRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) { res.status(400).json({ error: "Both passwords are required" }); return; }
      if (newPassword.length < 8) { res.status(400).json({ error: "New password must be at least 8 characters" }); return; }
      const row = db.prepare("SELECT password_hash FROM users WHERE id=?").get(req.user!.id) as any;
      if (!(await bcrypt.compare(currentPassword, row.password_hash))) {
        res.status(401).json({ error: "Current password is incorrect" }); return;
      }
      db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(await bcrypt.hash(newPassword, 10), req.user!.id);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: "Password change failed" }); }
  });

  // ═══ STATIC / VITE ════════════════════════════════════
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n  🎙️  Awaz server running at http://localhost:${PORT}\n`);
  });
}

startServer().catch(console.error);
