import { apiFetch, refreshCredits } from "./api";

interface TTSOptions {
  text: string;
  voiceName?: string;
  speed?: string;
  pitch?: string;
  style?: string;
}

export async function generateSpeech(opts: TTSOptions) {
  const res = await apiFetch(
    "/api/tts",
    {
      method: "POST",
      body: JSON.stringify({
        text: opts.text,
        voiceName: opts.voiceName || "bilal",
        speed: opts.speed || "Normal",
        pitch: opts.pitch || "Normal",
        style: opts.style || "Neutral",
      }),
    },
    true
  );

  const audioBlob = new Blob([await res.arrayBuffer()], { type: "audio/mpeg" });
  const audioUrl = URL.createObjectURL(audioBlob);
  const duration = parseFloat(res.headers.get("X-Audio-Duration") || "0");
  const audioId = res.headers.get("X-Audio-Id") || "";

  // Refresh credits in store after generation
  await refreshCredits();

  return { audioBlob, audioUrl, audioId, duration };
}
