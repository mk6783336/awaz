export interface User {
  id: string;
  name: string;
  email: string;
  plan: "free" | "pro" | "enterprise";
  credits: number;
}

export interface AudioRecord {
  id: string;
  user_id: string;
  text: string;
  voice: string;
  duration: number;
  created_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
